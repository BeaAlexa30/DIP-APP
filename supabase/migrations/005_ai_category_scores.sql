-- ============================================================
-- Migration 008: AI-Determined Category Scores
-- ============================================================
-- The AI Scoring Engine now defines its own scoring categories
-- based on the survey's focus and project context, rather than
-- being constrained to the seeded framework_categories.
--
-- Changes:
--   1. Make category_id nullable (AI-scored runs omit it)
--   2. Add ai_category_name for AI-derived category labels
-- ============================================================

-- 1. Drop NOT NULL constraint on category_id
ALTER TABLE score_results ALTER COLUMN category_id DROP NOT NULL;

-- 2. Add ai_category_name column
ALTER TABLE score_results ADD COLUMN IF NOT EXISTS ai_category_name TEXT;

-- 3. Add index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_score_results_ai_category ON score_results(score_run_id, ai_category_name);

-- Notes:
--   - Deterministic (non-AI) runs continue to use category_id (FK to framework_categories)
--   - AI-scored runs populate ai_category_name and leave category_id NULL
--   - Display code should use: ai_category_name ?? framework_categories?.name ?? category_id
