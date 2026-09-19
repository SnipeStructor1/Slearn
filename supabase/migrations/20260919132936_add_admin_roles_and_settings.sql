/*
# Add admin roles, app_settings, and first-user-admin logic

1. Modified Tables
- `profiles`: Added `role` column (text, default 'user', values: 'user' | 'admin')
  - The first real registered user automatically gets role 'admin' via trigger logic
  - Existing real user "Thibaut" (fd082eb0-c771-46e2-ba4c-0ef0f9d95270) is set to admin

2. New Tables
- `app_settings`: single-row table for global app configuration (AI API keys, feature flags)
  - `id`: always 1 (singleton)
  - `ai_api_key`: encrypted API key for AI services (OpenAI/Gemini)
  - `ai_provider`: which AI provider ('openai' | 'gemini' | 'none')
  - `ai_key_active`: whether the key has been validated
  - `updated_at`: last modification timestamp
  - `updated_by`: who made the change

3. Security
- `profiles` role column: users can SELECT their own role; only admins can SELECT all roles and UPDATE other users' roles
  - Added admin-scoped SELECT/UPDATE policies alongside existing owner-scoped ones
- `app_settings`: only admins can SELECT and UPDATE
  - RLS enabled, admin-only policies

4. Trigger
- `handle_new_user_with_role()`: replaces the old `handle_new_user()` trigger
  - Creates profile with role 'admin' if this is the first auth user, else 'user'
  - First-user check: count existing profiles; if 0, role = 'admin'

5. Important Notes
- The existing `handle_new_user()` trigger is dropped and replaced
- EXECUTE on the new function is revoked from anon/authenticated (same as before)
- The demo user (d0000000...) keeps role 'user' — only real users get admin
*/

-- === Add role column to profiles ===
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- === Set existing real user as admin (first real signup) ===
UPDATE profiles SET role = 'admin' WHERE id = 'fd082eb0-c771-46e2-ba4c-0ef0f9d95270';

-- === Update profiles RLS for role visibility ===
-- Drop old policies and recreate with admin support
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- Admins can see all profiles
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
CREATE POLICY "admin_select_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Keep existing insert/update/delete for own profile
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admins can update any profile (for role management)
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;
CREATE POLICY "admin_update_all_profiles" ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- === Create app_settings table ===
CREATE TABLE IF NOT EXISTS app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ai_api_key text NOT NULL DEFAULT '',
  ai_provider text NOT NULL DEFAULT 'none',
  ai_key_active boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Insert singleton row
INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read app_settings
DROP POLICY IF EXISTS "admin_select_app_settings" ON app_settings;
CREATE POLICY "admin_select_app_settings" ON app_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Only admins can update app_settings
DROP POLICY IF EXISTS "admin_update_app_settings" ON app_settings;
CREATE POLICY "admin_update_app_settings" ON app_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- === Replace the new-user trigger with role-aware version ===
CREATE OR REPLACE FUNCTION public.handle_new_user_with_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  profile_count integer;
  new_role text;
BEGIN
  -- Count existing profiles to determine if this is the first user
  SELECT count(*) INTO profile_count FROM public.profiles;

  -- First user gets admin role
  IF profile_count = 0 THEN
    new_role := 'admin';
  ELSE
    new_role := 'user';
  END IF;

  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    new_role
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', profiles.display_name);

  RETURN NEW;
END;
$$;

-- Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_role();

-- Revoke execute from public roles (same security as before)
REVOKE EXECUTE ON FUNCTION public.handle_new_user_with_role() FROM anon, authenticated;

-- === Create admin audit log table ===
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_id uuid,
  target_type text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_audit_log" ON admin_audit_log;
CREATE POLICY "admin_select_audit_log" ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_audit_log" ON admin_audit_log;
CREATE POLICY "admin_insert_audit_log" ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- === Grant profiles select to authenticated for admin lookups ===
-- Already handled by policies above

-- === Indexes ===
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);