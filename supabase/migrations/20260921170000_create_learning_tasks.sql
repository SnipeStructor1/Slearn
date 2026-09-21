/*
  Learning tasks and exams for the personal planner.
  Every row is private to its owner.
*/

CREATE TABLE IF NOT EXISTS learning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT 'Allgemein',
  task_type text NOT NULL CHECK (task_type IN ('assignment', 'exam')),
  due_date date NOT NULL,
  estimated_hours numeric(5,2) CHECK (estimated_hours IS NULL OR (estimated_hours >= 0 AND estimated_hours <= 999)),
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE learning_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_learning_tasks" ON learning_tasks;
CREATE POLICY "select_own_learning_tasks" ON learning_tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_learning_tasks" ON learning_tasks;
CREATE POLICY "insert_own_learning_tasks" ON learning_tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_learning_tasks" ON learning_tasks;
CREATE POLICY "update_own_learning_tasks" ON learning_tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_learning_tasks" ON learning_tasks;
CREATE POLICY "delete_own_learning_tasks" ON learning_tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_learning_tasks_user_due
  ON learning_tasks(user_id, due_date);
