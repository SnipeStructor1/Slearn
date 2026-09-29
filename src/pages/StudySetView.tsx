import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Layers, HelpCircle, MessageSquare, Lock, Save, Check, Trash2, Palette, Plus, X, Loader2 } from 'lucide-react';
import { supabase, type StudySet, type Flashcard } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { getTheme, getIcon } from '@/lib/themes';
import { FlashcardsMode } from './FlashcardsMode';
import { QuizMode } from './QuizMode';
import { AiTutor } from '@/components/AiTutor';
import { CustomizePanel } from '@/components/CustomizePanel';

type Props = {
  setId: string;
  onBack: () => void;
};

type Mode = 'overview' | 'flashcards' | 'quiz';

export function StudySetView({ setId, onBack }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [set, setSet] = useState<StudySet | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('overview');
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorContext, setTutorContext] = useState<{ front: string; back: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [addingCard, setAddingCard] = useState(false);
  const [addCardError, setAddCardError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: setData }, { data: cardData }, { data: savedData }] = await Promise.all([
        supabase.from('study_sets').select('*').eq('id', setId).maybeSingle(),
        supabase.from('flashcards').select('*').eq('set_id', setId).order('created_at', { ascending: true }),
        user ? supabase.from('saved_sets').select('id').eq('set_id', setId).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null as { id: string } | null }),
      ]);

      if (setData) {
        setSet(setData as StudySet);
        setIsOwner(setData.user_id === user?.id);
      }
      setCards((cardData as Flashcard[]) || []);
      setIsSaved(!!(savedData as unknown as { data: unknown })?.data);
      setLoading(false);
    })();
  }, [setId, user]);

  const handleSave = async () => {
    if (!user || !set) return;
    if (isSaved) {
      await supabase.from('saved_sets').delete().eq('set_id', set.id).eq('user_id', user.id);
      setIsSaved(false);
    } else {
      await supabase.from('saved_sets').insert({ set_id: set.id, user_id: user.id });
      setIsSaved(true);
    }
  };

  const handleDelete = async () => {
    if (!set || !isOwner) return;
    await supabase.from('study_sets').delete().eq('id', set.id);
    onBack();
  };

  const handleCustomize = async (color: string, icon: string) => {
    if (!set || !isOwner) return;
    setSet({ ...set, color_theme: color, icon_name: icon });
    await supabase.from('study_sets').update({ color_theme: color, icon_name: icon }).eq('id', set.id);
  };

  const handleCardRated = async (cardId: string, updates: Partial<Flashcard>) => {
    await supabase.from('flashcards').update(updates).eq('id', cardId);
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...updates } : c)));

    if (user && profile) {
      const today = new Date().toISOString().split('T')[0];
      const lastDate = profile.last_studied_date;
      let newStreak = profile.study_streak;

      if (lastDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (lastDate === yesterday) {
          newStreak = profile.study_streak + 1;
        } else {
          newStreak = 1;
        }
        await supabase
          .from('profiles')
          .update({ study_streak: newStreak, last_studied_date: today, total_cards_learned: profile.total_cards_learned + 1 })
          .eq('id', user.id);
        refreshProfile();
      } else {
        await supabase
          .from('profiles')
          .update({ total_cards_learned: profile.total_cards_learned + 1 })
          .eq('id', user.id);
        refreshProfile();
      }
    }
  };

  const handleAddCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const front = newCardFront.trim();
    const back = newCardBack.trim();
    if (!set || !user || !isOwner || !front || !back) return;

    setAddingCard(true);
    setAddCardError(null);
    try {
      const { data: newCard, error: insertError } = await supabase
        .from('flashcards')
        .insert({ set_id: set.id, front, back })
        .select()
        .single();

      if (insertError || !newCard) {
        setAddCardError(`Card could not be added: ${insertError?.message || 'No card was returned.'}`);
        return;
      }

      const updatedCount = cards.length + 1;
      setCards((previous) => [...previous, newCard as Flashcard]);
      setSet((previous) => previous ? { ...previous, card_count: updatedCount } : previous);
      setAddCardOpen(false);
      setNewCardFront('');
      setNewCardBack('');

      const { error: countError } = await supabase
        .from('study_sets')
        .update({ card_count: updatedCount })
        .eq('id', set.id)
        .eq('user_id', user.id);
      if (countError) {
        setAddCardError(`Card was added, but the set's card count could not be updated: ${countError.message}`);
      }
    } catch (error) {
      setAddCardError(`Card could not be added: ${error instanceof Error ? error.message : 'Unexpected error.'}`);
    } finally {
      setAddingCard(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-shimmer rounded-lg" />
        <div className="mt-6 h-64 animate-shimmer rounded-2xl" />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-gray-400">Study set not found.</p>
        <button onClick={onBack} className="mt-4 text-cyan-400 hover:text-cyan-300">Go back</button>
      </div>
    );
  }

  const theme = getTheme(set.color_theme);
  const SetIcon = getIcon(set.icon_name);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header with theme */}
      <div className={`mt-4 overflow-hidden rounded-2xl border ${theme.badgeBorder} bg-gradient-to-br ${theme.badgeBg} p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-1 items-start gap-4">
            <div className={`flex flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.gradient} p-3 shadow-lg ${theme.glow}`}>
              <SetIcon size={28} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-lg border ${theme.badgeBorder} ${theme.badgeBg} ${theme.badgeText} px-2.5 py-1 text-xs font-medium`}>
                  {set.subject}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Lock size={12} /> Private
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold text-white">{set.title}</h1>
              <p className="mt-1 text-sm text-gray-400">{set.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwner ? (
              <>
                <button
                  onClick={() => setCustomizeOpen(true)}
                  className={`flex items-center gap-1.5 rounded-lg border ${theme.badgeBorder} bg-white/5 px-3 py-2 text-sm ${theme.accent} hover:bg-white/10 transition-all`}
                  title="Customize appearance"
                >
                  <Palette size={15} /> Customize
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                  title="Delete set"
                >
                  <Trash2 size={15} />
                </button>
              </>
            ) : (
              user && (
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all ${
                    isSaved
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {isSaved ? <Check size={15} /> : <Save size={15} />}
                  {isSaved ? 'Saved' : 'Save'}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {set.summary && Array.isArray(set.summary) && set.summary.length > 0 && (
        <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <h3 className="text-sm font-semibold text-white">Summary</h3>
          <ul className="mt-3 space-y-2">
            {(set.summary as string[]).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${theme.solidBg}`} />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode !== 'overview' && (
        <div className="mt-6 flex items-center gap-2">
          <button
            onClick={() => setMode('overview')}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={15} /> Overview
          </button>
        </div>
      )}

      {mode === 'overview' && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => setMode('flashcards')}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-left transition-all hover:border-cyan-400/20 hover:bg-cyan-500/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 p-2.5 shadow-lg shadow-cyan-500/20">
                  <Layers size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Flashcards</h3>
                  <p className="text-sm text-gray-400">Flip cards with SRS spaced repetition</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">{cards.length} cards available</p>
            </button>

            <button
              onClick={() => setMode('quiz')}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-left transition-all hover:border-emerald-400/20 hover:bg-emerald-500/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 p-2.5 shadow-lg shadow-emerald-500/20">
                  <HelpCircle size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Quiz</h3>
                  <p className="text-sm text-gray-400">Multiple choice & fill-in-the-blank</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">Auto-generated from this set</p>
            </button>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">{cards.length} Flashcards</h3>
            <div className="flex items-center gap-2">
              {isOwner && (
                <button
                  onClick={() => { setAddCardError(null); setAddCardOpen(true); }}
                  className="flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20 transition-all"
                >
                  <Plus size={15} /> Add card
                </button>
              )}
              <button
                onClick={() => setTutorOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-300 hover:bg-violet-500/20 transition-all"
              >
                <MessageSquare size={15} /> Ask AI Tutor
              </button>
            </div>
          </div>

          {addCardError && !addCardOpen && (
            <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {addCardError}
            </p>
          )}

          <div className="mt-3 space-y-2">
            {cards.slice(0, 5).map((card, i) => (
              <div
                key={card.id}
                onClick={() => { setTutorContext({ front: card.front, back: card.back }); setTutorOpen(true); }}
                className="cursor-pointer rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-white truncate">{card.front}</span>
                  <span className="flex-1 text-sm text-gray-400 truncate">{card.back}</span>
                </div>
              </div>
            ))}
            {cards.length > 5 && (
              <p className="py-1 text-center text-xs text-gray-500">
                + {cards.length - 5} more cards
              </p>
            )}
          </div>
        </>
      )}

      {mode === 'flashcards' && (
        <FlashcardsMode
          cards={cards}
          onCardRated={handleCardRated}
          onAskTutor={(card) => { setTutorContext(card); setTutorOpen(true); }}
        />
      )}

      {mode === 'quiz' && (
        <QuizMode
          cards={cards}
          onAskTutor={(card) => { setTutorContext(card); setTutorOpen(true); }}
        />
      )}

      <button
        onClick={() => setTutorOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:brightness-110 hover:shadow-violet-500/40"
      >
        <MessageSquare size={18} />
        AI Tutor
      </button>

      <AiTutor
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        cardContext={tutorContext}
      />

      {isOwner && (
        <CustomizePanel
          open={customizeOpen}
          onClose={() => setCustomizeOpen(false)}
          currentColor={set.color_theme}
          currentIcon={set.icon_name}
          onApply={handleCustomize}
        />
      )}

      {isOwner && addCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation">
          <form
            onSubmit={(event) => void handleAddCard(event)}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-card-title"
          >
            <div className="flex items-center justify-between">
              <h2 id="add-card-title" className="text-lg font-semibold text-white">Add a flashcard</h2>
              <button type="button" onClick={() => setAddCardOpen(false)} aria-label="Close" className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <label className="mt-5 block text-sm font-medium text-gray-300" htmlFor="new-card-front">Front / question</label>
            <textarea
              id="new-card-front"
              value={newCardFront}
              onChange={(event) => setNewCardFront(event.target.value)}
              rows={2}
              required
              maxLength={2000}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50"
            />
            <label className="mt-4 block text-sm font-medium text-gray-300" htmlFor="new-card-back">Back / answer</label>
            <textarea
              id="new-card-back"
              value={newCardBack}
              onChange={(event) => setNewCardBack(event.target.value)}
              rows={2}
              required
              maxLength={2000}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50"
            />
            {addCardError && <p role="alert" className="mt-3 text-sm text-red-300">{addCardError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddCardOpen(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingCard || !newCardFront.trim() || !newCardBack.trim()}
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {addingCard && <Loader2 size={15} className="animate-spin" />}
                Add card
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
