import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/AccessControlGuard'
import fs from 'fs'
import path from 'path'

/**
 * GET /api/admin/download/migrations
 * Returns all migration SQL files concatenated into a single .sql file for download.
 * Admin only. Never includes env vars or API keys.
 */
export async function GET() {
  const auth = await requirePermission('manageSettings')
  if (!auth.ok) return auth.response

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

  let files: string[] = []
  try {
    files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()
  } catch {
    return NextResponse.json({ error: 'Could not read migrations directory.' }, { status: 500 })
  }

  const header = `-- ============================================================
-- Decision Intelligence Platform — Database Migrations
-- Generated: ${new Date().toUTCString()}
--
-- Instructions:
--   1. Create a new project on https://supabase.com
--   2. Open the SQL Editor in your Supabase dashboard
--   3. Paste this entire file and click Run
--   4. All tables, policies, and functions will be created
-- ============================================================\n\n`

  const sections = files.map(file => {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    return `-- ────────────────────────────────────────────────────────────
-- Migration: ${file}
-- ────────────────────────────────────────────────────────────\n${content.trim()}\n`
  })

  const combined = header + sections.join('\n\n')

  return new NextResponse(combined, {
    status: 200,
    headers: {
      'Content-Type': 'application/sql',
      'Content-Disposition': `attachment; filename="dip-database-migrations.sql"`,
    },
  })
}
