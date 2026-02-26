import { NextRequest } from 'next/server'
import { GET as _GET } from '@/app/api/assessments/reload-framework-data/route'

/**
 * Alias for /api/assessments/reload-framework-data
 * GET /api/survey/refresh-snapshot?surveyId=xxx — refresh pack_version_snapshot for a survey
 */
export const GET = _GET
