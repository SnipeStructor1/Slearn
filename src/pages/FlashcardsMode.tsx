import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Check, Flame, Minus, MessageSquare, Keyboard } from 'lucide-react';
import type { Flashcard } from '@/lib/supabase';
import { updateSrsState } from '@/lib/srs';
import type { Difficulty } from '@/lib/types';

type Props = {
  cards: Flashcard[];
  onCardRated: (cardId: string, updates: Partial<Flashcard>) => void;
  onAskTutor: (card: { front: string; back: string }) => void;
};

export function FlashcardsMode({ cards, onCardRated, onAskTutor }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  const card = cards[index];

  const handleFlip = useCallback(() => setFlipped((f) => !f), []);

  const handleNext = useCallback(() => {
    if (index < cards.length - 1) {
      setIndex(index + 1);
      setFlipped(false);
    } else {
      setSessionDone(true);
    }
  }, [index, cards.length]);

  const handlePrev = useCallback(() => {
    if (index > 0) {
      setIndex(index - 1);
      setFlipped(false);
    }
  }, [index]);

  const handleRate = (difficulty: Difficulty) => {
    if (!card) return;
    const updated = updateSrsState(
      { ease_factor: card.ease_factor, interval_days: card.interval_days, repetitions: card.repetitions },
      difficulty
    );
    onCardRated(card.id, {
      ...updated,
      last_reviewed_at: new Date().toISOString(),
    });
    setCompleted((c) => c + 1);
    handleNext();
  };

  const handleRestart = () => {
    setIndex(0);
    setFlipped(false);
    setCompleted(0);
    setSessionDone(false);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (sessionDone) return;
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          handleFlip();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (flipped) handleRate('easy');
          else handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case '1':
          if (flipped) handleRate('hard');
          break;
        case '2':
          if (flipped) handleRate('medium');
          break;
        case '3':
          if (flipped) handleRate('easy');
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (cards.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-12 text-center">
        <p className="text-gray-400">No flashcards in this set yet.</p>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div className="mt-8 text-center">
        <div className="mx-auto inline-flex rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 p-4 shadow-lg shadow-emerald-500/20">
          <Check size={40} className="text-white" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-white">Session Complete!</h2>
        <p className="mt-2 text-gray-400">You reviewed {cards.length} cards</p>
        <button
          onClick={handleRestart}
          className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 mx-auto"
        >
          <RotateCcw size={18} /> Study Again
        </button>
      </div>
    );
  }

  const progress = ((index + 1) / cards.length) * 100;

  return (
    <div className="mt-6">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Card {index + 1} of {cards.length}</span>
          <span className="flex items-center gap-1 text-gray-400">
            <Flame size={14} className="text-orange-400" />
            {completed} reviewed
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="perspective mx-auto max-w-2xl">
        <div
          onClick={handleFlip}
          className={`preserve-3d relative h-80 cursor-pointer transition-transform duration-500 ${
            flipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front */}
          <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-8 shadow-2xl">
            <span className="absolute top-4 left-4 text-xs font-medium text-cyan-400">Question</span>
            <p className="text-center text-2xl font-semibold text-white">{card.front}</p>
            <span className="absolute bottom-4 text-xs text-gray-500">Click to flip</span>
          </div>
          {/* Back */}
          <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-8 shadow-2xl">
            <span className="absolute top-4 left-4 text-xs font-medium text-emerald-400">Answer</span>
            <p className="text-center text-lg text-gray-100 leading-relaxed">{card.back}</p>
            <button
              onClick={(e) => { e.stopPropagation(); onAskTutor({ front: card.front, back: card.back }); }}
              className="absolute bottom-4 flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300 hover:bg-violet-500/20 transition-all"
            >
              <MessageSquare size={12} /> Ask Tutor
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={index === 0}
          className="rounded-xl border border-white/10 bg-white/5 p-3 text-gray-300 hover:bg-white/10 transition-all disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Rating buttons (show when flipped) */}
        {flipped ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRate('hard')}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/20 transition-all"
            >
              <Minus size={16} /> Hard
            </button>
            <button
              onClick={() => handleRate('medium')}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20 transition-all"
            >
              <Flame size={16} /> Medium
            </button>
            <button
              onClick={() => handleRate('easy')}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 transition-all"
            >
              <Check size={16} /> Easy
            </button>
          </div>
        ) : (
          <button
            onClick={handleFlip}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110"
          >
            Flip Card
          </button>
        )}

        <button
          onClick={handleNext}
          disabled={index === cards.length - 1}
          className="rounded-xl border border-white/10 bg-white/5 p-3 text-gray-300 hover:bg-white/10 transition-all disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1"><Keyboard size={12} /> Space: flip</span>
        <span>← →: navigate</span>
        <span>1/2/3: rate</span>
      </div>
    </div>
  );
}
