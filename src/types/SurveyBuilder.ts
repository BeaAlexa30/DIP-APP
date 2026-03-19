/**
 * SurveyBuilder.ts
 * ═════════════════════════════════════════════════════════════
 * Enhanced TypeScript interfaces for Google Forms-style survey creation.
 * Supports:
 *   - Dynamic question types with strict validation
 *   - Advanced option management (add, delete, reorder, "Other" field)
 *   - Required field marking and validation
 *   - Duplicate and delete actions per question block
 *   - Optional selection limits for checkboxes
 *   - Scale configuration for Linear Scale questions
 */

/**
 * All supported question types in the survey builder
 */
export type QuestionType =
  | 'short_text'      // Single-line text input
  | 'long_text'       // Multi-line text area
  | 'multiple_choice' // Radio buttons (pick one)
  | 'checkboxes'      // Checkboxes (pick multiple)
  | 'dropdown'        // Dropdown select
  | 'linear_scale'    // 1-N rating scale
  | 'yes_no'          // Binary choice
  | 'email'           // Email validation
  | 'url'             // URL validation
  | 'date'            // Date picker
  | 'time'            // Time picker
  | 'number'          // Numeric input

/**
 * Selection limit type for checkboxes (optional constraint)
 */
export type SelectionLimitType = 'unlimited' | 'max' | 'min' | 'exact'

/**
 * Rich text formatting marks for bold, italic, underline, etc.
 */
export interface TextMark {
  type: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'link'
  start: number      // Character position start
  end: number        // Character position end
  url?: string       // For link marks
}

/**
 * Rich text content with formatting (similar to Google Forms)
 * Stores plain text + formatting marks separately for portability
 */
export interface RichTextContent {
  text: string       // Plain text content
  marks?: TextMark[] // Formatting marks (bold, italic, etc.)
}

/**
 * Skip logic for conditional question display
 * Shows/hides questions based on responses to previous questions
 */
export interface SkipLogic {
  /** Question ID this skip logic references */
  sourceQuestionId: string
  /** Operator for comparison */
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan'
  /** Values to compare against (e.g., option value_keys) */
  values: string[]
  /** Jump to this section ID (null = end survey) */
  jumpToSectionId: string | null
  /** Jump to this question ID if jumpToSectionId is null */
  jumpToQuestionId?: string
}

/**
 * Button that redirects to another section (section shortcut)
 */
export interface SectionButton {
  id: string
  label: string           // Button text
  targetSectionId: string // Which section to jump to
}

/**
 * Option object for selection-based questions
 * Supports standard label + value_key, and special "Other" handling
 */
export interface QuestionOption {
  /** Unique ID per option (UUID or deterministic) */
  id: string
  /** Display label shown to respondent */
  label: string
  /** Snake_case key for backend storage */
  value_key: string
  /** Visual order within options array */
  order: number
  /** Flag: if true, this is an "Other: ____" option */
  isOther?: boolean
  /** Optional placeholder text if isOther=true */
  otherPlaceholder?: string
}

/**
 * Scale configuration for linear_scale questions
 */
export interface ScaleConfig {
  scaleMin: number        // Minimum value (typically 1)
  scaleMax: number        // Maximum value (typically 5-10)
  minLabel: string        // Label for minimum (e.g., "Strongly Disagree")
  maxLabel: string        // Label for maximum (e.g., "Strongly Agree")
}

/**
 * Selection constraint for checkbox-type questions
 */
export interface SelectionConstraint {
  type: SelectionLimitType
  count?: number          // When type is 'min', 'max', or 'exact'
}

/**
 * Core Question object used in both Create and Edit modes
 * Designed to serialize cleanly to JSONB and match Supabase schema
 */
export interface Question {
  /** Unique identifier (ephemeral during creation, persistent when saved) */
  id: string
  /** Question type determines UI and validation */
  type: QuestionType
  /** The question text (supports rich text: bold, italic, underline, links) */
  prompt: string | RichTextContent
  /** Whether the response is mandatory */
  required: boolean
  /** Visual order within the survey */
  order?: number

  // ── Selection-based fields (multiple_choice, checkboxes, dropdown) ──
  /** Options for selection questions */
  options?: QuestionOption[]

  // ── Linear scale fields ──
  /** Scale configuration for linear_scale type */
  scaleMin?: number
  scaleMax?: number
  minLabel?: string
  maxLabel?: string

  // ── Checkbox-specific fields ──
  /** Optional: min/max selection constraints for checkboxes */
  selectionLimit?: SelectionConstraint

  // ── Rich text & formatting ──
  /** Optional description shown below the question (with rich text) */
  description?: string | RichTextContent
  /** Optional: render as grid (multiple rows/columns) */
  displayAsGrid?: boolean
  /** Optional: randomize option order */
  randomizeOptions?: boolean

  // ── Skip Logic & Branching ──
  /** Optional: conditional display/skip logic */
  skipLogic?: SkipLogic[]
}

/**
 * Category/Section object (organizational grouping of questions)
 * Allows surveys to be sectioned into logical groups with rich text descriptions
 */
export interface SurveyCategory {
  /** Unique category identifier */
  id: string
  /** Section name (e.g., "Demographics", "Product Experience") */
  name: string
  /** Optional description with rich text formatting (shown above questions) */
  description?: string | RichTextContent
  /** Optional: buttons that jump to other sections */
  sectionButtons?: SectionButton[]
  /** Questions within this section */
  questions: Question[]
  /** Visual order */
  order: number
  /** Optional: collapse this section by default in rendering */
  collapsedByDefault?: boolean
}

