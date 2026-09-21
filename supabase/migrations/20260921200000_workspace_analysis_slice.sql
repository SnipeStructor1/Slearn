/*
  Notes-first workspace analysis slice.
  Raw files remain in private storage; extracted text is bounded and optional.
*/

ALTER TABLE public.workspace_files
  ADD COLUMN IF NOT EXISTS extracted_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS extraction_status text NOT NULL DEFAULT 'metadata_only';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workspace_files_extraction_status_check'
  ) THEN
    ALTER TABLE public.workspace_files
      ADD CONSTRAINT workspace_files_extraction_status_check
      CHECK (extraction_status IN ('text_extracted', 'metadata_only', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workspace_files_user_created
  ON public.workspace_files(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.workspace_analysis (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  context_summary text NOT NULL DEFAULT '',
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  uncertainties jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspace_analysis_owner" ON public.workspace_analysis;
CREATE POLICY "workspace_analysis_owner" ON public.workspace_analysis
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_analysis_updated
  ON public.workspace_analysis(updated_at DESC);
