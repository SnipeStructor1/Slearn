/*
# Add profile language preference

1. Changes
- Add `preferred_language` to `profiles`.
- Store the user's selected interface language for future sessions.
- Use German as the default because the current product language is German.

2. Security
- The existing owner-scoped profile policies continue to protect this value.
- No new public data or access policy is introduced.

3. Important notes
- The change is additive and preserves all existing profile data.
- Supported application values are `de` and `en`; the database default is `de`.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'de';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_language_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferred_language_check
  CHECK (preferred_language IN ('de', 'en'));