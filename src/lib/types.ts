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

export type AIAction =
  | 'generate_flashcards'
  | 'generate_quiz'
  | 'generate_study_plan'
  | 'generate_summary'
  | 'tutor_chat'
  | 'homework_help';

export type QuizQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

export type GeneratedQuiz = {
  title: string;
  questions: QuizQuestion[];
};

export type StudyPlanUnit = {
  title: string;
  description: string;
  topics: string[];
  estimated_hours: number;
};

export type GeneratedStudyPlan = {
  title: string;
  goal: string;
  units: StudyPlanUnit[];
};

export type GeneratedSummary = {
  summary: string[];
  key_points: string[];
};

export type TutorResponse = {
  reply: string;
  suggestions?: string[];
};

export type AIContext = {
  notes?: string;
  files?: { name: string; content?: string }[];
  flashcards?: { front: string; back: string }[];
  conversation?: { role: 'user' | 'assistant'; content: string }[];
};

export type AIOptions = {
  card_count?: number;
  question_count?: number;
  timeframe_weeks?: number;
  goal?: string;
};

export type AIResult<T> =
  | { success: true; data: T; tokens_used: number }
  | { success: false; error: string };
