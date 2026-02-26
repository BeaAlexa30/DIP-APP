-- ============================================================
-- DIP MVP Framework Seed — Framework Pack v1.0
-- Migration: 003_seed_framework_v1.sql
-- Customer Experience Decision Intelligence Framework
-- ============================================================

-- UUIDs used in this file:
--   Pack:        a1b2c3d4-0001-0001-0001-000000000001
--   Category 1:  ca000001-0001-0001-0001-000000000001
--   Category 2:  ca000001-0001-0001-0001-000000000002
--   Category 3:  ca000001-0001-0001-0001-000000000003
--   Category 4:  ca000001-0001-0001-0001-000000000004
--   Category 5:  ca000001-0001-0001-0001-000000000005
--   Questions:   00000000-0000-0000-0000-000000000001 .. 000000000021

-- Pack
INSERT INTO framework_packs (id, name, version, description, active)
VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Customer Experience Decision Intelligence',
  '1.0',
  'Comprehensive CX evaluation framework covering trust, usability, conversion, experience, and loyalty dimensions.',
  TRUE
) ON CONFLICT (name, version) DO NOTHING;

-- ============================================================
-- CATEGORIES (5 categories, weights sum to 1.0)
-- ============================================================
INSERT INTO framework_categories (id, pack_id, name, weight, order_index) VALUES
  ('ca000001-0001-0001-0001-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'Trust & Security Perception',    0.20, 1),
  ('ca000001-0001-0001-0001-000000000002', 'a1b2c3d4-0001-0001-0001-000000000001', 'Usability & Navigation',         0.25, 2),
  ('ca000001-0001-0001-0001-000000000003', 'a1b2c3d4-0001-0001-0001-000000000001', 'Conversion & Decision Friction', 0.25, 3),
  ('ca000001-0001-0001-0001-000000000004', 'a1b2c3d4-0001-0001-0001-000000000001', 'Overall Experience Quality',     0.20, 4),
  ('ca000001-0001-0001-0001-000000000005', 'a1b2c3d4-0001-0001-0001-000000000001', 'Loyalty & Advocacy Potential',   0.10, 5)
ON CONFLICT DO NOTHING;

-- ============================================================
-- QUESTIONS
-- ============================================================

-- Category 1: Trust & Security Perception (Q1-Q4)
INSERT INTO framework_questions (id, pack_id, category_id, type, prompt, required, order_index) VALUES
  ('00000000-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000001', 'single_select',
   'How confident do you feel that your personal data is secure when using this product/service?', TRUE, 1),
  ('00000000-0000-0000-0000-000000000002', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000001', 'single_select',
   'How transparent is the company about how your data is used?', TRUE, 2),
  ('00000000-0000-0000-0000-000000000003', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000001', 'single_select',
   'How much do you trust the reviews and social proof shown on the platform?', TRUE, 3),
  ('00000000-0000-0000-0000-000000000004', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000001', 'single_select',
   'Have you ever hesitated to complete an action due to security concerns?', TRUE, 4),

-- Category 2: Usability & Navigation (Q5-Q9)
  ('00000000-0000-0000-0000-000000000005', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000002', 'single_select',
   'How easy is it to find what you are looking for on this platform?', TRUE, 1),
  ('00000000-0000-0000-0000-000000000006', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000002', 'scale',
   'On a scale of 1–5, how intuitive is the interface? (1 = Very Confusing, 5 = Very Intuitive)', TRUE, 2),
  ('00000000-0000-0000-0000-000000000007', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000002', 'single_select',
   'How often do you encounter errors or broken features?', TRUE, 3),
  ('00000000-0000-0000-0000-000000000008', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000002', 'single_select',
   'How well does the platform work on your preferred device (mobile/desktop)?', TRUE, 4),
  ('00000000-0000-0000-0000-000000000009', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000002', 'single_select',
   'How quickly does the platform respond to your actions?', TRUE, 5),

-- Category 3: Conversion & Decision Friction (Q10-Q14)
  ('00000000-0000-0000-0000-000000000010', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000003', 'single_select',
   'How easy is it to complete a purchase or primary action on this platform?', TRUE, 1),
  ('00000000-0000-0000-0000-000000000011', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000003', 'single_select',
   'Have you ever abandoned a purchase or action midway? If yes, what was the primary reason?', TRUE, 2),
  ('00000000-0000-0000-0000-000000000012', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000003', 'single_select',
   'How clear and helpful are the product/service descriptions and pricing?', TRUE, 3),
  ('00000000-0000-0000-0000-000000000013', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000003', 'single_select',
   'How many steps did it take to complete your most recent primary action?', TRUE, 4),
  ('00000000-0000-0000-0000-000000000014', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000003', 'single_select',
   'How satisfied are you with the checkout or conversion process?', TRUE, 5),

-- Category 4: Overall Experience Quality (Q15-Q18)
  ('00000000-0000-0000-0000-000000000015', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000004', 'scale',
   'Overall, how would you rate your experience with this product/service? (1–5)', TRUE, 1),
  ('00000000-0000-0000-0000-000000000016', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000004', 'single_select',
   'How responsive and helpful is customer support when you need it?', TRUE, 2),
  ('00000000-0000-0000-0000-000000000017', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000004', 'single_select',
   'How well does the product/service meet your initial expectations?', TRUE, 3),
  ('00000000-0000-0000-0000-000000000018', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000004', 'single_select',
   'How often do you experience friction or frustration during a typical session?', TRUE, 4),

-- Category 5: Loyalty & Advocacy Potential (Q19-Q21)
  ('00000000-0000-0000-0000-000000000019', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000005', 'single_select',
   'How likely are you to use this product/service again in the future?', TRUE, 1),
  ('00000000-0000-0000-0000-000000000020', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000005', 'scale',
   'On a scale of 1–5, how likely are you to recommend this to a friend or colleague? (NPS)', TRUE, 2),
  ('00000000-0000-0000-0000-000000000021', 'a1b2c3d4-0001-0001-0001-000000000001', 'ca000001-0001-0001-0001-000000000005', 'single_select',
   'Have you already recommended this product/service to someone?', TRUE, 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- OPTIONS & SCORING RULES
-- Format: option value_key, label, then scoring rule (score_delta, risk_flag, friction_flag, driver_tag)
-- ============================================================

-- Q1: Data security confidence
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Very confident',         'q1_very_confident',   1),
  ('00000000-0000-0000-0000-000000000001', 'Somewhat confident',     'q1_somewhat_conf',    2),
  ('00000000-0000-0000-0000-000000000001', 'Neutral',                'q1_neutral',          3),
  ('00000000-0000-0000-0000-000000000001', 'Somewhat concerned',     'q1_somewhat_concern', 4),
  ('00000000-0000-0000-0000-000000000001', 'Very concerned',         'q1_very_concern',     5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000001', 'q1_very_confident',   10, FALSE, FALSE, 'data_security'),
  ('00000000-0000-0000-0000-000000000001', 'q1_somewhat_conf',     7, FALSE, FALSE, 'data_security'),
  ('00000000-0000-0000-0000-000000000001', 'q1_neutral',           4, FALSE, FALSE, 'data_security'),
  ('00000000-0000-0000-0000-000000000001', 'q1_somewhat_concern',  1, TRUE,  FALSE, 'data_security'),
  ('00000000-0000-0000-0000-000000000001', 'q1_very_concern',      0, TRUE,  FALSE, 'data_security')
ON CONFLICT DO NOTHING;

-- Q2: Data transparency
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Very transparent',       'q2_very_trans',   1),
  ('00000000-0000-0000-0000-000000000002', 'Somewhat transparent',   'q2_somewhat',     2),
  ('00000000-0000-0000-0000-000000000002', 'Neutral',                'q2_neutral',      3),
  ('00000000-0000-0000-0000-000000000002', 'Somewhat opaque',        'q2_opaque',       4),
  ('00000000-0000-0000-0000-000000000002', 'Very opaque',            'q2_very_opaque',  5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000002', 'q2_very_trans',  10, FALSE, FALSE, 'transparency'),
  ('00000000-0000-0000-0000-000000000002', 'q2_somewhat',     7, FALSE, FALSE, 'transparency'),
  ('00000000-0000-0000-0000-000000000002', 'q2_neutral',      4, FALSE, FALSE, 'transparency'),
  ('00000000-0000-0000-0000-000000000002', 'q2_opaque',       1, TRUE,  FALSE, 'transparency'),
  ('00000000-0000-0000-0000-000000000002', 'q2_very_opaque',  0, TRUE,  FALSE, 'transparency')
ON CONFLICT DO NOTHING;

-- Q3: Trust in social proof
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000003', 'Fully trust them',        'q3_full_trust',    1),
  ('00000000-0000-0000-0000-000000000003', 'Mostly trust them',       'q3_mostly_trust',  2),
  ('00000000-0000-0000-0000-000000000003', 'Neutral / unsure',        'q3_neutral',       3),
  ('00000000-0000-0000-0000-000000000003', 'Slightly skeptical',      'q3_skeptical',     4),
  ('00000000-0000-0000-0000-000000000003', 'Do not trust them',       'q3_no_trust',      5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000003', 'q3_full_trust',   10, FALSE, FALSE, 'social_proof'),
  ('00000000-0000-0000-0000-000000000003', 'q3_mostly_trust',  7, FALSE, FALSE, 'social_proof'),
  ('00000000-0000-0000-0000-000000000003', 'q3_neutral',       4, FALSE, FALSE, 'social_proof'),
  ('00000000-0000-0000-0000-000000000003', 'q3_skeptical',     2, TRUE,  FALSE, 'social_proof'),
  ('00000000-0000-0000-0000-000000000003', 'q3_no_trust',      0, TRUE,  FALSE, 'social_proof')
ON CONFLICT DO NOTHING;

-- Q4: Security hesitation
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000004', 'Never',                   'q4_never',     1),
  ('00000000-0000-0000-0000-000000000004', 'Rarely',                  'q4_rarely',    2),
  ('00000000-0000-0000-0000-000000000004', 'Sometimes',               'q4_sometimes', 3),
  ('00000000-0000-0000-0000-000000000004', 'Often',                   'q4_often',     4),
  ('00000000-0000-0000-0000-000000000004', 'Always',                  'q4_always',    5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000004', 'q4_never',     10, FALSE, FALSE, 'security_friction'),
  ('00000000-0000-0000-0000-000000000004', 'q4_rarely',     7, FALSE, TRUE,  'security_friction'),
  ('00000000-0000-0000-0000-000000000004', 'q4_sometimes',  3, TRUE,  TRUE,  'security_friction'),
  ('00000000-0000-0000-0000-000000000004', 'q4_often',      1, TRUE,  TRUE,  'security_friction'),
  ('00000000-0000-0000-0000-000000000004', 'q4_always',     0, TRUE,  TRUE,  'security_friction')
ON CONFLICT DO NOTHING;

-- Q5: Ease of finding content
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000005', 'Very easy',               'q5_very_easy',  1),
  ('00000000-0000-0000-0000-000000000005', 'Easy',                    'q5_easy',       2),
  ('00000000-0000-0000-0000-000000000005', 'Neutral',                 'q5_neutral',    3),
  ('00000000-0000-0000-0000-000000000005', 'Difficult',               'q5_difficult',  4),
  ('00000000-0000-0000-0000-000000000005', 'Very difficult',          'q5_very_hard',  5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000005', 'q5_very_easy', 10, FALSE, FALSE, 'navigation'),
  ('00000000-0000-0000-0000-000000000005', 'q5_easy',       7, FALSE, FALSE, 'navigation'),
  ('00000000-0000-0000-0000-000000000005', 'q5_neutral',    4, FALSE, FALSE, 'navigation'),
  ('00000000-0000-0000-0000-000000000005', 'q5_difficult',  1, FALSE, TRUE,  'navigation'),
  ('00000000-0000-0000-0000-000000000005', 'q5_very_hard',  0, FALSE, TRUE,  'navigation')
ON CONFLICT DO NOTHING;

-- Q6: Interface intuitiveness (scale 1–5)
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000006', '1 - Very Confusing',   'q6_1', 1),
  ('00000000-0000-0000-0000-000000000006', '2 - Confusing',        'q6_2', 2),
  ('00000000-0000-0000-0000-000000000006', '3 - Neutral',          'q6_3', 3),
  ('00000000-0000-0000-0000-000000000006', '4 - Intuitive',        'q6_4', 4),
  ('00000000-0000-0000-0000-000000000006', '5 - Very Intuitive',   'q6_5', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000006', 'q6_1',  0, FALSE, TRUE,  'usability'),
  ('00000000-0000-0000-0000-000000000006', 'q6_2',  2, FALSE, TRUE,  'usability'),
  ('00000000-0000-0000-0000-000000000006', 'q6_3',  5, FALSE, FALSE, 'usability'),
  ('00000000-0000-0000-0000-000000000006', 'q6_4',  8, FALSE, FALSE, 'usability'),
  ('00000000-0000-0000-0000-000000000006', 'q6_5', 10, FALSE, FALSE, 'usability')
ON CONFLICT DO NOTHING;

-- Q7: Error frequency
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000007', 'Never',         'q7_never',     1),
  ('00000000-0000-0000-0000-000000000007', 'Rarely',        'q7_rarely',    2),
  ('00000000-0000-0000-0000-000000000007', 'Sometimes',     'q7_sometimes', 3),
  ('00000000-0000-0000-0000-000000000007', 'Often',         'q7_often',     4),
  ('00000000-0000-0000-0000-000000000007', 'Very often',    'q7_very',      5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000007', 'q7_never',     10, FALSE, FALSE, 'reliability'),
  ('00000000-0000-0000-0000-000000000007', 'q7_rarely',     7, FALSE, FALSE, 'reliability'),
  ('00000000-0000-0000-0000-000000000007', 'q7_sometimes',  4, FALSE, TRUE,  'reliability'),
  ('00000000-0000-0000-0000-000000000007', 'q7_often',      1, TRUE,  TRUE,  'reliability'),
  ('00000000-0000-0000-0000-000000000007', 'q7_very',       0, TRUE,  TRUE,  'reliability')
ON CONFLICT DO NOTHING;

-- Q8: Device compatibility
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000008', 'Works perfectly',         'q8_perfect',    1),
  ('00000000-0000-0000-0000-000000000008', 'Works well',              'q8_well',       2),
  ('00000000-0000-0000-0000-000000000008', 'Works adequately',        'q8_adequate',   3),
  ('00000000-0000-0000-0000-000000000008', 'Has some issues',         'q8_issues',     4),
  ('00000000-0000-0000-0000-000000000008', 'Works poorly',            'q8_poor',       5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000008', 'q8_perfect',   10, FALSE, FALSE, 'device_compat'),
  ('00000000-0000-0000-0000-000000000008', 'q8_well',       7, FALSE, FALSE, 'device_compat'),
  ('00000000-0000-0000-0000-000000000008', 'q8_adequate',   4, FALSE, FALSE, 'device_compat'),
  ('00000000-0000-0000-0000-000000000008', 'q8_issues',     2, FALSE, TRUE,  'device_compat'),
  ('00000000-0000-0000-0000-000000000008', 'q8_poor',       0, TRUE,  TRUE,  'device_compat')
ON CONFLICT DO NOTHING;

-- Q9: Platform responsiveness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000009', 'Very fast',     'q9_very_fast', 1),
  ('00000000-0000-0000-0000-000000000009', 'Fast',          'q9_fast',      2),
  ('00000000-0000-0000-0000-000000000009', 'Acceptable',    'q9_ok',        3),
  ('00000000-0000-0000-0000-000000000009', 'Slow',          'q9_slow',      4),
  ('00000000-0000-0000-0000-000000000009', 'Very slow',     'q9_very_slow', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000009', 'q9_very_fast', 10, FALSE, FALSE, 'performance'),
  ('00000000-0000-0000-0000-000000000009', 'q9_fast',       8, FALSE, FALSE, 'performance'),
  ('00000000-0000-0000-0000-000000000009', 'q9_ok',         5, FALSE, FALSE, 'performance'),
  ('00000000-0000-0000-0000-000000000009', 'q9_slow',       2, FALSE, TRUE,  'performance'),
  ('00000000-0000-0000-0000-000000000009', 'q9_very_slow',  0, TRUE,  TRUE,  'performance')
ON CONFLICT DO NOTHING;

-- Q10: Ease of completing primary action
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000010', 'Very easy',      'q10_very_easy', 1),
  ('00000000-0000-0000-0000-000000000010', 'Easy',           'q10_easy',      2),
  ('00000000-0000-0000-0000-000000000010', 'Neutral',        'q10_neutral',   3),
  ('00000000-0000-0000-0000-000000000010', 'Difficult',      'q10_difficult', 4),
  ('00000000-0000-0000-0000-000000000010', 'Very difficult', 'q10_very_hard', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000010', 'q10_very_easy', 10, FALSE, FALSE, 'conversion_ease'),
  ('00000000-0000-0000-0000-000000000010', 'q10_easy',       7, FALSE, FALSE, 'conversion_ease'),
  ('00000000-0000-0000-0000-000000000010', 'q10_neutral',    4, FALSE, FALSE, 'conversion_ease'),
  ('00000000-0000-0000-0000-000000000010', 'q10_difficult',  1, TRUE,  TRUE,  'conversion_ease'),
  ('00000000-0000-0000-0000-000000000010', 'q10_very_hard',  0, TRUE,  TRUE,  'conversion_ease')
ON CONFLICT DO NOTHING;

-- Q11: Abandonment reason
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000011', 'No, I have never abandoned',                   'q11_no',        1),
  ('00000000-0000-0000-0000-000000000011', 'Yes — too complicated / confusing',            'q11_confusing', 2),
  ('00000000-0000-0000-0000-000000000011', 'Yes — security / trust concerns',              'q11_security',  3),
  ('00000000-0000-0000-0000-000000000011', 'Yes — price / cost was unexpected',            'q11_price',     4),
  ('00000000-0000-0000-0000-000000000011', 'Yes — technical problem',                      'q11_technical', 5),
  ('00000000-0000-0000-0000-000000000011', 'Yes — changed my mind / no longer needed',     'q11_changed',   6)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000011', 'q11_no',        10, FALSE, FALSE, 'abandonment'),
  ('00000000-0000-0000-0000-000000000011', 'q11_confusing',  0, TRUE,  TRUE,  'abandonment'),
  ('00000000-0000-0000-0000-000000000011', 'q11_security',   0, TRUE,  TRUE,  'abandonment'),
  ('00000000-0000-0000-0000-000000000011', 'q11_price',      2, TRUE,  TRUE,  'abandonment'),
  ('00000000-0000-0000-0000-000000000011', 'q11_technical',  1, TRUE,  TRUE,  'abandonment'),
  ('00000000-0000-0000-0000-000000000011', 'q11_changed',    5, FALSE, FALSE, 'abandonment')
ON CONFLICT DO NOTHING;

-- Q12: Clarity of descriptions/pricing
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000012', 'Very clear and helpful',   'q12_very_clear',  1),
  ('00000000-0000-0000-0000-000000000012', 'Clear',                    'q12_clear',       2),
  ('00000000-0000-0000-0000-000000000012', 'Somewhat clear',           'q12_somewhat',    3),
  ('00000000-0000-0000-0000-000000000012', 'Confusing',                'q12_confusing',   4),
  ('00000000-0000-0000-0000-000000000012', 'Very confusing',           'q12_very_conf',   5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000012', 'q12_very_clear', 10, FALSE, FALSE, 'info_clarity'),
  ('00000000-0000-0000-0000-000000000012', 'q12_clear',       7, FALSE, FALSE, 'info_clarity'),
  ('00000000-0000-0000-0000-000000000012', 'q12_somewhat',    4, FALSE, FALSE, 'info_clarity'),
  ('00000000-0000-0000-0000-000000000012', 'q12_confusing',   1, FALSE, TRUE,  'info_clarity'),
  ('00000000-0000-0000-0000-000000000012', 'q12_very_conf',   0, TRUE,  TRUE,  'info_clarity')
ON CONFLICT DO NOTHING;

-- Q13: Steps to complete primary action
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000013', '1–2 steps (very smooth)',   'q13_1_2',    1),
  ('00000000-0000-0000-0000-000000000013', '3–4 steps (acceptable)',    'q13_3_4',    2),
  ('00000000-0000-0000-0000-000000000013', '5–6 steps (manageable)',    'q13_5_6',    3),
  ('00000000-0000-0000-0000-000000000013', '7+ steps (too many)',       'q13_7plus',  4)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000013', 'q13_1_2',   10, FALSE, FALSE, 'process_length'),
  ('00000000-0000-0000-0000-000000000013', 'q13_3_4',    7, FALSE, FALSE, 'process_length'),
  ('00000000-0000-0000-0000-000000000013', 'q13_5_6',    4, FALSE, TRUE,  'process_length'),
  ('00000000-0000-0000-0000-000000000013', 'q13_7plus',  0, TRUE,  TRUE,  'process_length')
ON CONFLICT DO NOTHING;

-- Q14: Satisfaction with conversion process
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000014', 'Very satisfied',    'q14_very_sat',  1),
  ('00000000-0000-0000-0000-000000000014', 'Satisfied',         'q14_sat',       2),
  ('00000000-0000-0000-0000-000000000014', 'Neutral',           'q14_neutral',   3),
  ('00000000-0000-0000-0000-000000000014', 'Dissatisfied',      'q14_dissat',    4),
  ('00000000-0000-0000-0000-000000000014', 'Very dissatisfied', 'q14_very_dis',  5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000014', 'q14_very_sat',  10, FALSE, FALSE, 'conversion_sat'),
  ('00000000-0000-0000-0000-000000000014', 'q14_sat',        7, FALSE, FALSE, 'conversion_sat'),
  ('00000000-0000-0000-0000-000000000014', 'q14_neutral',    4, FALSE, FALSE, 'conversion_sat'),
  ('00000000-0000-0000-0000-000000000014', 'q14_dissat',     1, TRUE,  FALSE, 'conversion_sat'),
  ('00000000-0000-0000-0000-000000000014', 'q14_very_dis',   0, TRUE,  FALSE, 'conversion_sat')
ON CONFLICT DO NOTHING;

-- Q15: Overall experience rating (scale 1–5)
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000015', '1 - Very Poor',      'q15_1', 1),
  ('00000000-0000-0000-0000-000000000015', '2 - Poor',           'q15_2', 2),
  ('00000000-0000-0000-0000-000000000015', '3 - Average',        'q15_3', 3),
  ('00000000-0000-0000-0000-000000000015', '4 - Good',           'q15_4', 4),
  ('00000000-0000-0000-0000-000000000015', '5 - Excellent',      'q15_5', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000015', 'q15_1',  0, TRUE,  FALSE, 'overall_experience'),
  ('00000000-0000-0000-0000-000000000015', 'q15_2',  2, TRUE,  FALSE, 'overall_experience'),
  ('00000000-0000-0000-0000-000000000015', 'q15_3',  5, FALSE, FALSE, 'overall_experience'),
  ('00000000-0000-0000-0000-000000000015', 'q15_4',  8, FALSE, FALSE, 'overall_experience'),
  ('00000000-0000-0000-0000-000000000015', 'q15_5', 10, FALSE, FALSE, 'overall_experience')
ON CONFLICT DO NOTHING;

-- Q16: Customer support responsiveness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000016', 'Very helpful and fast',          'q16_very_help',  1),
  ('00000000-0000-0000-0000-000000000016', 'Helpful',                        'q16_helpful',    2),
  ('00000000-0000-0000-0000-000000000016', 'Acceptable',                     'q16_ok',         3),
  ('00000000-0000-0000-0000-000000000016', 'Slow or unhelpful',              'q16_slow',       4),
  ('00000000-0000-0000-0000-000000000016', 'I have not needed support',      'q16_no_contact', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000016', 'q16_very_help',  10, FALSE, FALSE, 'support'),
  ('00000000-0000-0000-0000-000000000016', 'q16_helpful',     7, FALSE, FALSE, 'support'),
  ('00000000-0000-0000-0000-000000000016', 'q16_ok',          5, FALSE, FALSE, 'support'),
  ('00000000-0000-0000-0000-000000000016', 'q16_slow',        1, TRUE,  TRUE,  'support'),
  ('00000000-0000-0000-0000-000000000016', 'q16_no_contact',  7, FALSE, FALSE, 'support')
ON CONFLICT DO NOTHING;

-- Q17: Expectations met
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000017', 'Exceeded expectations',  'q17_exceeded',  1),
  ('00000000-0000-0000-0000-000000000017', 'Met expectations',       'q17_met',       2),
  ('00000000-0000-0000-0000-000000000017', 'Mostly met',             'q17_mostly',    3),
  ('00000000-0000-0000-0000-000000000017', 'Fell short',             'q17_short',     4),
  ('00000000-0000-0000-0000-000000000017', 'Did not meet at all',    'q17_not_met',   5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000017', 'q17_exceeded', 10, FALSE, FALSE, 'expectation_gap'),
  ('00000000-0000-0000-0000-000000000017', 'q17_met',       8, FALSE, FALSE, 'expectation_gap'),
  ('00000000-0000-0000-0000-000000000017', 'q17_mostly',    5, FALSE, FALSE, 'expectation_gap'),
  ('00000000-0000-0000-0000-000000000017', 'q17_short',     2, TRUE,  FALSE, 'expectation_gap'),
  ('00000000-0000-0000-0000-000000000017', 'q17_not_met',   0, TRUE,  FALSE, 'expectation_gap')
ON CONFLICT DO NOTHING;

-- Q18: Friction frequency
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000018', 'Never',         'q18_never',     1),
  ('00000000-0000-0000-0000-000000000018', 'Rarely',        'q18_rarely',    2),
  ('00000000-0000-0000-0000-000000000018', 'Sometimes',     'q18_sometimes', 3),
  ('00000000-0000-0000-0000-000000000018', 'Often',         'q18_often',     4),
  ('00000000-0000-0000-0000-000000000018', 'Very often',    'q18_very',      5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000018', 'q18_never',     10, FALSE, FALSE, 'friction_frequency'),
  ('00000000-0000-0000-0000-000000000018', 'q18_rarely',     7, FALSE, FALSE, 'friction_frequency'),
  ('00000000-0000-0000-0000-000000000018', 'q18_sometimes',  4, FALSE, TRUE,  'friction_frequency'),
  ('00000000-0000-0000-0000-000000000018', 'q18_often',      1, TRUE,  TRUE,  'friction_frequency'),
  ('00000000-0000-0000-0000-000000000018', 'q18_very',       0, TRUE,  TRUE,  'friction_frequency')
ON CONFLICT DO NOTHING;

-- Q19: Likelihood to use again
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000019', 'Definitely will use again',    'q19_def_yes',  1),
  ('00000000-0000-0000-0000-000000000019', 'Likely will use again',        'q19_likely',   2),
  ('00000000-0000-0000-0000-000000000019', 'Unsure',                       'q19_unsure',   3),
  ('00000000-0000-0000-0000-000000000019', 'Unlikely to use again',        'q19_unlikely', 4),
  ('00000000-0000-0000-0000-000000000019', 'Will not use again',           'q19_no',       5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000019', 'q19_def_yes',  10, FALSE, FALSE, 'retention'),
  ('00000000-0000-0000-0000-000000000019', 'q19_likely',    7, FALSE, FALSE, 'retention'),
  ('00000000-0000-0000-0000-000000000019', 'q19_unsure',    4, FALSE, FALSE, 'retention'),
  ('00000000-0000-0000-0000-000000000019', 'q19_unlikely',  1, TRUE,  FALSE, 'retention'),
  ('00000000-0000-0000-0000-000000000019', 'q19_no',        0, TRUE,  FALSE, 'retention')
ON CONFLICT DO NOTHING;

-- Q20: NPS (1–5 scale)
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000020', '1',   'q20_1',  1),
  ('00000000-0000-0000-0000-000000000020', '2',   'q20_2',  2),
  ('00000000-0000-0000-0000-000000000020', '3',   'q20_3',  3),
  ('00000000-0000-0000-0000-000000000020', '4',   'q20_4',  4),
  ('00000000-0000-0000-0000-000000000020', '5',   'q20_5',  5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000020', 'q20_1',  2, TRUE,  TRUE,  'nps'),
  ('00000000-0000-0000-0000-000000000020', 'q20_2',  4, TRUE,  FALSE, 'nps'),
  ('00000000-0000-0000-0000-000000000020', 'q20_3',  6, FALSE, FALSE, 'nps'),
  ('00000000-0000-0000-0000-000000000020', 'q20_4',  8, FALSE, FALSE, 'nps'),
  ('00000000-0000-0000-0000-000000000020', 'q20_5', 10, FALSE, FALSE, 'nps')
ON CONFLICT DO NOTHING;

-- Q21: Already recommended
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0000-0000-0000-000000000021', 'Yes, multiple people',   'q21_yes_many',  1),
  ('00000000-0000-0000-0000-000000000021', 'Yes, one or two people', 'q21_yes_few',   2),
  ('00000000-0000-0000-0000-000000000021', 'Not yet but would',      'q21_would',     3),
  ('00000000-0000-0000-0000-000000000021', 'Unsure',                 'q21_unsure',    4),
  ('00000000-0000-0000-0000-000000000021', 'No and would not',       'q21_no',        5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0000-0000-0000-000000000021', 'q21_yes_many', 10, FALSE, FALSE, 'advocacy'),
  ('00000000-0000-0000-0000-000000000021', 'q21_yes_few',   8, FALSE, FALSE, 'advocacy'),
  ('00000000-0000-0000-0000-000000000021', 'q21_would',     5, FALSE, FALSE, 'advocacy'),
  ('00000000-0000-0000-0000-000000000021', 'q21_unsure',    3, FALSE, FALSE, 'advocacy'),
  ('00000000-0000-0000-0000-000000000021', 'q21_no',        0, TRUE,  FALSE, 'advocacy')
ON CONFLICT DO NOTHING;



