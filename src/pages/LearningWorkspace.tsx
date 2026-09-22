import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Bot, Check, FileText, Loader2, Paperclip, Send, Sparkles, Upload, X, Layers3, Save, Brain, Pencil, Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getGreetingName } from '@/lib/auth-context';
import { supabase, type StudySet, type WorkspaceFile as StoredWorkspaceFile, type WorkspaceMemory } from '@/lib/supabase';
import { LearningPlanner } from '@/components/LearningPlanner';
import { analyzeWorkspace, homeworkHelp, tutorChat } from '@/lib/ai-client';
import type { WorkspaceAnalysis, WorkspaceAnalysisContext } from '@/lib/types';
import { extractFileText } from '@/lib/file-extraction';
import { userError } from '@/lib/error-text';
import { StudySetView } from './StudySetView';
import { t } from '@/lib/i18n';

type Props = {
  onNavigate: (page: 'create') => void;
  initialTab?: 'notes' | 'flashcards';
  initialSetId?: string | null;
};

type ChatMessage = { role: 'assistant' | 'user'; text: string; id: string; questionId?: string };
const WORKSPACE_KEY = 'default';

const memoryLabel: Record<WorkspaceMemory['memory_type'], string> = {
  summary: 'Zusammenfassung',
  topic: 'Themencluster',
  task: 'Aufgabe',
  exam: 'Prüfung',
  confirmed_answer: 'Bestätigte Antwort',
  uncertainty: 'Offene Unsicherheit',
};

