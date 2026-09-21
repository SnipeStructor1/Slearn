// Slearn central AI edge function
// All AI actions go through this single endpoint.
// The API key is read server-side from app_settings — never sent to the client.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

if (req.method === "OPTIONS") {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// --- Types ---

type AIAction =
  | "generate_flashcards"
  | "generate_quiz"
  | "generate_study_plan"
  | "generate_summary"
  | "tutor_chat"
  | "homework_help";

interface RequestBody {
  action: AIAction;
  input: string;
  context?: {
    notes?: string;
    files?: { name: string; content?: string }[];
    flashcards?: { front: string; back: string }[];
    conversation?: { role: "user" | "assistant"; content: string }[];
    tasks?: {
      id: string;
      title: string;
      description: string;
      subject: string;
      task_type: "assignment" | "exam";
      due_date: string;
      estimated_hours: number | null;
    }[];
  };
  options?: {
    card_count?: number;
    question_count?: number;
    timeframe_weeks?: number;
    goal?: string;
  };
}

const SUPPORTED_ACTIONS = [
  "generate_flashcards",
  "generate_quiz",
  "generate_study_plan",
  "generate_summary",
  "tutor_chat",
  "homework_help",
] as const satisfies readonly AIAction[];

const MAX_WEEKLY_ACTIONS = 50;
const MAX_INPUT_LENGTH = 20_000;
const MAX_NOTES_LENGTH = 20_000;
const MAX_FILES = 10;
const MAX_FILE_NAME_LENGTH = 256;
const MAX_FILE_CONTENT_LENGTH = 10_000;
const MAX_FLASHCARDS = 100;
const MAX_FLASHCARD_FIELD_LENGTH = 4_000;
const MAX_CONVERSATION_MESSAGES = 50;
const MAX_MESSAGE_CONTENT_LENGTH = 8_000;
const MAX_GOAL_LENGTH = 2_000;
const MAX_TASKS = 100;
const MAX_TASK_FIELD_LENGTH = 2_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    throw new Error(`${field} must be a non-empty string of at most ${maxLength} characters`);
  }
  return value;
}

function requireOptionalString(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, field, maxLength);
}

