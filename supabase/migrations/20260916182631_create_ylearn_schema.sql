/*
# Slearn Schema — profiles, study_sets, flashcards, saved_sets

1. New Tables
- `profiles`: user display info (name, avatar), study streak, total cards learned. One row per auth user.
- `study_sets`: AI-generated study sets owned by a user. Has visibility (public/private), subject, summary bullets.
- `flashcards`: individual cards within a set, with SRS fields (ease factor, interval, repetitions, next review date).
- `saved_sets`: bookmark/clone relationship — a user saving a community set to their dashboard.

2. Security
- RLS enabled on ALL tables.
- profiles: owner-only CRUD (auth.uid() = id).
- study_sets: SELECT allows public sets to everyone (anon+authenticated) plus owner's private sets; write operations owner-only.
- flashcards: SELECT follows parent set visibility; writes through parent ownership check.
- saved_sets: owner-only CRUD (user's own bookmarks).
- All owner columns default to auth.uid() so frontend inserts succeed.
*/

-- === profiles ===
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text DEFAULT '',
  study_streak integer NOT NULL DEFAULT 0,
  last_studied_date date,
  total_cards_learned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- === study_sets ===
CREATE TABLE IF NOT EXISTS study_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT 'General',
  visibility text NOT NULL DEFAULT 'public',
  summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_type text NOT NULL DEFAULT 'topic',
  source_content text NOT NULL DEFAULT '',
  card_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_sets ENABLE ROW LEVEL SECURITY;

-- Public sets visible to everyone (incl. anon for explore page); private sets only to owner
DROP POLICY IF EXISTS "select_study_sets" ON study_sets;
CREATE POLICY "select_study_sets" ON study_sets FOR SELECT
  TO anon, authenticated
  USING (visibility = 'public' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_study_sets" ON study_sets;
CREATE POLICY "insert_own_study_sets" ON study_sets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_study_sets" ON study_sets;
CREATE POLICY "update_own_study_sets" ON study_sets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_study_sets" ON study_sets;
CREATE POLICY "delete_own_study_sets" ON study_sets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- === flashcards ===
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  ease_factor double precision NOT NULL DEFAULT 2.5,
  interval_days integer NOT NULL DEFAULT 0,
  repetitions integer NOT NULL DEFAULT 0,
  next_review_date date NOT NULL DEFAULT CURRENT_DATE,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Select cards if the parent set is public or owned by the user
DROP POLICY IF EXISTS "select_flashcards" ON flashcards;
CREATE POLICY "select_flashcards" ON flashcards FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_sets
      WHERE study_sets.id = flashcards.set_id
      AND (study_sets.visibility = 'public' OR study_sets.user_id = auth.uid())
    )
  );

-- Write cards only if the parent set is owned by the user
DROP POLICY IF EXISTS "insert_own_flashcards" ON flashcards;
CREATE POLICY "insert_own_flashcards" ON flashcards FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_sets
      WHERE study_sets.id = flashcards.set_id
      AND study_sets.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_flashcards" ON flashcards;
CREATE POLICY "update_own_flashcards" ON flashcards FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM study_sets
      WHERE study_sets.id = flashcards.set_id
      AND study_sets.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_sets
      WHERE study_sets.id = flashcards.set_id
      AND study_sets.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_flashcards" ON flashcards;
CREATE POLICY "delete_own_flashcards" ON flashcards FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM study_sets
      WHERE study_sets.id = flashcards.set_id
      AND study_sets.user_id = auth.uid()
    )
  );

-- === saved_sets ===
CREATE TABLE IF NOT EXISTS saved_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  set_id uuid NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, set_id)
);

ALTER TABLE saved_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_saved_sets" ON saved_sets;
CREATE POLICY "select_own_saved_sets" ON saved_sets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_saved_sets" ON saved_sets;
CREATE POLICY "insert_own_saved_sets" ON saved_sets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_saved_sets" ON saved_sets;
CREATE POLICY "delete_own_saved_sets" ON saved_sets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- === Indexes ===
CREATE INDEX IF NOT EXISTS idx_study_sets_user_id ON study_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sets_visibility ON study_sets(visibility);
CREATE INDEX IF NOT EXISTS idx_study_sets_subject ON study_sets(subject);
CREATE INDEX IF NOT EXISTS idx_flashcards_set_id ON flashcards(set_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review_date);
CREATE INDEX IF NOT EXISTS idx_saved_sets_user_id ON saved_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_sets_set_id ON saved_sets(set_id);

-- === Auto-create profile on signup ===
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();