export function LearningWorkspace({ onNavigate, initialTab = 'notes', initialSetId = null }: Props) {
  const { user, profile } = useAuth();
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<StoredWorkspaceFile[]>([]);
  const [sets, setSets] = useState<StudySet[]>([]);
  const [workspaceTab, setWorkspaceTab] = useState<'notes' | 'flashcards' | 'memory'>(initialTab);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(initialSetId);
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTool, setActiveTool] = useState('assistant');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analysis, setAnalysis] = useState<WorkspaceAnalysis | null>(null);
  const [memory, setMemory] = useState<WorkspaceMemory[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [editingMemory, setEditingMemory] = useState<WorkspaceMemory | null>(null);
  const [memoryDraft, setMemoryDraft] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [confirmingTasks, setConfirmingTasks] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [questionLoading, setQuestionLoading] = useState<Record<string, boolean>>({});
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});
  const [savedQuestionAnswers, setSavedQuestionAnswers] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', text: 'Ich bin bereit. Lade Lernmaterial hoch oder stelle mir eine Frage zu deinen Notizen.' },
  ]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzableFiles = files.filter((file) => file.extraction_status === 'text_extracted' && file.extracted_text.trim());

  useEffect(() => {
    if (!user) return;
    setMemoryLoading(true);
    setChatLoading(true);
    (async () => {
      const [noteResult, filesResult, analysisResult, setsResult, memoryResult, conversationResult] = await Promise.all([
        supabase.from('workspace_notes').select('content').eq('user_id', user.id).maybeSingle(),
        supabase.from('workspace_files').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('workspace_analysis').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('study_sets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('workspace_memory').select('*').eq('user_id', user.id).eq('workspace_key', WORKSPACE_KEY).order('updated_at', { ascending: false }),
        supabase.from('ai_conversations').select('messages,conversation_id,question_id').eq('user_id', user.id).eq('workspace_key', WORKSPACE_KEY),
      ]);
      if (noteResult.error || filesResult.error || analysisResult.error || setsResult.error || memoryResult.error || conversationResult.error) {
        setError(userError(noteResult.error || filesResult.error || analysisResult.error || setsResult.error || memoryResult.error || conversationResult.error, 'Der Workspace ist gerade im Ladechaos – bitte versuch es gleich nochmal.'));
        setChatLoading(false);
        setMemoryLoading(false);
        return;
      }
      setNotes(noteResult.data?.content || '');
      setFiles((filesResult.data as StoredWorkspaceFile[]) || []);
      setSets((setsResult.data as StudySet[]) || []);
      setMemory((memoryResult.data as WorkspaceMemory[]) || []);
      setSavedQuestionAnswers(Object.fromEntries(
        ((memoryResult.data as WorkspaceMemory[]) || [])
          .filter((item) => item.memory_type === 'confirmed_answer' && item.stable_key.startsWith('analysis:answer:'))
          .map((item) => [item.stable_key.slice('analysis:answer:'.length), true]),
      ));
      const storedRows = conversationResult.data || [];
      const restored = storedRows.flatMap((row) => {
        const storedMessages = row.messages;
        if (!Array.isArray(storedMessages)) return [];
        return storedMessages.filter((message): message is { role: 'assistant' | 'user'; content: string; questionId?: string } =>
          typeof message === 'object' && message !== null &&
          ((message as { role?: string }).role === 'assistant' || (message as { role?: string }).role === 'user') &&
          typeof (message as { content?: unknown }).content === 'string',
        ).map((message, index) => ({
          id: `stored-${row.conversation_id || 'general'}-${index}`,
          role: message.role,
          text: message.content,
          questionId: typeof message.questionId === 'string' ? message.questionId : row.question_id || undefined,
        }));
      });
      if (restored.length) setMessages(restored);
      setChatLoading(false);
      setMemoryLoading(false);
      if (analysisResult.data) {
        setAnalysis({
          context_summary: analysisResult.data.context_summary,
          topics: analysisResult.data.topics,
          tasks: analysisResult.data.pending_tasks,
          uncertainties: analysisResult.data.uncertainties,
          open_questions: Array.isArray(analysisResult.data.open_questions) ? analysisResult.data.open_questions : analysisResult.data.uncertainties.map((question: string, index: number) => ({ id: `legacy-${index}`, question, suggestions: [] })),
          language_learning: analysisResult.data.language_learning || null,
        });
      }
    })();
  }, [user]);

  const saveConversation = async (nextMessages: ChatMessage[], conversationId = 'general', questionId?: string) => {
    if (!user) return;
    const { error: saveError } = await supabase.from('ai_conversations').upsert({
      user_id: user.id,
      workspace_key: WORKSPACE_KEY,
      conversation_id: conversationId,
      question_id: questionId || null,
      messages: nextMessages.map(({ role, text, questionId }) => ({ role, content: text, questionId, timestamp: new Date().toISOString() })),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,workspace_key,conversation_id' });
    if (saveError) setChatError(`Chat konnte nicht dauerhaft gespeichert werden: ${userError(saveError)}`);
  };

  const startNewChat = async () => {
    const nextMessages: ChatMessage[] = [{ id: 'welcome', role: 'assistant', text: 'Neuer Chat gestartet. Wobei kann ich dich unterstützen?' }];
    setMessages(nextMessages);
    setChatError(null);
    await saveConversation(nextMessages);
  };

  const saveMemoryEdit = async () => {
    if (!editingMemory || !user || !memoryDraft.trim()) return;
    const { data, error: saveError } = await supabase.from('workspace_memory')
      .update({ title: memoryDraft.trim(), updated_at: new Date().toISOString() })
      .eq('id', editingMemory.id).eq('user_id', user.id).select().single();
    if (saveError) setError(`Memory konnte nicht gespeichert werden: ${userError(saveError)}`);
    else if (data) setMemory((current) => current.map((item) => item.id === editingMemory.id ? data as WorkspaceMemory : item));
    setEditingMemory(null);
  };

  const deleteMemory = async (item: WorkspaceMemory) => {
    if (!user) return;
    const { error: deleteError } = await supabase.from('workspace_memory').delete().eq('id', item.id).eq('user_id', user.id);
    if (deleteError) setError(`Memory konnte nicht gelöscht werden: ${userError(deleteError)}`);
    else setMemory((current) => current.filter((entry) => entry.id !== item.id));
  };

  const persistAnalysisMemory = async (result: WorkspaceAnalysis) => {
    if (!user) return;
    const rows = [
      {
        user_id: user.id, workspace_key: WORKSPACE_KEY, memory_type: 'summary', stable_key: 'analysis:summary',
        title: 'Workspace-Zusammenfassung', content: { summary: result.context_summary }, source: 'Workspace-Analyse',
      },
      ...result.topics.map((topic) => ({
        user_id: user.id, workspace_key: WORKSPACE_KEY, memory_type: 'topic', stable_key: `analysis:topic:${topic.name.toLowerCase().trim()}`,
        title: topic.name, content: { details: topic.details, source_names: topic.source_names }, source: 'Workspace-Analyse',
      })),
      ...result.tasks.map((task) => ({
        user_id: user.id, workspace_key: WORKSPACE_KEY, memory_type: task.task_type === 'exam' ? 'exam' : 'task',
        stable_key: `analysis:${task.task_type}:${task.title.toLowerCase().trim()}:${task.due_date || 'no-date'}`,
        title: task.title, content: task, source: 'Workspace-Analyse',
      })),
      ...result.uncertainties.map((item) => ({
        user_id: user.id, workspace_key: WORKSPACE_KEY, memory_type: 'uncertainty',
        stable_key: `analysis:uncertainty:${item.toLowerCase().trim()}`, title: item, content: { uncertainty: item }, source: 'Workspace-Analyse',
      })),
    ];
    if (!rows.length) return;
    const { data, error: memoryError } = await supabase.from('workspace_memory').upsert(rows, { onConflict: 'user_id,workspace_key,stable_key' }).select();
    if (memoryError) setError(`Analyse erstellt, aber Memory konnte nicht gespeichert werden: ${userError(memoryError)}`);
    else if (data) setMemory((current) => [...(data as WorkspaceMemory[]), ...current.filter((item) => !data.some((saved) => saved.id === item.id))]);
  };

  const saveNotes = async () => {
    if (!user) return;
    setSavingNotes(true);
    setError(null);
    const { error: saveError } = await supabase.from('workspace_notes').upsert({ user_id: user.id, content: notes, updated_at: new Date().toISOString() });
    if (saveError) setError(`Notizen konnten nicht gespeichert werden: ${userError(saveError)}`);
    setSavingNotes(false);
  };

  const addFiles = async (selected: FileList | null) => {
    if (!selected || !user) return;
    setUploading(true);
    setError(null);
    const uploaded: StoredWorkspaceFile[] = [];
    for (const file of Array.from(selected)) {
      const isText = ['text/plain', 'text/markdown', 'text/csv', 'application/json'].includes(file.type)
        || /\.(txt|md|csv|json)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);
      if ((!isText && !isPdf && !isImage) || file.size > 10 * 1024 * 1024) {
        setError(`${file.name}: Nur PDF-, Foto- oder Textdateien bis 10 MB werden akzeptiert.`);
        continue;
      }
      if (isImage) {
        setError(`${file.name}: Foto-OCR ist in dieser Umgebung nicht verfügbar. Die Datei wird nicht als KI-Kontext verwendet.`);
        continue;
      }
      const extraction = await extractFileText(file);
      const extractedText = extraction.status === 'text_extracted' ? extraction.text : '';
      const extractionStatus = extraction.status;
      if (extractionStatus !== 'text_extracted') {
        setError(`${file.name}: ${extraction.error}`);
        continue;
      }
      const storagePath = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from('workspace-files').upload(storagePath, file);
      if (error) {
        setError(`${file.name}: ${userError(error, 'Der Upload ist ins Stolpern geraten – bitte versuch es gleich nochmal.')}`);
        continue;
      }
      const { data, error: metadataError } = await supabase.from('workspace_files').insert({
        user_id: user.id,
        name: file.name,
        storage_path: storagePath,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        extracted_text: extractedText,
        extraction_status: extractionStatus,
      }).select().single();
      if (metadataError) {
        setError(`${file.name} wurde hochgeladen, aber nicht eingetragen: ${userError(metadataError)}`);
      } else if (data) {
        uploaded.push(data as StoredWorkspaceFile);
      }
    }
    setFiles((current) => [...uploaded, ...current]);
    setUploading(false);
  };

  const runWorkspaceAnalysis = async () => {
    if (!user || analyzing) return;
    setAnalyzing(true);
    setError(null);
    const result = await analyzeWorkspace(
      'Analysiere meinen gesamten LearningWorkspace. Extrahiere nur belastbare Aufgaben und Fristen, gruppiere zusammengehörige Themen und nenne offene Rückfragen.',
      {
        notes: notes.trim().slice(0, 20000) || undefined,
        files: analyzableFiles.map((file) => ({
          name: file.name,
          content: file.extracted_text.slice(0, 10000) || undefined,
        })),
        app_language: profile?.app_language || 'de',
        learning_language: profile?.learning_language || 'de',
      },
    );
    if (!result.success) {
      setError(`Analyse fehlgeschlagen: ${result.error}`);
    } else {
      setAnalysis(result.data);
      const { error: saveError } = await supabase.from('workspace_analysis').upsert({
        user_id: user.id,
        context_summary: result.data.context_summary,
        topics: result.data.topics,
        pending_tasks: result.data.tasks,
        uncertainties: result.data.uncertainties,
        open_questions: result.data.open_questions,
        language_learning: result.data.language_learning,
        updated_at: new Date().toISOString(),
      });
      if (saveError) setError(`Analyse erstellt, aber nicht gespeichert: ${userError(saveError)}`);
      await persistAnalysisMemory(result.data);
    }
    setAnalyzing(false);
  };

  const persistConfirmedAnswer = async (questionId: string) => {
    if (!user || !analysis || savedQuestionAnswers[questionId]) return;
    const question = analysis.open_questions.find((item) => item.id === questionId);
    const thread = messages.filter((message) => message.questionId === questionId);
    const answer = [...thread].reverse().find((message) => message.role === 'user');
    const aiReply = [...thread].reverse().find((message) => message.role === 'assistant');
    if (!question || !answer) return;
    const { data, error: memoryError } = await supabase.from('workspace_memory').upsert({
      user_id: user.id, workspace_key: WORKSPACE_KEY, memory_type: 'confirmed_answer',
      stable_key: `analysis:answer:${question.id}`, title: question.question,
      content: { question: question.question, answer: answer.text, ...(aiReply ? { ai_response: aiReply.text } : {}) }, source: 'Workspace-Rückfrage',
    }, { onConflict: 'user_id,workspace_key,stable_key' }).select().single();
    if (memoryError) {
      setQuestionErrors((current) => ({ ...current, [questionId]: `Antwort konnte nicht gespeichert werden: ${userError(memoryError)}` }));
      return;
    }
    if (data) setMemory((current) => [data as WorkspaceMemory, ...current.filter((item) => item.id !== data.id)]);
    setSavedQuestionAnswers((current) => ({ ...current, [questionId]: true }));
  };

  const answerOpenQuestion = async (questionId: string, answer: string | null) => {
    if (!user || !analysis) return;
    if (!answer) {
      return;
    }
    const question = analysis.open_questions.find((item) => item.id === questionId);
    if (!question || questionLoading[questionId]) return;
    const thread = messages.filter((message) => message.questionId === questionId).slice(-10);
    const analysisContext: WorkspaceAnalysisContext = {
      context_summary: analysis.context_summary,
      topics: analysis.topics.map(({ name, details }) => ({ name, details })),
      tasks: analysis.tasks,
      open_question: { id: question.id, question: question.question },
    };
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: answer, questionId };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setQuestionAnswers((current) => ({ ...current, [questionId]: '' }));
    setQuestionErrors((current) => ({ ...current, [questionId]: '' }));
    setQuestionLoading((current) => ({ ...current, [questionId]: true }));
    const result = await tutorChat(
      `Beantworte die konkrete Analyse-Rückfrage. Nutzerantwort: ${answer}`,
      {
        notes: notes.trim() || undefined,
        files: analyzableFiles.map((file) => ({ name: file.name, content: file.extracted_text.slice(0, 10000) })),
        app_language: profile?.app_language || 'de',
        learning_language: profile?.learning_language || 'de',
        conversation: [...thread, userMessage].map(({ role, text }) => ({ role, content: text })),
        analysis_context: analysisContext,
        memory_context: memory.slice(0, 20).map((item) => ({ title: item.title, content: JSON.stringify(item.content).slice(0, 2000) })),
      },
    );
    if (!result.success) {
      setMessages((current) => current.filter((message) => message.id !== userMessage.id));
      setQuestionErrors((current) => ({ ...current, [questionId]: 'Die Rückfrage konnte gerade nicht beantwortet werden. Bitte versuch es gleich noch einmal.' }));
      setQuestionLoading((current) => ({ ...current, [questionId]: false }));
      return;
    }
    const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', text: result.data.reply, questionId };
    const completedMessages = [...nextMessages, assistantMessage];
    setMessages(completedMessages);
    await saveConversation(completedMessages.filter((message) => message.questionId === questionId), `question:${questionId}`, questionId);
    setQuestionLoading((current) => ({ ...current, [questionId]: false }));
  };

  const confirmTasks = async () => {
    if (!user || !analysis?.tasks.length) return;
    setConfirmingTasks(true);
    setError(null);
    const tasksWithDates = analysis.tasks.filter((task) => task.due_date);
    if (!tasksWithDates.length) {
      setError('Keine Aufgabe mit sicher erkannter Frist zum Bestätigen vorhanden.');
      setConfirmingTasks(false);
      return;
    }
    const { error: saveError } = await supabase.from('learning_tasks').insert(tasksWithDates.map((task) => ({
      user_id: user.id,
      title: task.title,
      description: task.description,
      subject: task.subject || 'Allgemein',
      task_type: task.task_type,
      due_date: task.due_date as string,
      estimated_hours: task.estimated_hours,
    })));
    if (saveError) setError(`Bestätigte Aufgaben konnten nicht gespeichert werden: ${userError(saveError)}`);
    else {
      const remainingTasks = analysis.tasks.filter((task) => !tasksWithDates.includes(task));
      const { error: analysisUpdateError } = await supabase.from('workspace_analysis').update({
        pending_tasks: remainingTasks,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
      if (analysisUpdateError) setError(`Aufgaben gespeichert, Analyse konnte nicht aktualisiert werden: ${userError(analysisUpdateError)}`);
      setAnalysis((current) => current ? { ...current, tasks: remainingTasks } : current);
    }
    setConfirmingTasks(false);
  };

  const removeFile = async (file: StoredWorkspaceFile) => {
    setError(null);
    const { error: storageError } = await supabase.storage.from('workspace-files').remove([file.storage_path]);
    const { error: metadataError } = await supabase.from('workspace_files').delete().eq('id', file.id).eq('user_id', user?.id);
    if (storageError || metadataError) {
      setError(userError(storageError || metadataError, 'Die Datei wollte gerade nicht verschwinden – bitte versuch es gleich nochmal.'));
      return;
    }
    setFiles((current) => current.filter((item) => item.id !== file.id));
  };

  const askAssistant = async () => {
    const trimmed = question.trim();
    if (!trimmed || asking) return;
    setAsking(true);
    setQuestion('');
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', text: trimmed },
    ]);
    const context = {
      notes: notes.trim() || undefined,
      files: files.filter((file) => file.extraction_status === 'text_extracted' && file.extracted_text.trim()).map((file) => ({
        name: file.name,
        content: file.extracted_text,
      })),
      app_language: profile?.app_language || 'de',
      learning_language: profile?.learning_language || 'de',
      conversation: messages.slice(-20).map(({ role, text }) => ({ role, content: text })),
    };
    const result = /hausaufgabe|homework|aufgabe/i.test(trimmed)
      ? await homeworkHelp(trimmed, context)
      : await tutorChat(trimmed, context);
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: result.success ? result.data.reply : result.error,
    };
    const nextMessages = [...messages, { id: crypto.randomUUID(), role: 'user' as const, text: trimmed }, assistantMessage];
    setMessages(nextMessages);
    if (result.success) await saveConversation(nextMessages);
    else setChatError(result.error);
    setAsking(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2">
        <button
          onClick={() => { setWorkspaceTab('notes'); setSelectedSetId(null); }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${workspaceTab === 'notes' ? 'bg-cyan-500/20 text-cyan-100' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          Notizen & Materialien
        </button>
        <button
          onClick={() => setWorkspaceTab('flashcards')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${workspaceTab === 'flashcards' ? 'bg-cyan-500/20 text-cyan-100' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          Karteikarten ({sets.length})
        </button>
        <button
          onClick={() => { setWorkspaceTab('memory'); setSelectedSetId(null); }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${workspaceTab === 'memory' ? 'bg-violet-500/20 text-violet-100' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          <Brain size={15} /> KI-Memory ({memory.length})
        </button>
      </div>
      {workspaceTab === 'flashcards' && (
        selectedSetId ? (
          <StudySetView setId={selectedSetId} onBack={() => setSelectedSetId(null)} />
        ) : (
          <section className="mb-8 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Deine Karteikarten</h2>
                <p className="mt-1 text-xs text-gray-500">Wähle ein Set, um direkt im aktuellen Workspace zu lernen.</p>
              </div>
              <button onClick={() => onNavigate('create')} className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-400">Set erstellen</button>
            </div>
            {sets.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">Noch keine Karteikarten erstellt.</p>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sets.map((studySet) => (
                  <button key={studySet.id} onClick={() => setSelectedSetId(studySet.id)} className="rounded-xl border border-white/10 bg-black/10 p-4 text-left hover:border-cyan-400/40 hover:bg-cyan-500/5">
                    <p className="font-medium text-white">{studySet.title}</p>
                    <p className="mt-1 text-xs text-gray-400">{studySet.card_count} Karten · {studySet.subject}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        )
      )}
      {workspaceTab === 'flashcards' && selectedSetId ? null : workspaceTab === 'memory' ? (
        <section className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.05] p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2 text-violet-300"><Brain size={18} /><span className="text-xs font-semibold uppercase tracking-[0.18em]">KI-Memory</span></div>
              <h1 className="mt-2 text-2xl font-bold text-white">Gespeicherte Erkenntnisse</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-400">Automatisch gespeicherte Einträge bleiben privat in diesem Workspace. Du kannst jeden Eintrag bearbeiten oder löschen.</p>
            </div>
          </div>
          {memoryLoading && <p className="mt-5 text-sm text-gray-500">Memory wird geladen ...</p>}
          {!memoryLoading && memory.length === 0 && <p className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-gray-500">Noch keine Erkenntnisse. Starte eine Workspace-Analyse.</p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {memory.map((item) => (
              <article key={item.id} className="rounded-xl border border-white/10 bg-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><span className="text-[10px] font-semibold uppercase tracking-wide text-violet-300">{memoryLabel[item.memory_type]}</span><h2 className="mt-1 text-sm font-semibold text-white">{item.title}</h2></div>
                  <div className="flex gap-2"><button onClick={() => { setEditingMemory(item); setMemoryDraft(item.title); }} className="text-gray-500 hover:text-white" aria-label="Memory bearbeiten"><Pencil size={14} /></button><button onClick={() => void deleteMemory(item)} className="text-gray-500 hover:text-red-300" aria-label="Memory löschen"><Trash2 size={14} /></button></div>
                </div>
                <p className="mt-3 text-xs leading-5 text-gray-300">{typeof item.content.summary === 'string' ? item.content.summary : typeof item.content.details === 'string' ? item.content.details : typeof item.content.uncertainty === 'string' ? item.content.uncertainty : item.memory_type === 'task' || item.memory_type === 'exam' ? String(item.content.description || '') : item.title}</p>
                <p className="mt-3 text-[10px] text-gray-500">Quelle: {item.source} · {new Date(item.updated_at).toLocaleDateString('de-DE')}</p>
              </article>
            ))}
          </div>
          {editingMemory && <div className="mt-5 flex flex-col gap-2 rounded-xl border border-violet-400/20 bg-black/10 p-4 sm:flex-row"><input value={memoryDraft} onChange={(event) => setMemoryDraft(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /><button onClick={() => void saveMemoryEdit()} className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-white">Speichern</button><button onClick={() => setEditingMemory(null)} className="rounded-lg px-3 py-2 text-sm text-gray-400">Abbrechen</button></div>}
        </section>
      ) : (
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-cyan-400">
            <Sparkles size={17} />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">Slearn Workspace</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-white">Dein Lernraum für alles</h1>
          <p className="mt-3 text-lg font-medium text-cyan-200">Hey, {getGreetingName(profile, user)}</p>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Sammle Notizen, Dokumente und Aufgaben an einem Ort. Die KI hilft dir später beim Verstehen,
            Strukturieren und Üben.
          </p>
        </div>
        <button
          onClick={() => onNavigate('create')}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110"
        >
          <Sparkles size={17} /> Slearn-Set erstellen
        </button>
      </div>
      )}

      {workspaceTab === 'notes' && (
      <>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {[
          { id: 'assistant', icon: Bot, title: 'KI-Lernassistent', text: 'Fragen, Erklärungen und Hausaufgabenhilfe' },
          { id: 'create', icon: Layers3, title: 'Slearn-Set erstellen', text: 'Lernkarten aus einem Thema oder deinen Notizen generieren' },
        ].map(({ id, icon: Icon, title, text }) => (
          <button key={id} onClick={() => id === 'assistant' ? setActiveTool(id) : onNavigate('create')} className={`rounded-xl border p-4 text-left transition-all ${activeTool === id ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'}`}>
            <Icon size={20} className="text-cyan-300" />
            <p className="mt-3 text-sm font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">{text}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Notizen & Kontext</h2>
              <p className="mt-1 text-xs text-gray-500">Alles hier kann später als Lernkontext dienen.</p>
            </div>
            <FileText size={19} className="text-cyan-400" />
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Schreibe oder füge deine Mitschrift, Aufgabenstellung oder Fragen hier ein ..."
            className="mt-4 min-h-72 w-full resize-y rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-gray-200 outline-none transition-all placeholder:text-gray-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
            <span>{notes.length.toLocaleString()} Zeichen · privat in Slearn gespeichert</span>
            <div className="flex items-center gap-3">
              <button onClick={saveNotes} disabled={savingNotes} className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 disabled:opacity-50"><Save size={13} /> {savingNotes ? 'Speichert ...' : 'Speichern'}</button>
              <button onClick={() => setNotes('')} className="text-gray-400 hover:text-white">Notizen leeren</button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Materialien</h2>
              <p className="mt-1 text-xs text-gray-500">PDFs und Textdateien sammeln</p>
            </div>
            <Upload size={19} className="text-violet-400" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,text/markdown,text/csv,application/json,image/png,image/jpeg,image/webp"
            onChange={(event) => { void addFiles(event.target.files); event.target.value = ''; }}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              void addFiles(event.dataTransfer.files);
            }}
            className={`mt-4 flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center transition-all ${
              dragActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/15 bg-white/[0.02] hover:border-cyan-400/40 hover:bg-cyan-500/5'
            }`}
          >
            <Paperclip size={22} className="text-gray-400" />
            <span className="mt-2 text-sm font-medium text-gray-300">{uploading ? 'Wird sicher gespeichert ...' : 'Dateien auswählen'}</span>
            <span className="mt-1 text-xs text-gray-600">PDF, Foto oder Text · klicken oder ziehen · max. 10 MB</span>
          </button>
          {error && <p className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <div className="mt-4 space-y-2">
            {files.length === 0 && <p className="text-center text-xs text-gray-600">Noch keine Dateien hinzugefügt</p>}
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                <FileText size={16} className="text-cyan-300" />
                <span className="min-w-0 flex-1 truncate text-xs text-gray-300">{file.name}</span>
                <span className={`text-[10px] ${file.extraction_status === 'text_extracted' ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {file.extraction_status === 'text_extracted' ? 'Text extrahiert' : 'Nicht im KI-Kontext'}
                </span>
                <button onClick={() => void removeFile(file)} className="text-gray-600 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-violet-400/20 bg-violet-500/[0.05] p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="font-semibold text-white">{t(profile?.app_language, 'analyze')}</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">Die KI startet erst auf Knopfdruck und verwendet Notizen sowie den tatsächlich extrahierten Text. Nicht lesbare PDFs und Fotos werden sichtbar abgewiesen.</p>
          </div>
          <button onClick={() => void runWorkspaceAnalysis()} disabled={analyzing || (!notes.trim() && analyzableFiles.length === 0)} className="flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50">
            {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {analyzing ? t(profile?.app_language, 'analyzing') : t(profile?.app_language, 'analyze')}
          </button>
        </div>
        {!notes.trim() && files.length > 0 && analyzableFiles.length === 0 && <p className="mt-3 text-xs text-amber-200">Die Dateien sind da, aber noch ohne lesbaren Text. Lade ein PDF oder eine Textdatei mit extrahierbarem Inhalt hoch.</p>}
        {analysis && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm leading-6 text-gray-300">{analysis.context_summary}</p>
              {analysis.topics.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{analysis.topics.map((topic) => <span key={topic.name} className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">{topic.name}</span>)}</div>}
              {analysis.language_learning && <p className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-200">Sprachlernen erkannt: {analysis.language_learning.target_language}{analysis.language_learning.source_language ? ` ← ${analysis.language_learning.source_language}` : ''} · {analysis.language_learning.vocabulary.length} Vokabeln</p>}
            </div>
            {analysis.tasks.length > 0 && <div>
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-white">Erkannte Aufgaben zur Bestätigung</h3><button onClick={() => void confirmTasks()} disabled={confirmingTasks} className="flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"><Check size={14} /> {confirmingTasks ? 'Speichert ...' : 'Fristen bestätigen'}</button></div>
              <div className="mt-2 space-y-2">{analysis.tasks.map((task, index) => <div key={`${task.title}-${index}`} className="rounded-lg border border-white/10 bg-black/10 p-3"><p className="text-sm font-medium text-white">{task.title}</p><p className="mt-1 text-xs text-gray-400">{task.task_type === 'exam' ? 'Prüfung' : 'Aufgabe'} · {task.subject} · {task.due_date ? `Frist ${task.due_date}` : 'Frist offen'} · Sicherheit {Math.round(task.confidence * 100)}%</p></div>)}</div>
            </div>}
            {analysis.open_questions.length > 0 && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                  <AlertTriangle size={15} /> {t(profile?.app_language, 'questions')}
                </p>
                <div className="mt-3 grid gap-3">
                  {analysis.open_questions.map((item) => {
                    const thread = messages.filter((message) => message.questionId === item.id);
                    const answer = questionAnswers[item.id] || '';
                    const loading = questionLoading[item.id];
                    const isSaved = savedQuestionAnswers[item.id];
                    const hasAssistantMessage = thread.some((message) => message.role === 'assistant');

                    return (
                      <article key={item.id} className="rounded-xl border border-white/10 bg-black/10 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-amber-50">{item.question}</p>
                          {isSaved && (
                            <span className="shrink-0 rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-200">
                              Als Fakt gespeichert
                            </span>
                          )}
                          {!isSaved && hasAssistantMessage && (
                            <span className="shrink-0 rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-200">
                              Nur Chat-Kontext
                            </span>
                          )}
                        </div>

                        {thread.length > 0 && (
                          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-lg bg-black/20 p-2">
                            {thread.map((message) => (
                              <div
                                key={message.id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <p
                                  className={`max-w-[90%] rounded-lg px-2.5 py-2 text-xs ${
                                    message.role === 'user'
                                      ? 'bg-cyan-500/20 text-cyan-100'
                                      : 'bg-white/[0.05] text-gray-300'
                                  }`}
                                >
                                  {message.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 grid gap-2">
                          {item.suggestions.slice(0, 3).map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => void answerOpenQuestion(item.id, suggestion)}
                              disabled={loading}
                              className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-left text-xs text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>

                        <div className="mt-2 flex gap-2">
                          <input
                            value={answer}
                            onChange={(event) =>
                              setQuestionAnswers((current) => ({ ...current, [item.id]: event.target.value }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && answer.trim()) {
                                void answerOpenQuestion(item.id, answer.trim());
                              }
                            }}
                            placeholder={t(profile?.app_language, 'answer')}
                            disabled={loading}
                            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white placeholder:text-gray-600"
                          />
                          <button
                            onClick={() => void answerOpenQuestion(item.id, answer.trim() || null)}
                            disabled={loading}
                            className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {loading ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : answer.trim() ? (
                              <Send size={14} />
                            ) : (
                              t(profile?.app_language, 'later')
                            )}
                          </button>
                        </div>

                        {hasAssistantMessage && !isSaved && (
                          <button
                            onClick={() => void persistConfirmedAnswer(item.id)}
                            disabled={loading}
                            className="mt-2 rounded-lg border border-emerald-400/30 px-3 py-1.5 text-left text-xs font-semibold text-emerald-200 hover:bg-emerald-400/10 disabled:opacity-50"
                          >
                            Best�tigen und als Fakt speichern
                          </button>
                        )}

                        {questionErrors[item.id] && (
                          <p className="mt-2 rounded-lg border border-red-400/20 bg-red-500/10 px-2.5 py-2 text-xs text-red-300">
                            {questionErrors[item.id]}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-cyan-500/[0.07] to-blue-500/[0.03] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15">
            <Bot size={21} className="text-cyan-300" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Slearn Lernassistent</h2>
            <p className="text-xs text-gray-400">Frage nach Erklärungen, Zusammenfassungen oder einem Lernplan.</p>
          </div>
        </div>
        <div className="mt-4 max-h-56 space-y-3 overflow-y-auto pr-1">
          {chatLoading && <p className="text-sm text-gray-500">Chatverlauf wird geladen ...</p>}
          {messages.map((message, index) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <p className={`max-w-2xl rounded-xl px-3 py-2 text-sm ${
                message.role === 'user' ? 'bg-cyan-500/20 text-cyan-100' : 'bg-white/[0.05] text-gray-300'
              }`}>{message.text}</p>
            </div>
          ))}
        </div>
        {chatError && <p className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{chatError}</p>}
        <div className="mt-4 flex gap-2">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void askAssistant(); }}
            placeholder="z. B. Erkläre mir dieses Thema einfach ..."
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-cyan-400/50"
          />
          <button onClick={() => void askAssistant()} disabled={asking} className="rounded-xl bg-cyan-500 px-4 text-white transition-all hover:bg-cyan-400 disabled:opacity-50" aria-label="Frage senden">
            <Send size={17} />
          </button>
        </div>
        <div className="mt-3 flex justify-end"><button onClick={() => void startNewChat()} className="text-xs text-gray-500 hover:text-white">Neuer Chat</button></div>
      </section>

      <LearningPlanner hasAnalyzedMaterial={Boolean(analysis)} />
      </>
      )}
    </div>
  );
}
