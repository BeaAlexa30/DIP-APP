# Key Differences: Original vs. Refactored Components

## 🎯 At a Glance

| Aspect | Original | Refactored |
|--------|----------|-----------|
| **Question Structure** | Simple strings (`options?: string[]`) | Rich objects (`options?: QuestionOption[]` with `label`, `value_key`, `order`, `id`) |
| **Question Block UI** | Not shown (simple list) | **Collapsible panels** with detailed editing |
| **Question Actions** | Add, remove, reorder | Add, **duplicate**, remove, reorder + option-level actions |
| **Option Management** | Add/remove/edit in nested loop | **Full CRUD with reordering** via arrow buttons |
| **Validation** | Basic (title + count) | **Comprehensive** (prompt, options uniqueness, scale ranges) |
| **Type System** | Local interfaces | **Imported from SurveyBuilder.ts** with helpers |
| **State Management** | String options + basic fields | **Full Question objects** with nested validation |
| **UI Complexity** | Inline editing | **Collapsible blocks** matching Google Forms |

---

## 💻 Code-Level Changes

### **1. Type Imports**

**ORIGINAL:**
```typescript
// All types defined locally
type QuestionType = 'short_text' | 'long_text' | ...
interface CustomQuestion {
  id: string
  type: QuestionType
  prompt: string
  required: boolean
  options?: string[]  // ❌ Plain strings
  scaleMin?: number
  // etc.
}
```

**REFACTORED:**
```typescript
// Import rich type system
import {
  Question,                    // ✅ Full object
  QuestionType,
  SurveySnapshot,
  SurveyCategory,
  QuestionOption,              // ✅ With id, label, value_key, order
  createQuestion,              // ✅ Helper to create with defaults
  validateQuestion,            // ✅ Pre-save validation
} from '@/types/SurveyBuilder'

// Use imported types
const [customQuestions, setCustomQuestions] = useState<Question[]>([])
```

**Why?**
- Validates options have required fields before saving
- Enables option-level operations (move up/down, update value_key)
- Shares structure with editing dialog and AI generation
- Type guards prevent bugs

---

### **2. Question Option Structure**

**ORIGINAL:**
```typescript
interface CustomQuestion {
  options?: string[]  // Just labels
}

// Usage:
question.options?.map((label, idx) => (
  <input value={label} onChange={(e) => {
    const newOpts = [...question.options]
    newOpts[idx] = e.target.value
    // ❌ No way to update value_key automatically
    // ❌ No option IDs for reordering
  }} />
))
```

**REFACTORED:**
```typescript
interface Question {
  options?: QuestionOption[]
}

interface QuestionOption {
  id: string                    // ✅ Unique per option
  label: string                 // ✅ Display text
  value_key: string             // ✅ Backend key (auto-synced)
  order: number                 // ✅ Explicit ordering
}

// Usage - full manipulation:
function updateOption(questionId, optionId, updates) {
  setCustomQuestions(prev =>
    prev.map(q => 
      q.id === questionId 
        ? {
            ...q,
            options: q.options.map(o =>
              o.id === optionId ? { ...o, ...updates } : o
            )
          }
        : q
    )
  )
}

// Move option up/down:
function moveOptionUp(questionId, optionIndex) {
  setCustomQuestions(prev =>
    prev.map(q => {
      if (q.id !== questionId) return q
      const opts = [...q.options]
      ;[opts[optionIndex - 1], opts[optionIndex]] = 
        [opts[optionIndex], opts[optionIndex - 1]]
      return {
        ...q,
        options: opts.map((o, idx) => ({ ...o, order: idx + 1 }))
      }
    })
  )
}
```

**Why?**
- Each option gets a unique ID for reliable updates
- `value_key` stored separately from display `label`
- `order` field enables reordering with arrow buttons
- Matches Supabase schema exactly

---

### **3. Question Block UI**

**ORIGINAL:**
```typescript
{customQuestions.length > 0 && (
  <div className="space-y-3">
    {customQuestions.map((question, index) => (
      <QuestionEditor
        key={question.id}
        question={question}
        index={index}
        isEditing={editingQuestionId === question.id}
        onEdit={() => setEditingQuestionId(question.id)}
        // ... (inline editing, not collapsible)
      />
    ))}
  </div>
)}
```

