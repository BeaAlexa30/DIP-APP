-- ─────────────────────────────────────────────────────────────
-- Migration 009: Archive Project — Survey Status Tracking
-- ─────────────────────────────────────────────────────────────
-- Adds `pre_archive_status` to the surveys table so that when a
-- project is un-archived we can restore each survey to exactly
-- its state BEFORE the project was archived, rather than naively
-- marking every closed survey as published.

ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS pre_archive_status TEXT
    CHECK (pre_archive_status IN ('draft', 'published', 'closed'));

COMMENT ON COLUMN surveys.pre_archive_status IS
  'Stores the survey status that was in effect immediately before
   the parent project was archived. Used to restore the correct
   status when the project is un-archived. NULL when the project
   is not archived.';
