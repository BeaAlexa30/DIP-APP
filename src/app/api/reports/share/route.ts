import { NextRequest } from 'next/server'
import { GET as _GET, POST as _POST, DELETE as _DELETE } from '@/app/api/reporting/manage-sharing/route'

/**
 * Alias for /api/reporting/manage-sharing
 * GET    /api/reports/share?projectId=xxx  — list share links for a project
 * POST   /api/reports/share                — create a new share link
 * DELETE /api/reports/share?id=xxx         — deactivate a share link
 */
export const GET = _GET
export const POST = _POST
export const DELETE = _DELETE
