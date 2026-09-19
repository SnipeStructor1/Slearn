import { useEffect, useRef, useState } from 'react';
import {
  Bot, FileText, Image, Paperclip, Plus, Send, Sparkles, Upload, X,
} from 'lucide-react';

type WorkspaceFile = {
  id: string;
  name: string;
  size: number;
  type: string;
};

type Props = {
  onNavigate: (page: 'create' | 'dashboard') => void;
};

export function LearningWorkspace({ onNavigate }: Props) {
  const [notes, setNotes] = useState(() => localStorage.getItem('slearn-workspace-notes') || '');
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ role: 'assistant' | 'user'; text: string }[]>([
    { role: 'assistant', text: 'Ich bin bereit. Lade Lernmaterial hoch oder stelle mir eine Frage zu deinen Notizen.' },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('slearn-workspace-notes', notes);
  }, [notes]);

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const next = Array.from(selected).map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setFiles((current) => [...current, ...next.filter((file) => !current.some((item) => item.id === file.id))]);
  };

  const askAssistant = () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { role: 'user', text: trimmed },
      {
        role: 'assistant',
        text: notes.trim()
          ? `Ich habe deine Frage für den Lernkontext erhalten. Die serverseitige Slearn-KI kann sie später anhand deiner Notizen beantworten: „${trimmed}“`
          : 'Lade zuerst Notizen oder Lernmaterial hoch, damit die Slearn-KI deine Frage mit Kontext beantworten kann.',
      },
    ]);
    setQuestion('');
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
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Sammle Notizen, Dokumente und Aufgaben an einem Ort. Die KI hilft dir später beim Verstehen,
            Strukturieren und Üben.
          </p>
        </div>
        <button
          onClick={() => onNavigate('create')}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110"
        >
          <Plus size={17} /> Lernmaterial verarbeiten
        </button>
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
            <span>{notes.length.toLocaleString()} Zeichen · automatisch lokal gespeichert</span>
            <button onClick={() => setNotes('')} className="text-gray-400 hover:text-white">Notizen leeren</button>
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
            accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
            onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 text-center transition-all hover:border-cyan-400/40 hover:bg-cyan-500/5"
          >
            <Paperclip size={22} className="text-gray-400" />
            <span className="mt-2 text-sm font-medium text-gray-300">Dateien auswählen</span>
            <span className="mt-1 text-xs text-gray-600">PDF, DOCX, TXT oder Bilder</span>
          </button>
          <div className="mt-4 space-y-2">
            {files.length === 0 && <p className="text-center text-xs text-gray-600">Noch keine Dateien hinzugefügt</p>}
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                {file.type.startsWith('image/') ? <Image size={16} className="text-violet-300" /> : <FileText size={16} className="text-cyan-300" />}
                <span className="min-w-0 flex-1 truncate text-xs text-gray-300">{file.name}</span>
                <button onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))} className="text-gray-600 hover:text-white">
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
            onKeyDown={(event) => { if (event.key === 'Enter') askAssistant(); }}
            placeholder="z. B. Erkläre mir dieses Thema einfach ..."
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-cyan-400/50"
          />
          <button onClick={askAssistant} className="rounded-xl bg-cyan-500 px-4 text-white transition-all hover:bg-cyan-400" aria-label="Frage senden">
            <Send size={17} />
          </button>
        </div>
      </section>
    </div>
  );
}
