# DIP Framework System - Comprehensive Guide

## Overview
The DIP system now includes 6 professional decision intelligence frameworks for different use cases. Each framework provides structured surveys with scoring, risk detection, and AI-powered insights.

## Available Frameworks

### 1. Customer Experience Decision Intelligence (Original MVP)
**Use Case**: E-commerce, SaaS platforms, digital products  
**Categories**:
- Trust & Security Perception (20%)
- Usability & Navigation (25%)
- Conversion & Decision Friction (25%)
- Overall Experience Quality (20%)
- Loyalty & Advocacy Potential (10%)

**Questions**: 21 comprehensive questions  
**Best For**: Understanding customer journey friction points and conversion optimization

---

### 2. Employee Experience & Engagement ⭐ NEW
**Use Case**: HR departments, organizational health assessment  
**Categories**:
- Work Environment & Culture (25%)
- Leadership & Management (20%)
- Growth & Development (25%)
- Compensation & Recognition (15%)
- Work-Life Balance & Wellbeing (15%)

**Questions**: 18 strategic questions  
**Best For**: Employee satisfaction surveys, retention prediction, culture assessment

**Key Metrics**:
- eNPS (Employee Net Promoter Score)
- Leadership trust scores
- Career path clarity
- Workload sustainability

---

### 3. SaaS Product Adoption & Retention ⭐ NEW
**Use Case**: B2B SaaS companies, product managers  
**Categories**:
- Onboarding & Time-to-Value (25%)
- Feature Discovery & Usage (25%)
- Product Value & ROI (25%)
- Support & Documentation (15%)
- Renewal & Expansion Intent (10%)

**Questions**: 13 adoption-focused questions  
**Best For**: Customer health scores, churn prediction, product-market fit assessment

**Key Metrics**:
- Time to first value
- Feature adoption rate
- Renewal likelihood
- Expansion potential

---

### 4. E-commerce Conversion Optimization ⭐ NEW
**Use Case**: Online retail, marketplaces  
**Categories**:
- Product Discovery & Search (25%)
- Product Page Experience (20%)
- Cart & Checkout Process (30%)
- Trust & Security (15%)
- Post-Purchase Experience (10%)

**Questions**: 13 conversion-focused questions  
**Best For**: Cart abandonment analysis, checkout optimization, product discovery improvement

**Key Metrics**:
- Search effectiveness
- Checkout friction points
- Trust indicators
- Repeat purchase intent

---

### 5. Mobile App User Experience ⭐ NEW
**Use Case**: Mobile app developers, product teams  
**Categories**:
- First Impression & Onboarding (20%)
- UI/UX & Navigation (25%)
- Performance & Stability (25%)
- Features & Functionality (20%)
- Engagement & Retention (10%)

**Questions**: 13 app-specific questions  
**Best For**: App store rating improvement, user retention, feature prioritization

**Key Metrics**:
- Onboarding completion
- Crash frequency
- Feature satisfaction
- Daily/weekly active usage

---

### 6. B2B Sales Process Experience ⭐ NEW
**Use Case**: Enterprise sales teams, B2B procurement  
**Categories**:
- Discovery & Initial Contact (20%)
- Sales Engagement Quality (25%)
- Solution Fit & Demo (25%)
- Negotiation & Contracting (20%)
- Implementation & Onboarding (10%)

**Questions**: 13 sales journey questions  
**Best For**: Sales process optimization, buyer journey mapping, win/loss analysis

**Key Metrics**:
- Sales responsiveness
- Demo effectiveness
- Contract friction
- Implementation satisfaction

---

## How to Activate New Frameworks

### Step 1: Run the Migration
```powershell
# Navigate to your project
cd "C:\Users\Bea Alexa Bausas\OneDrive\Desktop\DIP\dip-app"

# Run the new migration using Supabase CLI
supabase db push
```

Or manually run the migration file:
```sql
-- In Supabase Dashboard > SQL Editor
-- Run: supabase/migrations/006_additional_frameworks.sql
```

### Step 2: Verify Frameworks are Active
Check the `framework_packs` table:
```sql
SELECT id, name, version, active, description 
FROM framework_packs 
WHERE active = true 
ORDER BY created_at DESC;
```

You should see all 6 frameworks listed.

### Step 3: Create Projects with New Frameworks
1. Go to your DIP app dashboard
2. Create a new project
3. Select one of the new frameworks from the dropdown
4. Configure your survey and send to participants

