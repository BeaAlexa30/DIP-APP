import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import type { Database } from '@/types/DatabaseSchemaDefinitions'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ResponseCard from './ResponseCard'
import ExportResponsesButton from './ExportResponsesButton'
import ImportResponsesButton from './ImportResponsesButton'

type Response = Database['public']['Tables']['responses']['Row']
type ResponseAnswer = Database['public']['Tables']['response_answers']['Row']

interface ResponseWithAnswers extends Omit<Response, 'respondent_meta'> {
  respondent_meta: any
  response_answers: (ResponseAnswer & {
    framework_questions: {
      prompt: string
      category_id: string
      framework_categories: {
        name: string
      } | null
    } | null
  })[]
}

export default async function ResponsesPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ surveyId?: string }>
}) {
  const { id: projectId } = await params
  const { surveyId: querySurveyId } = await searchParams
  const serviceClient = await createServiceClient()

  // Get project
  const { data: projectData } = await serviceClient
    .from('projects')
    .select('id, client_name')
    .eq('id', projectId)
    .single()

  const project = projectData as { id: string; client_name: string } | null

  if (!project) notFound()

  // Get survey - either from query param or latest survey for this project
  let surveyId: string | undefined
  let snapshot: { packName?: string; version?: string } | undefined
  
  if (querySurveyId) {
    // Use the specific survey from query param
    const { data: surveyData } = await serviceClient
      .from('surveys')
      .select('id, pack_version_snapshot')
      .eq('id', querySurveyId)
      .eq('project_id', projectId)
      .single()
    
    if (surveyData) {
      surveyId = surveyData.id
      snapshot = surveyData.pack_version_snapshot as { packName?: string; version?: string } | undefined
    }
  }
  
  if (!surveyId) {
    // Fallback to latest survey
    const { data: surveysData } = await serviceClient
      .from('surveys')
      .select('id, created_at, pack_version_snapshot')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)

    const surveys = surveysData as { id: string; created_at: string; pack_version_snapshot: Record<string, unknown> }[] | null
    surveyId = surveys?.[0]?.id
    snapshot = surveys?.[0]?.pack_version_snapshot as { packName?: string; version?: string } | undefined
  }
  
  const frameworkName = snapshot?.packName ?? 'Framework'
  const frameworkVersion = snapshot?.version ?? ''

  if (!surveyId) {
    return (
      <div className="px-4 sm:px-8 py-4 sm:py-6">
        {/* Navigation Bar */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-6 py-3 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/app/projects" className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
              Projects
            </Link>
            <span className="text-gray-300">/</span>
            <Link href={`/app/projects/${projectId}`} className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
              {project.client_name}
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 text-sm font-semibold">Survey Responses</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400">No survey found for this project.</p>
          <p className="text-gray-400 text-sm mt-2">Please create a survey first to collect responses.</p>
        </div>
      </div>
    )
  }

  // Get all responses with answers and question details
  // Note: Answers can be in response_answers table OR in respondent_meta.ai_survey_answers JSONB
  const { data: responses, error: responsesError } = await serviceClient
    .from('responses')
    .select(`
      *,
      response_answers (
        *,
        framework_questions (
          prompt,
          category_id,
          framework_categories (
            name
          )
        )
      )
    `)
    .eq('survey_id', surveyId)
    .order('submitted_at', { ascending: false })

  const typedResponses = (responses ?? []) as unknown as ResponseWithAnswers[]

  // Process responses to merge answers from both sources:
  // 1. response_answers table
  // 2. respondent_meta.ai_survey_answers JSONB field
  for (const resp of typedResponses) {
    const meta = resp.respondent_meta as any
    if (meta?.ai_survey_answers && Array.isArray(meta.ai_survey_answers)) {
      // Convert JSONB answers to match response_answers format
      const jsonbAnswers = meta.ai_survey_answers.map((ans: any) => ({
        id: `jsonb-${resp.id}-${ans.questionId}`,
        question_id: ans.questionId,
        response_id: resp.id,
        option_value_key: ans.valueKey ?? null,
        free_text: ans.freeText ?? null,
        created_at: resp.submitted_at,
        framework_questions: {
          prompt: ans.questionPrompt ?? 'Survey Question',
          category_id: 'general',
          framework_categories: { name: 'General' }
        }
      }))
      // Merge with existing response_answers
      resp.response_answers = [...resp.response_answers, ...jsonbAnswers]
    }
  }

  // Collect all unique question IDs from the fetched answers so we can resolve option labels
  const allQuestionIds = new Set<string>()
  for (const resp of typedResponses) {
    for (const ans of resp.response_answers) {
      if (ans.question_id) allQuestionIds.add(ans.question_id)
    }
  }

  // Build a lookup map: `${question_id}:${value_key}` → human-readable label
  type FrameworkOptionRow = { question_id: string; value_key: string; label: string }
  const optionsLookup = new Map<string, string>()

  if (allQuestionIds.size > 0) {
    const { data: optionsData } = await serviceClient
      .from('framework_options')
      .select('question_id, value_key, label')
      .in('question_id', Array.from(allQuestionIds))

    for (const opt of (optionsData ?? []) as FrameworkOptionRow[]) {
      optionsLookup.set(`${opt.question_id}:${opt.value_key}`, opt.label)
    }
  }

  // Convert Map to plain object for client component serialisation
  const optionsMap: Record<string, string> = Object.fromEntries(optionsLookup)

  return (
    <div className="px-4 sm:px-8 py-4 sm:py-6">
      {/* Navigation Bar */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-6 py-3 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/app/projects" className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
            Projects
          </Link>
          <span className="text-gray-300">/</span>
          <Link href={`/app/projects/${projectId}`} className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
            {project.client_name}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 text-sm font-semibold">Survey Responses</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">

        {/* Framework Badge + Export */}
        <div className="mb-6 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {frameworkName}{frameworkVersion ? ` · v${frameworkVersion}` : ''}
          </span>
          <div className="flex items-center gap-2">
            <ImportResponsesButton surveyId={surveyId} />
            <ExportResponsesButton
              responses={typedResponses as any}
              optionsMap={optionsMap}
              surveyName={frameworkName}
              projectName={project.client_name}
            />
          </div>
        </div>

        {/* Responses List */}
        {typedResponses.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 font-medium">No responses yet</p>
            <p className="text-gray-400 text-sm mt-2">Responses will appear here once participants submit the survey.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {typedResponses.map((response, idx) => (
              <ResponseCard
                key={response.id}
                response={response}
                responseNumber={typedResponses.length - idx}
                optionsMap={optionsMap}
              />
            ))}
          </div>
      )}
      </div>
    </div>
  )
}