function requireBoundedInteger(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function validateRequestBody(value: unknown): RequestBody {
  if (!isRecord(value)) throw new Error("Request body must be a JSON object");

  const action = value.action;
  if (typeof action !== "string" || !(SUPPORTED_ACTIONS as readonly string[]).includes(action)) {
    throw new Error("Unsupported action");
  }
  const input = requireString(value.input, "input", MAX_INPUT_LENGTH);

  let context: RequestBody["context"];
  if (value.context !== undefined) {
    if (!isRecord(value.context)) throw new Error("context must be an object");
    const rawContext = value.context;
    context = {
      notes: requireOptionalString(rawContext.notes, "context.notes", MAX_NOTES_LENGTH),
    };

    if (rawContext.files !== undefined) {
      if (!Array.isArray(rawContext.files) || rawContext.files.length > MAX_FILES) {
        throw new Error(`context.files must contain at most ${MAX_FILES} files`);
      }
      context.files = rawContext.files.map((file, index) => {
        if (!isRecord(file)) throw new Error(`context.files[${index}] must be an object`);
        return {
          name: requireString(file.name, `context.files[${index}].name`, MAX_FILE_NAME_LENGTH),
          content: requireOptionalString(file.content, `context.files[${index}].content`, MAX_FILE_CONTENT_LENGTH),
        };
      });
    }

    if (rawContext.flashcards !== undefined) {
      if (!Array.isArray(rawContext.flashcards) || rawContext.flashcards.length > MAX_FLASHCARDS) {
        throw new Error(`context.flashcards must contain at most ${MAX_FLASHCARDS} cards`);
      }
      context.flashcards = rawContext.flashcards.map((card, index) => {
        if (!isRecord(card)) throw new Error(`context.flashcards[${index}] must be an object`);
        return {
          front: requireString(card.front, `context.flashcards[${index}].front`, MAX_FLASHCARD_FIELD_LENGTH),
          back: requireString(card.back, `context.flashcards[${index}].back`, MAX_FLASHCARD_FIELD_LENGTH),
        };
      });
    }

    if (rawContext.conversation !== undefined) {
      if (!Array.isArray(rawContext.conversation) || rawContext.conversation.length > MAX_CONVERSATION_MESSAGES) {
        throw new Error(`context.conversation must contain at most ${MAX_CONVERSATION_MESSAGES} messages`);
      }
      context.conversation = rawContext.conversation.map((message, index) => {
        if (!isRecord(message) || (message.role !== "user" && message.role !== "assistant")) {
          throw new Error(`context.conversation[${index}] has an invalid role`);
        }
        return {
          role: message.role,
          content: requireString(message.content, `context.conversation[${index}].content`, MAX_MESSAGE_CONTENT_LENGTH),
        };
      });
    }

    if (rawContext.tasks !== undefined) {
      if (!Array.isArray(rawContext.tasks) || rawContext.tasks.length > MAX_TASKS) {
        throw new Error(`context.tasks must contain at most ${MAX_TASKS} tasks`);
      }
      context.tasks = rawContext.tasks.map((task, index) => {
        if (!isRecord(task)) throw new Error(`context.tasks[${index}] must be an object`);
        if (task.task_type !== "assignment" && task.task_type !== "exam") {
          throw new Error(`context.tasks[${index}].task_type is invalid`);
        }
        const estimatedHours = task.estimated_hours;
        if (estimatedHours !== null && estimatedHours !== undefined &&
            (typeof estimatedHours !== "number" || !Number.isFinite(estimatedHours) || estimatedHours < 0 || estimatedHours > 999)) {
          throw new Error(`context.tasks[${index}].estimated_hours is invalid`);
        }
        return {
          id: requireString(task.id, `context.tasks[${index}].id`, 100),
          title: requireString(task.title, `context.tasks[${index}].title`, MAX_TASK_FIELD_LENGTH),
          description: typeof task.description === "string" ? task.description.slice(0, MAX_TASK_FIELD_LENGTH) : "",
          subject: requireString(task.subject, `context.tasks[${index}].subject`, 200),
          task_type: task.task_type,
          due_date: requireString(task.due_date, `context.tasks[${index}].due_date`, 30),
          estimated_hours: estimatedHours ?? null,
        };
      });
    }
  }

  let options: RequestBody["options"];
  if (value.options !== undefined) {
    if (!isRecord(value.options)) throw new Error("options must be an object");
    options = {
      card_count: value.options.card_count === undefined
        ? undefined
        : requireBoundedInteger(value.options.card_count, "options.card_count", 1, 100),
      question_count: value.options.question_count === undefined
        ? undefined
        : requireBoundedInteger(value.options.question_count, "options.question_count", 1, 100),
      timeframe_weeks: value.options.timeframe_weeks === undefined
        ? undefined
        : requireBoundedInteger(value.options.timeframe_weeks, "options.timeframe_weeks", 1, 52),
      goal: requireOptionalString(value.options.goal, "options.goal", MAX_GOAL_LENGTH),
    };
  }

  return { action: action as AIAction, input, context, options };
}

// --- Response schemas (validated server-side) ---

function validateFlashcards(data: unknown): { title: string; description: string; subject: string; summary: string[]; cards: { front: string; back: string }[] } {
  if (typeof data !== "object" || data === null) throw new Error("Invalid flashcard response");
  const d = data as Record<string, unknown>;
  if (typeof d.title !== "string" || !d.title) throw new Error("Missing title");
  if (typeof d.description !== "string") throw new Error("Missing description");
  if (typeof d.subject !== "string") throw new Error("Missing subject");
  if (!Array.isArray(d.summary)) throw new Error("Missing summary array");
  if (!Array.isArray(d.cards) || d.cards.length === 0) throw new Error("Missing cards array");
  for (const c of d.cards) {
    if (typeof c !== "object" || c === null) throw new Error("Invalid card");
    const card = c as Record<string, unknown>;
    if (typeof card.front !== "string" || typeof card.back !== "string") throw new Error("Invalid card shape");
  }
  return {
    title: d.title,
    description: d.description,
    subject: d.subject,
    summary: d.summary as string[],
    cards: d.cards as { front: string; back: string }[],
  };
}

function validateQuiz(data: unknown): { title: string; questions: { question: string; options: string[]; correct_index: number; explanation: string }[] } {
  if (typeof data !== "object" || data === null) throw new Error("Invalid quiz response");
  const d = data as Record<string, unknown>;
  if (typeof d.title !== "string") throw new Error("Missing quiz title");
  if (!Array.isArray(d.questions) || d.questions.length === 0) throw new Error("Missing questions");
  for (const q of d.questions) {
    const qObj = q as Record<string, unknown>;
    if (typeof qObj.question !== "string") throw new Error("Invalid question");
    if (!Array.isArray(qObj.options) || qObj.options.length < 2) throw new Error("Invalid options");
    if (typeof qObj.correct_index !== "number") throw new Error("Invalid correct_index");
    if (typeof qObj.explanation !== "string") throw new Error("Invalid explanation");
  }
  return d as any;
}

function validateStudyPlan(data: unknown): { title: string; goal: string; units: { title: string; description: string; topics: string[]; estimated_hours: number; scheduled_date?: string; task_ids?: string[] }[] } {
  if (typeof data !== "object" || data === null) throw new Error("Invalid study plan response");
  const d = data as Record<string, unknown>;
  if (typeof d.title !== "string") throw new Error("Missing plan title");
  if (typeof d.goal !== "string") throw new Error("Missing plan goal");
  if (!Array.isArray(d.units) || d.units.length === 0) throw new Error("Missing units");
  for (const u of d.units) {
    const uObj = u as Record<string, unknown>;
    if (typeof uObj.title !== "string") throw new Error("Invalid unit title");
    if (typeof uObj.description !== "string") throw new Error("Invalid unit description");
    if (!Array.isArray(uObj.topics)) throw new Error("Invalid unit topics");
    if (typeof uObj.estimated_hours !== "number") throw new Error("Invalid estimated_hours");
    if (uObj.scheduled_date !== undefined && (typeof uObj.scheduled_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(uObj.scheduled_date))) {
      throw new Error("Invalid scheduled_date");
    }
    if (uObj.task_ids !== undefined && (!Array.isArray(uObj.task_ids) || uObj.task_ids.some((id) => typeof id !== "string"))) {
      throw new Error("Invalid task_ids");
    }
  }
  return d as any;
}

function validateSummary(data: unknown): { summary: string[]; key_points: string[] } {
  if (typeof data !== "object" || data === null) throw new Error("Invalid summary response");
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.summary)) throw new Error("Missing summary array");
  if (!Array.isArray(d.key_points)) throw new Error("Missing key_points array");
  return d as any;
}

