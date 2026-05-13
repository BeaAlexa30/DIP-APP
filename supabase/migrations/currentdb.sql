-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  user_email text NOT NULL,
  user_name text,
  action text NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.ai_insights (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  score_run_id uuid NOT NULL,
  summary_text text,
  themes_json jsonb,
  model_metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  root_causes_json jsonb,
  action_plan_json jsonb,
  success_metrics_json jsonb,
  risk_level text,
  CONSTRAINT ai_insights_pkey PRIMARY KEY (id),
  CONSTRAINT ai_insights_score_run_id_fkey FOREIGN KEY (score_run_id) REFERENCES public.score_runs(id)
);
CREATE TABLE public.app_settings (
  id text NOT NULL DEFAULT 'default'::text,
  company_name text NOT NULL DEFAULT 'Decision Intelligence'::text,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#6d28d9'::text,
  footer_tagline text DEFAULT 'Internal Decision Intelligence Platform'::text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.executive_results (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  score_run_id uuid NOT NULL,
  health_score_0_100 numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT executive_results_pkey PRIMARY KEY (id),
  CONSTRAINT executive_results_score_run_id_fkey FOREIGN KEY (score_run_id) REFERENCES public.score_runs(id)
);
CREATE TABLE public.framework_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  pack_id uuid NOT NULL,
  name text NOT NULL,
  weight numeric NOT NULL CHECK (weight >= 0::numeric AND weight <= 1::numeric),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT framework_categories_pkey PRIMARY KEY (id),
  CONSTRAINT framework_categories_pack_id_fkey FOREIGN KEY (pack_id) REFERENCES public.framework_packs(id)
);
CREATE TABLE public.framework_options (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  question_id uuid NOT NULL,
  label text NOT NULL,
  value_key text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT framework_options_pkey PRIMARY KEY (id),
  CONSTRAINT framework_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.framework_questions(id)
);
CREATE TABLE public.framework_packs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  version text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT framework_packs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.framework_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  pack_id uuid NOT NULL,
  category_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['single_select'::text, 'multi_select'::text, 'scale'::text, 'text'::text])),
  prompt text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT framework_questions_pkey PRIMARY KEY (id),
  CONSTRAINT framework_questions_pack_id_fkey FOREIGN KEY (pack_id) REFERENCES public.framework_packs(id),
  CONSTRAINT framework_questions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.framework_categories(id)
);
CREATE TABLE public.framework_scoring_rules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  question_id uuid NOT NULL,
  option_value_key text NOT NULL,
  score_delta numeric NOT NULL DEFAULT 0,
  risk_flag boolean NOT NULL DEFAULT false,
  friction_flag boolean NOT NULL DEFAULT false,
  driver_tag text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT framework_scoring_rules_pkey PRIMARY KEY (id),
  CONSTRAINT framework_scoring_rules_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.framework_questions(id)
);
CREATE TABLE public.index_results (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  score_run_id uuid NOT NULL,
  index_key text NOT NULL,
  score_0_100 numeric NOT NULL,
  higher_is_better boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT index_results_pkey PRIMARY KEY (id),
  CONSTRAINT index_results_score_run_id_fkey FOREIGN KEY (score_run_id) REFERENCES public.score_runs(id)
);
CREATE TABLE public.issue_rankings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  score_run_id uuid NOT NULL,
  driver_tag text NOT NULL,
  risk numeric NOT NULL,
  friction numeric NOT NULL,
  frequency numeric NOT NULL,
  priority_score numeric NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT issue_rankings_pkey PRIMARY KEY (id),
  CONSTRAINT issue_rankings_score_run_id_fkey FOREIGN KEY (score_run_id) REFERENCES public.score_runs(id)
);
CREATE TABLE public.orgs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orgs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  org_id uuid,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'analyst'::text CHECK (role = ANY (ARRAY['admin'::text, 'analyst'::text])),
  created_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'approved'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  password_change_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  created_by uuid NOT NULL,
  client_name text NOT NULL,
  industry text,
  goal text,
  stage text,
  channels ARRAY,
  target_audience text,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'completed'::text, 'archived'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id),
  CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.report_shares (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  score_run_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  view_count integer DEFAULT 0,
  last_viewed_at timestamp with time zone,
  is_active boolean DEFAULT true,
  CONSTRAINT report_shares_pkey PRIMARY KEY (id),
  CONSTRAINT report_shares_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT report_shares_score_run_id_fkey FOREIGN KEY (score_run_id) REFERENCES public.score_runs(id),
  CONSTRAINT report_shares_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.response_answers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  response_id uuid NOT NULL,
  question_id uuid NOT NULL,
  option_value_key text,
  free_text text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT response_answers_pkey PRIMARY KEY (id),
  CONSTRAINT response_answers_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.responses(id),
  CONSTRAINT response_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.framework_questions(id)
);
CREATE TABLE public.responses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  survey_id uuid NOT NULL,
  token_id uuid,
  respondent_meta jsonb,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT responses_pkey PRIMARY KEY (id),
  CONSTRAINT responses_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id),
  CONSTRAINT responses_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.survey_tokens(id)
);
CREATE TABLE public.score_results (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  score_run_id uuid NOT NULL,
  category_id uuid,
  raw_score numeric NOT NULL,
  min_possible numeric NOT NULL,
  max_possible numeric NOT NULL,
  normalized_score numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  ai_category_name text,
  CONSTRAINT score_results_pkey PRIMARY KEY (id),
  CONSTRAINT score_results_score_run_id_fkey FOREIGN KEY (score_run_id) REFERENCES public.score_runs(id),
  CONSTRAINT score_results_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.framework_categories(id)
);
CREATE TABLE public.score_runs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  survey_id uuid NOT NULL,
  framework_version text NOT NULL,
  executed_at timestamp with time zone DEFAULT now(),
  checksum text NOT NULL,
  response_count integer NOT NULL,
  CONSTRAINT score_runs_pkey PRIMARY KEY (id),
  CONSTRAINT score_runs_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id)
);
CREATE TABLE public.survey_tokens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  survey_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone,
  max_responses integer,
  response_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT survey_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT survey_tokens_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id)
);
CREATE TABLE public.surveys (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  pack_id uuid,
  pack_version_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'closed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT surveys_pkey PRIMARY KEY (id),
  CONSTRAINT surveys_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT surveys_pack_id_fkey FOREIGN KEY (pack_id) REFERENCES public.framework_packs(id)
);