'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 bg-gray-950 border-r border-gray-800 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
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
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 font-medium uppercase">
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
            className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
            title="Sign out"
          >
            ↩
          </button>
        </div>
      </div>
    </aside>
  )
}