function validateTutorResponse(data: unknown): { reply: string; suggestions?: string[] } {
  if (typeof data !== "object" || data === null) throw new Error("Invalid tutor response");
  const d = data as Record<string, unknown>;
  if (typeof d.reply !== "string" || !d.reply) throw new Error("Missing reply");
  return d as any;
}

// --- Prompt builders ---

function buildSystemPrompt(action: AIAction): string {
  const base = "You are Slearn's AI learning assistant. You help students study effectively. All responses must be valid JSON. Do not include markdown code fences or any text outside the JSON object.";
  switch (action) {
    case "generate_flashcards":
      return `${base} Create high-quality flashcards from the given input. Each card should have a clear question on the front and a concise but complete answer on the back. Respond with: {"title": string, "description": string, "subject": string, "summary": string[], "cards": [{"front": string, "back": string}]}`;
    case "generate_quiz":
      return `${base} Create a quiz from the given context. Each question should have 4 options, one correct answer, and an explanation. Respond with: {"title": string, "questions": [{"question": string, "options": string[], "correct_index": number, "explanation": string}]}`;
    case "generate_study_plan":
      return `${base} Create a detailed, date-based study plan from the student's open assignments and exams. Schedule preparation sessions on dates before each due date, prioritize exams and nearer deadlines, and include the source task ids. Respond with: {"title": string, "goal": string, "units": [{"title": string, "description": string, "topics": string[], "estimated_hours": number, "scheduled_date": "YYYY-MM-DD", "task_ids": string[]}]}`;
    case "generate_summary":
      return `${base} Summarize the given material. Respond with: {"summary": string[], "key_points": string[]}`;
    case "tutor_chat":
      return `${base} You are a patient tutor. Answer the student's question using the provided context. Respond with: {"reply": string, "suggestions": string[]}`;
    case "homework_help":
      return `${base} Help with homework. Guide the student without just giving the answer. Respond with: {"reply": string, "suggestions": string[]}`;
    default:
      return base;
  }
}

