import type { Difficulty } from './types';

// SM-2 spaced repetition algorithm
export function updateSrsState(
  current: {
    ease_factor: number;
    interval_days: number;
    repetitions: number;
  },
  difficulty: Difficulty
): {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
} {
  let { ease_factor, interval_days, repetitions } = current;

  if (difficulty === 'easy') {
    repetitions += 1;
  } else if (difficulty === 'medium') {
    repetitions += 1;
    ease_factor = Math.max(1.3, ease_factor - 0.15);
  } else {
    // Hard: reset repetitions, small ease penalty
    repetitions = 0;
    ease_factor = Math.max(1.3, ease_factor - 0.2);
  }

  if (repetitions === 0) {
    interval_days = 1;
  } else if (repetitions === 1) {
    interval_days = 3;
  } else {
    interval_days = Math.round(interval_days * ease_factor);
  }

  const next = new Date();
  next.setDate(next.getDate() + interval_days);

  return {
    ease_factor: Math.round(ease_factor * 100) / 100,
    interval_days,
    repetitions,
    next_review_date: next.toISOString().split('T')[0],
  };
}
