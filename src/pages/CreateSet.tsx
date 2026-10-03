import { useRef, useState } from 'react';
import { Sparkles, FileText, ImageIcon, Loader2, ArrowLeft, ArrowRight, Check, RefreshCw, Palette } from 'lucide-react';
import { generateFlashcards } from '@/lib/ai-client';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { subjects } from '@/lib/mock-data';
import { colorThemes, iconOptions, getTheme, getIcon, subjectDefaults } from '@/lib/themes';
import type { GeneratedSet } from '@/lib/types';
import { extractFileText } from '@/lib/file-extraction';

type Props = {
  onCreated: (setId: string) => void;
};

type Step = 'input' | 'preview';

export function CreateSet({ onCreated }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('input');
  const [inputMode, setInputMode] = useState<'topic' | 'text' | 'image'>('topic');
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('General');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedSet | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colorTheme, setColorTheme] = useState('cyan');
  const [iconName, setIconName] = useState('BookOpen');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceContent, setSourceContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubjectChange = (newSubject: string) => {
    setSubject(newSubject);
    const defaults = subjectDefaults[newSubject];
    if (defaults) {
      setColorTheme(defaults.color);
      setIconName(defaults.icon);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      let input = '';
      let sourceType: 'topic' | 'text' = 'topic';

      if (inputMode === 'topic') {
        input = topic.trim();
        sourceType = 'topic';
      } else if (inputMode === 'text') {
        input = text.trim();
        sourceType = 'text';
      } else {
        if (sourceFile) {
          const extraction = await extractFileText(sourceFile);
          if (extraction.status !== 'text_extracted') {
            setError(extraction.error);
            setLoading(false);
            return;
          }
          input = extraction.text;
        } else {
          input = text.trim() || topic.trim();
        }
        sourceType = 'text';
      }

      if (!input) {
        setError('Bitte gib ein Thema ein oder füge Text ein');
        setLoading(false);
        return;
      }

      setSourceContent(input);
      const result = await generateFlashcards(input, undefined, 20);
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }
      const generatedSet = result.data;
      if (subject !== 'General') {
        generatedSet.subject = subject;
      }
      // Apply subject-based defaults for color/icon
      const defaults = subjectDefaults[generatedSet.subject] || subjectDefaults['General'];
      setColorTheme(defaults.color);
      setIconName(defaults.icon);

      setGenerated(generatedSet);
      setStep('preview');
    } catch {
      setError('Das Lernset konnte nicht erstellt werden. Bitte versuche es erneut.');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !generated) return;
    setSaving(true);
    setError(null);

    try {
      const { data: setData, error: setError2 } = await supabase
        .from('study_sets')
        .insert({
          user_id: user.id,
          title: generated.title,
          description: generated.description,
          subject: generated.subject,
          visibility: 'private',
          summary: generated.summary,
          source_type: inputMode === 'topic' ? 'topic' : 'text',
          source_content: sourceContent,
          card_count: generated.cards.length,
          color_theme: colorTheme,
          icon_name: iconName,
        })
        .select()
        .single();

      if (setError2 || !setData) {
        setError('Das Lernset konnte nicht gespeichert werden');
        setSaving(false);
        return;
      }

      const cards = generated.cards.map((c) => ({
        set_id: setData.id,
        front: c.front,
        back: c.back,
      }));

      const { error: cardError } = await supabase.from('flashcards').insert(cards);
      if (cardError) {
        setError('Die Karteikarten konnten nicht gespeichert werden');
        setSaving(false);
        return;
      }

      onCreated(setData.id);
    } catch {
      setError('Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    }
    setSaving(false);
  };

  const handleRegenerate = () => {
    setGenerated(null);
    setStep('input');
  };

  const theme = getTheme(colorTheme);
  const PreviewIcon = getIcon(iconName);

  if (step === 'preview' && generated) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={handleRegenerate}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft size={16} /> Zurück zur Bearbeitung
        </button>

        <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-start gap-4">
            <div className={`flex flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.gradient} p-3 shadow-lg ${theme.glow}`}>
              <PreviewIcon size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className={theme.accent} />
                <span className={`text-sm font-medium ${theme.accent}`}>KI-Vorschau</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold text-white">{generated.title}</h1>
              <p className="mt-1 text-sm text-gray-400">{generated.description}</p>
            </div>
          </div>
        </div>

        {/* Customization section */}
        <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <Palette size={16} className={theme.accent} />
            <h3 className="text-sm font-semibold text-white">Darstellung anpassen</h3>
          </div>

          {/* Color picker */}
          <div className="mt-4">
            <p className="mb-2 text-xs text-gray-400">Color</p>
            <div className="flex flex-wrap gap-2">
              {colorThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setColorTheme(t.id)}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${t.gradient} transition-all hover:scale-110 ${
                    colorTheme === t.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f]' : ''
                  }`}
                  title={t.label}
                >
                  {colorTheme === t.id && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div className="mt-4">
            <p className="mb-2 text-xs text-gray-400">Icon</p>
            <div className="grid grid-cols-8 gap-2 sm:grid-cols-12">
              {iconOptions.map(({ name, Icon }) => (
                <button
                  key={name}
                  onClick={() => setIconName(name)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all hover:scale-110 ${
                    iconName === name
                      ? `border-white/30 bg-gradient-to-br ${theme.gradient}`
                      : 'border-white/5 bg-white/[0.03]'
                  }`}
                  title={name}
                >
                  <Icon size={16} className={iconName === name ? 'text-white' : 'text-gray-400'} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        {generated.summary.length > 0 && (
          <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <h3 className="text-sm font-semibold text-white">Summary</h3>
            <ul className="mt-3 space-y-2">
              {generated.summary.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                  <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${theme.solidBg}`} />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Flashcards */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              {generated.cards.length} Flashcards
            </h3>
            <span className="text-xs text-gray-500">Klicke zum Umdrehen</span>
          </div>

          <div className="mt-4 space-y-3">
            {generated.cards.map((card, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className={`text-xs font-medium ${theme.accent}`}>Front</div>
                    <p className="mt-1 text-sm font-medium text-white">{card.front}</p>
                  </div>
                  <div className="flex-1 border-l border-white/5 pl-4">
                    <div className="text-xs font-medium text-emerald-400">Back</div>
                    <p className="mt-1 text-sm text-gray-300">{card.back}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
          >
            <RefreshCw size={16} /> Regenerate
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Speichert ...' : 'Lernset speichern'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <Sparkles size={20} className="text-cyan-400" />
        <h1 className="text-2xl font-bold text-white">Create AI Study Set</h1>
      </div>
      <p className="mt-1 text-sm text-gray-400">
        Enter a topic or paste your notes — AI does the rest
      </p>

      <div className="mt-6 flex gap-2">
        {[
          { key: 'topic' as const, label: 'Topic', icon: FileText },
          { key: 'text' as const, label: 'Paste Text', icon: FileText },
          { key: 'image' as const, label: 'Image / PDF', icon: ImageIcon },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setInputMode(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              inputMode === key
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {inputMode === 'topic' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              What do you want to study?
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerate()}
              placeholder="e.g. French Unit 3 Vocab, Human Digestive System, World War II..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {['French Unit 3 Vocab', 'Human Digestive System', 'Biology Human Organs', 'Periodic Table Basics'].map((sugg) => (
                <button
                  key={sugg}
                  onClick={() => setTopic(sugg)}
                  className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                >
                  {sugg}
                </button>
              ))}
            </div>
          </div>
        )}

        {inputMode === 'text' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Paste your notes, textbook excerpt, or any text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Paste your study material here. The AI will extract key concepts and create flashcards automatically..."
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
            />
            <p className="mt-1 text-xs text-gray-500">
              {text.trim().split(/\s+/).filter(Boolean).length} words detected
            </p>
          </div>
        )}

        {inputMode === 'image' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Upload an image or PDF of your study material
            </label>
            <div className="rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
              <ImageIcon size={40} className="mx-auto text-gray-600" />
              <p className="mt-3 text-sm text-gray-400">Drag & drop or click to upload</p>
              <p className="text-xs text-gray-500">PDF (auch gescannt) und Fotos — Text wird per OCR ausgelesen und an die KI übergeben</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setSourceFile(file);
                  if (file) setText('');
                  event.target.value = '';
                }}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/20"
              >
                {sourceFile ? `Ausgewählt: ${sourceFile.name}` : 'PDF oder Foto auswählen'}
              </button>
              <p className="mt-2 text-xs text-gray-500">OCR läuft direkt im Browser — der Text wird automatisch erkannt.</p>
              <div className="mt-4">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  placeholder="Or paste the text content from your image here..."
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-400/50"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-gray-300">Subject (optional)</label>
          <select
            value={subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all focus:border-cyan-400/50"
          >
            {subjects.map((s) => (
              <option key={s} value={s} className="bg-[#12121a]">{s}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || (inputMode === 'topic' ? !topic.trim() : inputMode === 'image' ? (!text.trim() && !sourceFile) : !text.trim())}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 disabled:opacity-40"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating flashcards...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate Study Set
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
