import { NextRequest, NextResponse } from 'next/server'
import { createFrameworkSnapshot } from '@/lib/framework/AssessmentFrameworkCapture'
import { requirePermission } from '@/lib/auth/AccessControlGuard'

export async function POST(req: NextRequest) {
  const auth = await requirePermission('assignFramework')
  if (!auth.ok) return auth.response

  const { packId } = await req.json()

  if (!packId) {
    return NextResponse.json({ error: 'packId is required.' }, { status: 400 })
  }

  try {
    const snapshot = await createFrameworkSnapshot(packId)
    return NextResponse.json(snapshot)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
