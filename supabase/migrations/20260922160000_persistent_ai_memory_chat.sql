/*
  Persistent, owner-only AI memory and workspace-scoped chat.
  Existing rows remain valid and are assigned to the default personal workspace.
*/

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS workspace_key text NOT NULL DEFAULT 'default';

DELETE FROM public.ai_conversations older
USING public.ai_conversations newer
WHERE older.user_id = newer.user_id
  AND older.workspace_key = newer.workspace_key
  AND (older.updated_at < newer.updated_at
    OR (older.updated_at = newer.updated_at AND older.id < newer.id));

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_conversations_user_workspace
  ON public.ai_conversations(user_id, workspace_key);

CREATE TABLE IF NOT EXISTS public.workspace_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_key text NOT NULL DEFAULT 'default',
  memory_type text NOT NULL,
  stable_key text NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_memory_type_check CHECK (
    memory_type IN ('summary', 'topic', 'task', 'exam', 'confirmed_answer', 'uncertainty')
  ),
  CONSTRAINT workspace_memory_source_check CHECK (length(trim(source)) > 0),
  CONSTRAINT workspace_memory_stable_key_check CHECK (length(trim(stable_key)) > 0),
  UNIQUE (user_id, workspace_key, stable_key)
);

ALTER TABLE public.workspace_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspace_memory_owner" ON public.workspace_memory;
CREATE POLICY "workspace_memory_owner" ON public.workspace_memory
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_memory_user_updated
  ON public.workspace_memory(user_id, workspace_key, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_memory_type
  ON public.workspace_memory(user_id, workspace_key, memory_type);
