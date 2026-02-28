-- ============================================================
-- DIP Settings & Analyst Approval Workflow
-- Migration: 011_settings_and_approval.sql
-- ============================================================

-- ── 1. Add approval status to profiles ──────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Mark any existing profiles as approved (they were created before this system)
UPDATE profiles SET status = 'approved' WHERE status IS NULL OR status = '';

-- ── 2. Update the new-user trigger so analysts start as 'pending'
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'analyst');

  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    user_role,
    CASE WHEN user_role = 'analyst' THEN 'pending' ELSE 'approved' END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 3. App settings table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  id             TEXT PRIMARY KEY DEFAULT 'default',
  company_name   TEXT NOT NULL DEFAULT 'Decision Intelligence',
  logo_url       TEXT,
  primary_color  TEXT NOT NULL DEFAULT '#6d28d9',
  footer_tagline TEXT DEFAULT 'Internal Decision Intelligence Platform',
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings row (idempotent)
INSERT INTO app_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- ── 4. Supabase Storage bucket for logo / assets ─────────────
-- Run this block only if the bucket does not exist yet.
-- If it already exists, the INSERT is skipped via ON CONFLICT.
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT DO NOTHING;

-- Allow any authenticated user to READ from the public bucket
DROP POLICY IF EXISTS "Public read app-assets" ON storage.objects;
CREATE POLICY "Public read app-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app-assets');

-- Allow admins to INSERT / UPDATE / DELETE in the bucket
DROP POLICY IF EXISTS "Admin manage app-assets" ON storage.objects;
CREATE POLICY "Admin manage app-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'app-assets'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin update app-assets" ON storage.objects;
CREATE POLICY "Admin update app-assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'app-assets'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin delete app-assets" ON storage.objects;
CREATE POLICY "Admin delete app-assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'app-assets'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ── 5. RLS for app_settings (read-all / write-admin) ────────
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read settings" ON app_settings;
CREATE POLICY "Anyone can read settings"
  ON app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can update settings" ON app_settings;
CREATE POLICY "Admin can update settings"
  ON app_settings FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
