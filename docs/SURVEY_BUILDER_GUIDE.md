# Google Forms-Style Survey Builder — Implementation Guide

## Overview

This document explains the refactored survey creation system that matches Google Forms functionality while maintaining your existing DIP-APP architecture.

### Key Enhancements

✅ **12 Question Types** — Short Text, Long Text, Multiple Choice, Checkboxes, Dropdown, Linear Scale, Yes/No, Email, URL, Date, Time, Number  
✅ **Dynamic Question Management** — Add, edit, duplicate, delete questions with real-time UI updates  
✅ **Advanced Option Management** — Add/remove options, reorder via arrow buttons, smart option validation  
✅ **Required Field Marking** — Enforce mandatory responses per question  
✅ **Scale Configuration** — Customize min/max values and labels for Likert-style questions  
✅ **Two-Mode Editing** — Create new surveys & edit existing ones with identical interfaces  
✅ **Type Safety** — Full TypeScript interfaces with validation helpers  
✅ **AI Alignment** — Enhanced Groq prompt returns data matching new structure exactly  

---

## File Structure

### New Files Created

```
src/types/SurveyBuilder.ts
├── Core Interfaces
│   ├── QuestionType (enum-like union)
│   ├── Question (main question object)
│   ├── QuestionOption (option with label + value_key)
│   ├── SurveyCategory (thematic grouping)
│   └── SurveySnapshot (persisted structure)
├── Helper Functions
│   ├── createQuestion(type)
│   ├── validateQuestion(q)
│   └── Type guards (isSelectionQuestion, etc.)
└── Validation Error Types

src/components/app/AddOrGenerateSurveyDialog.refactored.tsx
├── Main Dialog Component
├── <RecommendationsTab /> — Framework pack suggestions
├── <GenerateTab /> — AI generation with prompting tips
├── <CustomSurveyTab /> — Custom question builder
├── <QuestionBlock /> — Single question editor (collapsible)
└── Enhanced Features
    ├── Question duplication
    ├── Drag-and-drop via arrow buttons
    ├── Option management UI
    └── Real-time validation

src/components/app/EditCustomSurveyDialog.refactored.tsx
├── Edit Dialog Component (similar to Create but with persistence)
├── Legacy snapshot parser (handles old AI-generated surveys)
├── <QuestionEditBlock /> — Edit-mode question block
└── Real-time local state before saving
```

### Modified Files

```
src/app/api/survey/generate-ai/route.ts
└── buildPrompt() function — Enhanced with detailed guidelines
    ├── 12 question type examples
    ├── Data validation rules
    ├── Quality guidelines
    └── Response schema documentation
```

---

## Data Structure

### Core Interfaces

#### `Question`

```typescript
interface Question {
  id: string                          // Unique identifier
  type: QuestionType                  // One of 12 types
  prompt: string                      // Display text
  required: boolean                   // Mandatory or optional
  order?: number                      // Position in survey

  // Selection-based fields (multiple_choice, checkboxes, dropdown)
  options?: QuestionOption[]

  // Linear scale fields
  scaleMin?: number                   // e.g., 1
  scaleMax?: number                   // e.g., 5
  minLabel?: string                   // e.g., "Strongly Disagree"
  maxLabel?: string                   // e.g., "Strongly Agree"

  // Checkbox constraints (optional)
  selectionLimit?: SelectionConstraint

  // Future extensibility
  description?: string
  randomizeOptions?: boolean
}
```

#### `QuestionOption`

```typescript
interface QuestionOption {
  id: string                          // UUID or deterministic ID
  label: string                       // Display text to respondent
  value_key: string                   // snake_case backend key
  order: number                       // Visual position
  isOther?: boolean                   // Special "Other" handling
  otherPlaceholder?: string           // Hint text if isOther=true
}
```

#### `SurveySnapshot` (Persisted to Supabase)

```typescript
interface SurveySnapshot {
  packName: string                    // Survey title
  version: string                     // e.g., "custom-1706123456"
  ai_generated: boolean               // true for AI surveys, false for custom
  custom_survey?: boolean             // true for hand-built surveys
  surveyDescription?: string          // Original AI prompt if applicable
  categories: SurveyCategory[]        // 1+ thematic groupings
}
```

#### `SurveyCategory`

```typescript
interface SurveyCategory {
  id: string
  name: string                        // e.g., "Product Experience"
  description?: string                // Optional intro text
  questions: Question[]
  order: number
}
```

---

## Usage Guide

### For Users: Creating a Custom Survey

1. **Open Dialog**  
   Click "Add or Generate AI Survey" → Tab to "Create Custom"

2. **Add Questions**  
   - Enter survey title
   - Click question type buttons (📝 Short Text, ⭕ Multiple Choice, etc.)
   - Each question appears as a collapsible block

