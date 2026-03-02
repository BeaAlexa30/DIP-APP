/**
 * GET /api/settings/logo
 * Returns only the logo_url from app_settings.
 * Lightweight endpoint for client components that only need the logo.
 */

import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { NextResponse } from 'next/server'

export async function GET() {
    const db = await createServiceClient()
    const { data, error } = await db
        .from('app_settings')
        .select('logo_url')
        .eq('id', 'default')
        .single()

    if (error) return NextResponse.json({ logo_url: null }, { status: 200 })
    return NextResponse.json({ logo_url: data?.logo_url ?? null })
}
