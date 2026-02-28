import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import Sidebar from '@/components/app/NavigationSidebar'
import { ProfileProvider } from '@/components/app/UserProfileProvider'
import ChangePasswordModal from '@/components/app/ChangePasswordModal'
import type { UserProfile } from '@/lib/auth/UserPermissionDefinitions'
import { getAppSettings } from '@/lib/settings/AppSettingsLoader'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const serviceClient = await createServiceClient()
  const [settings, profileResult] = await Promise.all([
    getAppSettings(),
    serviceClient
      .from('profiles')
      .select('full_name, role, email, status, is_active, password_change_required')
      .eq('id', user.id)
      .single(),
  ])

  let { data: profile } = profileResult

  if (!profile) {
    console.log('[layout] profile missing, upserting...')
    const { data: newProfile, error: upsertError } = await serviceClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email!,
        role: 'analyst',
        status: 'pending',
      }, { onConflict: 'id' })
      .select('full_name, role, email, status, is_active, password_change_required')
      .single()

    console.log('[layout] upsert result:', newProfile, upsertError)
    profile = newProfile
  }

  // Block pending / rejected / inactive accounts — sign them out and redirect
  const status = profile?.status
  if (status === 'pending' || status === 'rejected') {
    await supabase.auth.signOut()
    redirect(`/login?status=${status}`)
  }
  if (profile?.is_active === false) {
    await supabase.auth.signOut()
    redirect('/login?status=inactive')
  }

  const userProfile: UserProfile | null = profile
    ? { full_name: profile.full_name, email: profile.email, role: profile.role as UserProfile['role'] }
    : null

  const mustChangePassword = profile?.password_change_required === true

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar profile={userProfile} settings={settings} />
      <ProfileProvider profile={userProfile}>
        <main className="flex-1 overflow-auto bg-gray-50 text-gray-900 flex flex-col">
          <div className="flex-1">{children}</div>
          {settings?.footer_tagline && (
            <footer className="shrink-0 border-t border-gray-200 bg-white px-8 py-3 text-center text-xs text-gray-400">
              {settings.footer_tagline}
            </footer>
          )}
        </main>
      </ProfileProvider>
      <ChangePasswordModal required={mustChangePassword} />
    </div>
  )
}