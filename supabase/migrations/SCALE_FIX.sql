-- ============================================================
-- FIX ALL SCALE QUESTIONS TO USE 1-5 SCALE CONSISTENTLY
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================================

-- Step 1: Update question prompts to use (1-5) scale
-- ============================================================

-- Framework v1.0 Q20: Change (0-10) to (1-5)
UPDATE framework_questions
SET prompt = 'On a scale of 1–5, how likely are you to recommend this to a friend or colleague? (NPS)'
WHERE id = '00000000-0000-0000-0000-000000000020';

-- Employee Experience Q18: Change (0-10) to (1-5)
UPDATE framework_questions
SET prompt = 'Overall, how likely are you to recommend this company as a great place to work? (1-5)'
WHERE id = '00000000-0002-0000-0000-000000000018';

-- SaaS Q5: Change (1-10) to (1-5)
UPDATE framework_questions
SET prompt = 'How much of the product''s features do you actively use? (1-5)'
WHERE id = '00000000-0003-0000-0000-000000000005';

-- SaaS Q12: Change (0-10) to (1-5)
UPDATE framework_questions
SET prompt = 'How likely are you to renew your subscription? (1-5)'
WHERE id = '00000000-0003-0000-0000-000000000012';

-- E-commerce Q13: Change (0-10) to (1-5)
UPDATE framework_questions
SET prompt = 'How likely are you to shop with us again? (1-5)'
WHERE id = '00000000-0004-0000-0000-000000000013';

-- Mobile App Q13: Change (0-10) to (1-5)
UPDATE framework_questions
SET prompt = 'How likely are you to recommend this app? (1-5)'
WHERE id = '00000000-0005-0000-0000-000000000013';

-- Step 2: Delete old scoring rules for these questions
-- ============================================================

DELETE FROM framework_scoring_rules WHERE question_id = '00000000-0000-0000-0000-000000000020';
DELETE FROM framework_scoring_rules WHERE question_id = '00000000-0002-0000-0000-000000000018';
DELETE FROM framework_scoring_rules WHERE question_id = '00000000-0003-0000-0000-000000000005';
DELETE FROM framework_scoring_rules WHERE question_id = '00000000-0003-0000-0000-000000000012';
DELETE FROM framework_scoring_rules WHERE question_id = '00000000-0004-0000-0000-000000000013';
DELETE FROM framework_scoring_rules WHERE question_id = '00000000-0005-0000-0000-000000000013';

-- Step 2b: Delete old options for Q20 (had 11 options, needs 5)
-- ============================================================

DELETE FROM framework_options WHERE question_id = '00000000-0000-0000-0000-000000000020';

-- Step 2c: Insert new 1-5 options for Q20
-- ============================================================

INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000020', '1', 'q20_1', 1),
  ('00000000-0000-0000-0000-000000000020', '2', 'q20_2', 2),
  ('00000000-0000-0000-0000-000000000020', '3', 'q20_3', 3),
  ('00000000-0000-0000-0000-000000000020', '4', 'q20_4', 4),
  ('00000000-0000-0000-0000-000000000020', '5', 'q20_5', 5);

-- Step 3: Insert new 1-5 scoring rules
-- ============================================================

-- Framework v1.0 Q20: NPS (1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag)
SELECT '00000000-0000-0000-0000-000000000020', value::text, value * 2, 
  CASE WHEN value <= 2 THEN TRUE ELSE FALSE END,
  CASE WHEN value = 1 THEN TRUE ELSE FALSE END,
  'nps'
FROM generate_series(1, 5) AS value;

-- Employee Experience Q18: Recommend company (1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag)
SELECT '00000000-0002-0000-0000-000000000018', value::text, value * 2, 
  CASE WHEN value <= 2 THEN TRUE ELSE FALSE END,
  CASE WHEN value = 1 THEN TRUE ELSE FALSE END,
  'nps'
FROM generate_series(1, 5) AS value;

-- SaaS Q5: Feature usage (1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag)
SELECT '00000000-0003-0000-0000-000000000005', value::text, value * 2, 
  CASE WHEN value <= 2 THEN TRUE ELSE FALSE END,
  CASE WHEN value = 1 THEN TRUE ELSE FALSE END,
  'feature_adoption'
FROM generate_series(1, 5) AS value;

-- SaaS Q12: Renewal likelihood (1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag)
SELECT '00000000-0003-0000-0000-000000000012', value::text, value * 2, 
  CASE WHEN value <= 2 THEN TRUE ELSE FALSE END,
  CASE WHEN value = 1 THEN TRUE ELSE FALSE END,
  'retention'
FROM generate_series(1, 5) AS value;

-- E-commerce Q13: Shop again likelihood (1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag)
SELECT '00000000-0004-0000-0000-000000000013', value::text, value * 2, 
  CASE WHEN value <= 2 THEN TRUE ELSE FALSE END,
  CASE WHEN value = 1 THEN TRUE ELSE FALSE END,
  'retention'
FROM generate_series(1, 5) AS value;

-- Mobile App Q13: Recommend app (1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag)
SELECT '00000000-0005-0000-0000-000000000013', value::text, value * 2, 
  CASE WHEN value <= 2 THEN TRUE ELSE FALSE END,
  CASE WHEN value = 1 THEN TRUE ELSE FALSE END,
  'nps'
FROM generate_series(1, 5) AS value;

-- ============================================================
-- DONE! All scale questions now use 1-5 scale consistently
-- ============================================================
-- 
-- Questions updated:
-- - Framework v1.0 Q20: NPS (0-10 → 1-5)
-- - Employee Experience Q18: Recommend company (0-10 → 1-5)
-- - SaaS Q5: Feature usage (0-100% → 1-5)
-- - SaaS Q12: Renewal likelihood (0-10 → 1-5)
-- - E-commerce Q13: Shop again (0-10 → 1-5)
-- - Mobile App Q13: Recommend app (0-10 → 1-5)
--
-- Next steps:
-- 1. Go to each survey in the UI
-- 2. Click "Refresh Survey Options" button
-- 3. Survey will now show 1-5 buttons for all scale questions
-- ============================================================
