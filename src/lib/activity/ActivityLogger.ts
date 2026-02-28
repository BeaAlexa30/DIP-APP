import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'

/** Fetches user email + name from profiles for logging purposes. */
export async function getUserInfo(userId: string): Promise<{ email: string; name?: string | null }> {
  try {
    const db = await createServiceClient()
    const { data } = await db
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()
    return { email: (data as any)?.email ?? '', name: (data as any)?.full_name }
  } catch {
    return { email: '' }
  }
}

export type ActivityAction =
  | 'login'
  | 'generate_insights'
  | 'generate_ai_survey'
  | 'create_survey'
  | 'create_survey_token'
  | 'export_pdf'
  | 'share_report'
  | 'deactivate_share'
  | 'create_account'
  | 'edit_user'
  | 'delete_project'
  | 'edit_project'
  | 'archive_project'
  | 'delete_user'
  | 'delete_framework'
  | 'toggle_framework'
  | 'run_scoring'
  | 'approve_user'
  | 'reject_user'
  | 'set_active'
  | 'set_inactive'
  | 'survey_status_change'
  | 'update_branding'
  | 'change_password'

export interface LogActivityParams {
  userId: string
  userEmail: string
  userName?: string | null
  action: ActivityAction
  details?: Record<string, unknown>
}

/**
 * Inserts a row into activity_logs.
 * Fire-and-forget: call without await if you don't want to block the response.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const db = await createServiceClient()
    await db.from('activity_logs').insert({
      user_id: params.userId,
      user_email: params.userEmail,
      user_name: params.userName ?? null,
      action: params.action,
      details: (params.details ?? {}) as import('@/types/DatabaseSchemaDefinitions').Json,
    })
  } catch {
    // Never let logging failures surface to users
    console.error('[ActivityLogger] Failed to log activity:', params.action)
  }
}
