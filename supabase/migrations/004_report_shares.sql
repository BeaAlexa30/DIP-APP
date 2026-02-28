-- ============================================================
-- REPORT SHARES
-- Shareable read-only report links for clients
-- ============================================================

CREATE TABLE IF NOT EXISTS report_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  score_run_id UUID NOT NULL REFERENCES score_runs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_report_shares_token ON report_shares(token);
CREATE INDEX IF NOT EXISTS idx_report_shares_project ON report_shares(project_id);

-- RLS Policies
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all report shares" ON report_shares;
DROP POLICY IF EXISTS "Admins can create report shares" ON report_shares;
DROP POLICY IF EXISTS "Admins can update report shares" ON report_shares;
DROP POLICY IF EXISTS "Admins can delete report shares" ON report_shares;

-- Admins can view all report shares
CREATE POLICY "Admins can view all report shares"
  ON report_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can create report shares
CREATE POLICY "Admins can create report shares"
  ON report_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update report shares
CREATE POLICY "Admins can update report shares"
  ON report_shares FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete report shares
CREATE POLICY "Admins can delete report shares"
  ON report_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_report_view(share_token TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE report_shares
  SET 
    view_count = view_count + 1,
    last_viewed_at = NOW()
  WHERE token = share_token AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;