3. **Edit Question Details** (Click to expand)
   - Enter question text
   - Toggle "Required" checkbox
   - For selection questions: Add/remove/reorder options via arrow buttons
   - For linear scales: Set min/max values and labels

4. **Advanced Actions**  
   - **Move Up/Down** ▲ ▼ — Reorder questions
   - **Duplicate** 📋 — Copy entire question and edit
   - **Delete** 🗑️ — Remove question

5. **Save**  
   Click "💾 Create" to save to Supabase

### For Developers: Integration

#### **Import the Types**

```typescript
import {
  Question,
  QuestionType,
  SurveySnapshot,
  SurveyCategory,
  createQuestion,
  validateQuestion,
  isSelectionQuestion,
} from '@/types/SurveyBuilder'
```

#### **Create Questions Programmatically**

```typescript
// Create a new question with defaults
const q = createQuestion('linear_scale')
// Returns: { id, type, prompt: '', required: false, scaleMin: 1, scaleMax: 5, ... }

// Validate before saving
const errors = validateQuestion(q)
if (errors.length > 0) {
  console.error('Validation failed:', errors)
}
```

#### **Handle Selection Questions**

```typescript
const isSelection = isSelectionQuestion(question.type)
if (isSelection) {
  question.options?.forEach(opt => {
    console.log(`${opt.label} → ${opt.value_key}`)
  })
}
```

#### **Fetch Surveys for Editing**

```typescript
const { data: survey } = await supabase
  .from('surveys')
  .select('pack_version_snapshot')
  .eq('id', surveyId)
  .single()

const snapshot = survey.pack_version_snapshot as SurveySnapshot
const questions = parseQuestionsFromSnapshot(snapshot)
```

---

## Migration Guide: Old → New Format

### If You Have Existing AI-Generated Surveys

The **EditCustomSurveyDialog** automatically normalizes legacy snapshots:

```typescript
function parseQuestionsFromSnapshot(snapshot): Question[] {
  // Handles:
  // - 'single_select' → 'multiple_choice'
  // - 'scale' → 'linear_scale'
  // - Diverse option formats (strings or objects)
  // Returns: Question[]
}
```

**No data loss** – your existing surveys will open and can be edited using the new UI.

### Creating Backwards-Compatible Snapshots

If you need to generate snapshots client-side for older code:

```typescript
const legacyFormat = {
  packName: snapshot.packName,
  version: snapshot.version,
  categories: snapshot.categories.map(cat => ({
    ...cat,
    questions: cat.questions.map(q => ({
      ...q,
      // Revert type names if needed:
      type: q.type === 'multiple_choice' ? 'single_select' : q.type
      type: q.type === 'linear_scale' ? 'scale' : q.type,
    }))
  }))
}
```

---

## Validation Rules

### Question Validation

```typescript
const errors = validateQuestion(question)
// Returns: QuestionValidationError[]

// Checked automatically:
// ✓ Prompt text is non-empty
// ✓ Selection questions have 2+ unique options
// ✓ Scale questions have valid min/max (3-10 point range)
// ✓ Option labels are unique and non-empty
```

### Survey Validation

```typescript
if (!title.trim()) error = 'Title required'
if (questions.length === 0) error = 'At least 1 question required'
if (validationErrors.length > 0) error = validation errors
```

---

## AI Generation Enhancement

### Updated Groq Prompt

The **buildPrompt()** function now includes:

✅ **12 Question Type Examples**  
```
"short_text": Single-line text input (e.g., "What is your name?")
"linear_scale": Likert scale (e.g., "1=Strongly Disagree, 5=Strongly Agree")
...
```

✅ **Value Key Requirements**  
```json
{
  "label": "Very Satisfied",
  "value_key": "very_satisfied"   // must be snake_case
}
```

✅ **Explicit Data Validation Rules**  
- Multiple choice: 2-5 options with value_key
- Linear scale: scaleMin=1, scaleMax=3-10, NO options array
- Single-answer types: NO options array

✅ **Quality Guidelines**  
- Avoid leading questions
- Organize by logical flow (general → specific)
- Honor persona/tone constraints
- Estimate completion time if mentioned

### Example AI Response

```json
{
  "surveyTitle": "Customer Satisfaction Survey",
  "categories": [
    {
      "name": "Product Experience",
      "description": "Your thoughts on core features",
      "questions": [
        {
          "type": "multiple_choice",
          "prompt": "How often do you use our platform?",
          "required": true,
          "options": [
            { "label": "Daily", "value_key": "daily" },
            { "label": "Weekly", "value_key": "weekly" },
            { "label": "Monthly", "value_key": "monthly" },
            { "label": "Rarely", "value_key": "rarely" }
          ]
        },
        {
          "type": "linear_scale",
          "prompt": "How satisfied are you with our product?",
          "required": true,
          "scaleMin": 1,
          "scaleMax": 5,
          "minLabel": "Not at all satisfied",
          "maxLabel": "Extremely satisfied"
        }
      ]
    }
  ]
}
```

