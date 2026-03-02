'use client'

import { Button } from '@/components/ui/button';
import type { UserProfile } from '@/lib/auth/UserPermissionDefinitions';
import { ROLE_LABELS } from '@/lib/auth/UserPermissionDefinitions';
import type { AppSettings } from '@/lib/settings/AppSettingsLoader';
import { createClient } from '@/lib/supabase/DatabaseClientManager';
import { Blocks, Folder, LayoutDashboard, LogOut, PanelRightClose, PanelRightOpen, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ROLE_BADGE_COLORS: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-700',
  analyst: 'bg-gray-100 text-gray-600',
}

const BASE_NAV_ITEMS = [
  { href: '/app', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/app/projects', label: 'Projects', icon: <Folder className="w-5 h-5" /> },
  { href: '/app/frameworks', label: 'Frameworks', icon: <Blocks className="w-5 h-5" /> },
]

export default function Sidebar({ profile, settings }: { profile: UserProfile | null; settings?: AppSettings | null }) {
  const [isOpen, setIsOpen] = useState(false) // Mobile toggle
  const [isCollapsed, setIsCollapsed] = useState(false) // Desktop collapse
  const [currentTime, setCurrentTime] = useState(new Date())
  const [pendingCount, setPendingCount] = useState(0)
  const [logoSrc, setLogoSrc] = useState(settings?.logo_url ?? '/images/PlatformBrandingLogo.png')
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(profile?.role === 'admin' ? [{ href: '/app/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> }] : []),
  ]

  const companyName = settings?.company_name ?? 'Decision Intel'
  const primaryColor = settings?.primary_color ?? '#2563eb'

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Live-fetch logo so it reflects updates without a full server reload
  useEffect(() => {
    fetch('/api/settings/logo')
      .then(r => r.ok ? r.json() : null)
      .then((data: { logo_url: string | null } | null) => {
        if (data?.logo_url) setLogoSrc(data.logo_url)
      })
      .catch(() => { })
  }, [])

  // Fetch pending approval count for admin notification badge
  useEffect(() => {
    if (profile?.role !== 'admin') return
    fetch('/api/admin/notifications')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPendingCount(data.total ?? 0) })
      .catch(() => { })
  }, [profile?.role])

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="Logo" width={32} height={32} className="w-8 h-8 object-contain" />
          </div>
          <span className="text-gray-900 font-semibold text-sm">{companyName}</span>
        </div>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-gray-700"
        >
          {isOpen ? '✕' : '☰'}
        </Button>
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt="Logo" width={40} height={40} className="w-10 h-10 object-contain" />
              </Link>
              <Button
                onClick={() => setIsCollapsed(!isCollapsed)}
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-gray-600"
                title="Expand sidebar"
              >
                <PanelRightOpen className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <>
              <Link href="/app" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoSrc} alt="Logo" width={40} height={40} className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <p className="text-gray-900 font-semibold text-base leading-tight">{companyName}</p>
                  <p className="text-gray-400 text-sm">Platform v1</p>
                </div>
              </Link>
              <Button
                onClick={() => setIsCollapsed(!isCollapsed)}
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-gray-600"
                title="Collapse sidebar"
              >
                <PanelRightClose className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>

        {/* Menu Header */}
        <div className="px-4 pt-6 pb-3">
          <h3 className={`text-xs text-gray-400 tracking-wider ${isCollapsed ? 'text-center' : 'px-3'}`}>
            {isCollapsed ? '☰' : 'Menu'}
          </h3>
        </div>

        {/* Nav */}
        <nav className="px-4 pb-6 space-y-2">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href))
            const isSettings = item.href === '/app/settings'
            const showBadge = isSettings && pendingCount > 0
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg text-base font-medium transition-colors ${active ? '' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                style={active ? { backgroundColor: `${primaryColor}18`, color: primaryColor } : {}}
                title={isCollapsed ? item.label : ''}
              >
                <span className="relative text-lg">
                  {item.icon}
                  {showBadge && isCollapsed && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border border-white" />
                  )}
                </span>
                {!isCollapsed && (
                  <span className="flex items-center gap-2 flex-1">
                    {item.label}
                    {showBadge && (
                      <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </span>
                )}
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
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="icon"
                className="text-gray-300 hover:text-gray-500"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </Button>
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
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="icon"
                className="text-gray-300 hover:text-gray-500 shrink-0"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}