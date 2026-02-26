import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { createFrameworkSnapshot } from '@/lib/framework/AssessmentFrameworkCapture'
import { Database } from '@/types/DatabaseSchemaDefinitions'

type Survey = Database['public']['Tables']['surveys']['Row']

/**
 * Refresh survey snapshot to include latest framework options
 * GET /api/survey/refresh-snapshot?surveyId=xxx
 */
export async function GET(req: NextRequest) {
  const surveyId = req.nextUrl.searchParams.get('surveyId')
  
  if (!surveyId) {
    return NextResponse.json({ error: 'surveyId required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Get the survey and its pack_id
  const { data: survey, error: surveyError } = await (supabase as any)
    .from('surveys')
    .select('id, pack_id')
    .eq('id', surveyId)
    .single()

  if (surveyError || !survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  // Generate fresh snapshot with all current options
  const freshSnapshot = await createFrameworkSnapshot(survey.pack_id)

  // Update the survey with the new snapshot
  const { error: updateError } = await (supabase as any)
    .from('surveys')
    .update({ pack_version_snapshot: freshSnapshot })
    .eq('id', surveyId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update snapshot', details: updateError }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Snapshot refreshed successfully',
    questionCount: freshSnapshot.categories.reduce((sum, cat) => sum + cat.questions.length, 0),
    optionCount: freshSnapshot.categories.reduce((sum, cat) => 
      sum + cat.questions.reduce((qSum, q) => qSum + q.options.length, 0), 0
    )
  })
}

// Create alert system for significant changes
export async function checkForAlerts(newScore: number, previousScore?: number) {
  const scoreDrop = previousScore ? previousScore - newScore : 0
  
  if (scoreDrop > 10) {
    // Send notification/alert
    return {
      type: 'score_drop',
      urgency: 'high',
      message: `Health score dropped ${scoreDrop} points`
    }
  }
}
