import type {
  AIAction, AIContext, AIOptions, AIResult,
  GeneratedSet, GeneratedQuiz, GeneratedStudyPlan, GeneratedSummary, TutorResponse, WorkspaceAnalysis,
} from '@/lib/types';
import { userError } from '@/lib/error-text';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-20b:free';
const FALLBACK_MODELS = [
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.1-8b-instruct:free',
];
const MAX_TOKENS = 4000;

function getApiKey(): string | undefined {
  return import.meta.env.VITE_OPENROUTER_API_KEY || undefined;
}

// --- Prompt builders ---

function buildSystemPrompt(action: AIAction): string {
  const base = "You are Slearn's AI learning assistant. You help students study effectively. All responses must be valid JSON. Do not include markdown code fences or any text outside the JSON object.";
  switch (action) {
    case 'analyze_workspace':
      return `${base} Analyze all provided notes and uploaded material. Never invent a date: use null when a deadline is not reliably stated and add a concrete question to uncertainties. Group related material into topics and produce a compact context summary. Respond with: {"context_summary": string, "topics": [{"name": string, "details": string, "source_names": string[]}], "tasks": [{"title": string, "description": string, "subject": string, "task_type": "assignment"|"exam", "due_date": "YYYY-MM-DD"|null, "estimated_hours": number|null, "confidence": number}], "uncertainties": string[]}`;
    case 'generate_flashcards':
      return `${base} Create high-quality flashcards from the given input. Each card should have a clear question on the front and a concise but complete answer on the back. Respond with: {"title": string, "description": string, "subject": string, "summary": string[], "cards": [{"front": string, "back": string}]}`;
    case 'generate_quiz':
      return `${base} Create a quiz from the given context. Each question should have 4 options, one correct answer, and an explanation. Respond with: {"title": string, "questions": [{"question": string, "options": string[], "correct_index": number, "explanation": string}]}`;
    case 'generate_study_plan':
      return `${base} Create a detailed, date-based study plan from the student's open assignments and exams. Schedule preparation sessions on dates before each due date, prioritize exams and nearer deadlines, and include the source task ids. Respond with: {"title": string, "goal": string, "units": [{"title": string, "description": string, "topics": string[], "estimated_hours": number, "scheduled_date": "YYYY-MM-DD", "task_ids": string[]}]}`;
    case 'generate_summary':
      return `${base} Summarize the given material. Respond with: {"summary": string[], "key_points": string[]}`;
    case 'tutor_chat':
      return `${base} You are a patient tutor. Answer the student's question using the provided context. Respond with: {"reply": string, "suggestions": string[]}`;
    case 'homework_help':
      return `${base} Help with homework. Guide the student without just giving the answer. Respond with: {"reply": string, "suggestions": string[]}`;
    default:
      return base;
  }
}

function buildUserPrompt(action: AIAction, input: string, context?: AIContext, options?: AIOptions): string {
  let prompt = `Input: ${input}\n`;
  if (context?.notes) {
    prompt += `\nStudent's notes:\n${context.notes.slice(0, 8000)}\n`;
  }
  if (context?.files && context.files.length > 0) {
    prompt += `\nUploaded files:\n${context.files.map((f) => `- ${f.name}${f.content ? `: ${f.content.slice(0, 4000)}` : ''}`).join('\n')}\n`;
  }
  if (context?.flashcards && context.flashcards.length > 0) {
    prompt += `\nExisting flashcards:\n${context.flashcards.map((c) => `Q: ${c.front} | A: ${c.back}`).join('\n')}\n`;
  }
  if (context?.conversation && context.conversation.length > 0) {
    prompt += `\nConversation so far:\n${context.conversation.map((m) => `${m.role}: ${m.content}`).join('\n')}\n`;
  }
  if (context?.tasks && context.tasks.length > 0) {
    prompt += `\nOpen learning tasks and exams (use these exact ids and due dates):\n${JSON.stringify(context.tasks)}\n`;
  }
  if (options) {
    const parts: string[] = [];
    if (options.card_count) parts.push(`Generate exactly ${options.card_count} flashcards`);
    if (options.question_count) parts.push(`Generate exactly ${options.question_count} questions`);
    if (options.timeframe_weeks) parts.push(`Plan for ${options.timeframe_weeks} weeks`);
    if (options.goal) parts.push(`Goal: ${options.goal}`);
    if (parts.length) prompt += `\n${parts.join('. ')}.\n`;
  }
  return prompt;
}

// --- OpenRouter call with fallback ---

