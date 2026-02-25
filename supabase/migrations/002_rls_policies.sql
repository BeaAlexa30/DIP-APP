-- ============================================================
-- DIP MVP RLS Policies
-- Migration: 002_rls_policies.sql
-- ============================================================

-- Enable RLS on all internal tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE index_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES — users can read/update own profile; admins see all
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- NOTE: profiles_select_admin removed — querying profiles inside a profiles policy
-- causes infinite recursion (PostgreSQL error 42P17). Admin access handled via service role.

-- ============================================================
-- PROJECTS — authenticated users can view all; only admins create/update/delete
-- ============================================================
DROP POLICY IF EXISTS "projects_select_auth" ON projects;
CREATE POLICY "projects_select_auth" ON projects
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "projects_insert_admin" ON projects;
CREATE POLICY "projects_insert_admin" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "projects_update_admin" ON projects;
CREATE POLICY "projects_update_admin" ON projects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "projects_delete_admin" ON projects;
CREATE POLICY "projects_delete_admin" ON projects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- FRAMEWORK PACKS — read by all authenticated; write by admins
-- ============================================================
DROP POLICY IF EXISTS "framework_packs_select_auth" ON framework_packs;
CREATE POLICY "framework_packs_select_auth" ON framework_packs
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "framework_packs_write_admin" ON framework_packs;
CREATE POLICY "framework_packs_write_admin" ON framework_packs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- FRAMEWORK CATEGORIES, QUESTIONS, OPTIONS, RULES
-- Read by authenticated; write by admin
-- ============================================================
DROP POLICY IF EXISTS "framework_categories_select_auth" ON framework_categories;
CREATE POLICY "framework_categories_select_auth" ON framework_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "framework_categories_write_admin" ON framework_categories;
CREATE POLICY "framework_categories_write_admin" ON framework_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "framework_questions_select_auth" ON framework_questions;
CREATE POLICY "framework_questions_select_auth" ON framework_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "framework_questions_write_admin" ON framework_questions;
CREATE POLICY "framework_questions_write_admin" ON framework_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "framework_options_select_auth" ON framework_options;
CREATE POLICY "framework_options_select_auth" ON framework_options
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "framework_options_write_admin" ON framework_options;
CREATE POLICY "framework_options_write_admin" ON framework_options
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "framework_scoring_rules_select_auth" ON framework_scoring_rules;
CREATE POLICY "framework_scoring_rules_select_auth" ON framework_scoring_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "framework_scoring_rules_write_admin" ON framework_scoring_rules;
CREATE POLICY "framework_scoring_rules_write_admin" ON framework_scoring_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- SURVEYS — authenticated users can view; admins write
-- ============================================================
DROP POLICY IF EXISTS "surveys_select_auth" ON surveys;
CREATE POLICY "surveys_select_auth" ON surveys
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "surveys_write_admin" ON surveys;
CREATE POLICY "surveys_write_admin" ON surveys
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- SURVEY TOKENS — internal read by auth; public read by token match (for respondents)
-- ============================================================
DROP POLICY IF EXISTS "survey_tokens_select_auth" ON survey_tokens;
CREATE POLICY "survey_tokens_select_auth" ON survey_tokens
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "survey_tokens_write_admin" ON survey_tokens;
CREATE POLICY "survey_tokens_write_admin" ON survey_tokens
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Public: allow token validation via anon key (respondent flow)
DROP POLICY IF EXISTS "survey_tokens_public_read" ON survey_tokens;
CREATE POLICY "survey_tokens_public_read" ON survey_tokens
  FOR SELECT USING (TRUE);

-- ============================================================
-- RESPONSES — respondents can insert; authenticated users read
-- ============================================================
DROP POLICY IF EXISTS "responses_select_auth" ON responses;
CREATE POLICY "responses_select_auth" ON responses
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow anyone (anon) to insert a response (token-linked)
DROP POLICY IF EXISTS "responses_insert_public" ON responses;
CREATE POLICY "responses_insert_public" ON responses
  FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- RESPONSE ANSWERS — same as responses
-- ============================================================
DROP POLICY IF EXISTS "response_answers_select_auth" ON response_answers;
CREATE POLICY "response_answers_select_auth" ON response_answers
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "response_answers_insert_public" ON response_answers;
CREATE POLICY "response_answers_insert_public" ON response_answers
  FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- SCORE RUNS, RESULTS, INDEXES, EXECUTIVE, RANKINGS, AI INSIGHTS
-- Read by authenticated; write by authenticated (service role / server action)
-- ============================================================
DROP POLICY IF EXISTS "score_runs_auth" ON score_runs;
CREATE POLICY "score_runs_auth" ON score_runs
  FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "score_results_auth" ON score_results;
CREATE POLICY "score_results_auth" ON score_results
  FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "index_results_auth" ON index_results;
CREATE POLICY "index_results_auth" ON index_results
  FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "executive_results_auth" ON executive_results;
CREATE POLICY "executive_results_auth" ON executive_results
  FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "issue_rankings_auth" ON issue_rankings;
CREATE POLICY "issue_rankings_auth" ON issue_rankings
  FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ai_insights_auth" ON ai_insights;
CREATE POLICY "ai_insights_auth" ON ai_insights
  FOR ALL USING (auth.uid() IS NOT NULL);
