/**
 * Role-Based Access Control
 * ─────────────────────────
 * Admin / Strategist  → can create projects, assign frameworks,
 *                       run scoring, generate insights, export reports
 * Analyst             → read-only: view dashboards, scoring results,
 *                       insights, and export reports
 */

export type UserRole = 'admin' | 'analyst'

export interface UserProfile {
  full_name: string | null
  email: string
  role: UserRole
  status?: 'pending' | 'approved' | 'rejected'
}

/** Central permission map */
const PERMISSIONS = {
  createProject:       ['admin'] as UserRole[],
  editProject:         ['admin'] as UserRole[],
  deleteProject:       ['admin'] as UserRole[],
  assignFramework:     ['admin'] as UserRole[],  // create/manage surveys
  runScoring:          ['admin', 'analyst'] as UserRole[],
  generateInsights:    ['admin', 'analyst'] as UserRole[],
  viewDashboard:       ['admin', 'analyst'] as UserRole[],
  exportReport:        ['admin', 'analyst'] as UserRole[],
  viewReports:         ['admin', 'analyst'] as UserRole[],
  viewResponses:       ['admin', 'analyst'] as UserRole[],
  viewFrameworks:      ['admin', 'analyst'] as UserRole[],
  manageSurvey:        ['admin'] as UserRole[],  // manual survey close/reopen
  manageFramework:     ['admin'] as UserRole[],  // toggle framework pack active status
  generateAiSurvey:    ['admin'] as UserRole[],  // generate AI-powered surveys via Groq
  manageSettings:      ['admin'] as UserRole[],  // access settings & user approval
  shareReport:         ['admin'] as UserRole[],  // generate shareable report links
} as const

export type Permission = keyof typeof PERMISSIONS

export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role)
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

export function isAnalyst(role: UserRole | null | undefined): boolean {
  return role === 'analyst'
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:   'Admin',
  analyst: 'Analyst',
}