function buildUserPrompt(body: RequestBody): string {
  let prompt = `Input: ${body.input}\n`;
  if (body.context?.notes) {
    prompt += `\nStudent's notes:\n${body.context.notes.slice(0, 8000)}\n`;
  }
  if (body.context?.files && body.context.files.length > 0) {
    prompt += `\nUploaded files:\n${body.context.files.map((f) => `- ${f.name}${f.content ? `: ${f.content.slice(0, 4000)}` : ""}`).join("\n")}\n`;
  }
  if (body.context?.flashcards && body.context.flashcards.length > 0) {
    prompt += `\nExisting flashcards:\n${body.context.flashcards.map((c) => `Q: ${c.front} | A: ${c.back}`).join("\n")}\n`;
  }
  if (body.context?.conversation && body.context.conversation.length > 0) {
    prompt += `\nConversation so far:\n${body.context.conversation.map((m) => `${m.role}: ${m.content}`).join("\n")}\n`;
  }
  if (body.context?.tasks && body.context.tasks.length > 0) {
    prompt += `\nOpen learning tasks and exams (use these exact ids and due dates):\n${JSON.stringify(body.context.tasks)}\n`;
  }
  if (body.options) {
    const parts: string[] = [];
    if (body.options.card_count) parts.push(`Generate exactly ${body.options.card_count} flashcards`);
    if (body.options.question_count) parts.push(`Generate exactly ${body.options.question_count} questions`);
    if (body.options.timeframe_weeks) parts.push(`Plan for ${body.options.timeframe_weeks} weeks`);
    if (body.options.goal) parts.push(`Goal: ${body.options.goal}`);
    if (parts.length) prompt += `\n${parts.join(". ")}.\n`;
  }
  return prompt;
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Auth check — must have valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("Missing authorization", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client to read app_settings (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create user client to verify the JWT and get user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonError("Unauthorized", 401);
    }

    // Read API key from app_settings (server-side only — never returned to client)
    const { data: settings, error: settingsError } = await adminClient
      .from("app_settings")
      .select("ai_api_key, ai_provider, ai_key_active, ai_model")
      .eq("id", 1)
      .maybeSingle();

    if (settingsError || !settings) {
      return jsonError("AI settings not configured", 503);
    }

    if (!settings.ai_key_active || !settings.ai_api_key) {
      return jsonError("AI is not enabled. Ask an admin to configure the API key.", 503);
    }

    // Parse and validate the request before constructing a provider prompt.
    let body: RequestBody;
    try {
      body = validateRequestBody(await req.json());
    } catch (error) {
      return jsonError(`Invalid request: ${(error as Error).message}`, 400);
    }

    // Keep the existing usage log as a small per-user weekly safety limit.
    const usageSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: weeklyUsage, error: usageError } = await adminClient
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", usageSince);
    if (usageError) {
      return jsonError("Unable to verify AI usage limit", 503);
    }
    if ((weeklyUsage ?? 0) >= MAX_WEEKLY_ACTIONS) {
      return jsonError(`Weekly AI usage limit reached (${MAX_WEEKLY_ACTIONS} requests). Please try again later.`, 429);
    }

    // --- Build the AI API call ---
    const systemPrompt = buildSystemPrompt(body.action);
    const userPrompt = buildUserPrompt(body);

    const aiResponse = await callAI(settings.ai_provider, settings.ai_api_key, settings.ai_model, systemPrompt, userPrompt);
    const rawText = aiResponse.text;
    const tokensUsed = aiResponse.tokens;

    // --- Parse and validate JSON ---
    let parsed: unknown;
    try {
      // Strip any markdown code fences if present
      const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Log the parse failure
      await adminClient.from("ai_usage_log").insert({
        user_id: user.id,
        action: body.action,
        tokens_used: tokensUsed,
        metadata: { error: "json_parse_failed", raw_length: rawText.length },
      });
      return jsonError("AI returned invalid JSON. Please try again.", 502);
    }

    // --- Validate based on action ---
    let validated: unknown;
    try {
      switch (body.action) {
        case "generate_flashcards": validated = validateFlashcards(parsed); break;
        case "generate_quiz": validated = validateQuiz(parsed); break;
        case "generate_study_plan": validated = validateStudyPlan(parsed); break;
        case "generate_summary": validated = validateSummary(parsed); break;
        case "tutor_chat":
        case "homework_help": validated = validateTutorResponse(parsed); break;
        default: return jsonError("Unknown action", 400);
      }
    } catch (e) {
      await adminClient.from("ai_usage_log").insert({
        user_id: user.id,
        action: body.action,
        tokens_used: tokensUsed,
        metadata: { error: "schema_validation_failed", message: (e as Error).message },
      });
      return jsonError(`AI response validation failed: ${(e as Error).message}`, 502);
    }

    // --- Log successful usage ---
    await adminClient.from("ai_usage_log").insert({
      user_id: user.id,
      action: body.action,
      tokens_used: tokensUsed,
      metadata: { success: true },
    });

    return new Response(
      JSON.stringify({ success: true, data: validated, tokens_used: tokensUsed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return jsonError(`Internal error: ${(err as Error).message}`, 500);
  }
});

// --- AI provider abstraction ---

async function callAI(provider: string, apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<{ text: string; tokens: number }> {
  if (provider === "openai") {
    return callOpenAI(apiKey, model || "gpt-4o-mini", systemPrompt, userPrompt);
  } else if (provider === "gemini") {
    return callGemini(apiKey, model || "gemini-1.5-flash", systemPrompt, userPrompt);
  }
  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<{ text: string; tokens: number }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  const tokens = data.usage?.total_tokens || 0;
  return { text, tokens };
}

async function callGemini(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<{ text: string; tokens: number }> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const tokens = data.usageMetadata?.totalTokenCount || 0;
  return { text, tokens };
}

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