---

## Framework Scoring Methodology

Each framework uses the same sophisticated scoring system:

### Score Components
- **score_delta**: 0-10 points per answer
- **risk_flag**: Boolean indicating problematic responses
- **friction_flag**: Boolean indicating user experience friction
- **driver_tag**: Category identifier for AI insights

### Category Weights
Each framework's categories have weights that sum to 1.0 (100%), allowing for:
- Overall index scores (0-100)
- Category-specific scores
- Weighted average calculations
- Comparative analytics

### Risk & Friction Detection
- **High Risk**: Scores 0-3 + risk_flag = TRUE
- **Medium Risk**: Scores 4-6 with friction_flag
- **Low Risk**: Scores 7-10 with no flags

---

## Customization Options

### Option 1: Activate/Deactivate Frameworks
```sql
-- Deactivate a framework
UPDATE framework_packs 
SET active = false 
WHERE name = 'Framework Name';

-- Reactivate
UPDATE framework_packs 
SET active = true 
WHERE name = 'Framework Name';
```

### Option 2: Adjust Category Weights
```sql
-- Increase importance of a category
UPDATE framework_categories 
SET weight = 0.30 
WHERE pack_id = 'framework-id' AND name = 'Category Name';

-- Remember: All category weights must sum to 1.0 per framework
```

### Option 3: Modify Question Order
```sql
-- Reorder questions within a category
UPDATE framework_questions 
SET order_index = 5 
WHERE id = 'question-id';
```

---

## Best Practices

### Framework Selection
- **Customer-facing products**: Customer Experience or E-commerce frameworks
- **Internal tools**: Employee Experience framework
- **SaaS platforms**: SaaS Adoption framework
- **Mobile products**: Mobile App framework
- **Enterprise sales**: B2B Sales Process framework

### Survey Distribution
1. **Target Audience**: Match framework to respondent type (customers, employees, etc.)
2. **Sample Size**: Aim for 30+ responses for statistical significance
3. **Timing**: Deploy at key journey moments (post- purchase, quarterly reviews, etc.)
4. **Frequency**: Balance insight needs with survey fatigue

### Analyzing Results
1. **Index Score**: Overall health metric (0-100)
2. **Category Breakdown**: Identify weak areas
3. **Risk Flags**: Prioritize critical issues
4. **Friction Points**: Optimize user experience
5. **AI Insights**: Leverage automated recommendations

---

## Technical Architecture

### Database Schema
```
framework_packs (top level container)
  └─ framework_categories (weighted groups)
       └─ framework_questions (individual questions)
            ├─ framework_options (answer choices)
            └─ framework_scoring_rules (scoring logic)
```

### Question Types Supported
- `single_select`: Single choice questions
- `scale`: Numeric scale questions (NPS, ratings)
- `multi_select`: Multiple choice (future)
- `text`: Open-ended text (future)

---

## Migration Details

**File**: `supabase/migrations/006_additional_frameworks.sql`  
**Size**: ~600 lines  
**Added**:
- 5 new framework packs
- 25 new categories
- 70 new questions
- Framework structure ready for full option/scoring implementation

**Status**: Structure complete - options abbreviated for file size. Full production deployment should include all 4-5 options per question with complete scoring rules following the pattern established in `003_seed_framework_v1.sql`.

---

## Next Steps for Production

1. ✅ **Completed**: Framework structure and questions
2. ⏳ **Recommended**: Add complete options and scoring for all questions
3. ⏳ **Optional**: Create framework-specific report templates
4. ⏳ **Optional**: Add framework switcher in project creation UI
5. ⏳ **Optional**: Build framework comparison analytics

---

## Support & Customization

Need custom frameworks for your specific industry or use case? The framework system is designed to be extensible:

1. Copy the pattern from `006_additional_frameworks.sql`
2. Create new UUIDs for your framework, categories, and questions
3. Define appropriate weights (must sum to 1.0)
4. Add questions with scoring rules
5. Set `active = true` to make it available

---

## Framework Versioning

Each framework has a version number (currently all at 1.0). When making significant changes:
- Create a new pack with incremented version
- Maintain backward compatibility with existing projects
- Document changes in migration notes

---

**Last Updated**: February 25, 2026  
**Migration Version**: 006  
**Framework Count**: 6 total (1 original + 5 new)
