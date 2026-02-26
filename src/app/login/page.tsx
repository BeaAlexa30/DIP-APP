'use client'

import { createClient } from '@/lib/supabase/DatabaseClientManager'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [role, setRole] = useState<'admin' | 'analyst'>('analyst')
  const [showPassword, setShowPassword] = useState(false)

  // Compute validation status without causing re-renders
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

    // Validate password for signup
    if (mode === 'signup' && !isPasswordValid) {
      setError('Password must meet all requirements above.')
      setLoading(false)
      return
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/app')
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role } },
      })
      if (error) setError(error.message)
      else setError('Check your email to confirm your account.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        {/* Logo / Title */}
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="w-8 h-8  rounded-lg flex items-center justify-center">
            <Image src="/images/PlatformBrandingLogo.png" alt="Logo" width={32} height={32} className="w-8 h-8 object-contain mb-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Decision Intelligence</h1>
          <p className="text-gray-400 text-sm mt-1">Platform — Internal Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 pr-10 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {mode === 'signup' && password && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600 mb-1">Password must contain:</p>
                <div className="space-y-0.5">
                  <div className={`flex items-center gap-2 text-xs ${
                    currentPasswordValidation.length ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <span className={`w-3 h-3 rounded-full text-center leading-3 text-[10px] ${
                      currentPasswordValidation.length ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {currentPasswordValidation.length ? '✓' : '○'}
                    </span>
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${
                    currentPasswordValidation.uppercase ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <span className={`w-3 h-3 rounded-full text-center leading-3 text-[10px] ${
                      currentPasswordValidation.uppercase ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {currentPasswordValidation.uppercase ? '✓' : '○'}
                    </span>
                    One uppercase letter
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${
                    currentPasswordValidation.lowercase ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <span className={`w-3 h-3 rounded-full text-center leading-3 text-[10px] ${
                      currentPasswordValidation.lowercase ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {currentPasswordValidation.lowercase ? '✓' : '○'}
                    </span>
                    One lowercase letter
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${
                    currentPasswordValidation.number ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <span className={`w-3 h-3 rounded-full text-center leading-3 text-[10px] ${
                      currentPasswordValidation.number ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {currentPasswordValidation.number ? '✓' : '○'}
                    </span>
                    One number
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${
                    currentPasswordValidation.special ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <span className={`w-3 h-3 rounded-full text-center leading-3 text-[10px] ${
                      currentPasswordValidation.special ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {currentPasswordValidation.special ? '✓' : '○'}
                    </span>
                    One special character (!@#$%^&*)
                  </div>
                </div>
              </div>
            )}
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {(['analyst', 'admin'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors capitalize ${role === r
                      ? 'bg-blue-50 border-blue-200 text-blue-600'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className={`text-xs px-3 py-2 rounded-lg border ${error.includes('Check') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'signup' && !isPasswordValid)}
            className={`w-full font-medium py-2.5 px-4 rounded-lg text-sm transition-colors ${
              loading || (mode === 'signup' && !isPasswordValid)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {loading ? 'Loading…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null) }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
