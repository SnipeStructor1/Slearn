/*
# Add customization columns to study_sets

1. Modified Tables
- `study_sets`: Added `color_theme` (text, default 'cyan') and `icon_name` (text, default 'BookOpen')
  These let set owners customize the visual appearance of their study set cards and headers.

2. Security
- No RLS policy changes — the new columns are writable by the set owner via the existing
  UPDATE policy, and readable by anyone who can already SELECT the row.

3. Allowed values
- color_theme: cyan, emerald, orange, violet, pink, red, amber, blue, teal, slate
- icon_name: any lucide-react icon name string (validated on the frontend)
*/

ALTER TABLE study_sets ADD COLUMN IF NOT EXISTS color_theme text NOT NULL DEFAULT 'cyan';
ALTER TABLE study_sets ADD COLUMN IF NOT EXISTS icon_name text NOT NULL DEFAULT 'BookOpen';

-- Update existing mock sets with varied themes
UPDATE study_sets SET color_theme = 'emerald', icon_name = 'Dna' WHERE subject = 'Biology';
UPDATE study_sets SET color_theme = 'pink', icon_name = 'Languages' WHERE subject = 'French';
UPDATE study_sets SET color_theme = 'orange', icon_name = 'FlaskConical' WHERE subject = 'Chemistry';
UPDATE study_sets SET color_theme = 'amber', icon_name = 'Scroll' WHERE subject = 'History';
UPDATE study_sets SET color_theme = 'violet', icon_name = 'Sigma' WHERE subject = 'Math';
UPDATE study_sets SET color_theme = 'blue', icon_name = 'Atom' WHERE subject = 'Physics';
UPDATE study_sets SET color_theme = 'red', icon_name = 'Utensils' WHERE subject = 'Spanish';
UPDATE study_sets SET color_theme = 'teal', icon_name = 'Globe2' WHERE subject = 'Geography';
UPDATE study_sets SET color_theme = 'cyan', icon_name = 'BookOpen' WHERE color_theme = 'cyan' AND icon_name = 'BookOpen' AND subject = 'General';