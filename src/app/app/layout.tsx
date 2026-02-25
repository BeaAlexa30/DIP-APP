import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Sidebar from '@/components/app/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Use service client to bypass RLS for profile lookup
  const serviceClient = await createServiceClient()
  let { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('full_name, role, email')
    .eq('id', user.id)
    .single()

  console.log('[layout] user.id:', user.id)
  console.log('[layout] profile:', profile)
  console.log('[layout] profileError:', profileError)

  // Auto-create profile if missing (handles users who signed up before trigger was fixed)
  if (!profile) {
    console.log('[layout] profile missing, upserting...')
    const { data: newProfile, error: upsertError } = await serviceClient
      .from('profiles')
      .upsert({ id: user.id, email: user.email!, role: 'analyst' }, { onConflict: 'id' })
      .select('full_name, role, email')
      .single()
    console.log('[layout] upsert result:', newProfile, upsertError)
    profile = newProfile
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-auto bg-gray-50 text-gray-900">
        {children}
      </main>
    </div>
  )
}
