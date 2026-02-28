-- Migration: 004_helper_functions.sql
-- Helper SQL functions for DIP MVP

-- ============================================================
-- Increment survey token response count
-- Called after respondent submits successfully
-- ============================================================
CREATE OR REPLACE FUNCTION increment_token_response_count(token_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE survey_tokens
  SET response_count = response_count + 1
  WHERE id = token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Dashboard Helper View: latest score run per survey
-- ============================================================
CREATE OR REPLACE VIEW latest_score_runs AS
SELECT DISTINCT ON (survey_id)
  id,
  survey_id,
  framework_version,
  executed_at,
  checksum,
  response_count
FROM score_runs
ORDER BY survey_id, executed_at DESC;

-- ============================================================
-- Dashboard Helper View: project summary with latest scores
-- ============================================================
CREATE OR REPLACE VIEW project_dashboard_summary AS
SELECT
  p.id AS project_id,
  p.client_name,
  p.status,
  s.id AS survey_id,
  s.status AS survey_status,
  st.response_count,
  sr.id AS score_run_id,
  sr.executed_at AS last_scored_at,
  er.health_score_0_100 AS health_score
FROM projects p
LEFT JOIN surveys s ON s.project_id = p.id
LEFT JOIN (
  SELECT DISTINCT ON (survey_id) *
  FROM survey_tokens
  ORDER BY survey_id, created_at ASC
) st ON st.survey_id = s.id
LEFT JOIN latest_score_runs sr ON sr.survey_id = s.id
LEFT JOIN executive_results er ON er.score_run_id = sr.id
ORDER BY p.created_at DESC;