/**
 * Complete survey snapshot (saved to Supabase JSONB column)
 * Persisted as pack_version_snapshot in surveys table
 */
export interface SurveySnapshot {
  /** Survey title */
  packName: string
  /** Version identifier (custom-TIMESTAMP or ai-TIMESTAMP) */
  version: string
  /** Whether generated by AI */
  ai_generated: boolean
  /** Whether this is a custom-built survey (vs. framework pack) */
  custom_survey?: boolean
  /** Original AI prompt if applicable */
  surveyDescription?: string
  /** Form description shown to respondents (supports rich text) */
  description?: string | RichTextContent | null
  /** Organized survey structure */
  categories: SurveyCategory[]
}

/**
 * Local state for editing a question during creation
 * Extends Question with ephemeral editing metadata
 */
export interface EditingQuestion extends Question {
  /** Temporary new option being added (UI-only) */
  pendingOption?: string
}

/**
 * Validation result for a question
 */
export interface QuestionValidationError {
  field: 'prompt' | 'options' | 'scale' | 'selectionLimit'
  message: string
}

/**
 * Helper function to create a new question with sensible defaults
 */
export function createQuestion(type: QuestionType): Question {
  const base: Question = {
    id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type,
    prompt: '',
    required: false,
  }

  if (['multiple_choice', 'checkboxes', 'dropdown'].includes(type)) {
    base.options = [
      { id: 'opt1', label: 'Option 1', value_key: 'option_1', order: 1 },
      { id: 'opt2', label: 'Option 2', value_key: 'option_2', order: 2 },
    ]
  }

  if (type === 'linear_scale') {
    base.scaleMin = 1
    base.scaleMax = 5
    base.minLabel = 'Strongly Disagree'
    base.maxLabel = 'Strongly Agree'
  }

  if (type === 'checkboxes') {
    base.selectionLimit = { type: 'unlimited' }
  }

  return base
}

/**
 * Helper to extract text from either string or RichTextContent
 */
export function getText(content: string | RichTextContent | undefined): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  return content.text
}

/**
 * Helper to convert plain text to RichTextContent
 */
export function createRichText(text: string): RichTextContent {
  return { text, marks: [] }
}

/**
 * Helper to extract plain HTML from RichTextContent for display
 */
export function richTextToHtml(content: string | RichTextContent | undefined): string {
  if (!content) return ''
  if (typeof content === 'string') return escapeHtml(content)

  let html = escapeHtml(content.text)
  if (!content.marks || content.marks.length === 0) return html

  // Sort marks by position (reverse order to maintain indices)
  const sortedMarks = [...content.marks].sort((a, b) => b.start - a.start)

  for (const mark of sortedMarks) {
    const before = html.substring(0, mark.start)
    const marked = html.substring(mark.start, mark.end)
    const after = html.substring(mark.end)

    let wrapper: string
    switch (mark.type) {
      case 'bold':
        wrapper = `<strong>${marked}</strong>`
        break
      case 'italic':
        wrapper = `<em>${marked}</em>`
        break
      case 'underline':
        wrapper = `<u>${marked}</u>`
        break
      case 'link':
        wrapper = `<a href="${escapeHtml(mark.url || '#')}" target="_blank" rel="noopener noreferrer">${marked}</a>`
        break
      default:
        wrapper = marked
    }

    html = before + wrapper + after
  }

  return html
}

/**
 * Helper to escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Validate a single question for completeness
 */
export function validateQuestion(question: Question): QuestionValidationError[] {
  const errors: QuestionValidationError[] = []

  // Prompt is required
  if (!getText(question.prompt).trim()) {
    errors.push({ field: 'prompt', message: 'Question text is required' })
  }

  // Selection-based questions need options
  if (['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type)) {
    if (!question.options || question.options.length < 2) {
      errors.push({ field: 'options', message: 'At least 2 options required' })
    }

    // Validate option labels are unique and non-empty
    const labels = (question.options || []).map(o => o.label.trim())
    const uniqueLabels = new Set(labels)
    if (labels.some(l => !l) || uniqueLabels.size !== labels.length) {
      errors.push({ field: 'options', message: 'Option labels must be unique and non-empty' })
    }
  }

  // Scale questions need valid min/max
  if (question.type === 'linear_scale') {
    const min = question.scaleMin ?? 1
    const max = question.scaleMax ?? 5
    if (min >= max || max - min < 2 || max - min > 9) {
      errors.push({
        field: 'scale',
        message: 'Scale must have 3-10 points (e.g., 1-5)',
      })
    }
  }

  return errors
}

/**
 * Type guard: is this question selection-based?
 */
export function isSelectionQuestion(type: QuestionType): boolean {
  return ['multiple_choice', 'checkboxes', 'dropdown'].includes(type)
}

/**
 * Type guard: is this question scale-based?
 */
export function isScaleQuestion(type: QuestionType): boolean {
  return type === 'linear_scale'
}

/**
 * Type guard: does this question accept text input?
 */
export function isTextQuestion(type: QuestionType): boolean {
  return ['short_text', 'long_text', 'email', 'url'].includes(type)
}

/**
 * Snapshot from Supabase (with additional metadata)
 * Used when loading existing surveys for editing
 */
export interface SupabaseSurvey {
  id: string
  project_id: string
  pack_id: string | null
  pack_version_snapshot: SurveySnapshot
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
}
