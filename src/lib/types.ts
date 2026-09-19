export type Difficulty = 'easy' | 'medium' | 'hard';

export type GeneratedCard = {
  front: string;
  back: string;
};

export type GeneratedSet = {
  title: string;
  description: string;
  subject: string;
  summary: string[];
  cards: GeneratedCard[];
};
