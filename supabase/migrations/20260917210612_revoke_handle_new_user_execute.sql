/*
# Revoke EXECUTE on handle_new_user from anon and authenticated

1. Security Changes
- REVOKE EXECUTE on public.handle_new_user() from anon and authenticated roles.
- This function is a trigger that fires on auth.users INSERT (signup).
- It should not be callable directly via the REST API by any frontend role.
- The trigger still works because it runs with the trigger invoker's privileges
  (the auth.users INSERT is done by Supabase Auth internals, not the frontend).
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;