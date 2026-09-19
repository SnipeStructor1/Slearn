import { useState, useMemo, useEffect } from 'react';
import { Check, X, RotateCcw, Trophy, MessageSquare, Loader2 } from 'lucide-react';
import type { Flashcard } from '@/lib/supabase';

type Props = {
  cards: Flashcard[];
  onAskTutor: (card: { front: string; back: string }) => void;
};

type QuestionType = 'multiple-choice' | 'fill-blank';

type Question = {
  type: QuestionType;
  card: Flashcard;
  prompt: string;
  options?: string[];
  correctAnswer: string;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuiz(cards: Flashcard[]): Question[] {
  if (cards.length < 2) return [];

  const questions: Question[] = [];
  const shuffledCards = shuffle(cards);

  shuffledCards.forEach((card, i) => {
    if (i % 2 === 0) {
      // Multiple choice: show front, pick the correct back
      const wrongOptions = shuffle(cards.filter((c) => c.id !== card.id))
        .slice(0, 3)
        .map((c) => c.back);
      const options = shuffle([card.back, ...wrongOptions]);
      questions.push({
        type: 'multiple-choice',
        card,
        prompt: card.front,
        options,
        correctAnswer: card.back,
      });
    } else {
      // Fill in the blank: show back with a key word blanked out, user types it
      const words = card.front.split(' ');
      if (words.length >= 2) {
        const blankIdx = Math.floor(words.length / 2);
        const blankedWord = words[blankIdx];
        const prompt = words.map((w, idx) => (idx === blankIdx ? '_____' : w)).join(' ');
        questions.push({
          type: 'fill-blank',
          card,
          prompt: `Fill in the blank: ${prompt}`,
          correctAnswer: blankedWord,
        });
      } else {
        // Fallback to multiple choice
        const wrongOptions = shuffle(cards.filter((c) => c.id !== card.id))
          .slice(0, 3)
          .map((c) => c.back);
        const options = shuffle([card.back, ...wrongOptions]);
        questions.push({
          type: 'multiple-choice',
          card,
          prompt: card.front,
          options,
          correctAnswer: card.back,
        });
      }
    }
  });

  return questions;
}

export function QuizMode({ cards, onAskTutor }: Props) {
  const questions = useMemo(() => generateQuiz(cards), [cards]);
  const [current, setCurrent] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setGenerating(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (generating) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-cyan-400" />
        <p className="mt-4 text-sm text-gray-400">Generating quiz questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-12 text-center">
        <p className="text-gray-400">Need at least 2 flashcards to generate a quiz.</p>
      </div>
    );
  }

  const question = questions[current];

  const handleAnswer = () => {
    if (question.type === 'multiple-choice') {
      if (!selectedAnswer) return;
      const isCorrect = selectedAnswer === question.correctAnswer;
      if (isCorrect) setScore(score + 1);
      setAnswered(true);
    } else {
      if (!textAnswer.trim()) return;
      const isCorrect = textAnswer.trim().toLowerCase() === question.correctAnswer.toLowerCase();
      if (isCorrect) setScore(score + 1);
      setAnswered(true);
    }
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setSelectedAnswer(null);
      setTextAnswer('');
      setAnswered(false);
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setSelectedAnswer(null);
    setTextAnswer('');
    setAnswered(false);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    const grade = percentage >= 90 ? 'Excellent!' : percentage >= 70 ? 'Good job!' : percentage >= 50 ? 'Keep practicing!' : 'Needs more study';

    return (
      <div className="mt-8 text-center">
        <div className="mx-auto inline-flex rounded-full bg-gradient-to-br from-amber-400 to-orange-600 p-4 shadow-lg shadow-orange-500/20">
          <Trophy size={40} className="text-white" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-white">{grade}</h2>
        <div className="mt-4 inline-flex items-center gap-6 rounded-2xl border border-white/5 bg-white/[0.02] px-8 py-4">
          <div>
            <div className="text-3xl font-bold text-white">{score}/{questions.length}</div>
            <div className="text-sm text-gray-400">Correct</div>
          </div>
          <div className="h-12 w-px bg-white/10" />
          <div>
            <div className="text-3xl font-bold text-cyan-400">{percentage}%</div>
            <div className="text-sm text-gray-400">Score</div>
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 mx-auto"
          >
            <RotateCcw size={18} /> Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div className="mt-6">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Question {current + 1} of {questions.length}</span>
          <span className="text-gray-400">Score: {score}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
              question.type === 'multiple-choice'
                ? 'bg-cyan-500/10 text-cyan-300'
                : 'bg-emerald-500/10 text-emerald-300'
            }`}>
              {question.type === 'multiple-choice' ? 'Multiple Choice' : 'Fill in the Blank'}
            </span>
          </div>
          <p className="text-xl font-semibold text-white">{question.prompt}</p>
        </div>

        {/* Answer area */}
        <div className="mt-4">
          {question.type === 'multiple-choice' && question.options && (
            <div className="space-y-2">
              {question.options.map((option, i) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === question.correctAnswer;
                let className = 'border-white/10 bg-white/[0.02] text-gray-200 hover:bg-white/[0.05]';

                if (answered) {
                  if (isCorrect) {
                    className = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
                  } else if (isSelected) {
                    className = 'border-red-500/40 bg-red-500/10 text-red-200';
                  } else {
                    className = 'border-white/5 bg-white/[0.01] text-gray-500';
                  }
                } else if (isSelected) {
                  className = 'border-cyan-400/40 bg-cyan-500/10 text-white';
                }

                return (
                  <button
                    key={i}
                    onClick={() => !answered && setSelectedAnswer(option)}
                    disabled={answered}
                    className={`flex w-full items-center justify-between rounded-xl border px-5 py-3.5 text-sm font-medium transition-all ${className}`}
                  >
                    <span>{option}</span>
                    {answered && isCorrect && <Check size={18} className="text-emerald-400" />}
                    {answered && isSelected && !isCorrect && <X size={18} className="text-red-400" />}
                  </button>
                );
              })}
            </div>
          )}

          {question.type === 'fill-blank' && (
            <div>
              <input
                type="text"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !answered && handleAnswer()}
                disabled={answered}
                placeholder="Type your answer..."
                className={`w-full rounded-xl border px-5 py-3.5 text-sm text-white placeholder-gray-500 outline-none transition-all ${
                  answered
                    ? textAnswer.trim().toLowerCase() === question.correctAnswer.toLowerCase()
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-red-500/40 bg-red-500/10'
                    : 'border-white/10 bg-white/5 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20'
                }`}
              />
              {answered && (
                <p className="mt-2 text-sm text-gray-400">
                  Correct answer: <span className="font-semibold text-white">{question.correctAnswer}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          {answered ? (
            <>
              <button
                onClick={() => onAskTutor({ front: question.card.front, back: question.card.back })}
                className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-300 hover:bg-violet-500/20 transition-all"
              >
                <MessageSquare size={15} /> Ask Tutor about this
              </button>
              <button
                onClick={handleNext}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110"
              >
                {current < questions.length - 1 ? 'Next Question' : 'See Results'}
              </button>
            </>
          ) : (
            <button
              onClick={handleAnswer}
              disabled={question.type === 'multiple-choice' ? !selectedAnswer : !textAnswer.trim()}
              className="ml-auto rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 disabled:opacity-40"
            >
              Submit Answer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