**REFACTORED:**
```typescript
{customQuestions.length > 0 && (
  <div className="space-y-3">
    {customQuestions.map((question, index) => (
      <QuestionBlock  // ✅ Renamed & enhanced
        key={question.id}
        question={question}
        index={index}
        isExpanded={expandedQuestionId === question.id}  // ✅ Collapsible
        totalQuestions={customQuestions.length}
        onExpand={() => setExpandedQuestionId(question.id)}
        onUpdate={(updates) => updateQuestion(question.id, updates)}
        onRemove={() => removeQuestion(question.id)}
        onDuplicate={() => duplicateQuestion(question.id)}  // ✅ NEW
        onMoveUp={() => moveQuestionUp(index)}
        onMoveDown={() => moveQuestionDown(index)}
        onAddOption={(label?) => addOptionToQuestion(question.id, label)}
        onRemoveOption={(optId) => removeOptionFromQuestion(question.id, optId)}
        onUpdateOption={(optId, updates) => updateOption(question.id, optId, updates)}
        onMoveOptionUp={(optIdx) => moveOptionUp(question.id, optIdx)}  // ✅ NEW
        onMoveOptionDown={(optIdx) => moveOptionDown(question.id, optIdx)}  // ✅ NEW
      />
    ))}
  </div>
)}
```

**Visual Difference:**
```
ORIGINAL (expanded inline):
┌─────────────────────────────┐
│ Q1 | [Input] | Type | Req   │
│    | Options:              │
│    |   [Opt A] [Opt B] ✕    │
│    |   + Add Option         │
│    | ... (all questions     │
│    | ... look the same)     │
│ Q2 | [Input] | Type | Req   │
│    | Options: ...           │
└─────────────────────────────┘

REFACTORED (collapsible):
┌─────────────────────────────┐
│ 1 | Question text?    ▼     │  ← Click to expand
│   • Multiple Choice • Req    │
└─────────────────────────────┘

┌─────────────────────────────┐  ← After clicking expand
│ 1 | Question text?    ▲     │
│   • Multiple Choice • Req    │
├─────────────────────────────┤
│ [Full edit UI here]         │
│ [Options editor]            │
│ [Scale config]              │
├─────────────────────────────┤
│ ▲ ▼ 📋 Duplicate 🗑️ Delete │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 2 | Another question?  ▼    │  ← Collapsed by default
│   • Checkboxes             │
└─────────────────────────────┘
```

---

### **4. Question Duplication (NEW)**

**ORIGINAL:**
```typescript
// ❌ Not implemented
// User had to manually re-create similar questions
```

**REFACTORED:**
```typescript
// ✅ NEW FEATURE
function duplicateQuestion(id: string) {
  const original = customQuestions.find(q => q.id === id)
  if (!original) return

  const duplicate: Question = {
    ...original,
    id: createQuestion(original.type).id,  // New ID
    options: original.options?.map((opt, idx) => ({
      ...opt,
      id: `${createQuestion(original.type).id}-opt-${idx}`,  // New option IDs
    })),
  }

  // Insert after original
  const idx = customQuestions.findIndex(q => q.id === id)
  const newQuestions = [...customQuestions]
  newQuestions.splice(idx + 1, 0, duplicate)
  setCustomQuestions(newQuestions)
}

// UI: Click 📋 Duplicate button → full question copied with new IDs
```

---

### **5. Option Reordering (NEW)**

**ORIGINAL:**
```typescript
// ❌ Could remove/add options, but not reorder
{(question.options || []).map((option, optIndex) => (
  <div key={optIndex}>
    <input value={option} onChange={...} />
    {(question.options || []).length > 2 && (
      <button onClick={() => removeOption(optIndex)}>✕</button>
    )}
  </div>
))}
```

**REFACTORED:**
```typescript
// ✅ Full reordering with arrows
{(question.options || []).map((option, optIdx) => (
  <div key={option.id} className="flex items-center gap-2">
    <input value={option.label} onChange={...} />
    <div className="flex gap-1">
      {optIdx > 0 && (
        <button onClick={() => onMoveOptionUp(optIdx)}>▲</button>
      )}
      {optIdx < (question.options || []).length - 1 && (
        <button onClick={() => onMoveOptionDown(optIdx)}>▼</button>
      )}
      {(question.options || []).length > 2 && (
        <button onClick={() => onRemoveOption(option.id)}>✕</button>
      )}
    </div>
  </div>
))}
```

---

### **6. Validation (Enhanced)**

**ORIGINAL:**
```typescript
async function handleSaveCustomSurvey() {
  // ❌ Minimal validation
  if (!customSurveyTitle.trim() || customQuestions.length === 0) {
    setCustomError('Survey title and at least one question are required.')
    return
  }

  const invalid = customQuestions.filter(q => !q.prompt.trim())
  if (invalid.length > 0) {
    setCustomError('All questions must have a prompt text.')
    return
  }
  
  // No validation of options structure
}
```

**REFACTORED:**
```typescript
async function handleSaveCustomSurvey() {
  // ✅ Comprehensive validation
  if (!customSurveyTitle.trim() || customQuestions.length === 0) {
    setCustomError('Survey title and at least one question are required.')
    return
  }

  // Use imported validation helper
  const validationErrors = customQuestions.flatMap(q => validateQuestion(q))
  // validateQuestion checks:
  // - Prompt text is non-empty
  // - Selection questions have 2+ unique options
  // - Scale questions have valid min/max (3-10 points)
  // - Option labels are unique and non-empty
  
  if (validationErrors.length > 0) {
    setCustomError(
      `Validation errors:\n${validationErrors.map(e => `- ${e.message}`).join('\n')}`
    )
    return
  }

  // ... save logic
}
```

