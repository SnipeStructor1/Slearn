CREATE TABLE IF NOT EXISTS public.workspace_notes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspace_notes_owner" ON public.workspace_notes;
CREATE POLICY "workspace_notes_owner" ON public.workspace_notes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.workspace_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspace_files_owner" ON public.workspace_files;
CREATE POLICY "workspace_files_owner" ON public.workspace_files
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-files', 'workspace-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "workspace_storage_owner" ON storage.objects;
CREATE POLICY "workspace_storage_owner" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'workspace-files' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'workspace-files' AND (storage.foldername(name))[1] = auth.uid()::text);
