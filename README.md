# Decision Intelligence Platform (DIP)

A full-stack platform for CX decision intelligence. Clients complete structured surveys, responses are scored through a deterministic engine, and results are presented as indexes, dashboards, and exportable PDF reports. The platform includes an admin panel for user management, branding customization, activity logging, and notification management.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Environment Setup](#environment-setup)
4. [Supabase Setup & Migrations](#supabase-setup--migrations)
5. [Running Locally](#running-locally)
6. [Running Unit Tests](#running-unit-tests)
7. [Project Structure](#project-structure)
8. [Scoring Engine](#scoring-engine)
9. [AI Insights Contract](#ai-insights-contract)
10. [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

```
Browser (Next.js App Router)
    │
    ├── /login                         — Auth (Supabase Auth)
    ├── /app/**                        — Protected internal app (requires auth)
    │       ├── /app                              Dashboard
    │       ├── /app/projects                     Projects list & intake
    │       ├── /app/projects/new                 New project form
    │       ├── /app/projects/[id]                Project detail + survey management
    │       ├── /app/projects/[id]/dashboard      Scoring dashboard
    │       ├── /app/projects/[id]/responses      Response viewer
    │       ├── /app/frameworks                   Framework pack browser
    │       └── /app/settings                     Admin settings panel
    │
    ├── /survey/[token]                — Public respondent survey (anon)
    ├── /reports/[projectId]           — Report preview + PDF export
    └── /share/report                  — Shareable public report link

API Routes (Next.js Route Handlers)
    ├── /api/scoring/run                        — Trigger deterministic scoring pipeline
    ├── /api/assessment-frameworks/capture-version — Create versioned framework snapshot
    ├── /api/insights/generate                  — Generate AI text insights
    ├── /api/insights/dashboard                 — Fetch dashboard insights
    ├── /api/intelligence/create-analysis       — AI intelligence analysis
    ├── /api/analytics/execute-assessment       — Execute assessment analytics
    ├── /api/assessments/*                      — Assessment CRUD + token + submission
    ├── /api/survey/*                           — Survey management + AI generation
    ├── /api/projects/[id]                      — Project CRUD
    ├── /api/reporting/manage-sharing           — Report sharing management
    ├── /api/reports/share                      — Shared report access
    ├── /api/auth/signup                        — User registration
    ├── /api/auth/change-password               — Password change
    ├── /api/admin/users                        — Admin: user management
    ├── /api/admin/activity                     — Admin: activity log viewer
    ├── /api/admin/notifications                — Admin: notification management
    ├── /api/admin/download/project             — Admin: project data export
    ├── /api/admin/download/migrations          — Admin: migration file download
    ├── /api/activity/log                       — Activity logging
    ├── /api/settings/branding                  — Branding configuration
    └── /api/workspaces/[id]                    — Workspace management

Supabase (Postgres + Auth + Row Level Security)
    ├── Full RLS on all tables
    ├── 11 migration files (run in order)
    └── Helper functions & dashboard views
```

**Data Flow:**
1. Admin creates a **Project** (client intake form)
2. Admin selects a **Framework Pack** → a versioned snapshot is frozen to the survey
3. A **Survey Token** (UUID link) is published and shared with respondents
4. Respondents complete the survey at `/survey/[token]` — responses stored anonymously
5. Admin triggers the **Scoring Engine** — deterministic pipeline runs and persists results
6. Dashboard shows Executive Health Score + 5 Index Scores + ranked issues + category breakdown
7. Admin generates AI Insights (strictly summary-only, never affects scores)
8. Admin exports **PDF Report** for the client

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Framer Motion |
| Backend | Next.js API Routes (Route Handlers) |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Charts | Recharts (RadarChart, BarChart) |
| PDF Export | jsPDF + jspdf-autotable |
| AI Insights | Google Gemini `gemini-2.0-flash` (summaries only) |
| AI (Groq) | Groq SDK — alternative AI provider |
| State Management | Zustand |
| Validation | Zod |
| Email | Nodemailer + Resend |
| Archiving | Archiver (project data export) |
| Unit Tests | Jest + ts-jest |
| Checksums | `crypto-js` SHA-256 |

---

## Environment Setup

Copy `.env.local` (already created in project root) and fill in all required values:

```env
# Supabase — get from your Supabase project dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Service Role key — NEVER expose to browser, server-side only
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini — for AI insights generation only
GEMINI_API_KEY=your_gemini_api_key

# Groq — alternative AI provider (optional)
GROQ_API_KEY=your_groq_api_key
```

> **Important:** `SUPABASE_SERVICE_ROLE_KEY` is used by the scoring engine API route to bypass RLS when writing results. Never use it in client-side code.

---

## Supabase Setup & Migrations

### Prerequisites
- A Supabase project (free tier works for MVP)
- Supabase CLI installed: `npm install -g supabase`

### Migration Files (run in order)

```
supabase/migrations/001_initial_schema.sql       ← Must run first (creates all tables)
supabase/migrations/002_rls_policies.sql         ← Row Level Security policies
supabase/migrations/003_helper_functions.sql     ← Helper functions + dashboard views
supabase/migrations/004_report_shares.sql        ← Shareable report links
supabase/migrations/005_ai_category_scores.sql   ← AI category scoring tables
supabase/migrations/006_archive_project.sql      ← Project archiving support
supabase/migrations/007_delete_seeded_frameworks.sql ← Cleanup seeded frameworks
supabase/migrations/011_settings_and_approval.sql    ← App settings + user approval
supabase/migrations/012_password_change_required.sql ← Force password change flag
supabase/migrations/013_user_active_status.sql   ← User active/inactive status
supabase/migrations/014_activity_logs.sql        ← Activity logging table
```

### Option A: Supabase Dashboard (recommended for quick start)

Run each SQL file in order via **Supabase Dashboard > SQL Editor**.

### Option B: Supabase CLI

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

### Option C: Manual psql

```bash
psql "$DATABASE_URL" -f supabase/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/002_rls_policies.sql
psql "$DATABASE_URL" -f supabase/migrations/003_helper_functions.sql
psql "$DATABASE_URL" -f supabase/migrations/004_report_shares.sql
psql "$DATABASE_URL" -f supabase/migrations/005_ai_category_scores.sql
psql "$DATABASE_URL" -f supabase/migrations/006_archive_project.sql
psql "$DATABASE_URL" -f supabase/migrations/007_delete_seeded_frameworks.sql
psql "$DATABASE_URL" -f supabase/migrations/011_settings_and_approval.sql
psql "$DATABASE_URL" -f supabase/migrations/012_password_change_required.sql
psql "$DATABASE_URL" -f supabase/migrations/013_user_active_status.sql
psql "$DATABASE_URL" -f supabase/migrations/014_activity_logs.sql
```

### Enable Row Level Security

RLS is automatically enabled via migration 002. Verify in Supabase Dashboard:
Go to **Database > Tables** and confirm the shield icon is active on all tables.

### Enable Anonymous Auth (for survey respondents)

1. Supabase Dashboard > **Authentication > Providers**
2. Enable **Anonymous sign-ins**

---

## Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- You will be redirected to `/login`
- Sign up to create the first user account (admin approval may be required)
- After login, you are redirected to `/app` (dashboard)

### First-time Setup Checklist

- [ ] All 11 migrations have been run in Supabase
- [ ] `.env.local` has valid Supabase URL + anon key + service role key + Gemini API key
- [ ] At least one admin user account created via `/login`
- [ ] Framework packs added via SQL or admin import

---

## Running Unit Tests

```bash
# Run all tests once
npm test

# Run in watch mode (re-runs on file changes)
npm run test:watch
```

Test suite located at `src/lib/scoring/__tests__/AssessmentScoringEngine.test.ts`

| Suite | Coverage |
|---|---|
| `normalizeScore()` | Score normalization, edge cases (0/100/clamped) |
| `computePriorityScore()` | Priority formula, all-zero, decimal weights |
| `computeWeightedIndex()` | Weighted average, missing components, fallback |
| `computeHealthScore()` | Health formula, risk penalty, boundary values |
| `computeChecksum()` | SHA-256 determinism, ID ordering, versioning |

---

## Project Structure

```
dip-app/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql          # All tables, triggers, indexes
│       ├── 002_rls_policies.sql            # Row Level Security for all tables
│       ├── 003_helper_functions.sql        # SQL functions + dashboard views
│       ├── 004_report_shares.sql           # Shareable report links
│       ├── 005_ai_category_scores.sql      # AI category scoring tables
│       ├── 006_archive_project.sql         # Project archiving
│       ├── 007_delete_seeded_frameworks.sql
│       ├── 011_settings_and_approval.sql   # App settings + user approval flow
│       ├── 012_password_change_required.sql
│       ├── 013_user_active_status.sql
│       └── 014_activity_logs.sql
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── activity/log/route.ts                   # Log activity events
│   │   │   ├── admin/
│   │   │   │   ├── users/route.ts                      # List/manage users
│   │   │   │   ├── users/[id]/route.ts                 # User detail + status
│   │   │   │   ├── activity/route.ts                   # Activity log viewer
│   │   │   │   ├── notifications/route.ts              # Notification management
│   │   │   │   ├── download/project/route.ts           # Export project data
│   │   │   │   └── download/migrations/route.ts        # Download migrations
│   │   │   ├── analytics/execute-assessment/route.ts   # Run assessment analytics
│   │   │   ├── assessment-frameworks/capture-version/route.ts
│   │   │   ├── assessments/
│   │   │   │   ├── [id]/state-management/route.ts
│   │   │   │   ├── create-access-token/route.ts
│   │   │   │   ├── reload-framework-data/route.ts
│   │   │   │   ├── submit-ai-response/route.ts
│   │   │   │   ├── submit-response/route.ts
│   │   │   │   └── update-response-count/route.ts
│   │   │   ├── auth/
│   │   │   │   ├── signup/route.ts                     # User registration
│   │   │   │   └── change-password/route.ts
│   │   │   ├── framework/[id]/route.ts
│   │   │   ├── framework/snapshot/route.ts
│   │   │   ├── insights/generate/route.ts              # AI text insights
│   │   │   ├── insights/dashboard/route.ts
│   │   │   ├── intelligence/create-analysis/route.ts
│   │   │   ├── projects/[id]/route.ts
│   │   │   ├── reporting/manage-sharing/route.ts
│   │   │   ├── reports/share/route.ts
│   │   │   ├── scoring/run/route.ts                    # Deterministic scoring pipeline
│   │   │   ├── settings/branding/route.ts
│   │   │   ├── survey/
│   │   │   │   ├── [id]/status/route.ts
│   │   │   │   ├── generate-ai/route.ts
│   │   │   │   ├── generate-token/route.ts
│   │   │   │   ├── increment-count/route.ts
│   │   │   │   ├── recommend-frameworks/route.ts
│   │   │   │   ├── refresh-snapshot/route.ts
│   │   │   │   └── submit/route.ts
│   │   │   └── workspaces/[id]/route.ts
│   │   ├── app/
│   │   │   ├── layout.tsx                              # Protected layout + sidebar
│   │   │   ├── page.tsx                                # Dashboard landing
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx                            # Projects list
│   │   │   │   ├── new/page.tsx                        # Client intake form
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx                        # Project detail
│   │   │   │       ├── dashboard/page.tsx              # Scoring dashboard
│   │   │   │       └── responses/page.tsx              # Response viewer
│   │   │   ├── frameworks/page.tsx                     # Framework browser
│   │   │   └── settings/page.tsx                       # Admin settings
│   │   ├── login/page.tsx                              # Auth page
│   │   ├── survey/[token]/page.tsx                     # Survey entry (public)
│   │   ├── reports/[projectId]/page.tsx                # Report preview + export
│   │   ├── share/report/                               # Public shared report
│   │   ├── layout.tsx
│   │   └── page.tsx                                    # Root redirect
│   │
│   ├── components/
│   │   ├── app/
│   │   │   ├── AddOrGenerateSurveyDialog.tsx
│   │   │   ├── ApplicationLoadingIndicator.tsx
│   │   │   ├── ChangePasswordModal.tsx
│   │   │   ├── FrameworkPacksTable.tsx
│   │   │   ├── NavigationSidebar.tsx
│   │   │   ├── ProjectEditDialog.tsx
│   │   │   ├── ProjectManagementControls.tsx
│   │   │   ├── ProjectRemovalControl.tsx
│   │   │   ├── ProjectsTable.tsx
│   │   │   ├── ProjectTableRow.tsx
│   │   │   ├── ScoringEngineController.tsx
│   │   │   ├── SurveyBulkManager.tsx
│   │   │   ├── SurveyDisplayWidget.tsx
│   │   │   ├── SurveyOrchestrator.tsx
│   │   │   ├── SurveyStateManager.tsx
│   │   │   ├── UserProfileProvider.tsx
│   │   │   └── settings/
│   │   │       ├── ActivityLogPanel.tsx
│   │   │       ├── BrandingSettingsForm.tsx
│   │   │       ├── DownloadPanel.tsx
│   │   │       ├── NotificationsPanel.tsx
│   │   │       ├── SettingsTabs.tsx
│   │   │       └── UserManagementPanel.tsx
│   │   ├── dashboard/
│   │   │   ├── AIInsightsPanel.tsx
│   │   │   ├── AnalyticsCategoryVisualizer.tsx
│   │   │   ├── AssessmentFrameworkPicker.tsx
│   │   │   ├── DashboardAutoInsights.tsx
│   │   │   ├── DashboardCharts.tsx
│   │   │   ├── ExecutionHistoryTracker.tsx
│   │   │   ├── MetricsOverviewCard.tsx
│   │   │   ├── PriorityIssuesDisplay.tsx
│   │   │   └── TimeperiodSelector.tsx
│   │   ├── reports/
│   │   │   ├── ReportDownloadController.tsx
│   │   │   └── ReportSharingManager.tsx
│   │   └── survey/
│   │       └── InteractiveSurveyRenderer.tsx
│   │
│   ├── lib/
│   │   ├── activity/ActivityLogger.ts                  # Activity event logging
│   │   ├── ai/IntelligenceAnalyticsProcessor.ts        # AI analytics processor
│   │   ├── auth/
│   │   │   ├── AccessControlGuard.ts
│   │   │   ├── UserPermissionDefinitions.ts
│   │   │   └── UserProfileRetriever.ts
│   │   ├── email/                                      # Email sending utilities
│   │   ├── framework/AssessmentFrameworkCapture.ts     # Framework snapshot utility
│   │   ├── reports/DocumentGenerationService.ts        # PDF report generator
│   │   ├── scoring/
│   │   │   ├── AssessmentScoringEngine.ts              # Deterministic scoring pipeline
│   │   │   ├── AIAssessmentScoringEngine.ts            # AI-assisted scoring
│   │   │   └── __tests__/AssessmentScoringEngine.test.ts
│   │   ├── settings/AppSettingsLoader.ts               # App settings loader
│   │   └── supabase/
│   │       ├── AuthenticationMiddleware.ts
│   │       ├── DatabaseClientManager.ts                # Browser Supabase client
│   │       └── ServerSideDbConnector.ts                # Server-side Supabase client
│   │
│   ├── types/
│   │   └── DatabaseSchemaDefinitions.ts                # TypeScript types for all DB tables
│   └── proxy.ts
│
├── public/
│   └── images/
│       └── NexSurveySolutionsLogo.png
├── .env.local                                          # Environment variables (fill in)
├── jest.config.ts
├── next.config.ts
├── postcss.config.mjs
└── tsconfig.json
```

---

## Scoring Engine

The scoring engine is **fully deterministic** — the same inputs always produce identical outputs. Results are cryptographically checksummed (SHA-256) for audit traceability.

### Pipeline Steps (`src/lib/scoring/engine.ts`)

1. Load survey + frozen framework snapshot from DB
2. Load all responses + response_answers for the survey
3. Load scoring rules, build rule map: `questionId::optionValueKey → rule`
4. Compute per-category raw scores (sum of `score_delta` values)
5. Compute min/max possible scores per category × response count
6. Normalize: `(raw - min) / (max - min) × 100`, clamped 0–100
7. Compute driver-tag normalized averages (weighted by response volume)
8. Compute 5 weighted indexes via `INDEX_COMPOSITION` config
9. Compute Executive Health Score:
   ```
   score = 0.25×Trust + 0.25×Usability + 0.20×(100 - ConversionRisk)
           + 0.20×Experience + 0.10×Loyalty - riskPenalty

   riskPenalty = (riskFlags / totalAnswers) × 100 × 0.5
   ```
10. Compute issue rankings: `priority = 0.4×risk + 0.4×friction + 0.2×frequency`
11. Generate SHA-256 checksum: `{surveyId, frameworkVersion, sortedResponseIds, packSnapshot}`
12. Persist all results to DB: `score_runs`, `score_results`, `index_results`, `executive_results`, `issue_rankings`

### Index Composition (v1)

| Index | Components & Weights |
|---|---|
| **Trust Index** | data_security (0.4) + transparency (0.3) + social_proof (0.2) + security_friction (0.1) |
| **Usability Index** | navigation (0.25) + usability (0.25) + performance (0.20) + reliability (0.20) + device_compat (0.10) |
| **Conversion Risk Index** | conversion_ease (0.30) + abandonment (0.30) + info_clarity (0.20) + process_length (0.10) + conversion_sat (0.10) — *lower is better* |
| **Experience Index** | overall_experience (0.40) + support (0.25) + expectation_gap (0.25) + friction_frequency (0.10) |
| **Loyalty Index** | nps (0.40) + retention (0.40) + advocacy (0.20) |

### Auditability

Every score run stores:
- `checksum` — SHA-256 of all inputs
- `framework_version` — version string from the frozen snapshot
- `response_count` — count of responses included
- `created_at` — timestamp of the run

To verify: re-trigger scoring on the same survey and compare checksums. Identical inputs → identical checksum.

---

## AI Insights Contract

**AI is strictly for text summaries only. It never affects, computes, or overrides any score.**

### What AI does
- Receives already-computed `ScoringResult` data
- Produces: `{ summary: string, themes: string[] }`
- Stored in the `ai_insights` table, linked to the score run

### What AI never does
- Does not compute indexes or scores
- Does not rerank issues
- Does not influence the Executive Health Score
- The prompt explicitly instructs: *"you must NOT recompute or change any scores"*

### In the PDF report
All AI-generated content is clearly labeled **"AI-Generated Summary (Non-Scoring)"** with a disclaimer note.

### Model
`gemini-2.0-flash`, temperature 0.3, `responseMimeType: application/json`

---

## Deployment Checklist

### Vercel Deployment

1. Push code to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Set all environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY` (if using Groq)
4. Deploy

### Production Supabase Checklist

- [ ] All 11 migrations run successfully (001–007, 011–014)
- [ ] RLS enabled on all tables (verify via Dashboard > Database > Tables)
- [ ] Anonymous sign-ins enabled (for survey respondents)
- [ ] Email confirmation configured (for admin user signups)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added to Vercel env vars (keep secret)

### Post-Deploy Verification

1. Visit `/login` → sign up → confirm redirect to `/app`
2. Visit `/app/frameworks` → confirm framework packs are listed
3. Create a test project → create a survey → copy the token URL
4. Open token URL in incognito → complete the survey
5. Back in admin: trigger scoring for the survey project
6. Verify dashboard shows scores → export PDF

---

## License

Internal use only — Decision Intelligence Platform, 2025–2026.
