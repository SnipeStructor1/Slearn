ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_language text NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS learning_language text NOT NULL DEFAULT 'de';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_app_language_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_app_language_check CHECK (app_language IN ('de', 'en'));
  END IF;
END $$;

ALTER TABLE public.workspace_analysis
  ADD COLUMN IF NOT EXISTS open_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS language_learning jsonb;
