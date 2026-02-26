import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import type { Database } from '@/types/DatabaseSchemaDefinitions'
import type { Metadata } from 'next'
import SurveyFlow from '@/components/survey/InteractiveSurveyRenderer'

type TokenWithSurvey = Database['public']['Tables']['survey_tokens']['Row'] & {
  surveys: Database['public']['Tables']['surveys']['Row'] | null
}

export const metadata: Metadata = {
  title: "Survey - Decision Intelligence Platform",
  description: "Complete this survey to help improve decision-making",
  openGraph: {
    title: "Survey - Decision Intelligence Platform",
    description: "Complete this survey to help improve decision-making",
    images: ['/images/PlatformBrandingLogo.png'],
  },
}

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createServiceClient()

  // Validate token — use service client so anonymous respondents can access surveys
  const { data: tokenRecord, error: tokenErr } = await supabase
    .from('survey_tokens')
    .select('*, surveys(id, status, pack_version_snapshot, pack_id)')
    .eq('token', token)
    .returns<TokenWithSurvey[]>()
    .single()

  if (tokenErr || !tokenRecord) notFound()

  const survey = tokenRecord.surveys

  if (!survey) notFound()

  if (survey.status !== 'published') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Survey Closed</h1>
          <p className="text-gray-500 text-sm">This survey is no longer accepting responses.</p>
        </div>
      </div>
    )
  }

  if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-sm">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Survey Expired</h1>
          <p className="text-gray-500 text-sm">This survey link has expired.</p>
        </div>
      </div>
    )
  }

  if (tokenRecord.max_responses && tokenRecord.response_count >= tokenRecord.max_responses) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-sm">
          <div className="text-4xl mb-4">📊</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Survey Full</h1>
          <p className="text-gray-500 text-sm">The maximum number of responses has been reached.</p>
        </div>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snapshot = survey.pack_version_snapshot as any

  return (
    <div className="min-h-screen bg-gray-50">
      <SurveyFlow
        surveyId={survey.id}
        tokenId={tokenRecord.id}
        snapshot={snapshot}
      />
    </div>
  )
}
