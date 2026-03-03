import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import type { Database } from '@/types/DatabaseSchemaDefinitions'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ResponseCard from './ResponseCard'

type Response = Database['public']['Tables']['responses']['Row']
type ResponseAnswer = Database['public']['Tables']['response_answers']['Row']

interface ResponseWithAnswers extends Response {
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

export default async function ResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const serviceClient = await createServiceClient()

  // Get project
  const { data: projectData } = await serviceClient
    .from('projects')
    .select('id, client_name')
    .eq('id', projectId)
    .single()

  const project = projectData as { id: string; client_name: string } | null

  if (!project) notFound()

  // Get latest survey for this project
  const { data: surveysData } = await serviceClient
    .from('surveys')
    .select('id, created_at, pack_version_snapshot')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)

  const surveys = surveysData as { id: string; created_at: string; pack_version_snapshot: Record<string, unknown> }[] | null
  const surveyId = surveys?.[0]?.id
  const snapshot = surveys?.[0]?.pack_version_snapshot as { packName?: string; version?: string } | undefined
  const frameworkName = snapshot?.packName ?? 'Framework'
  const frameworkVersion = snapshot?.version ?? ''

  if (!surveyId) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Full-width Navigation Bar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/app/projects/${projectId}`}
              className="text-[#009E9B] hover:text-[#00B3B0] text-sm font-medium flex items-center gap-2"
            >
              ← Back to Project
            </Link>
            <div className="text-gray-300">|</div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{project.client_name} - Survey Responses</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">No survey found for this project</p>
          </div>
        </div>
      </div>
    )
  }

  // Get all responses with answers and question details
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
    <div className="min-h-screen bg-gray-50">
      {/* Full-width Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <Link
              href={`/app/projects/${projectId}`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2"
            >
              ← Back to Project
            </Link>
            <div className="text-gray-300">|</div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{project.client_name} - Survey Responses</h1>
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-sm font-medium text-gray-700">{frameworkName}{frameworkVersion ? ` v${frameworkVersion}` : ''}</span>
            <span className="text-xs text-gray-400">{typedResponses.length} total response{typedResponses.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Framework Badge */}
        <div className="mb-6 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {frameworkName}{frameworkVersion ? ` · v${frameworkVersion}` : ''}
          </span>
        </div>

        {/* Responses List */}
        {typedResponses.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">No responses yet</p>
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
