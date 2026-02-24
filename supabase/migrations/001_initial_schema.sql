-- ============================================================
-- DIP MVP Database Schema
-- Migration: 001_initial_schema.sql
-- Run in Supabase SQL Editor or via supabase db push
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ORGS
-- ============================================================
CREATE TABLE IF NOT EXISTS orgs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES (internal users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'analyst')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES orgs(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  client_name TEXT NOT NULL,
  industry TEXT,
  goal TEXT,
  stage TEXT,
  channels TEXT[],
  target_audience TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FRAMEWORK PACKS
-- ============================================================
CREATE TABLE IF NOT EXISTS framework_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (name, version)
);

-- ============================================================
-- FRAMEWORK CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS framework_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID NOT NULL REFERENCES framework_packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC(5,4) NOT NULL CHECK (weight >= 0 AND weight <= 1),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FRAMEWORK QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS framework_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID NOT NULL REFERENCES framework_packs(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES framework_categories(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('single_select', 'multi_select', 'scale', 'text')),
  prompt TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FRAMEWORK OPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS framework_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES framework_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value_key TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (question_id, value_key)
);

-- ============================================================
-- FRAMEWORK SCORING RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS framework_scoring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES framework_questions(id) ON DELETE CASCADE,
  option_value_key TEXT NOT NULL,
  score_delta NUMERIC(8,2) NOT NULL DEFAULT 0,
  risk_flag BOOLEAN NOT NULL DEFAULT FALSE,
  friction_flag BOOLEAN NOT NULL DEFAULT FALSE,
  driver_tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (question_id, option_value_key)
);

-- ============================================================
-- SURVEYS
-- ============================================================
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES framework_packs(id) ON DELETE RESTRICT,
  pack_version_snapshot JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SURVEY TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS survey_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  max_responses INTEGER,
  response_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESPONSES
-- ============================================================
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  token_id UUID REFERENCES survey_tokens(id) ON DELETE SET NULL,
  respondent_meta JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESPONSE ANSWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS response_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES framework_questions(id) ON DELETE RESTRICT,
  option_value_key TEXT,
  free_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCORE RUNS
-- ============================================================
CREATE TABLE IF NOT EXISTS score_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  framework_version TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  checksum TEXT NOT NULL,
  response_count INTEGER NOT NULL
);

-- ============================================================
-- SCORE RESULTS (category-level)
-- ============================================================
CREATE TABLE IF NOT EXISTS score_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score_run_id UUID NOT NULL REFERENCES score_runs(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES framework_categories(id) ON DELETE RESTRICT,
  raw_score NUMERIC(10,4) NOT NULL,
  min_possible NUMERIC(10,4) NOT NULL,
  max_possible NUMERIC(10,4) NOT NULL,
  normalized_score NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEX RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS index_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score_run_id UUID NOT NULL REFERENCES score_runs(id) ON DELETE CASCADE,
  index_key TEXT NOT NULL,
  score_0_100 NUMERIC(6,2) NOT NULL,
  higher_is_better BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXECUTIVE RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS executive_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score_run_id UUID NOT NULL REFERENCES score_runs(id) ON DELETE CASCADE,
  health_score_0_100 NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ISSUE RANKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS issue_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score_run_id UUID NOT NULL REFERENCES score_runs(id) ON DELETE CASCADE,
  driver_tag TEXT NOT NULL,
  risk NUMERIC(6,2) NOT NULL,
  friction NUMERIC(6,2) NOT NULL,
  frequency NUMERIC(6,2) NOT NULL,
  priority_score NUMERIC(6,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI INSIGHTS (summary only, never affects scoring)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score_run_id UUID NOT NULL REFERENCES score_runs(id) ON DELETE CASCADE,
  summary_text TEXT,
  themes_json JSONB,
  model_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_surveys_project_id ON surveys(project_id);
CREATE INDEX IF NOT EXISTS idx_survey_tokens_token ON survey_tokens(token);
CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_response_answers_response_id ON response_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_score_runs_survey_id ON score_runs(survey_id);
CREATE INDEX IF NOT EXISTS idx_score_results_run_id ON score_results(score_run_id);
CREATE INDEX IF NOT EXISTS idx_index_results_run_id ON index_results(score_run_id);
CREATE INDEX IF NOT EXISTS idx_issue_rankings_run_id ON issue_rankings(score_run_id);

-- ============================================================
-- Helper: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS surveys_updated_at ON surveys;
CREATE TRIGGER surveys_updated_at BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
