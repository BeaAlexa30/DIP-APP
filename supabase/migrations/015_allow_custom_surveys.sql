-- ============================================================
-- Allow custom surveys without framework pack reference
-- Migration: 015_allow_custom_surveys.sql
-- ============================================================

-- Make pack_id nullable to support custom surveys
ALTER TABLE surveys
  ALTER COLUMN pack_id DROP NOT NULL;

-- Drop constraint if it exists, then add it (idempotent)
ALTER TABLE surveys
  DROP CONSTRAINT IF EXISTS surveys_pack_or_custom;

-- Add check constraint to ensure either pack_id exists OR it's a custom survey
-- (custom surveys will have custom_survey: true in pack_version_snapshot)
ALTER TABLE surveys
  ADD CONSTRAINT surveys_pack_or_custom CHECK (
    pack_id IS NOT NULL OR 
    (pack_version_snapshot->>'custom_survey')::boolean = true
  );

COMMENT ON COLUMN surveys.pack_id IS 'References framework_packs for standard surveys. NULL for custom surveys.';
