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
  created_at: string;
};

export type SavedSet = {
  id: string;
  user_id: string;
  set_id: string;
  created_at: string;
};
