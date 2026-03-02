'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface Props {
  brandingTab: React.ReactNode
  usersTab: React.ReactNode
  activityTab: React.ReactNode
  notificationsTab: React.ReactNode
  downloadTab: React.ReactNode
  pendingCount?: number
}

const TABS = [
  { id: 'branding', label: 'Branding' },
  { id: 'users', label: 'User Accounts' },
  { id: 'activity', label: 'Activity Log' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'download', label: 'Download' },
] as const

type TabId = typeof TABS[number]['id']

export default function SettingsTabs({ brandingTab, usersTab, activityTab, notificationsTab, downloadTab, pendingCount = 0 }: Props) {
  const [active, setActive] = useState<TabId>('branding')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-8 flex-wrap">
        {TABS.map(tab => (
          <Button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            variant="ghost"
            className={`relative px-4 py-2.5 rounded-none transition-colors ${active === tab.id
                ? 'text-violet-600 border-b-2 border-violet-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab.label}
            {tab.id === 'notifications' && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      {active === 'branding' && brandingTab}
      {active === 'users' && usersTab}
      {active === 'activity' && activityTab}
      {active === 'notifications' && notificationsTab}
      {active === 'download' && downloadTab}
    </div>
  )
}