---

### **7. State Management Comparison**

**ORIGINAL:**
```typescript
const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([])
const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

// Option manipulation mixed into update function
function updateCustomQuestion(id: string, updates: Partial<CustomQuestion>) {
  setCustomQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q))
}

// Options are just strings - no separate handler for option-level ops
```

**REFACTORED:**
```typescript
const [customQuestions, setCustomQuestions] = useState<Question[]>([])
const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)

// Separate handlers for question vs. option operations
function updateQuestion(id: string, updates: Partial<Question>) {
  setCustomQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...updates } : q)))
}

// NEW: Dedicated option handlers
function addOptionToQuestion(questionId: string, label: string = '') {
  setCustomQuestions(prev =>
    prev.map(q => {
      if (q.id !== questionId) return q
      const newOptions = [...(q.options || [])]
      newOptions.push({
        id: `${questionId}-opt-${newOptions.length}`,
        label: label || `Option ${newOptions.length + 1}`,
        value_key: (label || `Option ${newOptions.length + 1}`)
          .toLowerCase()
          .replace(/\s+/g, '_'),
        order: newOptions.length,
      })
      return { ...q, options: newOptions }
    })
  )
}

function moveOptionUp(questionId: string, optionIndex: number) { /* ... */ }
function moveOptionDown(questionId: string, optionIndex: number) { /* ... */ }
function updateOption(questionId: string, optionId: string, updates) { /* ... */ }
```

---

## 📊 Feature Matrix

| Feature | Original | Refactored | Notes |
|---------|----------|-----------|-------|
| **Add Question** | ✅ | ✅ | Same |
| **Edit Question Text** | ✅ | ✅ | Now in collapsible block |
| **Toggle Required** | ✅ | ✅ | Same |
| **Add Option** | ✅ | ✅ | Enhanced with ID + value_key |
| **Remove Option** | ✅ | ✅ | Same |
| **Edit Option Text** | ✅ | ✅ | Same |
| **Reorder Options** | ❌ | ✅ NEW | Arrow buttons |
| **Duplicate Question** | ❌ | ✅ NEW | 📋 Button |
| **Move Question Up/Down** | ✅ | ✅ | Enhanced arrows |
| **Delete Question** | ✅ | ✅ | Same |
| **Scale Configuration** | ✅ | ✅ | Enhanced inputs |
| **Collapsible UI** | ❌ | ✅ NEW | Organized editing |
| **Validation Helper** | ❌ | ✅ NEW | validateQuestion() |
| **TypeScript Types** | Local | **Shared** | Reused in EditDialog + imports |

---

## 🎨 UI/UX Improvements

### Header Presentation
**ORIGINAL:**
```typescript
// Question shown inline with type badge
<div className="space-y-3">
  {customQuestions.map((q, i) => <QuestionEditor ... />)}
</div>
```

**REFACTORED:**
```typescript
// Question shown as collapsible header
┌──────────────────────────────────┐
│ 1 Question text here?       ▼    │  ← Click to expand
│   ⭕ Multiple Choice  Required   │
└──────────────────────────────────┘
```

### Edit Space
**ORIGINAL:**
```
All questions always showing full editing UI
= Long scroll, hard to navigate with 10+ questions
```

**REFACTORED:**
```
Only expanded question shows full UI
= Compact view, click to expand what you need
= Matches Google Forms UX exactly
```

### Actions Bar
**ORIGINAL:**
```
No dedicated action area
(Actions mixed into question body)
```

**REFACTORED:**
```
┌────────────────────────────────┐
│ ... [editing UI] ...           │
├────────────────────────────────┤
│ ▲ ▼ 📋 Duplicate   🗑️ Delete  │  ← Clear action buttons
└────────────────────────────────┘
```

---

## Migration Checklist

If replacing original with refactored:

- [ ] Import new types from `SurveyBuilder.ts`
- [ ] Remove old local type definitions
- [ ] Replace `CustomQuestion` with `Question`
- [ ] Update parent components using these dialogs
- [ ] Test custom survey creation flow
- [ ] Test editing existing surveys
- [ ] Verify option structure in saved snapshots
- [ ] Check Supabase schema supports new structure

---

## Summary: Why These Changes Matter

| Change | Impact |
|--------|--------|
| **Rich Question Objects** | Enables options to have IDs, value_keys, explicit ordering |
| **Collapsible UI** | Scales to 50+ questions without endless scrolling |
| **Option Reordering** | Users can organize response options (critical for surveys) |
| **Question Duplication** | Saves time creating similar questions |
| **Validation Helper** | Catches errors before saving to DB |
| **Shared Types** | EditDialog, CreateDialog, API all use same structure |
| **Google Forms Parity** | Feature-complete survey builder, familiar to all users |

