'use client'

import { createClient } from '@/lib/supabase/DatabaseClientManager'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [role, setRole] = useState<'analyst' | 'admin'>('analyst')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  
  // Alive Feature: Mouse Tracking State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('status')
    if (status === 'pending') {
      setError('Your account is awaiting admin approval. You will receive an email once approved.')
    } else if (status === 'rejected') {
      setError('Your account access has been declined. Please contact an administrator.')
    } else if (status === 'inactive') {
      setError('Your account has been deactivated. Please contact an administrator.')
    }
  }, [])

  const currentPasswordValidation = useMemo(() => {
    if (mode === 'login') return { length: true, uppercase: true, lowercase: true, number: true, special: true }
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
  }, [password, mode])

  const isPasswordValid = mode === 'login' || Object.values(currentPasswordValidation).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'signup' && !isPasswordValid) {
      setError('Password must meet all requirements above.')
      setLoading(false)
      return
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else {
        fetch('/api/activity/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', details: { email } }),
        }).catch(() => {})
        router.push('/app')
      }
    } else {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, fullName }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to create account.')
      } else if (role === 'analyst') {
        setError('Account created! Your account is pending admin approval. You will receive an email once approved.')
      } else {
        setError('Account created! Check your email to confirm your account.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center font-sans px-4 sm:px-6 relative overflow-hidden bg-[#fbfcfd]">
      
      {/* --- Beautiful Ambient Web UI Background Mesh Gradient --- */}
      <div className="absolute inset-0 pointer-events-none z-0">
        
        {/* Soft base ambient teal glow at the top center (Boosted opacity from 0.05 to 0.12) */}
        <div className="absolute top-[-20%] w-[800px] h-[800px] bg-[#53969E]/[0.12] rounded-full blur-[100px]" />

        {/* --- The "Special" Layer: Deep Ambient Mesh (Boosted opacity from 0.035 to 0.08) --- */}
        <div className="absolute inset-0 opacity-[0.08] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_10%,transparent_100%)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <defs>
              <linearGradient id="a" x1="50%" x2="50%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#53969E"/>
                <stop offset="100%" stopColor="#3f7f86"/>
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#a)" mask="url(#b)"/>
            <mask id="b">
              <rect width="100%" height="100%" fill="#fff"/>
              <circle cx="20%" cy="20%" r="50%" fill="#000" filter="blur(100px)"/>
              <circle cx="80%" cy="50%" r="60%" fill="#000" filter="blur(120px)"/>
              <circle cx="50%" cy="110%" r="70%" fill="#000" filter="blur(150px)"/>
              <circle cx="90%" cy="20%" r="30%" fill="#000" filter="blur(80px)"/>
            </mask>
          </svg>
        </div>
        
        {/* Alive Background: Interactive Mouse Glow (Boosted intensity from 0.06 to 0.15) */}
        <div 
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(800px at ${mousePos.x}px ${mousePos.y}px, rgba(83, 150, 158, 0.15), transparent 80%)`
          }}
        />

        {/* Masked elegant fading dot grid (Boosted opacity from 30 to 45) */}
        <div className="absolute inset-0 bg-[radial-gradient(#d1d5db_1.2px,transparent_1.2px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_20%,transparent_100%)] opacity-45" />
      </div>

      {/* Main Content Container */}
      <div className="w-full max-w-[400px] relative z-10 flex flex-col">
        
        {/* Entrance Animation: Logo (Delayed & Scaled) with massive sizing */}
        <div className="flex justify-center -mt-32 -mb-14 w-full relative z-20 pointer-events-none animate-in fade-in zoom-in duration-1000 fill-mode-both"> 
          <Image 
            src="/images/logo-nexsurvey-removebg-preview.png" 
            alt="NexSurvey Solutions" 
            width={1200} 
            height={400} 
            className="w-auto h-[280px] md:h-[420px] max-w-[90vw] object-contain drop-shadow-sm transition-transform duration-700 hover:scale-[1.03] pointer-events-auto" 
            priority
          />
        </div>

        {/* Entrance Animation: Form (Slide up with delay) */}
        <form 
          onSubmit={handleSubmit} 
          className="space-y-5 w-full relative z-20 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both"
        >
          {/* Email Input with Tactile Shadow */}
          <div className="group">
            <label className="block text-sm font-medium text-[#4b5563] mb-2 ml-1 transition-colors group-focus-within:text-[#53969E]">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3.5 bg-white border border-[#e5e7eb] rounded-xl text-[#111827] placeholder-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#53969E] focus:border-transparent transition-all shadow-sm hover:border-[#d1d5db] focus:shadow-[0_0_20px_rgba(83,150,158,0.12)]"
              placeholder="you@company.com"
            />
          </div>

          {/* Password Input with Tactile Shadow */}
          <div className="group">
            <label className="block text-sm font-medium text-[#4b5563] mb-2 ml-1 transition-colors group-focus-within:text-[#53969E]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 pr-11 bg-white border border-[#e5e7eb] rounded-xl text-[#111827] placeholder-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#53969E] focus:border-transparent transition-all shadow-sm hover:border-[#d1d5db] focus:shadow-[0_0_20px_rgba(83,150,158,0.12)]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#9ca3af] hover:text-[#4b5563] focus:outline-none transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* Password Validation (Signup Only) */}
          {mode === 'signup' && password && (
            <div className="mt-3 space-y-1.5 p-4 bg-white/60 backdrop-blur-md rounded-xl border border-[#e5e7eb] shadow-sm relative z-30">
              <p className="text-xs font-medium text-[#4b5563] mb-2">Password requirements:</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { key: 'length', label: 'At least 8 characters' },
                  { key: 'uppercase', label: 'One uppercase letter' },
                  { key: 'lowercase', label: 'One lowercase letter' },
                  { key: 'number', label: 'One number' },
                  { key: 'special', label: 'One special character (!@#$%^&*)' },
                ].map(({ key, label }) => {
                  const isValid = currentPasswordValidation[key as keyof typeof currentPasswordValidation];
                  return (
                    <div key={key} className={`flex items-center gap-2 text-xs ${isValid ? 'text-[#53969E]' : 'text-[#6b7280]'}`}>
                      <svg className={`w-3.5 h-3.5 ${isValid ? 'text-[#53969E]' : 'text-[#d1d5db]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isValid ? 3 : 2}>
                        {isValid ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <circle cx="12" cy="12" r="9" />}
                      </svg>
                      {label}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full Name (Signup Only) */}
          {mode === 'signup' && (
            <div className="group">
              <label className="block text-sm font-medium text-[#4b5563] mb-2 ml-1 transition-colors group-focus-within:text-[#53969E]">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-[#e5e7eb] rounded-xl text-[#111827] placeholder-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#53969E] focus:border-transparent transition-all shadow-sm hover:border-[#d1d5db] focus:shadow-[0_0_20px_rgba(83,150,158,0.12)]"
                placeholder="Jane Doe"
              />
            </div>
          )}

          {/* Role Selection (Signup Only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-[#4b5563] mb-2 ml-1">Role</label>
              <div className="grid grid-cols-2 gap-3">
                {(['analyst', 'admin'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all capitalize shadow-sm ${
                      role === r
                        ? 'bg-[#f0f5f6] border-[#53969E] text-[#3f7f86] ring-1 ring-[#53969E]'
                        : 'bg-white border-[#e5e7eb] text-[#6b7280] hover:border-[#d1d5db] hover:bg-[#fbfcfd]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error / Success Messages */}
          {error && (
            <div className={`text-sm px-4 py-3 rounded-xl border shadow-sm ${
              error.toLowerCase().includes('created') || error.toLowerCase().includes('approved') || error.toLowerCase().includes('awaiting')
                ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                : error.toLowerCase().includes('declined') || error.toLowerCase().includes('deactivated')
                ? 'bg-[#fff7ed] text-[#9a3412] border-[#fed7aa]'
                : 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
            }`}>
              {error}
            </div>
          )}

          {/* Primary Action Button with Hover Elevation */}
          <button
            type="submit"
            disabled={loading || (mode === 'signup' && !isPasswordValid)}
            className={`w-full font-semibold py-4 px-4 rounded-xl text-sm transition-all duration-300 mt-4 active:scale-[0.98] ${
              loading || (mode === 'signup' && !isPasswordValid)
                ? 'bg-[#e5e7eb] text-[#6b7280] cursor-not-allowed'
                : 'bg-[#53969E] hover:bg-[#3f7f86] text-white shadow-[0_4px_14px_0_rgba(83,150,158,0.39)] hover:shadow-[0_6px_20px_rgba(83,150,158,0.45)] hover:-translate-y-0.5'
            }`}
          >
            {loading ? (
               <span className="flex items-center justify-center gap-2">
                 <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 Processing...
               </span>
            ) : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Staggered Footer Entrance */}
        <div className="mt-8 pt-6 text-center w-full relative z-20 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-500 fill-mode-both">
          <button
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null) }}
            className="text-sm font-medium text-[#6b7280] hover:text-[#53969E] transition-colors"
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
          
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#9ca3af]">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Secure access for authorized users only.
          </div>
        </div>

      </div>
    </div>
  )
}