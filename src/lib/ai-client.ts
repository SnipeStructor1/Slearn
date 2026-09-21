import { supabase } from '@/lib/supabase';
import type {
  AIAction, AIContext, AIOptions, AIResult,
  GeneratedSet, GeneratedQuiz, GeneratedStudyPlan, GeneratedSummary, TutorResponse,
} from '@/lib/types';

async function callAI<T>(
  action: AIAction,
  input: string,
  context?: AIContext,
  options?: AIOptions,
): Promise<AIResult<T>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    return { success: false, error: 'Not authenticated' };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action, input, context, options }),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    return { success: false, error: json.error || 'AI request failed' };
  }
  return { success: true, data: json.data as T, tokens_used: json.tokens_used || 0 };
}

export function generateFlashcards(
  input: string,
  context?: AIContext,
  cardCount?: number,
): Promise<AIResult<GeneratedSet>> {
  return callAI<GeneratedSet>('generate_flashcards', input, context, { card_count: cardCount });
}

export function generateQuiz(
  input: string,
  context?: AIContext,
  questionCount?: number,
): Promise<AIResult<GeneratedQuiz>> {
  return callAI<GeneratedQuiz>('generate_quiz', input, context, { question_count: questionCount });
}

export function generateStudyPlan(
  input: string,
  context?: AIContext,
  timeframeWeeks?: number,
  goal?: string,
): Promise<AIResult<GeneratedStudyPlan>> {
  return callAI<GeneratedStudyPlan>('generate_study_plan', input, context, { timeframe_weeks: timeframeWeeks, goal });
}

export function generateSummary(
  input: string,
  context?: AIContext,
): Promise<AIResult<GeneratedSummary>> {
  return callAI<GeneratedSummary>('generate_summary', input, context);
}

export function tutorChat(
  input: string,
  context?: AIContext,
): Promise<AIResult<TutorResponse>> {
  return callAI<TutorResponse>('tutor_chat', input, context);
}

export function homeworkHelp(
  input: string,
  context?: AIContext,
): Promise<AIResult<TutorResponse>> {
  return callAI<TutorResponse>('homework_help', input, context);
}

export async function isAIEnabled(): Promise<boolean> {
  const { data } = await supabase
    .from('app_settings')
    .select('ai_key_active')
    .eq('id', 1)
    .maybeSingle();
  return data?.ai_key_active === true;
}
