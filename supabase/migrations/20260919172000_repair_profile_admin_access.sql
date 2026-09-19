/*
  Repair profile loading for hosted projects:
  - avoid recursive RLS checks on profiles
  - ensure existing auth users have a profile row
  - preserve the known administrator role
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND lower(role) = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "admin_select_all_profiles" ON public.profiles;
CREATE POLICY "admin_select_all_profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_all_profiles" ON public.profiles;
CREATE POLICY "admin_update_all_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.profiles (id, display_name)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles AS p WHERE p.id = u.id
);

UPDATE public.profiles
SET role = 'admin'
WHERE id = 'fd082eb0-c771-46e2-ba4c-0ef0f9d95270';
