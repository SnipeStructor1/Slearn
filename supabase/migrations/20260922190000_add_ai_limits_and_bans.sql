-- Add per-user AI controls for administrators.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_weekly_limit integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_ai_weekly_limit_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_ai_weekly_limit_check
  CHECK (ai_weekly_limit >= 0);

-- Administrators are not limited by the regular-user quota. Keep the stored
-- value positive so it remains useful if an administrator is demoted.
UPDATE profiles
SET ai_weekly_limit = GREATEST(ai_weekly_limit, 200)
WHERE role = 'admin';

CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(is_banned);
