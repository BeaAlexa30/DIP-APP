import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import Sidebar from '@/components/app/NavigationSidebar'
import { ProfileProvider } from '@/components/app/UserProfileProvider'
import type { UserProfile } from '@/lib/auth/UserPermissionDefinitions'

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
    // Upsert the user profile if it doesn't exist yet
    const { data: newProfile, error: upsertError } = await serviceClient
      .from('profiles')
      .upsert({ 
        id: user.id, 
        email: user.email!, 
        role: 'analyst' 
      }, { onConflict: 'id' })
      .select('full_name, role, email')
      .single()
    
    console.log('[layout] upsert result:', newProfile, upsertError)
    profile = newProfile
  }

  const userProfile: UserProfile | null = profile
    ? { full_name: profile.full_name, email: profile.email, role: profile.role as UserProfile['role'] }
    : null

  return (
    // Changed: flex-col for mobile, flex-row for desktop
    <div className="flex flex-col md:flex-row h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar profile={userProfile} />
      <ProfileProvider profile={userProfile}>
        <main className="flex-1 overflow-auto bg-gray-50 text-gray-900">
          {children}
        </main>
      </ProfileProvider>
    </div>
  )
}