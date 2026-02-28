/**
 * GET  /api/settings/branding  — fetch current app settings
 * PATCH /api/settings/branding  — update app settings (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'
import { logActivity, getUserInfo } from '@/lib/activity/ActivityLogger'

export async function GET() {
  const db = await createServiceClient()
  const { data, error } = await db
    .from('app_settings')
    .select('company_name, logo_url, primary_color, footer_tagline')
    .eq('id', 'default')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('manageSettings')
  if (!auth.ok) return auth.response

  const body = await req.json()
  const { company_name, logo_url, primary_color, footer_tagline } = body

  const db = await createServiceClient()
  const { data, error } = await db
    .from('app_settings')
    .update({
      ...(company_name !== undefined && { company_name }),
      ...(logo_url !== undefined && { logo_url }),
      ...(primary_color !== undefined && { primary_color }),
      ...(footer_tagline !== undefined && { footer_tagline }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default')
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
