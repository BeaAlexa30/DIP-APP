'use client'

import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react'; // Added

interface Profile {
  full_name: string | null
  role: string
  email: string
}

const navItems = [
  { href: '/app', label: 'Dashboard', icon: '⬜' },
  { href: '/app/projects', label: 'Projects', icon: '📁' },
  { href: '/app/frameworks', label: 'Frameworks', icon: '🧩' },
]

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const [isOpen, setIsOpen] = useState(false) // Added for mobile toggle
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

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
            <Image src="/images/DI_logo.png" alt="Logo" width={32} height={32} className="w-8 h-8 object-contain" />
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
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col h-full transition-transform duration-300 ease-in-out shadow-sm
        md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo (Desktop only) */}
        <div className="px-5 py-5 border-b border-gray-100 hidden md:block">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <Image src="/images/DI_logo.png" alt="Logo" width={32} height={32} className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-sm leading-tight">Decision Intel</p>
              <p className="text-gray-400 text-xs">Platform v1</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)} // Close on mobile navigation
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-xs text-blue-600 font-medium uppercase shrink-0">
              {(profile?.full_name ?? profile?.email ?? 'U').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">
                {profile?.full_name ?? profile?.email ?? 'User'}
              </p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role ?? '—'}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-gray-300 hover:text-gray-500 text-xs transition-colors shrink-0 p-1"
              title="Sign out"
            >
              ↩
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}