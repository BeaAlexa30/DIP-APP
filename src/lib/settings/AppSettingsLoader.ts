/**
 * AppSettingsLoader
 * Server-side only. Reads the single `app_settings` row from the DB.
 * React-cached so it only hits the DB once per request.
 */

import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'

export interface AppSettings {
  company_name: string
  logo_url: string | null
  primary_color: string
  footer_tagline: string | null
}

const DEFAULTS: AppSettings = {
  company_name: 'Decision Intelligence',
  logo_url: null,
  primary_color: '#6d28d9',
  footer_tagline: 'Internal Decision Intelligence Platform',
}

export const getAppSettings = cache(async (): Promise<AppSettings> => {
  try {
    const db = await createServiceClient()
    const { data } = await db
      .from('app_settings')
      .select('company_name, logo_url, primary_color, footer_tagline')
      .eq('id', 'default')
      .single()

    if (!data) return DEFAULTS
    return {
      company_name: data.company_name ?? DEFAULTS.company_name,
      logo_url: data.logo_url ?? null,
      primary_color: data.primary_color ?? DEFAULTS.primary_color,
      footer_tagline: data.footer_tagline ?? null,
    }
  } catch {
    return DEFAULTS
  }
})