---

## Component Architecture

### AddOrGenerateSurveyDialog.refactored.tsx

**Props:**
```typescript
interface Props {
  projectId: string
  projectName: string
  projectContext: ProjectContext
  packs: Pack[]
  existingPackIds: string[]
}
```

**Tabs:**
- **Recommend** — AI-ranked framework packs
- **Generate** — Groq AI generation with live prompting tips
- **Custom** — Hand-built survey editor

**Key State:**
```typescript
const [customQuestions, setCustomQuestions] = useState<Question[]>([])
const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)
const [customSurveyTitle, setCustomSurveyTitle] = useState('')
```

**Key Handlers:**
```typescript
addNewQuestion(type: QuestionType)
removeQuestion(id: string)
duplicateQuestion(id: string)
updateQuestion(id: string, updates: Partial<Question>)
moveQuestionUp/Down(index: number)
addOptionToQuestion(questionId: string, label?: string)
removeOptionFromQuestion(questionId: string, optionId: string)
updateOption(questionId: string, optionId: string, updates)
moveOptionUp/Down(questionId: string, optionIndex: number)
handleSaveCustomSurvey()
```

### EditCustomSurveyDialog.refactored.tsx

**Props:**
```typescript
interface Props {
  surveyId: string
  snapshot: SurveySnapshot
}
```

**Behavior:**
- Opens existing survey from Supabase snapshot
- Parses legacy formats automatically
- Allows real-time editing before persistence
- Saves entire snapshot back to DB

---

## Styling & UI

### Collapsible Question Blocks

Each question renders as a **collapsible panel**:

```
┌─────────────────────────────────────────┐
│ 1 | "What is your experience?"          │ ▼
│   • Multiple Choice • Required          │
└─────────────────────────────────────────┘

(click to expand)

┌─────────────────────────────────────────┐
│ 1 | "What is your experience?"          │ ▲
│   • Multiple Choice • Required          │
├─────────────────────────────────────────┤
│ [Question text input]                   │
│ ☑ This question is required             │
│ Options:                                 │
│   1. [Good]    ▲ ▼ ✕                   │
│   2. [Great]   ▲ ▼ ✕                   │
│   3. [Excellent] ▲ ▼ ✕                 │
│ + Add Option                            │
├─────────────────────────────────────────┤
│ ▲ ▼ 📋 Duplicate    🗑️ Delete         │
└─────────────────────────────────────────┘
```

### Color Scheme

- **Violet/Purple** — Primary actions, required badges, focus states
- **Gray** — Neutral states, disabled buttons
- **Red** — Deletion & error messages
- **Green** — Success states

### Responsive

- `grid-cols-2 md:grid-cols-3` for question type buttons
- `max-w-3xl` dialog width (increases from 2xl)
- Mobile-friendly touch targets (min 44px)

---

## API Integration

### Save Custom Survey

```bash
POST /surveys
{
  "project_id": "uuid",
  "pack_id": null,                    # null for custom surveys
  "pack_version_snapshot": { ... },   # SurveySnapshot
  "status": "published"
}
```

### Create Survey Token

```bash
POST /survey_tokens
{
  "survey_id": "uuid",
  "token": "<random 48-char hex>",
  "max_responses": null,
  "expires_at": null
}
```

### AI Generation

```bash
POST /api/survey/generate-ai
{
  "projectId": "uuid",
  "surveyDescription": "Act as a Senior UX Researcher..."
}

200 Response:
{
  "surveyId": "uuid",
  "token": "...",
  "shareLink": "/survey/...",
  "surveyTitle": "...",
  "questionCount": 18,
  "categoryCount": 3
}
```

---

## Common Patterns

### Add "Other" Option to Selection Questions

Currently handled by backend/renderer. To enable in UI:

```typescript
function addOtherOption(questionId: string) {
  setCustomQuestions(prev => prev.map(q => {
    if (q.id !== questionId) return q
    return {
      ...q,
      options: [...(q.options || []), {
        id: `${questionId}-other`,
        label: 'Other',
        value_key: 'other',
        isOther: true,
        otherPlaceholder: 'Please specify...'
      }]
    }
  }))
}
```

### Conditional Questions (Skip Logic)

Not yet implemented. To add:

```typescript
interface Question {
  // ... existing fields
  displayCondition?: {
    questionId: string
    operator: 'equals' | 'notEquals' | 'includes'
    value: string | string[]
  }
}
```

