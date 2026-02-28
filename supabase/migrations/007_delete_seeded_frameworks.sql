-- ============================================================
-- Migration 010: Delete seeded framework packs
-- ============================================================
-- Removes the 6 manually-seeded framework packs introduced in
-- migrations 003 and 006.
--
-- AI-generated framework packs (version LIKE 'ai-%') are NOT
-- touched by this migration.
--
-- Deletion order:
--   1. surveys  (ON DELETE RESTRICT → must go before pack)
--      └─ cascades: survey_tokens, responses, response_answers,
--                   score_runs, score_results, index_results,
--                   executive_results, issue_rankings, ai_insights
--   2. framework_packs
--      └─ cascades: framework_categories, framework_questions,
--                   framework_options, framework_scoring_rules
-- ============================================================

BEGIN;

-- Step 1: Delete all surveys that belong to the seeded packs.
--         The ON DELETE CASCADE chain removes all downstream data.
DELETE FROM surveys
WHERE pack_id IN (
  'a1b2c3d4-0001-0001-0001-000000000001',  -- Customer Experience Decision Intelligence (v1.0)
  'a1b2c3d4-0002-0001-0001-000000000001',  -- Employee Experience & Engagement (v1.0)
  'a1b2c3d4-0003-0001-0001-000000000001',  -- SaaS Product Adoption & Retention (v1.0)
  'a1b2c3d4-0004-0001-0001-000000000001',  -- E-commerce Conversion Optimization (v1.0)
  'a1b2c3d4-0005-0001-0001-000000000001',  -- Mobile App User Experience (v1.0)
  'a1b2c3d4-0006-0001-0001-000000000001'   -- B2B Sales Process Experience (v1.0)
);

-- Step 2: Delete the packs themselves.
--         Cascades to framework_categories → framework_questions
--         → framework_options and framework_scoring_rules.
DELETE FROM framework_packs
WHERE id IN (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'a1b2c3d4-0002-0001-0001-000000000001',
  'a1b2c3d4-0003-0001-0001-000000000001',
  'a1b2c3d4-0004-0001-0001-000000000001',
  'a1b2c3d4-0005-0001-0001-000000000001',
  'a1b2c3d4-0006-0001-0001-000000000001'
);

COMMIT;
