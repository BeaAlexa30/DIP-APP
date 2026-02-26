-- ============================================================
-- DIP Framework Options - Migration 007
-- Complete options and scoring for all 5 additional frameworks
-- ============================================================
-- This migration adds all framework_options and framework_scoring_rules
-- for the 5 frameworks created in migration 006.
-- ============================================================

-- ============================================================
-- FRAMEWORK 1: Employee Experience & Engagement
-- Pack ID: a1b2c3d4-0002-0001-0001-000000000001
-- ============================================================

-- Q3: Team collaboration (already on this question in UI)
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000003', 'Excellent - seamless collaboration', 'f2_q3_excellent', 1),
  ('00000000-0002-0000-0000-000000000003', 'Good - mostly effective', 'f2_q3_good', 2),
  ('00000000-0002-0000-0000-000000000003', 'Fair - some communication issues', 'f2_q3_fair', 3),
  ('00000000-0002-0000-0000-000000000003', 'Poor - frequent miscommunication', 'f2_q3_poor', 4),
  ('00000000-0002-0000-0000-000000000003', 'Very poor - siloed and dysfunctional', 'f2_q3_very_poor', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000003', 'f2_q3_excellent', 10, FALSE, FALSE, 'collaboration'),
  ('00000000-0002-0000-0000-000000000003', 'f2_q3_good', 7, FALSE, FALSE, 'collaboration'),
  ('00000000-0002-0000-0000-000000000003', 'f2_q3_fair', 4, FALSE, FALSE, 'collaboration'),
  ('00000000-0002-0000-0000-000000000003', 'f2_q3_poor', 1, TRUE, FALSE, 'collaboration'),
  ('00000000-0002-0000-0000-000000000003', 'f2_q3_very_poor', 0, TRUE, TRUE, 'collaboration')
ON CONFLICT DO NOTHING;

-- Q4: Tools and resources
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000004', 'Yes - fully equipped', 'f2_q4_fully', 1),
  ('00000000-0002-0000-0000-000000000004', 'Mostly - minor gaps', 'f2_q4_mostly', 2),
  ('00000000-0002-0000-0000-000000000004', 'Somewhat - significant gaps', 'f2_q4_somewhat', 3),
  ('00000000-0002-0000-0000-000000000004', 'Rarely - lack critical resources', 'f2_q4_rarely', 4),
  ('00000000-0002-0000-0000-000000000004', 'No - severely under-resourced', 'f2_q4_no', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000004', 'f2_q4_fully', 10, FALSE, FALSE, 'resources'),
  ('00000000-0002-0000-0000-000000000004', 'f2_q4_mostly', 7, FALSE, FALSE, 'resources'),
  ('00000000-0002-0000-0000-000000000004', 'f2_q4_somewhat', 4, FALSE, TRUE, 'resources'),
  ('00000000-0002-0000-0000-000000000004', 'f2_q4_rarely', 1, TRUE, TRUE, 'resources'),
  ('00000000-0002-0000-0000-000000000004', 'f2_q4_no', 0, TRUE, TRUE, 'resources')
ON CONFLICT DO NOTHING;

-- Q5: Manager effectiveness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000005', 'Extremely effective', 'f2_q5_extremely', 1),
  ('00000000-0002-0000-0000-000000000005', 'Very effective', 'f2_q5_very', 2),
  ('00000000-0002-0000-0000-000000000005', 'Moderately effective', 'f2_q5_moderate', 3),
  ('00000000-0002-0000-0000-000000000005', 'Somewhat ineffective', 'f2_q5_somewhat', 4),
  ('00000000-0002-0000-0000-000000000005', 'Very ineffective', 'f2_q5_ineffective', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000005', 'f2_q5_extremely', 10, FALSE, FALSE, 'management'),
  ('00000000-0002-0000-0000-000000000005', 'f2_q5_very', 8, FALSE, FALSE, 'management'),
  ('00000000-0002-0000-0000-000000000005', 'f2_q5_moderate', 5, FALSE, FALSE, 'management'),
  ('00000000-0002-0000-0000-000000000005', 'f2_q5_somewhat', 2, TRUE, FALSE, 'management'),
  ('00000000-0002-0000-0000-000000000005', 'f2_q5_ineffective', 0, TRUE, TRUE, 'management')
ON CONFLICT DO NOTHING;

-- Q6: Feedback frequency
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000006', 'Very frequently - weekly or more', 'f2_q6_weekly', 1),
  ('00000000-0002-0000-0000-000000000006', 'Regularly - monthly', 'f2_q6_monthly', 2),
  ('00000000-0002-0000-0000-000000000006', 'Occasionally - quarterly', 'f2_q6_quarterly', 3),
  ('00000000-0002-0000-0000-000000000006', 'Rarely - once or twice a year', 'f2_q6_rarely', 4),
  ('00000000-0002-0000-0000-000000000006', 'Never or almost never', 'f2_q6_never', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000006', 'f2_q6_weekly', 10, FALSE, FALSE, 'feedback'),
  ('00000000-0002-0000-0000-000000000006', 'f2_q6_monthly', 8, FALSE, FALSE, 'feedback'),
  ('00000000-0002-0000-0000-000000000006', 'f2_q6_quarterly', 5, FALSE, FALSE, 'feedback'),
  ('00000000-0002-0000-0000-000000000006', 'f2_q6_rarely', 2, TRUE, FALSE, 'feedback'),
  ('00000000-0002-0000-0000-000000000006', 'f2_q6_never', 0, TRUE, TRUE, 'feedback')
ON CONFLICT DO NOTHING;

-- Q7: Trust in leadership
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000007', 'Complete trust', 'f2_q7_complete', 1),
  ('00000000-0002-0000-0000-000000000007', 'High trust', 'f2_q7_high', 2),
  ('00000000-0002-0000-0000-000000000007', 'Moderate trust', 'f2_q7_moderate', 3),
  ('00000000-0002-0000-0000-000000000007', 'Low trust', 'f2_q7_low', 4),
  ('00000000-0002-0000-0000-000000000007', 'No trust', 'f2_q7_none', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000007', 'f2_q7_complete', 10, FALSE, FALSE, 'leadership'),
  ('00000000-0002-0000-0000-000000000007', 'f2_q7_high', 8, FALSE, FALSE, 'leadership'),
  ('00000000-0002-0000-0000-000000000007', 'f2_q7_moderate', 5, FALSE, FALSE, 'leadership'),
  ('00000000-0002-0000-0000-000000000007', 'f2_q7_low', 2, TRUE, FALSE, 'leadership'),
  ('00000000-0002-0000-0000-000000000007', 'f2_q7_none', 0, TRUE, TRUE, 'leadership')
ON CONFLICT DO NOTHING;

-- Q8: Leadership transparency
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000008', 'Very transparent', 'f2_q8_very', 1),
  ('00000000-0002-0000-0000-000000000008', 'Transparent', 'f2_q8_transparent', 2),
  ('00000000-0002-0000-0000-000000000008', 'Somewhat transparent', 'f2_q8_somewhat', 3),
  ('00000000-0002-0000-0000-000000000008', 'Not very transparent', 'f2_q8_not_very', 4),
  ('00000000-0002-0000-0000-000000000008', 'Not transparent at all', 'f2_q8_not', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000008', 'f2_q8_very', 10, FALSE, FALSE, 'transparency'),
  ('00000000-0002-0000-0000-000000000008', 'f2_q8_transparent', 7, FALSE, FALSE, 'transparency'),
  ('00000000-0002-0000-0000-000000000008', 'f2_q8_somewhat', 4, FALSE, FALSE, 'transparency'),
  ('00000000-0002-0000-0000-000000000008', 'f2_q8_not_very', 1, TRUE, FALSE, 'transparency'),
  ('00000000-0002-0000-0000-000000000008', 'f2_q8_not', 0, TRUE, TRUE, 'transparency')
ON CONFLICT DO NOTHING;

-- Q9: Career growth satisfaction
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000009', 'Very satisfied', 'f2_q9_very', 1),
  ('00000000-0002-0000-0000-000000000009', 'Satisfied', 'f2_q9_satisfied', 2),
  ('00000000-0002-0000-0000-000000000009', 'Neutral', 'f2_q9_neutral', 3),
  ('00000000-0002-0000-0000-000000000009', 'Dissatisfied', 'f2_q9_dissatisfied', 4),
  ('00000000-0002-0000-0000-000000000009', 'Very dissatisfied', 'f2_q9_very_dissatisfied', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000009', 'f2_q9_very', 10, FALSE, FALSE, 'growth'),
  ('00000000-0002-0000-0000-000000000009', 'f2_q9_satisfied', 7, FALSE, FALSE, 'growth'),
  ('00000000-0002-0000-0000-000000000009', 'f2_q9_neutral', 5, FALSE, FALSE, 'growth'),
  ('00000000-0002-0000-0000-000000000009', 'f2_q9_dissatisfied', 2, TRUE, FALSE, 'growth'),
  ('00000000-0002-0000-0000-000000000009', 'f2_q9_very_dissatisfied', 0, TRUE, TRUE, 'growth')
ON CONFLICT DO NOTHING;

-- Q10: Learning resources accessibility
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000010', 'Very accessible', 'f2_q10_very', 1),
  ('00000000-0002-0000-0000-000000000010', 'Accessible', 'f2_q10_accessible', 2),
  ('00000000-0002-0000-0000-000000000010', 'Somewhat accessible', 'f2_q10_somewhat', 3),
  ('00000000-0002-0000-0000-000000000010', 'Limited access', 'f2_q10_limited', 4),
  ('00000000-0002-0000-0000-000000000010', 'Not accessible', 'f2_q10_not', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000010', 'f2_q10_very', 10, FALSE, FALSE, 'learning'),
  ('00000000-0002-0000-0000-000000000010', 'f2_q10_accessible', 7, FALSE, FALSE, 'learning'),
  ('00000000-0002-0000-0000-000000000010', 'f2_q10_somewhat', 4, FALSE, FALSE, 'learning'),
  ('00000000-0002-0000-0000-000000000010', 'f2_q10_limited', 1, TRUE, FALSE, 'learning'),
  ('00000000-0002-0000-0000-000000000010', 'f2_q10_not', 0, TRUE, TRUE, 'learning')
ON CONFLICT DO NOTHING;

-- Q11: Role engagement
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000011', 'Very challenged and engaged', 'f2_q11_very', 1),
  ('00000000-0002-0000-0000-000000000011', 'Challenged and engaged', 'f2_q11_engaged', 2),
  ('00000000-0002-0000-0000-000000000011', 'Moderately engaged', 'f2_q11_moderate', 3),
  ('00000000-0002-0000-0000-000000000011', 'Somewhat disengaged', 'f2_q11_somewhat', 4),
  ('00000000-0002-0000-0000-000000000011', 'Very disengaged or bored', 'f2_q11_bored', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000011', 'f2_q11_very', 10, FALSE, FALSE, 'engagement'),
  ('00000000-0002-0000-0000-000000000011', 'f2_q11_engaged', 8, FALSE, FALSE, 'engagement'),
  ('00000000-0002-0000-0000-000000000011', 'f2_q11_moderate', 5, FALSE, FALSE, 'engagement'),
  ('00000000-0002-0000-0000-000000000011', 'f2_q11_somewhat', 2, TRUE, FALSE, 'engagement'),
  ('00000000-0002-0000-0000-000000000011', 'f2_q11_bored', 0, TRUE, TRUE, 'engagement')
ON CONFLICT DO NOTHING;

-- Q12: Career path clarity
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000012', 'Very clear', 'f2_q12_very', 1),
  ('00000000-0002-0000-0000-000000000012', 'Clear', 'f2_q12_clear', 2),
  ('00000000-0002-0000-0000-000000000012', 'Somewhat clear', 'f2_q12_somewhat', 3),
  ('00000000-0002-0000-0000-000000000012', 'Unclear', 'f2_q12_unclear', 4),
  ('00000000-0002-0000-0000-000000000012', 'Very unclear', 'f2_q12_very_unclear', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000012', 'f2_q12_very', 10, FALSE, FALSE, 'career_path'),
  ('00000000-0002-0000-0000-000000000012', 'f2_q12_clear', 7, FALSE, FALSE, 'career_path'),
  ('00000000-0002-0000-0000-000000000012', 'f2_q12_somewhat', 4, FALSE, FALSE, 'career_path'),
  ('00000000-0002-0000-0000-000000000012', 'f2_q12_unclear', 1, TRUE, FALSE, 'career_path'),
  ('00000000-0002-0000-0000-000000000012', 'f2_q12_very_unclear', 0, TRUE, TRUE, 'career_path')
ON CONFLICT DO NOTHING;

-- Q13: Compensation fairness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000013', 'Very fair', 'f2_q13_very', 1),
  ('00000000-0002-0000-0000-000000000013', 'Fair', 'f2_q13_fair', 2),
  ('00000000-0002-0000-0000-000000000013', 'Somewhat fair', 'f2_q13_somewhat', 3),
  ('00000000-0002-0000-0000-000000000013', 'Unfair', 'f2_q13_unfair', 4),
  ('00000000-0002-0000-0000-000000000013', 'Very unfair', 'f2_q13_very_unfair', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000013', 'f2_q13_very', 10, FALSE, FALSE, 'compensation'),
  ('00000000-0002-0000-0000-000000000013', 'f2_q13_fair', 7, FALSE, FALSE, 'compensation'),
  ('00000000-0002-0000-0000-000000000013', 'f2_q13_somewhat', 4, FALSE, FALSE, 'compensation'),
  ('00000000-0002-0000-0000-000000000013', 'f2_q13_unfair', 1, TRUE, FALSE, 'compensation'),
  ('00000000-0002-0000-0000-000000000013', 'f2_q13_very_unfair', 0, TRUE, TRUE, 'compensation')
ON CONFLICT DO NOTHING;

-- Q14: Benefits satisfaction
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000014', 'Very satisfied', 'f2_q14_very', 1),
  ('00000000-0002-0000-0000-000000000014', 'Satisfied', 'f2_q14_satisfied', 2),
  ('00000000-0002-0000-0000-000000000014', 'Neutral', 'f2_q14_neutral', 3),
  ('00000000-0002-0000-0000-000000000014', 'Dissatisfied', 'f2_q14_dissatisfied', 4),
  ('00000000-0002-0000-0000-000000000014', 'Very dissatisfied', 'f2_q14_very_dissatisfied', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000014', 'f2_q14_very', 10, FALSE, FALSE, 'benefits'),
  ('00000000-0002-0000-0000-000000000014', 'f2_q14_satisfied', 7, FALSE, FALSE, 'benefits'),
  ('00000000-0002-0000-0000-000000000014', 'f2_q14_neutral', 5, FALSE, FALSE, 'benefits'),
  ('00000000-0002-0000-0000-000000000014', 'f2_q14_dissatisfied', 2, TRUE, FALSE, 'benefits'),
  ('00000000-0002-0000-0000-000000000014', 'f2_q14_very_dissatisfied', 0, TRUE, TRUE, 'benefits')
ON CONFLICT DO NOTHING;

-- Q15: Recognition frequency
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000015', 'Very frequently', 'f2_q15_very', 1),
  ('00000000-0002-0000-0000-000000000015', 'Frequently', 'f2_q15_frequently', 2),
  ('00000000-0002-0000-0000-000000000015', 'Occasionally', 'f2_q15_occasionally', 3),
  ('00000000-0002-0000-0000-000000000015', 'Rarely', 'f2_q15_rarely', 4),
  ('00000000-0002-0000-0000-000000000015', 'Never', 'f2_q15_never', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000015', 'f2_q15_very', 10, FALSE, FALSE, 'recognition'),
  ('00000000-0002-0000-0000-000000000015', 'f2_q15_frequently', 8, FALSE, FALSE, 'recognition'),
  ('00000000-0002-0000-0000-000000000015', 'f2_q15_occasionally', 5, FALSE, FALSE, 'recognition'),
  ('00000000-0002-0000-0000-000000000015', 'f2_q15_rarely', 2, TRUE, FALSE, 'recognition'),
  ('00000000-0002-0000-0000-000000000015', 'f2_q15_never', 0, TRUE, TRUE, 'recognition')
ON CONFLICT DO NOTHING;

-- Q16: Workload sustainability
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000016', 'Very sustainable', 'f2_q16_very', 1),
  ('00000000-0002-0000-0000-000000000016', 'Sustainable', 'f2_q16_sustainable', 2),
  ('00000000-0002-0000-0000-000000000016', 'Somewhat sustainable', 'f2_q16_somewhat', 3),
  ('00000000-0002-0000-0000-000000000016', 'Unsustainable', 'f2_q16_unsustainable', 4),
  ('00000000-0002-0000-0000-000000000016', 'Very unsustainable', 'f2_q16_very_unsustainable', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000016', 'f2_q16_very', 10, FALSE, FALSE, 'workload'),
  ('00000000-0002-0000-0000-000000000016', 'f2_q16_sustainable', 7, FALSE, FALSE, 'workload'),
  ('00000000-0002-0000-0000-000000000016', 'f2_q16_somewhat', 4, FALSE, FALSE, 'workload'),
  ('00000000-0002-0000-0000-000000000016', 'f2_q16_unsustainable', 1, TRUE, TRUE, 'workload'),
  ('00000000-0002-0000-0000-000000000016', 'f2_q16_very_unsustainable', 0, TRUE, TRUE, 'workload')
ON CONFLICT DO NOTHING;

-- Q17: Work flexibility
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0002-0000-0000-000000000017', 'Very flexible', 'f2_q17_very', 1),
  ('00000000-0002-0000-0000-000000000017', 'Flexible', 'f2_q17_flexible', 2),
  ('00000000-0002-0000-0000-000000000017', 'Somewhat flexible', 'f2_q17_somewhat', 3),
  ('00000000-0002-0000-0000-000000000017', 'Inflexible', 'f2_q17_inflexible', 4),
  ('00000000-0002-0000-0000-000000000017', 'Very inflexible', 'f2_q17_very_inflexible', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000017', 'f2_q17_very', 10, FALSE, FALSE, 'flexibility'),
  ('00000000-0002-0000-0000-000000000017', 'f2_q17_flexible', 8, FALSE, FALSE, 'flexibility'),
  ('00000000-0002-0000-0000-000000000017', 'f2_q17_somewhat', 5, FALSE, FALSE, 'flexibility'),
  ('00000000-0002-0000-0000-000000000017', 'f2_q17_inflexible', 2, TRUE, FALSE, 'flexibility'),
  ('00000000-0002-0000-0000-000000000017', 'f2_q17_very_inflexible', 0, TRUE, TRUE, 'flexibility')
ON CONFLICT DO NOTHING;

-- Q18: NPS score (scale 1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0002-0000-0000-000000000018', '1', 2, TRUE, TRUE, 'nps'),
  ('00000000-0002-0000-0000-000000000018', '2', 4, TRUE, FALSE, 'nps'),
  ('00000000-0002-0000-0000-000000000018', '3', 6, FALSE, FALSE, 'nps'),
  ('00000000-0002-0000-0000-000000000018', '4', 8, FALSE, FALSE, 'nps'),
  ('00000000-0002-0000-0000-000000000018', '5', 10, FALSE, FALSE, 'nps')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FRAMEWORK 2: SaaS Product Adoption & Retention
-- Pack ID: a1b2c3d4-0003-0001-0001-000000000001
-- ============================================================

-- Q1: Onboarding smoothness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0003-0000-0000-000000000001', 'Very smooth', 'f3_q1_very', 1),
  ('00000000-0003-0000-0000-000000000001', 'Smooth', 'f3_q1_smooth', 2),
  ('00000000-0003-0000-0000-000000000001', 'Somewhat smooth', 'f3_q1_somewhat', 3),
  ('00000000-0003-0000-0000-000000000001', 'Difficult', 'f3_q1_difficult', 4),
  ('00000000-0003-0000-0000-000000000001', 'Very difficult', 'f3_q1_very_difficult', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0003-0000-0000-000000000001', 'f3_q1_very', 10, FALSE, FALSE, 'onboarding'),
  ('00000000-0003-0000-0000-000000000001', 'f3_q1_smooth', 8, FALSE, FALSE, 'onboarding'),
  ('00000000-0003-0000-0000-000000000001', 'f3_q1_somewhat', 5, FALSE, FALSE, 'onboarding'),
  ('00000000-0003-0000-0000-000000000001', 'f3_q1_difficult', 2, TRUE, TRUE, 'onboarding'),
  ('00000000-0003-0000-0000-000000000001', 'f3_q1_very_difficult', 0, TRUE, TRUE, 'onboarding')
ON CONFLICT DO NOTHING;

-- Q2: Time to value
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0003-0000-0000-000000000002', 'Within first day', 'f3_q2_day', 1),
  ('00000000-0003-0000-0000-000000000002', 'Within first week', 'f3_q2_week', 2),
  ('00000000-0003-0000-0000-000000000002', 'Within first month', 'f3_q2_month', 3),
  ('00000000-0003-0000-0000-000000000002', 'Took 2-3 months', 'f3_q2_months', 4),
  ('00000000-0003-0000-0000-000000000002', 'Still waiting for meaningful value', 'f3_q2_waiting', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0003-0000-0000-000000000002', 'f3_q2_day', 10, FALSE, FALSE, 'time_to_value'),
  ('00000000-0003-0000-0000-000000000002', 'f3_q2_week', 8, FALSE, FALSE, 'time_to_value'),
  ('00000000-0003-0000-0000-000000000002', 'f3_q2_month', 5, FALSE, FALSE, 'time_to_value'),
  ('00000000-0003-0000-0000-000000000002', 'f3_q2_months', 2, TRUE, FALSE, 'time_to_value'),
  ('00000000-0003-0000-0000-000000000002', 'f3_q2_waiting', 0, TRUE, TRUE, 'time_to_value')
ON CONFLICT DO NOTHING;

-- Q3: Integration ease
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0003-0000-0000-000000000003', 'Very easy', 'f3_q3_very', 1),
  ('00000000-0003-0000-0000-000000000003', 'Easy', 'f3_q3_easy', 2),
  ('00000000-0003-0000-0000-000000000003', 'Moderately easy', 'f3_q3_moderate', 3),
  ('00000000-0003-0000-0000-000000000003', 'Difficult', 'f3_q3_difficult', 4),
  ('00000000-0003-0000-0000-000000000003', 'Very difficult or not possible', 'f3_q3_very_difficult', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0003-0000-0000-000000000003', 'f3_q3_very', 10, FALSE, FALSE, 'integration'),
  ('00000000-0003-0000-0000-000000000003', 'f3_q3_easy', 8, FALSE, FALSE, 'integration'),
  ('00000000-0003-0000-0000-000000000003', 'f3_q3_moderate', 5, FALSE, FALSE, 'integration'),
  ('00000000-0003-0000-0000-000000000003', 'f3_q3_difficult', 2, TRUE, TRUE, 'integration'),
  ('00000000-0003-0000-0000-000000000003', 'f3_q3_very_difficult', 0, TRUE, TRUE, 'integration')
ON CONFLICT DO NOTHING;

-- Q4: Feature discoverability
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0003-0000-0000-000000000004', 'Very easy', 'f3_q4_very', 1),
  ('00000000-0003-0000-0000-000000000004', 'Easy', 'f3_q4_easy', 2),
  ('00000000-0003-0000-0000-000000000004', 'Moderately easy', 'f3_q4_moderate', 3),
  ('00000000-0003-0000-0000-000000000004', 'Difficult', 'f3_q4_difficult', 4),
  ('00000000-0003-0000-0000-000000000004', 'Very difficult', 'f3_q4_very_difficult', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0003-0000-0000-000000000004', 'f3_q4_very', 10, FALSE, FALSE, 'discovery'),
  ('00000000-0003-0000-0000-000000000004', 'f3_q4_easy', 7, FALSE, FALSE, 'discovery'),
  ('00000000-0003-0000-0000-000000000004', 'f3_q4_moderate', 5, FALSE, FALSE, 'discovery'),
  ('00000000-0003-0000-0000-000000000004', 'f3_q4_difficult', 2, TRUE, FALSE, 'discovery'),
  ('00000000-0003-0000-0000-000000000004', 'f3_q4_very_difficult', 0, TRUE, TRUE, 'discovery')
ON CONFLICT DO NOTHING;

-- Q5: Feature usage (scale 1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0003-0000-0000-000000000005', '1', 2, TRUE, TRUE, 'feature_adoption'),
  ('00000000-0003-0000-0000-000000000005', '2', 4, TRUE, FALSE, 'feature_adoption'),
  ('00000000-0003-0000-0000-000000000005', '3', 6, FALSE, FALSE, 'feature_adoption'),
  ('00000000-0003-0000-0000-000000000005', '4', 8, FALSE, FALSE, 'feature_adoption'),
  ('00000000-0003-0000-0000-000000000005', '5', 10, FALSE, FALSE, 'feature_adoption')
ON CONFLICT DO NOTHING;

-- Q6: Product updates relevance
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0003-0000-0000-000000000006', 'Always meet needs', 'f3_q6_always', 1),
  ('00000000-0003-0000-0000-000000000006', 'Usually meet needs', 'f3_q6_usually', 2),
  ('00000000-0003-0000-0000-000000000006', 'Sometimes meet needs', 'f3_q6_sometimes', 3),
  ('00000000-0003-0000-0000-000000000006', 'Rarely meet needs', 'f3_q6_rarely', 4),
  ('00000000-0003-0000-0000-000000000006', 'Never meet needs', 'f3_q6_never', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0003-0000-0000-000000000006', 'f3_q6_always', 10, FALSE, FALSE, 'product_updates'),
  ('00000000-0003-0000-0000-000000000006', 'f3_q6_usually', 7, FALSE, FALSE, 'product_updates'),
  ('00000000-0003-0000-0000-000000000006', 'f3_q6_sometimes', 4, FALSE, FALSE, 'product_updates'),
  ('00000000-0003-0000-0000-000000000006', 'f3_q6_rarely', 1, TRUE, FALSE, 'product_updates'),
  ('00000000-0003-0000-0000-000000000006', 'f3_q6_never', 0, TRUE, TRUE, 'product_updates')
ON CONFLICT DO NOTHING;

-- Q7: Value for price (scale 1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0003-0000-0000-000000000007', '1', 2, TRUE, TRUE, 'value'),
  ('00000000-0003-0000-0000-000000000007', '2', 4, TRUE, FALSE, 'value'),
  ('00000000-0003-0000-0000-000000000007', '3', 6, FALSE, FALSE, 'value'),
  ('00000000-0003-0000-0000-000000000007', '4', 8, FALSE, FALSE, 'value'),
  ('00000000-0003-0000-0000-000000000007', '5', 10, FALSE, FALSE, 'value')
ON CONFLICT DO NOTHING;

-- Q8: Productivity improvement
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0003-0000-0000-000000000008', 'Significantly improved', 'f3_q8_significant', 1),
  ('00000000-0003-0000-0000-000000000008', 'Moderately improved', 'f3_q8_moderate', 2),
  ('00000000-0003-0000-0000-000000000008', 'Slightly improved', 'f3_q8_slight', 3),
  ('00000000-0003-0000-0000-000000000008', 'No change', 'f3_q8_no_change', 4),
  ('00000000-0003-0000-0000-000000000008', 'Made things worse', 'f3_q8_worse', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0003-0000-0000-000000000008', 'f3_q8_significant', 10, FALSE, FALSE, 'productivity'),
  ('00000000-0003-0000-0000-000000000008', 'f3_q8_moderate', 7, FALSE, FALSE, 'productivity'),
  ('00000000-0003-0000-0000-000000000008', 'f3_q8_slight', 4, FALSE, FALSE, 'productivity'),
  ('00000000-0003-0000-0000-000000000008', 'f3_q8_no_change', 1, TRUE, FALSE, 'productivity'),
  ('00000000-0003-0000-0000-000000000008', 'f3_q8_worse', 0, TRUE, TRUE, 'productivity')
ON CONFLICT DO NOTHING;

-- Q9: Product essentiality
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0003-0000-0000-000000000009', 'Absolutely essential', 'f3_q9_essential', 1),
  ('00000000-0003-0000-0000-000000000009', 'Very important', 'f3_q9_very', 2),
  ('00000000-0003-0000-0000-000000000009', 'Helpful but not critical', 'f3_q9_helpful', 3),
  ('00000000-0003-0000-0000-000000000009', 'Nice to have', 'f3_q9_nice', 4),
  ('00000000-0003-0000-0000-000000000009', 'Could easily switch', 'f3_q9_switch', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0003-0000-0000-000000000009', 'f3_q9_essential', 10, FALSE, FALSE, 'retention'),
  ('00000000-0003-0000-0000-000000000009', 'f3_q9_very', 7, FALSE, FALSE, 'retention'),
  ('00000000-0003-0000-0000-000000000009', 'f3_q9_helpful', 5, FALSE, FALSE, 'retention'),
  ('00000000-0003-0000-0000-000000000009', 'f3_q9_nice', 2, TRUE, FALSE, 'retention'),
  ('00000000-0003-0000-0000-000000000009', 'f3_q9_switch', 0, TRUE, TRUE, 'retention')
ON CONFLICT DO NOTHING;

-- Q10: Documentation helpfulness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0003-0000-0000-000000000010', 'Very helpful', 'f3_q10_very', 1),
  ('00000000-0003-0000-0000-000000000010', 'Helpful', 'f3_q10_helpful', 2),
  ('00000000-0003-0000-0000-000000000010', 'Somewhat helpful', 'f3_q10_somewhat', 3),
  ('00000000-0003-0000-0000-000000000010', 'Not very helpful', 'f3_q10_not_very', 4),
  ('00000000-0003-0000-0000-000000000010', 'Not helpful at all', 'f3_q10_not', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0003-0000-0000-000000000010', 'f3_q10_very', 10, FALSE, FALSE, 'documentation'),
  ('00000000-0003-0000-0000-000000000010', 'f3_q10_helpful', 7, FALSE, FALSE, 'documentation'),
  ('00000000-0003-0000-0000-000000000010', 'f3_q10_somewhat', 4, FALSE, FALSE, 'documentation'),
  ('00000000-0003-0000-0000-000000000010', 'f3_q10_not_very', 1, TRUE, FALSE, 'documentation'),
  ('00000000-0003-0000-0000-000000000010', 'f3_q10_not', 0, TRUE, TRUE, 'documentation')
ON CONFLICT DO NOTHING;

-- Q11: Support responsiveness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0003-0000-0000-000000000011', 'Very responsive', 'f3_q11_very', 1),
  ('00000000-0003-0000-0000-000000000011', 'Responsive', 'f3_q11_responsive', 2),
  ('00000000-0003-0000-0000-000000000011', 'Moderately responsive', 'f3_q11_moderate', 3),
  ('00000000-0003-0000-0000-000000000011', 'Slow to respond', 'f3_q11_slow', 4),
  ('00000000-0003-0000-0000-000000000011', 'Unresponsive', 'f3_q11_unresponsive', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0003-0000-0000-000000000011', 'f3_q11_very', 10, FALSE, FALSE, 'support'),
  ('00000000-0003-0000-0000-000000000011', 'f3_q11_responsive', 7, FALSE, FALSE, 'support'),
  ('00000000-0003-0000-0000-000000000011', 'f3_q11_moderate', 4, FALSE, FALSE, 'support'),
  ('00000000-0003-0000-0000-000000000011', 'f3_q11_slow', 1, TRUE, FALSE, 'support'),
  ('00000000-0003-0000-0000-000000000011', 'f3_q11_unresponsive', 0, TRUE, TRUE, 'support')
ON CONFLICT DO NOTHING;

-- Q12: Renewal likelihood (scale 1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0003-0000-0000-000000000012', '1', 2, TRUE, TRUE, 'renewal'),
  ('00000000-0003-0000-0000-000000000012', '2', 4, TRUE, FALSE, 'renewal'),
  ('00000000-0003-0000-0000-000000000012', '3', 6, FALSE, FALSE, 'renewal'),
  ('00000000-0003-0000-0000-000000000012', '4', 8, FALSE, FALSE, 'renewal'),
  ('00000000-0003-0000-0000-000000000012', '5', 10, FALSE, FALSE, 'renewal')
ON CONFLICT DO NOTHING;

-- Q13: Expansion likelihood
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0003-0000-0000-000000000013', 'Very likely', 'f3_q13_very', 1),
  ('00000000-0003-0000-0000-000000000013', 'Likely', 'f3_q13_likely', 2),
  ('00000000-0003-0000-0000-000000000013', 'Possibly', 'f3_q13_possibly', 3),
  ('00000000-0003-0000-0000-000000000013', 'Unlikely', 'f3_q13_unlikely', 4),
  ('00000000-0003-0000-0000-000000000013', 'Very unlikely', 'f3_q13_very_unlikely', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0003-0000-0000-000000000013', 'f3_q13_very', 10, FALSE, FALSE, 'expansion'),
  ('00000000-0003-0000-0000-000000000013', 'f3_q13_likely', 7, FALSE, FALSE, 'expansion'),
  ('00000000-0003-0000-0000-000000000013', 'f3_q13_possibly', 5, FALSE, FALSE, 'expansion'),
  ('00000000-0003-0000-0000-000000000013', 'f3_q13_unlikely', 2, TRUE, FALSE, 'expansion'),
  ('00000000-0003-0000-0000-000000000013', 'f3_q13_very_unlikely', 0, TRUE, TRUE, 'expansion')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FRAMEWORK 3: E-commerce Conversion Optimization
-- Pack ID: a1b2c3d4-0004-0001-0001-000000000001
-- ============================================================

-- Q1: Product findability
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0004-0000-0000-000000000001', 'Very easy', 'f4_q1_very', 1),
  ('00000000-0004-0000-0000-000000000001', 'Easy', 'f4_q1_easy', 2),
  ('00000000-0004-0000-0000-000000000001', 'Moderately easy', 'f4_q1_moderate', 3),
  ('00000000-0004-0000-0000-000000000001', 'Difficult', 'f4_q1_difficult', 4),
  ('00000000-0004-0000-0000-000000000001', 'Very difficult', 'f4_q1_very_difficult', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0004-0000-0000-000000000001', 'f4_q1_very', 10, FALSE, FALSE, 'search'),
  ('00000000-0004-0000-0000-000000000001', 'f4_q1_easy', 7, FALSE, FALSE, 'search'),
  ('00000000-0004-0000-0000-000000000001', 'f4_q1_moderate', 5, FALSE, FALSE, 'search'),
  ('00000000-0004-0000-0000-000000000001', 'f4_q1_difficult', 2, TRUE, TRUE, 'search'),
  ('00000000-0004-0000-0000-000000000001', 'f4_q1_very_difficult', 0, TRUE, TRUE, 'search')
ON CONFLICT DO NOTHING;

-- Q2: Search and filter helpfulness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0004-0000-0000-000000000002', 'Very helpful', 'f4_q2_very', 1),
  ('00000000-0004-0000-0000-000000000002', 'Helpful', 'f4_q2_helpful', 2),
  ('00000000-0004-0000-0000-000000000002', 'Somewhat helpful', 'f4_q2_somewhat', 3),
  ('00000000-0004-0000-0000-000000000002', 'Not very helpful', 'f4_q2_not_very', 4),
  ('00000000-0004-0000-0000-000000000002', 'Not helpful', 'f4_q2_not', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0004-0000-0000-000000000002', 'f4_q2_very', 10, FALSE, FALSE, 'filters'),
  ('00000000-0004-0000-0000-000000000002', 'f4_q2_helpful', 7, FALSE, FALSE, 'filters'),
  ('00000000-0004-0000-0000-000000000002', 'f4_q2_somewhat', 4, FALSE, FALSE, 'filters'),
  ('00000000-0004-0000-0000-000000000002', 'f4_q2_not_very', 1, TRUE, FALSE, 'filters'),
  ('00000000-0004-0000-0000-000000000002', 'f4_q2_not', 0, TRUE, TRUE, 'filters')
ON CONFLICT DO NOTHING;

-- Q3: Recommendation relevance
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0004-0000-0000-000000000003', 'Very relevant', 'f4_q3_very', 1),
  ('00000000-0004-0000-0000-000000000003', 'Relevant', 'f4_q3_relevant', 2),
  ('00000000-0004-0000-0000-000000000003', 'Somewhat relevant', 'f4_q3_somewhat', 3),
  ('00000000-0004-0000-0000-000000000003', 'Not very relevant', 'f4_q3_not_very', 4),
  ('00000000-0004-0000-0000-000000000003', 'Not relevant', 'f4_q3_not', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0004-0000-0000-000000000003', 'f4_q3_very', 10, FALSE, FALSE, 'recommendations'),
  ('00000000-0004-0000-0000-000000000003', 'f4_q3_relevant', 7, FALSE, FALSE, 'recommendations'),
  ('00000000-0004-0000-0000-000000000003', 'f4_q3_somewhat', 4, FALSE, FALSE, 'recommendations'),
  ('00000000-0004-0000-0000-000000000003', 'f4_q3_not_very', 1, FALSE, FALSE, 'recommendations'),
  ('00000000-0004-0000-0000-000000000003', 'f4_q3_not', 0, FALSE, FALSE, 'recommendations')
ON CONFLICT DO NOTHING;

-- Q4: Product description clarity
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0004-0000-0000-000000000004', 'Very clear and complete', 'f4_q4_very', 1),
  ('00000000-0004-0000-0000-000000000004', 'Clear and complete', 'f4_q4_clear', 2),
  ('00000000-0004-0000-0000-000000000004', 'Somewhat clear', 'f4_q4_somewhat', 3),
  ('00000000-0004-0000-0000-000000000004', 'Unclear or incomplete', 'f4_q4_unclear', 4),
  ('00000000-0004-0000-0000-000000000004', 'Very unclear or missing', 'f4_q4_very_unclear', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0004-0000-0000-000000000004', 'f4_q4_very', 10, FALSE, FALSE, 'product_info'),
  ('00000000-0004-0000-0000-000000000004', 'f4_q4_clear', 7, FALSE, FALSE, 'product_info'),
  ('00000000-0004-0000-0000-000000000004', 'f4_q4_somewhat', 4, FALSE, FALSE, 'product_info'),
  ('00000000-0004-0000-0000-000000000004', 'f4_q4_unclear', 1, TRUE, TRUE, 'product_info'),
  ('00000000-0004-0000-0000-000000000004', 'f4_q4_very_unclear', 0, TRUE, TRUE, 'product_info')
ON CONFLICT DO NOTHING;

-- Q5: Product images/video helpfulness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0004-0000-0000-000000000005', 'Very helpful', 'f4_q5_very', 1),
  ('00000000-0004-0000-0000-000000000005', 'Helpful', 'f4_q5_helpful', 2),
  ('00000000-0004-0000-0000-000000000005', 'Somewhat helpful', 'f4_q5_somewhat', 3),
  ('00000000-0004-0000-0000-000000000005', 'Not very helpful', 'f4_q5_not_very', 4),
  ('00000000-0004-0000-0000-000000000005', 'Poor quality or missing', 'f4_q5_poor', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0004-0000-0000-000000000005', 'f4_q5_very', 10, FALSE, FALSE, 'media'),
  ('00000000-0004-0000-0000-000000000005', 'f4_q5_helpful', 7, FALSE, FALSE, 'media'),
  ('00000000-0004-0000-0000-000000000005', 'f4_q5_somewhat', 4, FALSE, FALSE, 'media'),
  ('00000000-0004-0000-0000-000000000005', 'f4_q5_not_very', 1, TRUE, FALSE, 'media'),
  ('00000000-0004-0000-0000-000000000005', 'f4_q5_poor', 0, TRUE, TRUE, 'media')
ON CONFLICT DO NOTHING;

-- Q6: Customer reviews usefulness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0004-0000-0000-000000000006', 'Very useful', 'f4_q6_very', 1),
  ('00000000-0004-0000-0000-000000000006', 'Useful', 'f4_q6_useful', 2),
  ('00000000-0004-0000-0000-000000000006', 'Somewhat useful', 'f4_q6_somewhat', 3),
  ('00000000-0004-0000-0000-000000000006', 'Not very useful', 'f4_q6_not_very', 4),
  ('00000000-0004-0000-0000-000000000006', 'Not useful or missing', 'f4_q6_not', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0004-0000-0000-000000000006', 'f4_q6_very', 10, FALSE, FALSE, 'reviews'),
  ('00000000-0004-0000-0000-000000000006', 'f4_q6_useful', 7, FALSE, FALSE, 'reviews'),
  ('00000000-0004-0000-0000-000000000006', 'f4_q6_somewhat', 4, FALSE, FALSE, 'reviews'),
  ('00000000-0004-0000-0000-000000000006', 'f4_q6_not_very', 1, FALSE, FALSE, 'reviews'),
  ('00000000-0004-0000-0000-000000000006', 'f4_q6_not', 0, FALSE, FALSE, 'reviews')
ON CONFLICT DO NOTHING;

-- Q7: Checkout simplicity
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0004-0000-0000-000000000007', 'Very simple', 'f4_q7_very', 1),
  ('00000000-0004-0000-0000-000000000007', 'Simple', 'f4_q7_simple', 2),
  ('00000000-0004-0000-0000-000000000007', 'Moderately simple', 'f4_q7_moderate', 3),
  ('00000000-0004-0000-0000-000000000007', 'Complicated', 'f4_q7_complicated', 4),
  ('00000000-0004-0000-0000-000000000007', 'Very complicated', 'f4_q7_very_complicated', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0004-0000-0000-000000000007', 'f4_q7_very', 10, FALSE, FALSE, 'checkout'),
  ('00000000-0004-0000-0000-000000000007', 'f4_q7_simple', 8, FALSE, FALSE, 'checkout'),
  ('00000000-0004-0000-0000-000000000007', 'f4_q7_moderate', 5, FALSE, FALSE, 'checkout'),
  ('00000000-0004-0000-0000-000000000007', 'f4_q7_complicated', 2, TRUE, TRUE, 'checkout'),
  ('00000000-0004-0000-0000-000000000007', 'f4_q7_very_complicated', 0, TRUE, TRUE, 'checkout')
ON CONFLICT DO NOTHING;

-- Q8: Shipping cost clarity
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0004-0000-0000-000000000008', 'Very clear', 'f4_q8_very', 1),
  ('00000000-0004-0000-0000-000000000008', 'Clear', 'f4_q8_clear', 2),
  ('00000000-0004-0000-0000-000000000008', 'Somewhat clear', 'f4_q8_somewhat', 3),
  ('00000000-0004-0000-0000-000000000008', 'Unclear', 'f4_q8_unclear', 4),
  ('00000000-0004-0000-0000-000000000008', 'Very unclear or hidden', 'f4_q8_very_unclear', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0004-0000-0000-000000000008', 'f4_q8_very', 10, FALSE, FALSE, 'shipping'),
  ('00000000-0004-0000-0000-000000000008', 'f4_q8_clear', 7, FALSE, FALSE, 'shipping'),
  ('00000000-0004-0000-0000-000000000008', 'f4_q8_somewhat', 4, FALSE, FALSE, 'shipping'),
  ('00000000-0004-0000-0000-000000000008', 'f4_q8_unclear', 1, TRUE, TRUE, 'shipping'),
  ('00000000-0004-0000-0000-000000000008', 'f4_q8_very_unclear', 0, TRUE, TRUE, 'shipping')
ON CONFLICT DO NOTHING;

-- Q9: Payment options satisfaction
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0004-0000-0000-000000000009', 'Very satisfied', 'f4_q9_very', 1),
  ('00000000-0004-0000-0000-000000000009', 'Satisfied', 'f4_q9_satisfied', 2),
  ('00000000-0004-0000-0000-000000000009', 'Neutral', 'f4_q9_neutral', 3),
  ('00000000-0004-0000-0000-000000000009', 'Dissatisfied', 'f4_q9_dissatisfied', 4),
  ('00000000-0004-0000-0000-000000000009', 'Very dissatisfied', 'f4_q9_very_dissatisfied', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0004-0000-0000-000000000009', 'f4_q9_very', 10, FALSE, FALSE, 'payment'),
  ('00000000-0004-0000-0000-000000000009', 'f4_q9_satisfied', 7, FALSE, FALSE, 'payment'),
  ('00000000-0004-0000-0000-000000000009', 'f4_q9_neutral', 5, FALSE, FALSE, 'payment'),
  ('00000000-0004-0000-0000-000000000009', 'f4_q9_dissatisfied', 2, TRUE, TRUE, 'payment'),
  ('00000000-0004-0000-0000-000000000009', 'f4_q9_very_dissatisfied', 0, TRUE, TRUE, 'payment')
ON CONFLICT DO NOTHING;

-- Q10: Payment security
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0004-0000-0000-000000000010', 'Very secure', 'f4_q10_very', 1),
  ('00000000-0004-0000-0000-000000000010', 'Secure', 'f4_q10_secure', 2),
  ('00000000-0004-0000-0000-000000000010', 'Somewhat secure', 'f4_q10_somewhat', 3),
  ('00000000-0004-0000-0000-000000000010', 'Not very secure', 'f4_q10_not_very', 4),
  ('00000000-0004-0000-0000-000000000010', 'Not secure', 'f4_q10_not', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0004-0000-0000-000000000010', 'f4_q10_very', 10, FALSE, FALSE, 'security'),
  ('00000000-0004-0000-0000-000000000010', 'f4_q10_secure', 7, FALSE, FALSE, 'security'),
  ('00000000-0004-0000-0000-000000000010', 'f4_q10_somewhat', 4, FALSE, FALSE, 'security'),
  ('00000000-0004-0000-0000-000000000010', 'f4_q10_not_very', 1, TRUE, TRUE, 'security'),
  ('00000000-0004-0000-0000-000000000010', 'f4_q10_not', 0, TRUE, TRUE, 'security')
ON CONFLICT DO NOTHING;

-- Q11: Return policy clarity
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0004-0000-0000-000000000011', 'Very clear', 'f4_q11_very', 1),
  ('00000000-0004-0000-0000-000000000011', 'Clear', 'f4_q11_clear', 2),
  ('00000000-0004-0000-0000-000000000011', 'Somewhat clear', 'f4_q11_somewhat', 3),
  ('00000000-0004-0000-0000-000000000011', 'Unclear', 'f4_q11_unclear', 4),
  ('00000000-0004-0000-0000-000000000011', 'Very unclear or missing', 'f4_q11_very_unclear', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0004-0000-0000-000000000011', 'f4_q11_very', 10, FALSE, FALSE, 'returns'),
  ('00000000-0004-0000-0000-000000000011', 'f4_q11_clear', 7, FALSE, FALSE, 'returns'),
  ('00000000-0004-0000-0000-000000000011', 'f4_q11_somewhat', 4, FALSE, FALSE, 'returns'),
  ('00000000-0004-0000-0000-000000000011', 'f4_q11_unclear', 1, TRUE, FALSE, 'returns'),
  ('00000000-0004-0000-0000-000000000011', 'f4_q11_very_unclear', 0, TRUE, TRUE, 'returns')
ON CONFLICT DO NOTHING;

-- Q12: Order tracking satisfaction
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0004-0000-0000-000000000012', 'Very satisfied', 'f4_q12_very', 1),
  ('00000000-0004-0000-0000-000000000012', 'Satisfied', 'f4_q12_satisfied', 2),
  ('00000000-0004-0000-0000-000000000012', 'Neutral', 'f4_q12_neutral', 3),
  ('00000000-0004-0000-0000-000000000012', 'Dissatisfied', 'f4_q12_dissatisfied', 4),
  ('00000000-0004-0000-0000-000000000012', 'Very dissatisfied', 'f4_q12_very_dissatisfied', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0004-0000-0000-000000000012', 'f4_q12_very', 10, FALSE, FALSE, 'tracking'),
  ('00000000-0004-0000-0000-000000000012', 'f4_q12_satisfied', 7, FALSE, FALSE, 'tracking'),
  ('00000000-0004-0000-0000-000000000012', 'f4_q12_neutral', 5, FALSE, FALSE, 'tracking'),
  ('00000000-0004-0000-0000-000000000012', 'f4_q12_dissatisfied', 2, TRUE, FALSE, 'tracking'),
  ('00000000-0004-0000-0000-000000000012', 'f4_q12_very_dissatisfied', 0, TRUE, TRUE, 'tracking')
ON CONFLICT DO NOTHING;

-- Q13: Repeat purchase likelihood (scale 1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0004-0000-0000-000000000013', '1', 2, TRUE, TRUE, 'retention'),
  ('00000000-0004-0000-0000-000000000013', '2', 4, TRUE, FALSE, 'retention'),
  ('00000000-0004-0000-0000-000000000013', '3', 6, FALSE, FALSE, 'retention'),
  ('00000000-0004-0000-0000-000000000013', '4', 8, FALSE, FALSE, 'retention'),
  ('00000000-0004-0000-0000-000000000013', '5', 10, FALSE, FALSE, 'retention')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FRAMEWORK 4: Mobile App User Experience
-- Pack ID: a1b2c3d4-0005-0001-0001-000000000001
-- ============================================================

-- Q1: First impression
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0005-0000-0000-000000000001', 'Excellent', 'f5_q1_excellent', 1),
  ('00000000-0005-0000-0000-000000000001', 'Good', 'f5_q1_good', 2),
  ('00000000-0005-0000-0000-000000000001', 'Average', 'f5_q1_average', 3),
  ('00000000-0005-0000-0000-000000000001', 'Poor', 'f5_q1_poor', 4),
  ('00000000-0005-0000-0000-000000000001', 'Very poor', 'f5_q1_very_poor', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0005-0000-0000-000000000001', 'f5_q1_excellent', 10, FALSE, FALSE, 'first_impression'),
  ('00000000-0005-0000-0000-000000000001', 'f5_q1_good', 7, FALSE, FALSE, 'first_impression'),
  ('00000000-0005-0000-0000-000000000001', 'f5_q1_average', 5, FALSE, FALSE, 'first_impression'),
  ('00000000-0005-0000-0000-000000000001', 'f5_q1_poor', 2, TRUE, FALSE, 'first_impression'),
  ('00000000-0005-0000-0000-000000000001', 'f5_q1_very_poor', 0, TRUE, TRUE, 'first_impression')
ON CONFLICT DO NOTHING;

-- Q2: Setup ease
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0005-0000-0000-000000000002', 'Very easy', 'f5_q2_very', 1),
  ('00000000-0005-0000-0000-000000000002', 'Easy', 'f5_q2_easy', 2),
  ('00000000-0005-0000-0000-000000000002', 'Moderately easy', 'f5_q2_moderate', 3),
  ('00000000-0005-0000-0000-000000000002', 'Difficult', 'f5_q2_difficult', 4),
  ('00000000-0005-0000-0000-000000000002', 'Very difficult', 'f5_q2_very_difficult', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0005-0000-0000-000000000002', 'f5_q2_very', 10, FALSE, FALSE, 'setup'),
  ('00000000-0005-0000-0000-000000000002', 'f5_q2_easy', 8, FALSE, FALSE, 'setup'),
  ('00000000-0005-0000-0000-000000000002', 'f5_q2_moderate', 5, FALSE, FALSE, 'setup'),
  ('00000000-0005-0000-0000-000000000002', 'f5_q2_difficult', 2, TRUE, TRUE, 'setup'),
  ('00000000-0005-0000-0000-000000000002', 'f5_q2_very_difficult', 0, TRUE, TRUE, 'setup')
ON CONFLICT DO NOTHING;

-- Q3: Onboarding helpfulness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0005-0000-0000-000000000003', 'Very helpful', 'f5_q3_very', 1),
  ('00000000-0005-0000-0000-000000000003', 'Helpful', 'f5_q3_helpful', 2),
  ('00000000-0005-0000-0000-000000000003', 'Somewhat helpful', 'f5_q3_somewhat', 3),
  ('00000000-0005-0000-0000-000000000003', 'Not very helpful', 'f5_q3_not_very', 4),
  ('00000000-0005-0000-0000-000000000003', 'Not helpful or skipped', 'f5_q3_not', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0005-0000-0000-000000000003', 'f5_q3_very', 10, FALSE, FALSE, 'onboarding'),
  ('00000000-0005-0000-0000-000000000003', 'f5_q3_helpful', 7, FALSE, FALSE, 'onboarding'),
  ('00000000-0005-0000-0000-000000000003', 'f5_q3_somewhat', 4, FALSE, FALSE, 'onboarding'),
  ('00000000-0005-0000-0000-000000000003', 'f5_q3_not_very', 1, TRUE, FALSE, 'onboarding'),
  ('00000000-0005-0000-0000-000000000003', 'f5_q3_not', 0, FALSE, FALSE, 'onboarding')
ON CONFLICT DO NOTHING;

-- Q4: Design rating (scale 1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0005-0000-0000-000000000004', '1', 2, TRUE, TRUE, 'design'),
  ('00000000-0005-0000-0000-000000000004', '2', 4, TRUE, FALSE, 'design'),
  ('00000000-0005-0000-0000-000000000004', '3', 6, FALSE, FALSE, 'design'),
  ('00000000-0005-0000-0000-000000000004', '4', 8, FALSE, FALSE, 'design'),
  ('00000000-0005-0000-0000-000000000004', '5', 10, FALSE, FALSE, 'design')
ON CONFLICT DO NOTHING;

-- Q5: Navigation intuitiveness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0005-0000-0000-000000000005', 'Very intuitive', 'f5_q5_very', 1),
  ('00000000-0005-0000-0000-000000000005', 'Intuitive', 'f5_q5_intuitive', 2),
  ('00000000-0005-0000-0000-000000000005', 'Moderately intuitive', 'f5_q5_moderate', 3),
  ('00000000-0005-0000-0000-000000000005', 'Confusing', 'f5_q5_confusing', 4),
  ('00000000-0005-0000-0000-000000000005', 'Very confusing', 'f5_q5_very_confusing', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0005-0000-0000-000000000005', 'f5_q5_very', 10, FALSE, FALSE, 'navigation'),
  ('00000000-0005-0000-0000-000000000005', 'f5_q5_intuitive', 7, FALSE, FALSE, 'navigation'),
  ('00000000-0005-0000-0000-000000000005', 'f5_q5_moderate', 5, FALSE, FALSE, 'navigation'),
  ('00000000-0005-0000-0000-000000000005', 'f5_q5_confusing', 2, TRUE, TRUE, 'navigation'),
  ('00000000-0005-0000-0000-000000000005', 'f5_q5_very_confusing', 0, TRUE, TRUE, 'navigation')
ON CONFLICT DO NOTHING;

-- Q6: Task completion ease
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0005-0000-0000-000000000006', 'Very easy', 'f5_q6_very', 1),
  ('00000000-0005-0000-0000-000000000006', 'Easy', 'f5_q6_easy', 2),
  ('00000000-0005-0000-0000-000000000006', 'Moderately easy', 'f5_q6_moderate', 3),
  ('00000000-0005-0000-0000-000000000006', 'Difficult', 'f5_q6_difficult', 4),
  ('00000000-0005-0000-0000-000000000006', 'Very difficult', 'f5_q6_very_difficult', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0005-0000-0000-000000000006', 'f5_q6_very', 10, FALSE, FALSE, 'usability'),
  ('00000000-0005-0000-0000-000000000006', 'f5_q6_easy', 8, FALSE, FALSE, 'usability'),
  ('00000000-0005-0000-0000-000000000006', 'f5_q6_moderate', 5, FALSE, FALSE, 'usability'),
  ('00000000-0005-0000-0000-000000000006', 'f5_q6_difficult', 2, TRUE, TRUE, 'usability'),
  ('00000000-0005-0000-0000-000000000006', 'f5_q6_very_difficult', 0, TRUE, TRUE, 'usability')
ON CONFLICT DO NOTHING;

-- Q7: Load speed
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0005-0000-0000-000000000007', 'Very fast', 'f5_q7_very', 1),
  ('00000000-0005-0000-0000-000000000007', 'Fast', 'f5_q7_fast', 2),
  ('00000000-0005-0000-0000-000000000007', 'Average', 'f5_q7_average', 3),
  ('00000000-0005-0000-0000-000000000007', 'Slow', 'f5_q7_slow', 4),
  ('00000000-0005-0000-0000-000000000007', 'Very slow', 'f5_q7_very_slow', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0005-0000-0000-000000000007', 'f5_q7_very', 10, FALSE, FALSE, 'performance'),
  ('00000000-0005-0000-0000-000000000007', 'f5_q7_fast', 8, FALSE, FALSE, 'performance'),
  ('00000000-0005-0000-0000-000000000007', 'f5_q7_average', 5, FALSE, FALSE, 'performance'),
  ('00000000-0005-0000-0000-000000000007', 'f5_q7_slow', 2, TRUE, TRUE, 'performance'),
  ('00000000-0005-0000-0000-000000000007', 'f5_q7_very_slow', 0, TRUE, TRUE, 'performance')
ON CONFLICT DO NOTHING;

-- Q8: Crash frequency
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0005-0000-0000-000000000008', 'Never', 'f5_q8_never', 1),
  ('00000000-0005-0000-0000-000000000008', 'Rarely', 'f5_q8_rarely', 2),
  ('00000000-0005-0000-0000-000000000008', 'Occasionally', 'f5_q8_occasionally', 3),
  ('00000000-0005-0000-0000-000000000008', 'Frequently', 'f5_q8_frequently', 4),
  ('00000000-0005-0000-0000-000000000008', 'Very frequently', 'f5_q8_very_frequently', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0005-0000-0000-000000000008', 'f5_q8_never', 10, FALSE, FALSE, 'stability'),
  ('00000000-0005-0000-0000-000000000008', 'f5_q8_rarely', 7, FALSE, FALSE, 'stability'),
  ('00000000-0005-0000-0000-000000000008', 'f5_q8_occasionally', 4, FALSE, FALSE, 'stability'),
  ('00000000-0005-0000-0000-000000000008', 'f5_q8_frequently', 1, TRUE, TRUE, 'stability'),
  ('00000000-0005-0000-0000-000000000008', 'f5_q8_very_frequently', 0, TRUE, TRUE, 'stability')
ON CONFLICT DO NOTHING;

-- Q9: Device performance
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0005-0000-0000-000000000009', 'Excellent', 'f5_q9_excellent', 1),
  ('00000000-0005-0000-0000-000000000009', 'Good', 'f5_q9_good', 2),
  ('00000000-0005-0000-0000-000000000009', 'Average', 'f5_q9_average', 3),
  ('00000000-0005-0000-0000-000000000009', 'Poor', 'f5_q9_poor', 4),
  ('00000000-0005-0000-0000-000000000009', 'Very poor', 'f5_q9_very_poor', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0005-0000-0000-000000000009', 'f5_q9_excellent', 10, FALSE, FALSE, 'device_compatibility'),
  ('00000000-0005-0000-0000-000000000009', 'f5_q9_good', 7, FALSE, FALSE, 'device_compatibility'),
  ('00000000-0005-0000-0000-000000000009', 'f5_q9_average', 5, FALSE, FALSE, 'device_compatibility'),
  ('00000000-0005-0000-0000-000000000009', 'f5_q9_poor', 2, TRUE, TRUE, 'device_compatibility'),
  ('00000000-0005-0000-0000-000000000009', 'f5_q9_very_poor', 0, TRUE, TRUE, 'device_compatibility')
ON CONFLICT DO NOTHING;

-- Q10: Needs fulfillment
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0005-0000-0000-000000000010', 'Exceeds needs', 'f5_q10_exceeds', 1),
  ('00000000-0005-0000-0000-000000000010', 'Fully meets needs', 'f5_q10_fully', 2),
  ('00000000-0005-0000-0000-000000000010', 'Mostly meets needs', 'f5_q10_mostly', 3),
  ('00000000-0005-0000-0000-000000000010', 'Partially meets needs', 'f5_q10_partially', 4),
  ('00000000-0005-0000-0000-000000000010', 'Does not meet needs', 'f5_q10_not', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0005-0000-0000-000000000010', 'f5_q10_exceeds', 10, FALSE, FALSE, 'value'),
  ('00000000-0005-0000-0000-000000000010', 'f5_q10_fully', 8, FALSE, FALSE, 'value'),
  ('00000000-0005-0000-0000-000000000010', 'f5_q10_mostly', 5, FALSE, FALSE, 'value'),
  ('00000000-0005-0000-0000-000000000010', 'f5_q10_partially', 2, TRUE, FALSE, 'value'),
  ('00000000-0005-0000-0000-000000000010', 'f5_q10_not', 0, TRUE, TRUE, 'value')
ON CONFLICT DO NOTHING;

-- Q11: Missing features
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0005-0000-0000-000000000011', 'No missing features', 'f5_q11_none', 1),
  ('00000000-0005-0000-0000-000000000011', 'Minor features missing', 'f5_q11_minor', 2),
  ('00000000-0005-0000-0000-000000000011', 'Some important features missing', 'f5_q11_some', 3),
  ('00000000-0005-0000-0000-000000000011', 'Many important features missing', 'f5_q11_many', 4),
  ('00000000-0005-0000-0000-000000000011', 'Critical features missing', 'f5_q11_critical', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0005-0000-0000-000000000011', 'f5_q11_none', 10, FALSE, FALSE, 'feature_completeness'),
  ('00000000-0005-0000-0000-000000000011', 'f5_q11_minor', 7, FALSE, FALSE, 'feature_completeness'),
  ('00000000-0005-0000-0000-000000000011', 'f5_q11_some', 4, FALSE, FALSE, 'feature_completeness'),
  ('00000000-0005-0000-0000-000000000011', 'f5_q11_many', 1, TRUE, FALSE, 'feature_completeness'),
  ('00000000-0005-0000-0000-000000000011', 'f5_q11_critical', 0, TRUE, TRUE, 'feature_completeness')
ON CONFLICT DO NOTHING;

-- Q12: Usage frequency
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0005-0000-0000-000000000012', 'Multiple times daily', 'f5_q12_daily', 1),
  ('00000000-0005-0000-0000-000000000012', 'Daily', 'f5_q12_once_daily', 2),
  ('00000000-0005-0000-0000-000000000012', 'Weekly', 'f5_q12_weekly', 3),
  ('00000000-0005-0000-0000-000000000012', 'Monthly', 'f5_q12_monthly', 4),
  ('00000000-0005-0000-0000-000000000012', 'Rarely', 'f5_q12_rarely', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0005-0000-0000-000000000012', 'f5_q12_daily', 10, FALSE, FALSE, 'engagement'),
  ('00000000-0005-0000-0000-000000000012', 'f5_q12_once_daily', 8, FALSE, FALSE, 'engagement'),
  ('00000000-0005-0000-0000-000000000012', 'f5_q12_weekly', 5, FALSE, FALSE, 'engagement'),
  ('00000000-0005-0000-0000-000000000012', 'f5_q12_monthly', 2, TRUE, FALSE, 'engagement'),
  ('00000000-0005-0000-0000-000000000012', 'f5_q12_rarely', 0, TRUE, TRUE, 'engagement')
ON CONFLICT DO NOTHING;

-- Q13: Recommendation likelihood (scale 1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0005-0000-0000-000000000013', '1', 2, TRUE, TRUE, 'nps'),
  ('00000000-0005-0000-0000-000000000013', '2', 4, TRUE, FALSE, 'nps'),
  ('00000000-0005-0000-0000-000000000013', '3', 6, FALSE, FALSE, 'nps'),
  ('00000000-0005-0000-0000-000000000013', '4', 8, FALSE, FALSE, 'nps'),
  ('00000000-0005-0000-0000-000000000013', '5', 10, FALSE, FALSE, 'nps')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FRAMEWORK 5: B2B Sales Process Experience
-- Pack ID: a1b2c3d4-0006-0001-0001-000000000001
-- ============================================================

-- Q1: Information findability
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0006-0000-0000-000000000001', 'Very easy', 'f6_q1_very', 1),
  ('00000000-0006-0000-0000-000000000001', 'Easy', 'f6_q1_easy', 2),
  ('00000000-0006-0000-0000-000000000001', 'Moderately easy', 'f6_q1_moderate', 3),
  ('00000000-0006-0000-0000-000000000001', 'Difficult', 'f6_q1_difficult', 4),
  ('00000000-0006-0000-0000-000000000001', 'Very difficult', 'f6_q1_very_difficult', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0006-0000-0000-000000000001', 'f6_q1_very', 10, FALSE, FALSE, 'discovery'),
  ('00000000-0006-0000-0000-000000000001', 'f6_q1_easy', 7, FALSE, FALSE, 'discovery'),
  ('00000000-0006-0000-0000-000000000001', 'f6_q1_moderate', 5, FALSE, FALSE, 'discovery'),
  ('00000000-0006-0000-0000-000000000001', 'f6_q1_difficult', 2, TRUE, TRUE, 'discovery'),
  ('00000000-0006-0000-0000-000000000001', 'f6_q1_very_difficult', 0, TRUE, TRUE, 'discovery')
ON CONFLICT DO NOTHING;

-- Q2: Sales team responsiveness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0006-0000-0000-000000000002', 'Very responsive', 'f6_q2_very', 1),
  ('00000000-0006-0000-0000-000000000002', 'Responsive', 'f6_q2_responsive', 2),
  ('00000000-0006-0000-0000-000000000002', 'Moderately responsive', 'f6_q2_moderate', 3),
  ('00000000-0006-0000-0000-000000000002', 'Slow to respond', 'f6_q2_slow', 4),
  ('00000000-0006-0000-0000-000000000002', 'Unresponsive', 'f6_q2_unresponsive', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0006-0000-0000-000000000002', 'f6_q2_very', 10, FALSE, FALSE, 'responsiveness'),
  ('00000000-0006-0000-0000-000000000002', 'f6_q2_responsive', 7, FALSE, FALSE, 'responsiveness'),
  ('00000000-0006-0000-0000-000000000002', 'f6_q2_moderate', 4, FALSE, FALSE, 'responsiveness'),
  ('00000000-0006-0000-0000-000000000002', 'f6_q2_slow', 1, TRUE, TRUE, 'responsiveness'),
  ('00000000-0006-0000-0000-000000000002', 'f6_q2_unresponsive', 0, TRUE, TRUE, 'responsiveness')
ON CONFLICT DO NOTHING;

-- Q3: Pricing clarity
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0006-0000-0000-000000000003', 'Very clear', 'f6_q3_very', 1),
  ('00000000-0006-0000-0000-000000000003', 'Clear', 'f6_q3_clear', 2),
  ('00000000-0006-0000-0000-000000000003', 'Somewhat clear', 'f6_q3_somewhat', 3),
  ('00000000-0006-0000-0000-000000000003', 'Unclear', 'f6_q3_unclear', 4),
  ('00000000-0006-0000-0000-000000000003', 'Very unclear', 'f6_q3_very_unclear', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0006-0000-0000-000000000003', 'f6_q3_very', 10, FALSE, FALSE, 'pricing'),
  ('00000000-0006-0000-0000-000000000003', 'f6_q3_clear', 7, FALSE, FALSE, 'pricing'),
  ('00000000-0006-0000-0000-000000000003', 'f6_q3_somewhat', 4, FALSE, FALSE, 'pricing'),
  ('00000000-0006-0000-0000-000000000003', 'f6_q3_unclear', 1, TRUE, TRUE, 'pricing'),
  ('00000000-0006-0000-0000-000000000003', 'f6_q3_very_unclear', 0, TRUE, TRUE, 'pricing')
ON CONFLICT DO NOTHING;

-- Q4: Needs understanding
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0006-0000-0000-000000000004', 'Excellent understanding', 'f6_q4_excellent', 1),
  ('00000000-0006-0000-0000-000000000004', 'Good understanding', 'f6_q4_good', 2),
  ('00000000-0006-0000-0000-000000000004', 'Fair understanding', 'f6_q4_fair', 3),
  ('00000000-0006-0000-0000-000000000004', 'Poor understanding', 'f6_q4_poor', 4),
  ('00000000-0006-0000-0000-000000000004', 'No understanding', 'f6_q4_none', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0006-0000-0000-000000000004', 'f6_q4_excellent', 10, FALSE, FALSE, 'consultative'),
  ('00000000-0006-0000-0000-000000000004', 'f6_q4_good', 7, FALSE, FALSE, 'consultative'),
  ('00000000-0006-0000-0000-000000000004', 'f6_q4_fair', 4, FALSE, FALSE, 'consultative'),
  ('00000000-0006-0000-0000-000000000004', 'f6_q4_poor', 1, TRUE, FALSE, 'consultative'),
  ('00000000-0006-0000-0000-000000000004', 'f6_q4_none', 0, TRUE, TRUE, 'consultative')
ON CONFLICT DO NOTHING;

-- Q5: Product knowledge
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0006-0000-0000-000000000005', 'Highly knowledgeable', 'f6_q5_highly', 1),
  ('00000000-0006-0000-0000-000000000005', 'Knowledgeable', 'f6_q5_knowledgeable', 2),
  ('00000000-0006-0000-0000-000000000005', 'Moderately knowledgeable', 'f6_q5_moderate', 3),
  ('00000000-0006-0000-0000-000000000005', 'Limited knowledge', 'f6_q5_limited', 4),
  ('00000000-0006-0000-0000-000000000005', 'No knowledge', 'f6_q5_none', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0006-0000-0000-000000000005', 'f6_q5_highly', 10, FALSE, FALSE, 'expertise'),
  ('00000000-0006-0000-0000-000000000005', 'f6_q5_knowledgeable', 7, FALSE, FALSE, 'expertise'),
  ('00000000-0006-0000-0000-000000000005', 'f6_q5_moderate', 4, FALSE, FALSE, 'expertise'),
  ('00000000-0006-0000-0000-000000000005', 'f6_q5_limited', 1, TRUE, FALSE, 'expertise'),
  ('00000000-0006-0000-0000-000000000005', 'f6_q5_none', 0, TRUE, TRUE, 'expertise')
ON CONFLICT DO NOTHING;

-- Q6: Sales professionalism
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0006-0000-0000-000000000006', 'Very professional', 'f6_q6_very', 1),
  ('00000000-0006-0000-0000-000000000006', 'Professional', 'f6_q6_professional', 2),
  ('00000000-0006-0000-0000-000000000006', 'Moderately professional', 'f6_q6_moderate', 3),
  ('00000000-0006-0000-0000-000000000006', 'Unprofessional', 'f6_q6_unprofessional', 4),
  ('00000000-0006-0000-0000-000000000006', 'Very unprofessional', 'f6_q6_very_unprofessional', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0006-0000-0000-000000000006', 'f6_q6_very', 10, FALSE, FALSE, 'professionalism'),
  ('00000000-0006-0000-0000-000000000006', 'f6_q6_professional', 8, FALSE, FALSE, 'professionalism'),
  ('00000000-0006-0000-0000-000000000006', 'f6_q6_moderate', 5, FALSE, FALSE, 'professionalism'),
  ('00000000-0006-0000-0000-000000000006', 'f6_q6_unprofessional', 2, TRUE, TRUE, 'professionalism'),
  ('00000000-0006-0000-0000-000000000006', 'f6_q6_very_unprofessional', 0, TRUE, TRUE, 'professionalism')
ON CONFLICT DO NOTHING;

-- Q7: Demo relevance
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0006-0000-0000-000000000007', 'Very relevant', 'f6_q7_very', 1),
  ('00000000-0006-0000-0000-000000000007', 'Relevant', 'f6_q7_relevant', 2),
  ('00000000-0006-0000-0000-000000000007', 'Somewhat relevant', 'f6_q7_somewhat', 3),
  ('00000000-0006-0000-0000-000000000007', 'Not very relevant', 'f6_q7_not_very', 4),
  ('00000000-0006-0000-0000-000000000007', 'Not relevant', 'f6_q7_not', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0006-0000-0000-000000000007', 'f6_q7_very', 10, FALSE, FALSE, 'demo'),
  ('00000000-0006-0000-0000-000000000007', 'f6_q7_relevant', 7, FALSE, FALSE, 'demo'),
  ('00000000-0006-0000-0000-000000000007', 'f6_q7_somewhat', 4, FALSE, FALSE, 'demo'),
  ('00000000-0006-0000-0000-000000000007', 'f6_q7_not_very', 1, TRUE, FALSE, 'demo'),
  ('00000000-0006-0000-0000-000000000007', 'f6_q7_not', 0, TRUE, TRUE, 'demo')
ON CONFLICT DO NOTHING;

-- Q8: Solution fit
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0006-0000-0000-000000000008', 'Excellent fit', 'f6_q8_excellent', 1),
  ('00000000-0006-0000-0000-000000000008', 'Good fit', 'f6_q8_good', 2),
  ('00000000-0006-0000-0000-000000000008', 'Fair fit', 'f6_q8_fair', 3),
  ('00000000-0006-0000-0000-000000000008', 'Poor fit', 'f6_q8_poor', 4),
  ('00000000-0006-0000-0000-000000000008', 'Not a fit', 'f6_q8_not', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0006-0000-0000-000000000008', 'f6_q8_excellent', 10, FALSE, FALSE, 'solution_fit'),
  ('00000000-0006-0000-0000-000000000008', 'f6_q8_good', 7, FALSE, FALSE, 'solution_fit'),
  ('00000000-0006-0000-0000-000000000008', 'f6_q8_fair', 4, FALSE, FALSE, 'solution_fit'),
  ('00000000-0006-0000-0000-000000000008', 'f6_q8_poor', 1, TRUE, FALSE, 'solution_fit'),
  ('00000000-0006-0000-0000-000000000008', 'f6_q8_not', 0, TRUE, TRUE, 'solution_fit')
ON CONFLICT DO NOTHING;

-- Q9: ROI confidence
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0006-0000-0000-000000000009', 'Very confident', 'f6_q9_very', 1),
  ('00000000-0006-0000-0000-000000000009', 'Confident', 'f6_q9_confident', 2),
  ('00000000-0006-0000-0000-000000000009', 'Somewhat confident', 'f6_q9_somewhat', 3),
  ('00000000-0006-0000-0000-000000000009', 'Not very confident', 'f6_q9_not_very', 4),
  ('00000000-0006-0000-0000-000000000009', 'Not confident', 'f6_q9_not', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0006-0000-0000-000000000009', 'f6_q9_very', 10, FALSE, FALSE, 'roi'),
  ('00000000-0006-0000-0000-000000000009', 'f6_q9_confident', 7, FALSE, FALSE, 'roi'),
  ('00000000-0006-0000-0000-000000000009', 'f6_q9_somewhat', 4, FALSE, FALSE, 'roi'),
  ('00000000-0006-0000-0000-000000000009', 'f6_q9_not_very', 1, TRUE, FALSE, 'roi'),
  ('00000000-0006-0000-0000-000000000009', 'f6_q9_not', 0, TRUE, TRUE, 'roi')
ON CONFLICT DO NOTHING;

-- Q10: Pricing negotiation fairness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0006-0000-0000-000000000010', 'Very fair and transparent', 'f6_q10_very', 1),
  ('00000000-0006-0000-0000-000000000010', 'Fair and transparent', 'f6_q10_fair', 2),
  ('00000000-0006-0000-0000-000000000010', 'Somewhat fair', 'f6_q10_somewhat', 3),
  ('00000000-0006-0000-0000-000000000010', 'Not very fair', 'f6_q10_not_very', 4),
  ('00000000-0006-0000-0000-000000000010', 'Unfair or deceptive', 'f6_q10_unfair', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0006-0000-0000-000000000010', 'f6_q10_very', 10, FALSE, FALSE, 'negotiation'),
  ('00000000-0006-0000-0000-000000000010', 'f6_q10_fair', 7, FALSE, FALSE, 'negotiation'),
  ('00000000-0006-0000-0000-000000000010', 'f6_q10_somewhat', 4, FALSE, FALSE, 'negotiation'),
  ('00000000-0006-0000-0000-000000000010', 'f6_q10_not_very', 1, TRUE, TRUE, 'negotiation'),
  ('00000000-0006-0000-0000-000000000010', 'f6_q10_unfair', 0, TRUE, TRUE, 'negotiation')
ON CONFLICT DO NOTHING;

-- Q11: Contract process smoothness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0006-0000-0000-000000000011', 'Very smooth', 'f6_q11_very', 1),
  ('00000000-0006-0000-0000-000000000011', 'Smooth', 'f6_q11_smooth', 2),
  ('00000000-0006-0000-0000-000000000011', 'Moderately smooth', 'f6_q11_moderate', 3),
  ('00000000-0006-0000-0000-000000000011', 'Difficult', 'f6_q11_difficult', 4),
  ('00000000-0006-0000-0000-000000000011', 'Very difficult', 'f6_q11_very_difficult', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0006-0000-0000-000000000011', 'f6_q11_very', 10, FALSE, FALSE, 'contracting'),
  ('00000000-0006-0000-0000-000000000011', 'f6_q11_smooth', 7, FALSE, FALSE, 'contracting'),
  ('00000000-0006-0000-0000-000000000011', 'f6_q11_moderate', 5, FALSE, FALSE, 'contracting'),
  ('00000000-0006-0000-0000-000000000011', 'f6_q11_difficult', 2, TRUE, TRUE, 'contracting'),
  ('00000000-0006-0000-0000-000000000011', 'f6_q11_very_difficult', 0, TRUE, TRUE, 'contracting')
ON CONFLICT DO NOTHING;

-- Q12: Implementation effectiveness
INSERT INTO framework_options (question_id, label, value_key, order_index) VALUES
  ('00000000-0006-0000-0000-000000000012', 'Very effective', 'f6_q12_very', 1),
  ('00000000-0006-0000-0000-000000000012', 'Effective', 'f6_q12_effective', 2),
  ('00000000-0006-0000-0000-000000000012', 'Moderately effective', 'f6_q12_moderate', 3),
  ('00000000-0006-0000-0000-000000000012', 'Ineffective', 'f6_q12_ineffective', 4),
  ('00000000-0006-0000-0000-000000000012', 'Very ineffective', 'f6_q12_very_ineffective', 5)
ON CONFLICT DO NOTHING;

INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0006-0000-0000-000000000012', 'f6_q12_very', 10, FALSE, FALSE, 'implementation'),
  ('00000000-0006-0000-0000-000000000012', 'f6_q12_effective', 7, FALSE, FALSE, 'implementation'),
  ('00000000-0006-0000-0000-000000000012', 'f6_q12_moderate', 5, FALSE, FALSE, 'implementation'),
  ('00000000-0006-0000-0000-000000000012', 'f6_q12_ineffective', 2, TRUE, TRUE, 'implementation'),
  ('00000000-0006-0000-0000-000000000012', 'f6_q12_very_ineffective', 0, TRUE, TRUE, 'implementation')
ON CONFLICT DO NOTHING;

-- Q13: Overall satisfaction (scale 1-5)
INSERT INTO framework_scoring_rules (question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag) VALUES
  ('00000000-0006-0000-0000-000000000013', '1', 2, TRUE, TRUE, 'satisfaction'),
  ('00000000-0006-0000-0000-000000000013', '2', 4, TRUE, FALSE, 'satisfaction'),
  ('00000000-0006-0000-0000-000000000013', '3', 6, FALSE, FALSE, 'satisfaction'),
  ('00000000-0006-0000-0000-000000000013', '4', 8, FALSE, FALSE, 'satisfaction'),
  ('00000000-0006-0000-0000-000000000013', '5', 10, FALSE, FALSE, 'satisfaction')
ON CONFLICT DO NOTHING;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
