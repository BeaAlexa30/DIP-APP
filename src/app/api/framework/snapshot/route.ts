import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFrameworkSnapshot } from '@/lib/framework/snapshot'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
