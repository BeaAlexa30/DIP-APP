'use client'

import { createClient } from '@/lib/supabase/DatabaseClientManager';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { UserProfile } from '@/lib/auth/UserPermissionDefinitions'
import { ROLE_LABELS } from '@/lib/auth/UserPermissionDefinitions'

const ROLE_BADGE_COLORS: Record<string, string> = {
  admin:   'bg-blue-100 text-blue-700',
  analyst: 'bg-gray-100 text-gray-600',
}

const navItems = [
  { href: '/app', label: 'Dashboard', icon: '⬜' },
  { href: '/app/projects', label: 'Projects', icon: '📁' },
  { href: '/app/frameworks', label: 'Frameworks', icon: '🧩' },
]

export default function Sidebar({ profile }: { profile: UserProfile | null }) {
  const [isOpen, setIsOpen] = useState(false) // Mobile toggle
  const [isCollapsed, setIsCollapsed] = useState(false) // Desktop collapse
  const [currentTime, setCurrentTime] = useState(new Date())
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile Top Bar: Hidden on Desktop */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center">
            <Image src="/images/PlatformBrandingLogo.png" alt="Logo" width={32} height={32} className="w-8 h-8 object-contain" />
          </div>
          <span className="text-gray-900 font-semibold text-sm">Decision Intel</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-gray-700 p-2"
        >
          {isOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar Overlay: Closes menu when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col h-full transition-all duration-300 ease-in-out shadow-sm
        md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>
        {/* Logo (Desktop only) */}
        <div className={`px-6 py-6 border-b border-gray-100 hidden md:flex items-center ${isCollapsed ? 'flex-col gap-3 justify-center' : 'justify-between'}`}>
          {isCollapsed ? (
            <>
              <Link href="/app" className="w-10 h-10 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity">
                <Image src="/images/PlatformBrandingLogo.png" alt="Logo" width={40} height={40} className="w-10 h-10 object-contain" />
              </Link>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 text-lg"
                title="Expand sidebar"
              >
                »
              </button>
            </>
          ) : (
            <>
              <Link href="/app" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                  <Image src="/images/PlatformBrandingLogo.png" alt="Logo" width={40} height={40} className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <p className="text-gray-900 font-semibold text-base leading-tight">Decision Intel</p>
                  <p className="text-gray-400 text-sm">Platform v1</p>
                </div>
              </Link>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 text-lg"
                title="Collapse sidebar"
              >
                «
              </button>
            </>
          )}
        </div>

        {/* Date and Time */}
        <div className="px-5 py-4 border-b border-gray-100 text-center">
          {isCollapsed ? (
            <div className="text-sm text-gray-500">
              <div className="font-medium text-base">{currentTime.getDate()}</div>
              <div className="text-xs">{currentTime.toLocaleDateString('en-US', { month: 'short' })}</div>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-700">{formatDate(currentTime)}</p>
              <p className="text-sm text-gray-500 mt-1">{formatTime(currentTime)}</p>
            </>
          )}
        </div>

        {/* Menu Header */}
        <div className="px-4 pt-6 pb-3">
          <h3 className={`text-sm font-semibold text-gray-400 uppercase tracking-wider ${isCollapsed ? 'text-center' : 'px-3'}`}>
            {isCollapsed ? '☰' : 'Menu'}
          </h3>
        </div>

        {/* Nav */}
        <nav className="px-4 pb-6 space-y-2">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)} // Close on mobile navigation
                className={`flex items-center gap-4 px-4 py-3 rounded-lg text-base font-medium transition-colors ${active
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <span className="text-lg">{item.icon}</span>
                {!isCollapsed && item.label}
              </Link>
            )
          })}
        </nav>


        {/* User */}
        <div className="px-5 py-5 border-t border-gray-100 mt-auto">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm text-blue-600 font-medium uppercase">
                {(profile?.full_name ?? profile?.email ?? 'U').charAt(0)}
              </div>
              <button
                onClick={handleSignOut}
                className="text-gray-300 hover:text-gray-500 text-base transition-colors p-1"
                title="Sign out"
              >
                ↩
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm text-blue-600 font-medium uppercase shrink-0">
                {(profile?.full_name ?? profile?.email ?? 'U').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {profile?.full_name ?? profile?.email ?? 'User'}
                </p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE_COLORS[profile?.role ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                  {ROLE_LABELS[profile?.role as keyof typeof ROLE_LABELS] ?? profile?.role ?? '—'}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="text-gray-300 hover:text-gray-500 text-base transition-colors shrink-0 p-1"
                title="Sign out"
              >
                ↩
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}