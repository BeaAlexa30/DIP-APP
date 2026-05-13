## Table `activity_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `user_email` | `text` |  |
| `user_name` | `text` |  Nullable |
| `action` | `text` |  |
| `details` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `ai_insights`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `score_run_id` | `uuid` |  |
| `summary_text` | `text` |  Nullable |
| `themes_json` | `jsonb` |  Nullable |
| `model_metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `root_causes_json` | `jsonb` |  Nullable |
| `action_plan_json` | `jsonb` |  Nullable |
| `success_metrics_json` | `jsonb` |  Nullable |
| `risk_level` | `text` |  Nullable |

## Table `app_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `company_name` | `text` |  |
| `logo_url` | `text` |  Nullable |
| `primary_color` | `text` |  |
| `footer_tagline` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `executive_results`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `score_run_id` | `uuid` |  |
| `health_score_0_100` | `numeric` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `framework_categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pack_id` | `uuid` |  |
| `name` | `text` |  |
| `weight` | `numeric` |  |
| `order_index` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `framework_options`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `question_id` | `uuid` |  |
| `label` | `text` |  |
| `value_key` | `text` |  |
| `order_index` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `framework_packs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `version` | `text` |  |
| `description` | `text` |  Nullable |
| `active` | `bool` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `framework_questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pack_id` | `uuid` |  |
| `category_id` | `uuid` |  |
| `type` | `text` |  |
| `prompt` | `text` |  |
| `required` | `bool` |  |
| `order_index` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `framework_scoring_rules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `question_id` | `uuid` |  |
| `option_value_key` | `text` |  |
| `score_delta` | `numeric` |  |
| `risk_flag` | `bool` |  |
| `friction_flag` | `bool` |  |
| `driver_tag` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `index_results`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `score_run_id` | `uuid` |  |
| `index_key` | `text` |  |
| `score_0_100` | `numeric` |  |
| `higher_is_better` | `bool` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `issue_rankings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `score_run_id` | `uuid` |  |
| `driver_tag` | `text` |  |
| `risk` | `numeric` |  |
| `friction` | `numeric` |  |
| `frequency` | `numeric` |  |
| `priority_score` | `numeric` |  |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `orgs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  Nullable |
| `email` | `text` |  |
| `full_name` | `text` |  Nullable |
| `role` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |
| `status` | `text` |  |
| `password_change_required` | `bool` |  |
| `is_active` | `bool` |  |

## Table `projects`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  Nullable |
| `created_by` | `uuid` |  |
| `client_name` | `text` |  |
| `industry` | `text` |  Nullable |
| `goal` | `text` |  Nullable |
| `stage` | `text` |  Nullable |
| `channels` | `_text` |  Nullable |
| `target_audience` | `text` |  Nullable |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `report_shares`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `score_run_id` | `uuid` |  |
| `token` | `text` |  Unique |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `expires_at` | `timestamptz` |  Nullable |
| `view_count` | `int4` |  Nullable |
| `last_viewed_at` | `timestamptz` |  Nullable |
| `is_active` | `bool` |  Nullable |

## Table `response_answers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `response_id` | `uuid` |  |
| `question_id` | `uuid` |  |
| `option_value_key` | `text` |  Nullable |
| `free_text` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `responses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `survey_id` | `uuid` |  |
| `token_id` | `uuid` |  Nullable |
| `respondent_meta` | `jsonb` |  Nullable |
| `submitted_at` | `timestamptz` |  Nullable |

## Table `score_results`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `score_run_id` | `uuid` |  |
| `category_id` | `uuid` |  Nullable |
| `raw_score` | `numeric` |  |
| `min_possible` | `numeric` |  |
| `max_possible` | `numeric` |  |
| `normalized_score` | `numeric` |  |
| `created_at` | `timestamptz` |  Nullable |
| `ai_category_name` | `text` |  Nullable |

## Table `score_runs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `survey_id` | `uuid` |  |
| `framework_version` | `text` |  |
| `executed_at` | `timestamptz` |  Nullable |
| `checksum` | `text` |  |
| `response_count` | `int4` |  |

## Table `survey_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `survey_id` | `uuid` |  |
| `token` | `text` |  Unique |
| `expires_at` | `timestamptz` |  Nullable |
| `max_responses` | `int4` |  Nullable |
| `response_count` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `surveys`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `pack_id` | `uuid` |  Nullable |
| `pack_version_snapshot` | `jsonb` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

