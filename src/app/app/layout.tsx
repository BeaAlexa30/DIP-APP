import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Sidebar from '@/components/app/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const serviceClient = await createServiceClient()
  let { data: profile } = await serviceClient
    .from('profiles')
    .select('full_name, role, email')
    .eq('id', user.id)
    .single()

 if (!profile) {
    console.log('[layout] profile missing, upserting...')
    // We cast 'as any' here to bypass the strict type check since we know the table structure
    const { data: newProfile, error: upsertError } = await (serviceClient
      .from('profiles')
      .upsert({ 
        id: user.id, 
        email: user.email!, 
        role: 'analyst' 
      } as any, { onConflict: 'id' }) as any)
      .select('full_name, role, email')
      .single()
    
    console.log('[layout] upsert result:', newProfile, upsertError)
    profile = newProfile
  }

  return (
    // Changed: flex-col for mobile, flex-row for desktop
    <div className="flex flex-col md:flex-row h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-auto bg-gray-50 text-gray-900">
        {children}
      </main>
    </div>
  )
}