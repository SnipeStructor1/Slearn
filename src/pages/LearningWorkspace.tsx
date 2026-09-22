import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Bot, Check, FileText, Loader2, Paperclip, Send, Sparkles, Upload, X, Layers3, Save,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getGreetingName } from '@/lib/auth-context';
import { supabase, type StudySet, type WorkspaceFile as StoredWorkspaceFile } from '@/lib/supabase';
import { LearningPlanner } from '@/components/LearningPlanner';
import { analyzeWorkspace, homeworkHelp, tutorChat } from '@/lib/ai-client';
import type { WorkspaceAnalysis } from '@/lib/types';
import { extractFileText } from '@/lib/file-extraction';
import { StudySetView } from './StudySetView';

type Props = {
  onNavigate: (page: 'create') => void;
  initialTab?: 'notes' | 'flashcards';
  initialSetId?: string | null;
};

export function LearningWorkspace({ onNavigate, initialTab = 'notes', initialSetId = null }: Props) {
  const { user, profile } = useAuth();
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<StoredWorkspaceFile[]>([]);
  const [sets, setSets] = useState<StudySet[]>([]);
  const [workspaceTab, setWorkspaceTab] = useState<'notes' | 'flashcards'>(initialTab);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(initialSetId);
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTool, setActiveTool] = useState('assistant');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analysis, setAnalysis] = useState<WorkspaceAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirmingTasks, setConfirmingTasks] = useState(false);
  const [messages, setMessages] = useState<{ role: 'assistant' | 'user'; text: string }[]>([
    { role: 'assistant', text: 'Ich bin bereit. Lade Lernmaterial hoch oder stelle mir eine Frage zu deinen Notizen.' },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [noteResult, filesResult, analysisResult, setsResult] = await Promise.all([
        supabase.from('workspace_notes').select('content').eq('user_id', user.id).maybeSingle(),
        supabase.from('workspace_files').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('workspace_analysis').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('study_sets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      if (noteResult.error || filesResult.error || analysisResult.error || setsResult.error) {
        setError(noteResult.error?.message || filesResult.error?.message || analysisResult.error?.message || setsResult.error?.message || 'Workspace konnte nicht geladen werden.');
        return;
      }
      setNotes(noteResult.data?.content || '');
      setFiles((filesResult.data as StoredWorkspaceFile[]) || []);
      setSets((setsResult.data as StudySet[]) || []);
      if (analysisResult.data) {
        setAnalysis({
          context_summary: analysisResult.data.context_summary,
          topics: analysisResult.data.topics,
          tasks: analysisResult.data.pending_tasks,
          uncertainties: analysisResult.data.uncertainties,
        });
      }
    })();
  }, [user]);

  const saveNotes = async () => {
    if (!user) return;
    setSavingNotes(true);
    setError(null);
    const { error: saveError } = await supabase.from('workspace_notes').upsert({ user_id: user.id, content: notes, updated_at: new Date().toISOString() });
    if (saveError) setError(`Notizen konnten nicht gespeichert werden: ${saveError.message}`);
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
        setError(`Upload von ${file.name} fehlgeschlagen: ${error.message}`);
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
        setError(`Datei ${file.name} wurde gespeichert, aber nicht registriert: ${metadataError.message}`);
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
        notes: notes.trim() || undefined,
        files: files.filter((file) => file.extraction_status === 'text_extracted' && file.extracted_text.trim()).map((file) => ({
          name: file.name,
          content: file.extracted_text || undefined,
        })),
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
        updated_at: new Date().toISOString(),
      });
      if (saveError) setError(`Analyse erstellt, aber nicht gespeichert: ${saveError.message}`);
    }
    setAnalyzing(false);
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
    if (saveError) setError(`Bestätigte Aufgaben konnten nicht gespeichert werden: ${saveError.message}`);
    else {
      const remainingTasks = analysis.tasks.filter((task) => !tasksWithDates.includes(task));
      const { error: analysisUpdateError } = await supabase.from('workspace_analysis').update({
        pending_tasks: remainingTasks,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
      if (analysisUpdateError) setError(`Aufgaben gespeichert, Analyse konnte nicht aktualisiert werden: ${analysisUpdateError.message}`);
      setAnalysis((current) => current ? { ...current, tasks: remainingTasks } : current);
    }
    setConfirmingTasks(false);
  };

  const removeFile = async (file: StoredWorkspaceFile) => {
    setError(null);
    const { error: storageError } = await supabase.storage.from('workspace-files').remove([file.storage_path]);
    const { error: metadataError } = await supabase.from('workspace_files').delete().eq('id', file.id).eq('user_id', user?.id);
    if (storageError || metadataError) {
      setError(storageError?.message || metadataError?.message || 'Datei konnte nicht gelöscht werden.');
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
      { role: 'user', text: trimmed },
    ]);
    const context = {
      notes: notes.trim() || undefined,
      files: files.filter((file) => file.extraction_status === 'text_extracted' && file.extracted_text.trim()).map((file) => ({
        name: file.name,
        content: file.extracted_text,
      })),
    };
    const result = /hausaufgabe|homework|aufgabe/i.test(trimmed)
      ? await homeworkHelp(trimmed, context)
      : await tutorChat(trimmed, context);
    setMessages((current) => [...current, {
      role: 'assistant',
      text: result.success ? result.data.reply : result.error,
    }]);
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
      {workspaceTab === 'flashcards' && selectedSetId ? null : (
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
            <h2 className="font-semibold text-white">Workspace analysieren</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">Die KI startet erst auf Knopfdruck und verwendet Notizen sowie den tatsächlich extrahierten Text. Nicht lesbare PDFs und Fotos werden sichtbar abgewiesen.</p>
          </div>
          <button onClick={() => void runWorkspaceAnalysis()} disabled={analyzing || (!notes.trim() && files.length === 0)} className="flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50">
            {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {analyzing ? 'Analysiert ...' : 'Alles analysieren'}
          </button>
        </div>
        {analysis && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm leading-6 text-gray-300">{analysis.context_summary}</p>
              {analysis.topics.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{analysis.topics.map((topic) => <span key={topic.name} className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">{topic.name}</span>)}</div>}
            </div>
            {analysis.tasks.length > 0 && <div>
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-white">Erkannte Aufgaben zur Bestätigung</h3><button onClick={() => void confirmTasks()} disabled={confirmingTasks} className="flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"><Check size={14} /> {confirmingTasks ? 'Speichert ...' : 'Fristen bestätigen'}</button></div>
              <div className="mt-2 space-y-2">{analysis.tasks.map((task, index) => <div key={`${task.title}-${index}`} className="rounded-lg border border-white/10 bg-black/10 p-3"><p className="text-sm font-medium text-white">{task.title}</p><p className="mt-1 text-xs text-gray-400">{task.task_type === 'exam' ? 'Prüfung' : 'Aufgabe'} · {task.subject} · {task.due_date ? `Frist ${task.due_date}` : 'Frist offen'} · Sicherheit {Math.round(task.confidence * 100)}%</p></div>)}</div>
            </div>}
            {analysis.uncertainties.length > 0 && <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3"><p className="flex items-center gap-2 text-xs font-semibold text-amber-200"><AlertTriangle size={15} /> Offene Rückfragen</p><ul className="mt-2 space-y-1 text-xs text-amber-100/80">{analysis.uncertainties.map((item) => <li key={item}>· {item}</li>)}</ul></div>}
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
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <p className={`max-w-2xl rounded-xl px-3 py-2 text-sm ${
                message.role === 'user' ? 'bg-cyan-500/20 text-cyan-100' : 'bg-white/[0.05] text-gray-300'
              }`}>{message.text}</p>
            </div>
          ))}
        </div>
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
      </section>

      <LearningPlanner />
      </>
      )}
    </div>
  );
}
