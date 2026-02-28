-- ============================================================
-- Migration 012: Add password_change_required flag to profiles
-- Set to TRUE when an admin creates an account with a temporary password.
-- Cleared to FALSE after the analyst sets their own password.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN NOT NULL DEFAULT FALSE;