### Randomize Options

Supported in `Question` interface:

```typescript
{
  type: 'multiple_choice',
  prompt: '...',
  options: [...],
  randomizeOptions: true  // Renderer can shuffle
}
```

---

## Troubleshooting

### "Validation errors: At least 2 options required"

**Cause:** Selection question has fewer than 2 options

**Fix:** Add more options before saving

```typescript
const hasEnoughOptions = question.options && question.options.length >= 2
```

### "Scale must have 3-10 points"

**Cause:** scaleMin/scaleMax creates invalid range

**Fix:** Ensure `scaleMax - scaleMin >= 2`

```typescript
const rangeSize = (question.scaleMax || 5) - (question.scaleMin || 1)
if (rangeSize < 2 || rangeSize > 9) {
  // Error
}
```

### Options show as empty strings

**Cause:** Option labels not synced when updating value_key

**Fix:** Ensure `onUpdateOption` updates label + value_key:

```typescript
onUpdateOption(optionId, {
  label: newLabel,
  value_key: newLabel.toLowerCase().replace(/\s+/g, '_')
})
```

### Survey won't save

**Debug Steps:**

1. Check browser console for fetch errors
2. Verify Supabase RLS policies allow insert on `surveys` table for authenticated users
3. If `pack_id` not-null constraint error: Ensure migration allows NULL for custom surveys
4. Run validation: `validateQuestion()` should return no errors

---

## Performance Considerations

### State Updates

All handlers use functional updates to avoid stale closures:

```typescript
// ✅ Good
setQuestions(prev => prev.map(q => ...))

// ❌ Bad
const newQ = [...questions]
setQuestions(newQ)
```

### Memoization

Use `useCallback` for handlers passed to child components (already implemented in refactored code).

### Large Surveys

If surveys exceed 50+ questions, consider:
- Virtual scrolling (e.g., `react-window`)
- Lazy-loading category tabs
- Debounced auto-saves

---

## Testing

### Unit Tests (Example)

```typescript
describe('SurveyBuilder', () => {
  test('validateQuestion rejects empty prompt', () => {
    const q = createQuestion('short_text')
    const errors = validateQuestion(q)
    expect(errors).toContainEqual(
      expect.objectContaining({ field: 'prompt' })
    )
  })

  test('validateQuestion requires 2+ options for selection', () => {
    const q = createQuestion('multiple_choice')
    q.options = [] // Invalid
    const errors = validateQuestion(q)
    expect(errors.some(e => e.field === 'options')).toBe(true)
  })
})
```

### Integration Tests

```typescript
describe('EditCustomSurveyDialog', () => {
  test('saves updated questions to Supabase', async () => {
    // render component
    // modify question
    // click save
    // assert supabase.update() called with correct snapshot
  })
})
```

---

## Future Enhancements

### Planned Features

- [ ] **Conditional Logic** — Show/hide questions based on responses
- [ ] **Section Descriptions** — Add intro text to categories
- [ ] **Question Groups** — Grid-style matrix questions
- [ ] **Rich Text** — Format question text with *emphasis*, **bold**, links
- [ ] **Import/Export** — CSV / XLS templates
- [ ] **Analytics Integration** — Auto-publish to GA4, Mixpanel
- [ ] **Response Limits** — Close survey after N responses
- [ ] **Branching Survey** — Multi-path surveys with different endpoints

### Extensibility

The `Question` interface is designed for forward compatibility:

```typescript
interface Question {
  // Core fields (current)
  id, type, prompt, required, order

  // Selection/Scale fields (current)
  options, scaleMin, scaleMax, minLabel, maxLabel

  // Future fields can be added:
  description?       // Category/section intro
  randomizeOptions?  // Shuffle option order
  displayCondition?  // Conditional show/hide
  validation?        // Custom regex / rules
  metadata?          // Tags, analytics labels
}
```

---

## Support & Questions

For questions on:
- **Architecture**: See file structure & component diagrams above
- **API**: Check route handlers in `src/app/api/`
- **Types**: Reference `src/types/SurveyBuilder.ts`
- **UI**: Check Tailwind classes & component props

---

## Summary

You now have a Google Forms-style survey builder with:

✅ **12 question types** matching Google Forms functionality  
✅ **Drag-and-drop UI** via arrow buttons for reordering  
✅ **Duplicate & delete** actions for bulk editing  
✅ **Advanced option management** (add, remove, reorder)  
✅ **Real-time validation** with clear error messages  
✅ **AI alignment** with enhanced Groq prompt  
✅ **Type safety** with full TypeScript interfaces  
✅ **Backwards compatibility** for legacy surveys  

Integration is straightforward — replace the old component files with the refactored versions and start using the new `SurveyBuilder` types!
