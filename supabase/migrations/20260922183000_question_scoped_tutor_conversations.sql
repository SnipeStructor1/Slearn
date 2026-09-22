/*
  Keep the general tutor chat and every workspace follow-up in separate,
  owner-only conversation rows. Existing conversations remain the general chat.
*/

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS conversation_id text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS question_id text;

DROP INDEX IF EXISTS public.idx_ai_conversations_user_workspace;

DELETE FROM public.ai_conversations older
USING public.ai_conversations newer
WHERE older.user_id = newer.user_id
  AND older.workspace_key = newer.workspace_key
  AND older.conversation_id = newer.conversation_id
  AND (older.updated_at < newer.updated_at
    OR (older.updated_at = newer.updated_at AND older.id < newer.id));

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_conversations_user_workspace_conversation
  ON public.ai_conversations(user_id, workspace_key, conversation_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_question
  ON public.ai_conversations(user_id, workspace_key, question_id);
