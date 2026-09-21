export type AIProvider = 'openai' | 'gemini' | 'openrouter';

export type AIModelPreset = {
  id: string;
  label: string;
  free?: boolean;
};

export const AI_PROVIDER_OPTIONS: { id: AIProvider; label: string }[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'openrouter', label: 'OpenRouter' },
];

export const AI_MODEL_PRESETS: Record<AIProvider, AIModelPreset[]> = {
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
  ],
  gemini: [
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
  openrouter: [
    { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash Experimental', free: true },
    { id: 'meta-llama/llama-3.3-8b-instruct:free', label: 'Llama 3.3 8B Instruct', free: true },
    { id: 'qwen/qwen3-4b:free', label: 'Qwen3 4B', free: true },
  ],
};

export const AI_DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
  openrouter: 'google/gemini-2.0-flash-exp:free',
};

export function isAIProvider(value: string): value is AIProvider {
  return AI_PROVIDER_OPTIONS.some((provider) => provider.id === value);
}
