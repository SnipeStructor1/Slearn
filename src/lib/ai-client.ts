import { supabase } from '@/lib/supabase';
import type {
  AIAction, AIContext, AIOptions, AIResult,
  GeneratedSet, GeneratedQuiz, GeneratedStudyPlan, GeneratedSummary, TutorResponse,
} from '@/lib/types';

async function callAI<T>(action: AIAction, input: string, context?: AIContext, options?: AIOptions): Promise<AIResult<T>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) return { success: false, error: 'Not authenticated' };

  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ['Bearer', accessToken].join(' '),
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action, input, context, options }),
    });
    const json = await response.json() as { success?: boolean; data?: T; error?: string; tokens_used?: number };
    if (!response.ok || !json.success) return { success: false, error: json.error || 'AI request failed' };
    return { success: true, data: json.data as T, tokens_used: json.tokens_used || 0 };
  } catch {
    return { success: false, error: 'Unable to reach the AI service' };
  }
}

export function generateFlashcards(input: string, context?: AIContext, cardCount?: number) {
  return callAI<GeneratedSet>('generate_flashcards', input, context, { card_count: cardCount });
}

export function generateQuiz(input: string, context?: AIContext, questionCount?: number) {
  return callAI<GeneratedQuiz>('generate_quiz', input, context, { question_count: questionCount });
}

export function generateStudyPlan(input: string, context?: AIContext, timeframeWeeks?: number, goal?: string) {
  return callAI<GeneratedStudyPlan>('generate_study_plan', input, context, { timeframe_weeks: timeframeWeeks, goal });
}

export function generateSummary(input: string, context?: AIContext) {
  return callAI<GeneratedSummary>('generate_summary', input, context);
}

export function tutorChat(input: string, context?: AIContext) {
  return callAI<TutorResponse>('tutor_chat', input, context);
}

export function homeworkHelp(input: string, context?: AIContext) {
  return callAI<TutorResponse>('homework_help', input, context);
}

export async function isAIEnabled(): Promise<boolean> {
  const { data } = await supabase.from('app_settings').select('ai_key_active').eq('id', 1).maybeSingle();
  return data?.ai_key_active === true;
}
