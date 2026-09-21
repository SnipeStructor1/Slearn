/*
# Slearn private AI platform — new tables + remove public defaults

1. New Tables
- `ai_conversations`: Per-user chat history with the AI assistant
  - `user_id`, `messages` (jsonb array of {role, content, timestamp})
  - Owner-only RLS
- `study_plans`: AI-generated structured study plans
  - `user_id`, `title`, `goal`, `timeframe_weeks`, `units` (jsonb), `progress` (int)
  - Owner-only RLS
- `quizzes`: AI-generated quizzes from workspace context
  - `user_id`, `title`, `questions` (jsonb), `source_context` (text)
  - Owner-only RLS
- `ai_usage_log`: Tracks every AI action for limits + admin oversight
  - `user_id`, `action` (text), `tokens_used` (int), `created_at`
  - Owner can SELECT own logs; admin can SELECT all

2. Modified Tables
- `study_sets`: Change default visibility to 'private'
  - Drop the 'public' default so new sets are always private
- `app_settings`: Add `ai_model` column for model selection

3. Security
- All new tables: owner-only RLS (4 policies each, FOR SELECT/INSERT/UPDATE/DELETE)
- `ai_usage_log`: owner SELECT own + admin SELECT all + owner INSERT own
- No public access anywhere

4. Important Notes
- Does NOT drop any existing tables or columns
- Does NOT change existing data (existing sets keep their visibility value)
- Only changes the DEFAULT for future inserts
*/

-- === study_sets: change default visibility to private ===
ALTER TABLE study_sets ALTER COLUMN visibility SET DEFAULT 'private';

-- === app_settings: add ai_model column ===
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS ai_model text NOT NULL DEFAULT 'gpt-4o-mini';

-- === ai_conversations table ===
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_conversations" ON ai_conversations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_conversations" ON ai_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_conversations" ON ai_conversations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_conversations" ON ai_conversations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- === study_plans table ===
CREATE TABLE IF NOT EXISTS study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  goal text NOT NULL DEFAULT '',
  timeframe_weeks integer NOT NULL DEFAULT 1,
  units jsonb NOT NULL DEFAULT '[]'::jsonb,
  progress integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_plans" ON study_plans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_plans" ON study_plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_plans" ON study_plans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_plans" ON study_plans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- === quizzes table ===
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_context text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_quizzes" ON quizzes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_quizzes" ON quizzes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_quizzes" ON quizzes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_quizzes" ON quizzes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- === ai_usage_log table ===
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  tokens_used integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Owner can see own logs
CREATE POLICY "select_own_usage" ON ai_usage_log FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Owner can insert own logs (edge function runs as authenticated)
CREATE POLICY "insert_own_usage" ON ai_usage_log FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admin can see all usage logs
CREATE POLICY "admin_select_all_usage" ON ai_usage_log FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- === Indexes ===
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON ai_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user ON quizzes(user_id);

-- === Make saved_sets truly private (it already is, but remove any public SELECT) ===
-- saved_sets already has owner-only policies from original migration, no change needed

-- === Verify workspace_notes and workspace_files exist (they do from earlier migration) ===
-- No action needed