async function callOpenRouterOnce(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<{ text: string; tokens: number }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  const referer = import.meta.env.VITE_OPENROUTER_HTTP_REFERER;
  const title = import.meta.env.VITE_OPENROUTER_X_TITLE;
  if (referer) headers['HTTP-Referer'] = referer;
  if (title) headers['X-Title'] = title;

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: MAX_TOKENS,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    let detail = '';
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch { /* ignore */ }
    const status = res.status;
    throw new Error(`OpenRouter rejected model "${model}" (HTTP ${status})${detail ? `: ${detail}` : ''}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text) {
    throw new Error(`OpenRouter returned no message content for model "${model}"`);
  }
  return { text, tokens: data.usage?.total_tokens || 0 };
}

async function callOpenRouterWithFallback(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<{ text: string; tokens: number }> {
  const attempts = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
  let lastError: Error | undefined;

  for (const candidate of attempts) {
    try {
      return await callOpenRouterOnce(apiKey, candidate, systemPrompt, userPrompt);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const msg = lastError.message;
      const isRecoverable = /\b(429|402|403|400)\b/.test(msg);
      if (!isRecoverable) throw lastError;
    }
  }

  throw lastError || new Error('OpenRouter request failed');
}

// --- Response validation ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateFlashcards(data: unknown): GeneratedSet {
  if (!isRecord(data)) throw new Error('Invalid flashcard response');
  if (typeof data.title !== 'string' || !data.title) throw new Error('Missing title');
  if (typeof data.description !== 'string') throw new Error('Missing description');
  if (typeof data.subject !== 'string') throw new Error('Missing subject');
  if (!Array.isArray(data.summary)) throw new Error('Missing summary array');
  if (!Array.isArray(data.cards) || data.cards.length === 0) throw new Error('Missing cards array');
  for (const c of data.cards) {
    if (!isRecord(c) || typeof c.front !== 'string' || typeof c.back !== 'string') throw new Error('Invalid card shape');
  }
  return data as unknown as GeneratedSet;
}

function validateQuiz(data: unknown): GeneratedQuiz {
  if (!isRecord(data)) throw new Error('Invalid quiz response');
  if (typeof data.title !== 'string') throw new Error('Missing quiz title');
  if (!Array.isArray(data.questions) || data.questions.length === 0) throw new Error('Missing questions');
  for (const q of data.questions) {
    if (!isRecord(q) || typeof q.question !== 'string' || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correct_index !== 'number' || typeof q.explanation !== 'string') {
      throw new Error('Invalid question');
    }
  }
  return data as unknown as GeneratedQuiz;
}

function validateStudyPlan(data: unknown): GeneratedStudyPlan {
  if (!isRecord(data)) throw new Error('Invalid study plan response');
  if (typeof data.title !== 'string') throw new Error('Missing plan title');
  if (typeof data.goal !== 'string') throw new Error('Missing plan goal');
  if (!Array.isArray(data.units) || data.units.length === 0) throw new Error('Missing units');
  for (const u of data.units) {
    if (!isRecord(u) || typeof u.title !== 'string' || typeof u.description !== 'string' || !Array.isArray(u.topics) || typeof u.estimated_hours !== 'number') {
      throw new Error('Invalid unit');
    }
  }
  return data as unknown as GeneratedStudyPlan;
}

function validateSummary(data: unknown): GeneratedSummary {
  if (!isRecord(data)) throw new Error('Invalid summary response');
  if (!Array.isArray(data.summary)) throw new Error('Missing summary array');
  if (!Array.isArray(data.key_points)) throw new Error('Missing key_points array');
  return data as unknown as GeneratedSummary;
}

function validateTutorResponse(data: unknown): TutorResponse {
  if (!isRecord(data)) throw new Error('Invalid tutor response');
  if (typeof data.reply !== 'string' || !data.reply) throw new Error('Missing reply');
  return data as unknown as TutorResponse;
}

function validateWorkspaceAnalysis(data: unknown): WorkspaceAnalysis {
  if (!isRecord(data)) throw new Error('Invalid workspace analysis response');
  if (typeof data.context_summary !== 'string') throw new Error('Missing context_summary');
  if (!Array.isArray(data.topics)) throw new Error('Missing topics');
  if (!Array.isArray(data.tasks)) throw new Error('Missing tasks');
  if (!Array.isArray(data.uncertainties)) throw new Error('Missing uncertainties');
  return data as unknown as WorkspaceAnalysis;
}

function validateResponse(action: AIAction, parsed: unknown): unknown {
  switch (action) {
    case 'analyze_workspace': return validateWorkspaceAnalysis(parsed);
    case 'generate_flashcards': return validateFlashcards(parsed);
    case 'generate_quiz': return validateQuiz(parsed);
    case 'generate_study_plan': return validateStudyPlan(parsed);
    case 'generate_summary': return validateSummary(parsed);
    case 'tutor_chat':
    case 'homework_help': return validateTutorResponse(parsed);
    default: throw new Error('Unknown action');
  }
}

// --- Main callAI ---

async function callAI<T>(action: AIAction, input: string, context?: AIContext, options?: AIOptions): Promise<AIResult<T>> {
  const apiKey = getApiKey();
  if (!apiKey) return { success: false, error: userError('AI is not enabled. Ask an admin to configure the API key.') };

  try {
    const systemPrompt = buildSystemPrompt(action);
    const userPrompt = buildUserPrompt(action, input, context, options);

    const { text, tokens } = await callOpenRouterWithFallback(apiKey, DEFAULT_MODEL, systemPrompt, userPrompt);

    let parsed: unknown;
    try {
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return { success: false, error: userError('AI returned invalid JSON. Please try again.') };
    }

    let validated: T;
    try {
      validated = validateResponse(action, parsed) as T;
    } catch (e) {
      return { success: false, error: userError(`AI response validation failed: ${(e as Error).message}`) };
    }

    return { success: true, data: validated, tokens_used: tokens };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reach the AI service';
    return { success: false, error: userError(message) };
  }
}

export function generateFlashcards(input: string, context?: AIContext, cardCount?: number) {
  return callAI<GeneratedSet>('generate_flashcards', input, context, { card_count: cardCount });
}

export function analyzeWorkspace(input: string, context?: AIContext) {
  return callAI<WorkspaceAnalysis>('analyze_workspace', input, context);
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
  return Boolean(getApiKey());
}
