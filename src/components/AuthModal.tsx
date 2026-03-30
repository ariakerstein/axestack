'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signInWithEmail, signUpWithEmail } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (mode === 'magic') {
        // Magic link sign in (no password needed)
        const { supabase } = await import('@/lib/supabase')
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/editor`,
          },
        })
        setLoading(false)
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Check your email for a sign-in link')
        }
        return
      }

      const result = mode === 'signin'
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password)

      setLoading(false)

      if (result.error) {
        setError(result.error)
      } else {
        if (mode === 'signup') {
          setSuccess('Check your email to confirm your account')
        } else {
          onClose()
        }
      }
    } catch (e) {
      setLoading(false)
      setError('Something went wrong. Please try again.')
      console.error('Auth error:', e)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-slate-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Sign in with email'}
          </h2>
          <p className="text-slate-400 text-sm">
            {mode === 'magic'
              ? 'No password needed - we\'ll email you a sign-in link'
              : 'Sign in to save your decks across devices'}
          </p>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-teal-400"
            />
          </div>
          {(mode === 'signin' || mode === 'signup') && (
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-teal-400"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {success && (
            <p className="text-sm text-teal-400">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Sign-in Link'}
          </button>
        </form>

        <div className="text-center text-sm text-slate-400 mt-6 space-y-2">
          {mode === 'signin' && (
            <>
              <p>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                  className="text-teal-400 hover:underline"
                >
                  Sign up
                </button>
              </p>
              <p>
                <button
                  onClick={() => { setMode('magic'); setError(null); setSuccess(null); }}
                  className="text-slate-500 hover:text-teal-400 hover:underline"
                >
                  Sign in without password
                </button>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
                className="text-teal-400 hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
          {mode === 'magic' && (
            <p>
              <button
                onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
                className="text-teal-400 hover:underline"
              >
                Sign in with password instead
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
