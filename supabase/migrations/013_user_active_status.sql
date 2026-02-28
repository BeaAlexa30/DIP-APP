-- Migration 013: Add is_active flag to profiles
-- Controls whether an approved user can log in (admin can deactivate/reactivate)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- All existing users are active by default
UPDATE profiles SET is_active = TRUE WHERE is_active IS NULL;
