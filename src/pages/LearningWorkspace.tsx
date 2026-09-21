import { useEffect, useRef, useState } from 'react';
import {
  Bot, FileText, Image, Paperclip, Send, Sparkles, Upload, X, Layers3, Save,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getGreetingName } from '@/lib/auth-context';
import { supabase, type WorkspaceFile as StoredWorkspaceFile } from '@/lib/supabase';
import { LearningPlanner } from '@/components/LearningPlanner';
import { homeworkHelp, tutorChat } from '@/lib/ai-client';

type Props = {
  onNavigate: (page: 'create') => void;
};

export function LearningWorkspace({ onNavigate }: Props) {
  const { user, profile } = useAuth();
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<StoredWorkspaceFile[]>([]);
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTool, setActiveTool] = useState('assistant');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [messages, setMessages] = useState<{ role: 'assistant' | 'user'; text: string }[]>([
    { role: 'assistant', text: 'Ich bin bereit. Lade Lernmaterial hoch oder stelle mir eine Frage zu deinen Notizen.' },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [noteResult, filesResult] = await Promise.all([
        supabase.from('workspace_notes').select('content').eq('user_id', user.id).maybeSingle(),
        supabase.from('workspace_files').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      if (noteResult.error || filesResult.error) {
        setError(noteResult.error?.message || filesResult.error?.message || 'Workspace konnte nicht geladen werden.');
        return;
      }
      setNotes(noteResult.data?.content || '');
      setFiles((filesResult.data as StoredWorkspaceFile[]) || []);
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
      files: files.map((file) => ({ name: file.name })),
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
              <p className="mt-1 text-xs text-gray-500">PDFs, Bilder und Dokumente sammeln</p>
            </div>
            <Upload size={19} className="text-violet-400" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
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
            <span className="mt-1 text-xs text-gray-600">PDF oder Bilder · klicken oder ziehen</span>
          </button>
          {error && <p className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <div className="mt-4 space-y-2">
            {files.length === 0 && <p className="text-center text-xs text-gray-600">Noch keine Dateien hinzugefügt</p>}
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                {file.mime_type.startsWith('image/') ? <Image size={16} className="text-violet-300" /> : <FileText size={16} className="text-cyan-300" />}
                <span className="min-w-0 flex-1 truncate text-xs text-gray-300">{file.name}</span>
                <button onClick={() => void removeFile(file)} className="text-gray-600 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

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
    </div>
  );
}
