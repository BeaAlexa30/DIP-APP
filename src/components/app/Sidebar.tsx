'use client'

import { useState } from 'react' // Added
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">DI</span>
          </div>
          <span className="text-white font-semibold text-sm">Decision Intel</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-white p-2"
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
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-950 border-r border-gray-800 flex flex-col h-full transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo (Desktop only) */}
        <div className="px-5 py-5 border-b border-gray-800 hidden md:block">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">DI</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Decision Intel</p>
              <p className="text-gray-500 text-xs">Platform v1</p>
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
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 font-medium uppercase shrink-0">
              {(profile?.full_name ?? profile?.email ?? 'U').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">
                {profile?.full_name ?? profile?.email ?? 'User'}
              </p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role ?? '—'}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-gray-500 hover:text-gray-300 text-xs transition-colors shrink-0 p-1"
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