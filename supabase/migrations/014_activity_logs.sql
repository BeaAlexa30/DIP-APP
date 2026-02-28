-- Migration 014: Activity Logs
-- Tracks user actions for admin audit trail

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_action_idx ON activity_logs(action);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at DESC);

-- Only admins can read via service client; no direct RLS needed (service key bypasses)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to activity_logs" ON activity_logs;
CREATE POLICY "Service role full access to activity_logs"
  ON activity_logs FOR ALL
  USING (true)
  WITH CHECK (true);
