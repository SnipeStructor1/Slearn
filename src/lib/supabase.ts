import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type StudySet = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  subject: string;
  visibility: 'public' | 'private';
  summary: string[];
  source_type: string;
  source_content: string;
  card_count: number;
  color_theme: string;
  icon_name: string;
  created_at: string;
};

export type Flashcard = {
  id: string;
  set_id: string;
  front: string;
  back: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
  last_reviewed_at: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string;
  study_streak: number;
  last_studied_date: string | null;
  total_cards_learned: number;
  role: 'user' | 'admin';
  ai_weekly_limit: number;
  is_banned: boolean;
  created_at: string;
};

export type AppSettings = {
  id: number;
  ai_api_key: string;
  ai_provider: 'openai' | 'gemini' | 'openrouter' | 'none';
  ai_model: string;
  ai_key_active: boolean;
  updated_at: string;
  updated_by: string | null;
};

export type AdminAuditLog = {
  id: string;
  admin_id: string;
  action: string;
  target_id: string | null;
  target_type: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export type SavedSet = {
  id: string;
  user_id: string;
  set_id: string;
  created_at: string;
};

export type WorkspaceFile = {
  id: string;
  user_id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  extracted_text: string;
  extraction_status: 'text_extracted' | 'metadata_only' | 'failed';
  created_at: string;
};

export type WorkspaceAnalysisRecord = {
  user_id: string;
  context_summary: string;
  topics: { name: string; details: string; source_names: string[] }[];
  pending_tasks: LearningTaskDraft[];
  uncertainties: string[];
  updated_at: string;
};

export type LearningTaskDraft = {
  title: string;
  description: string;
  subject: string;
  task_type: 'assignment' | 'exam';
  due_date: string | null;
  estimated_hours: number | null;
  confidence: number;
};

export type LearningTask = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  subject: string;
  task_type: 'assignment' | 'exam';
  due_date: string;
  estimated_hours: number | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};
