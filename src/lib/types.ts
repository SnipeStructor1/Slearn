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
  | 'analyze_workspace'
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
  scheduled_date?: string;
  task_ids?: string[];
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

export type WorkspaceAnalysis = {
  context_summary: string;
  topics: { name: string; details: string; source_names: string[] }[];
  tasks: {
    title: string;
    description: string;
    subject: string;
    task_type: 'assignment' | 'exam';
    due_date: string | null;
    estimated_hours: number | null;
    confidence: number;
  }[];
  uncertainties: string[];
  open_questions: {
    id: string;
    question: string;
    suggestions: string[];
  }[];
  language_learning?: {
    topic_type: 'language_learning';
    target_language: string;
    source_language: string | null;
    vocabulary: { term: string; translation: string; notes?: string }[];
    grammar: string[];
    goals: string[];
  } | null;
};

export type TutorResponse = {
  reply: string;
  suggestions?: string[];
};

export type AIContext = {
  app_language?: 'de' | 'en';
  learning_language?: string;
  notes?: string;
  files?: { name: string; content?: string }[];
  flashcards?: { front: string; back: string }[];
  conversation?: { role: 'user' | 'assistant'; content: string }[];
  tasks?: {
    id: string;
    title: string;
    description: string;
    subject: string;
    task_type: 'assignment' | 'exam';
    due_date: string;
    estimated_hours: number | null;
  }[];
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
