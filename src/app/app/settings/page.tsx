import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { getAppSettings } from '@/lib/settings/AppSettingsLoader'
import BrandingSettingsForm from '@/components/app/settings/BrandingSettingsForm'
import UserManagementPanel from '@/components/app/settings/UserManagementPanel'
import ActivityLogPanel from '@/components/app/settings/ActivityLogPanel'
import NotificationsPanel from '@/components/app/settings/NotificationsPanel'
import DownloadPanel from '@/components/app/settings/DownloadPanel'
import SettingsTabs from '@/components/app/settings/SettingsTabs'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = await createServiceClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only admins can access settings
  if (profile?.role !== 'admin') redirect('/app')

  const settings = await getAppSettings()

  // Fetch pending count for notification badge
  const { count: pendingCount } = await serviceClient
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage platform branding, user accounts, and activity logs.
        </p>
      </div>

      <SettingsTabs
        brandingTab={<BrandingSettingsForm initialSettings={settings} />}
        usersTab={<UserManagementPanel />}
        activityTab={<ActivityLogPanel />}
        notificationsTab={<NotificationsPanel />}
        downloadTab={<DownloadPanel />}
        pendingCount={pendingCount ?? 0}
      />
    </div>
  )
}
