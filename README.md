# Decision Intelligence Platform (DIP) — MVP

A full-stack platform for CX decision intelligence. Clients complete structured surveys, responses are scored through a deterministic engine, and results are presented as indexes, dashboards, and exportable PDF reports.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Environment Setup](#environment-setup)
4. [Supabase Setup & Migrations](#supabase-setup--migrations)
5. [Running Locally](#running-locally)
6. [Running Unit Tests](#running-unit-tests)
7. [Seeding the Framework](#seeding-the-framework)
8. [Project Structure](#project-structure)
9. [Scoring Engine](#scoring-engine)
10. [AI Insights Contract](#ai-insights-contract)
11. [Sprint / Team Tasks](#sprint--team-tasks)
12. [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

```
Browser (Next.js App Router)
    │
    ├── /login               — Auth (Supabase Auth)
    ├── /app/**              — Protected internal app (requires auth)
    │       ├── /app                   Dashboard
    │       ├── /app/projects          Projects list & intake
    │       ├── /app/projects/[id]     Project detail + survey management
    │       ├── /app/projects/[id]/dashboard   Scoring dashboard
    │       └── /app/frameworks        Framework pack browser
    │
    ├── /survey/[token]      — Public respondent survey (anon)
    └── /reports/[projectId] — Report preview + PDF export

API Routes (Next.js Route Handlers)
    ├── POST /api/scoring/run          — Trigger deterministic scoring pipeline
    ├── POST /api/framework/snapshot   — Create versioned framework snapshot
    └── POST /api/insights/generate    — Generate AI-only text insights

Supabase (Postgres + Auth + Row Level Security)
    ├── 18 tables with full RLS
    ├── 4 migration files (run in order)
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
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (Route Handlers) |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Charts | Recharts (RadarChart, BarChart) |
| PDF Export | jsPDF + jspdf-autotable |
| AI Insights | Google Gemini `gemini-2.0-flash` (summaries only) |
| Unit Tests | Jest + ts-jest |
| Checksums | Node.js `crypto` SHA-256 |

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
```

> **Important:** `SUPABASE_SERVICE_ROLE_KEY` is used by the scoring engine API route to bypass RLS when writing results. Never use it in client-side code.

---

## Supabase Setup & Migrations

### Prerequisites
- A Supabase project (free tier works for MVP)
- Supabase CLI installed: `npm install -g supabase`

### Option A: Supabase Dashboard (recommended for quick start)

Run each SQL file in order via **Supabase Dashboard > SQL Editor**:

```
supabase/migrations/001_initial_schema.sql    ← Must run first (creates all tables)
supabase/migrations/002_rls_policies.sql      ← Must run second (adds RLS)
supabase/migrations/003_seed_framework_v1.sql ← Seed CX framework pack
supabase/migrations/004_helper_functions.sql  ← Helper functions + views
```

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
psql "$DATABASE_URL" -f supabase/migrations/003_seed_framework_v1.sql
psql "$DATABASE_URL" -f supabase/migrations/004_helper_functions.sql
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
- Sign up to create the first user account
- After login, you are redirected to `/app` (dashboard)

### First-time Setup Checklist

- [ ] Migrations 001–004 have been run in Supabase
- [ ] `.env.local` has valid Supabase URL + anon key + service role key
- [ ] At least one admin user account created via `/login`
- [ ] Framework Pack visible in `/app/frameworks` (seeded by migration 003)

---

## Running Unit Tests

```bash
# Run all tests once
npm test

# Run in watch mode (re-runs on file changes)
npm run test:watch
```

Current test suite: **27 tests, all passing** in `src/lib/scoring/__tests__/engine.test.ts`

| Suite | Tests | Coverage |
|---|---|---|
| `normalizeScore()` | 7 | Score normalization, edge cases (0/100/clamped) |
| `computePriorityScore()` | 7 | Priority formula, all-zero, decimal weights |
| `computeWeightedIndex()` | 5 | Weighted average, missing components, fallback |
| `computeHealthScore()` | 5 | Health formula, risk penalty, boundary values |
| `computeChecksum()` | 4 | SHA-256 determinism, ID ordering, versioning |

---

## Seeding the Framework

Migration `003_seed_framework_v1.sql` automatically seeds:

**Framework Pack:** "Customer Experience Decision Intelligence" (v1.0)

| # | Category | Weight | Questions |
|---|---|---|---|
| 1 | Trust & Security Perception | 20% | 4 |
| 2 | Usability & Navigation | 25% | 5 |
| 3 | Conversion & Decision Friction | 25% | 5 |
| 4 | Overall Experience Quality | 20% | 4 |
| 5 | Loyalty & Advocacy Potential | 10% | 3 |

**Total:** 21 questions, 4–5 options each, all options have scoring rules (score_delta 0–10, risk_flag, friction_flag, driver_tag).

### Adding New Framework Packs

Framework packs are currently added via SQL only (no admin UI). To add a new pack:

1. Create a new `.sql` file in `supabase/migrations/` following the pattern of `003_seed_framework_v1.sql`
2. Insert into: `framework_packs` → `framework_categories` → `framework_questions` → `framework_options` → `framework_scoring_rules`
3. Run the migration against your Supabase project

---

## Project Structure

```
dip-app/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql     # All 18 tables, triggers, indexes
│       ├── 002_rls_policies.sql       # Row Level Security for all tables
│       ├── 003_seed_framework_v1.sql  # CX Framework Pack v1.0 seed
│       └── 004_helper_functions.sql   # SQL functions + dashboard views
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── scoring/run/route.ts         # POST: run scoring pipeline
│   │   │   ├── framework/snapshot/route.ts  # POST: create framework snapshot
│   │   │   └── insights/generate/route.ts   # POST: generate AI insights
│   │   ├── app/
│   │   │   ├── layout.tsx                   # Protected layout + sidebar
│   │   │   ├── page.tsx                     # Dashboard landing
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx                 # Projects list
│   │   │   │   ├── new/page.tsx             # Client intake form
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx             # Project detail
│   │   │   │       └── dashboard/page.tsx   # Scoring dashboard
│   │   │   └── frameworks/page.tsx          # Framework browser
│   │   ├── login/page.tsx                   # Auth page
│   │   ├── survey/[token]/page.tsx          # Survey entry (public)
│   │   ├── reports/[projectId]/page.tsx     # Report preview + export
│   │   ├── layout.tsx                       # Root layout
│   │   └── page.tsx                         # Root redirect
│   │
│   ├── components/
│   │   ├── app/
│   │   │   ├── Sidebar.tsx                  # Navigation sidebar
│   │   │   ├── SurveyManager.tsx            # Survey creation + link sharing
│   │   │   └── ScoreRunTrigger.tsx          # Scoring trigger UI
│   │   ├── dashboard/
│   │   │   ├── IndexScoreCard.tsx           # Color-coded index score card
│   │   │   ├── IssueRankingTable.tsx        # Priority-sorted issue table
│   │   │   └── CategoryChart.tsx            # Radar + bar chart (Recharts)
│   │   ├── reports/
│   │   │   └── ReportExportButton.tsx       # Client-side PDF trigger
│   │   └── survey/
│   │       └── SurveyFlow.tsx               # Respondent survey UI
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                    # Browser Supabase client
│   │   │   ├── server.ts                    # Server-side Supabase client
│   │   │   └── middleware.ts                # Middleware session updater
│   │   ├── scoring/
│   │   │   ├── engine.ts                    # Deterministic scoring pipeline
│   │   │   └── __tests__/engine.test.ts     # 27 unit tests (all passing)
│   │   ├── reports/
│   │   │   └── pdf.ts                       # PDF report generator
│   │   ├── ai/
│   │   │   └── insights.ts                  # AI summary generator
│   │   └── framework/
│   │       └── snapshot.ts                  # Framework snapshot utility
│   │
│   ├── types/
│   │   └── database.ts                      # TypeScript types for all DB tables
│   └── middleware.ts                        # Route protection (/app → /login)
│
├── .env.local                               # Environment variables (fill in)
├── jest.config.ts                           # Jest + ts-jest configuration
├── next.config.ts                           # Next.js config
├── tailwind.config.ts                       # Tailwind CSS config
└── tsconfig.json                            # TypeScript config
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

## Sprint / Team Tasks

Suggested allocation for a 5-intern team:

| Sprint | Task | Owner |
|---|---|---|
| **Sprint 1** | Supabase setup, run migrations, verify schema | Intern 1 |
| **Sprint 1** | Supabase Auth setup, login page testing | Intern 2 |
| **Sprint 1** | Environment config, local dev setup for all | DevLead |
| **Sprint 2** | Project intake form → project detail page | Intern 1 |
| **Sprint 2** | SurveyManager + framework snapshot API | Intern 2 |
| **Sprint 2** | Survey respondent flow (SurveyFlow component) | Intern 3 |
| **Sprint 3** | Scoring engine integration test (real DB) | Intern 4 |
| **Sprint 3** | Dashboard page + IndexScoreCard + CategoryChart | Intern 3 |
| **Sprint 3** | IssueRankingTable + ScoreRunTrigger | Intern 5 |
| **Sprint 4** | PDF report generation + ReportExportButton | Intern 1 |
| **Sprint 4** | AI insights API + insights section in dashboard | Intern 2 |
| **Sprint 4** | RLS policy verification + security audit | DevLead |
| **Sprint 5** | End-to-end testing (full flow) | All |
| **Sprint 5** | Performance + mobile testing of survey flow | Intern 3 |
| **Sprint 5** | Deployment to Vercel + production Supabase | DevLead |

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
4. Deploy

### Production Supabase Checklist

- [ ] Migrations 001–004 run successfully
- [ ] RLS enabled on all tables (verify via Dashboard > Database > Tables)
- [ ] Anonymous sign-ins enabled (for survey respondents)
- [ ] Email confirmation configured (for admin user signups)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added to Vercel env vars (keep secret)

### Post-Deploy Verification

1. Visit `/login` → sign up → confirm redirect to `/app`
2. Visit `/app/frameworks` → confirm CX framework pack is listed
3. Create a test project → create a survey → copy the token URL
4. Open token URL in incognito → complete the survey
5. Back in admin: trigger scoring for the survey project
6. Verify dashboard shows scores → export PDF

---

## Known Limitations (MVP)

- **Framework packs are managed via SQL only** — no admin UI for creating new packs
- **Single framework version** — the CX Framework v1.0 is the only seeded pack
- **RPC type casting** — `supabase.rpc('increment_token_response_count' as any, ...)` uses `as any` due to missing auto-generated Supabase types; resolve by running `supabase gen types typescript` after deployment
- **PDF is client-side only** — PDF generation runs in the browser; for large reports, server-side generation may be needed in a future sprint

---

## License

Internal use only — Decision Intelligence Platform MVP, 2025.
