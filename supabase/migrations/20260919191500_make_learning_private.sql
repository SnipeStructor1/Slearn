/*
  Slearn is a private learning platform. Existing and new study material
  must never be exposed through a public community library.
*/

UPDATE public.study_sets SET visibility = 'private' WHERE visibility <> 'private';

DROP POLICY IF EXISTS "select_study_sets" ON public.study_sets;
CREATE POLICY "select_own_study_sets" ON public.study_sets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_flashcards" ON public.flashcards;
CREATE POLICY "select_private_flashcards" ON public.flashcards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.study_sets
      WHERE study_sets.id = flashcards.set_id
        AND study_sets.user_id = auth.uid()
    )
  );
