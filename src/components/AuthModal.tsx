'use client'

import { useState } from 'react'
import { Mail, Check, Loader2, Lock, ArrowLeft } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'choice' | 'magic' | 'password'>('choice')
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<string | null>(null)

  if (!isOpen) return null

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/records`,
        },
      })

      setLoading(false)
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    } catch (e) {
      setLoading(false)
      setError('Something went wrong. Please try again.')
      console.error('Auth error:', e)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setLoading(false)
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Try magic link instead?')
        } else {
          setError(error.message)
        }
        return
      }

      // Login successful - now migrate localStorage records
      if (data.user) {
        await migrateLocalStorageRecords(data.user.id, data.session?.access_token)
      }

      setLoading(false)
      onClose()
      window.location.reload() // Refresh to show synced state
    } catch (e) {
      setLoading(false)
      setError('Something went wrong. Please try again.')
      console.error('Auth error:', e)
    }
  }

  const migrateLocalStorageRecords = async (userId: string, accessToken?: string) => {
    if (!accessToken) return

    try {
      setMigrating(true)

      // Get localStorage records
      const savedData = localStorage.getItem('axestack-translations-data')
      if (!savedData) {
        setMigrating(false)
        return
      }

      const records = JSON.parse(savedData)
      const recordIds = Object.keys(records)

      if (recordIds.length === 0) {
        setMigrating(false)
        return
      }

      let migrated = 0
      let failed = 0

      for (const id of recordIds) {
        const record = records[id]
        try {
          const response = await fetch('/api/records/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              fileName: record.fileName,
              documentType: record.documentType,
              result: record.result,
              documentText: record.documentText || '',
              chatMessages: record.chatMessages || [],
            }),
          })

          if (response.ok) {
            migrated++
          } else {
            failed++
          }
        } catch {
          failed++
        }
      }

      setMigrationResult(`Migrated ${migrated} records to cloud${failed > 0 ? ` (${failed} failed)` : ''}`)

      // Clear localStorage after successful migration
      if (migrated > 0 && failed === 0) {
        localStorage.removeItem('axestack-translations-data')
        localStorage.removeItem('axestack-translations')
      }
    } catch (e) {
      console.error('Migration error:', e)
    } finally {
      setMigrating(false)
    }
  }

  const resetForm = () => {
    setMode('choice')
    setError(null)
    setSuccess(false)
    setPassword('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>

        {migrating ? (
          <div className="text-center py-4">
            <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Migrating your records...</h2>
            <p className="text-slate-500 text-sm">Moving your local records to the cloud</p>
          </div>
        ) : success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
            <p className="text-slate-500">
              We sent a sign-in link to <span className="font-medium text-slate-700">{email}</span>
            </p>
            <p className="text-sm text-slate-400 mt-4">
              Click the link to sign in. Your records will sync automatically.
            </p>
          </div>
        ) : mode === 'choice' ? (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-violet-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign in</h2>
              <p className="text-slate-500 text-sm">
                Save your records and sync across devices
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-center text-lg"
              />

              <button
                onClick={() => email && setMode('magic')}
                disabled={!email}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-200 disabled:text-slate-400 text-white py-3.5 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Send magic link
              </button>

              <button
                onClick={() => email && setMode('password')}
                disabled={!email}
                className="w-full bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 py-3.5 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-5 h-5" />
                Sign in with password
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center mt-6">
              No account? We'll create one automatically.
            </p>
          </>
        ) : mode === 'magic' ? (
          <>
            <button
              onClick={resetForm}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Send magic link</h2>
              <p className="text-slate-500 text-sm">to {email}</p>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-4">
              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-violet-300 text-white py-3.5 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send sign-in link'
                )}
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-6">
              We'll email you a link. Click it to sign in instantly.
            </p>
          </>
        ) : (
          <>
            <button
              onClick={resetForm}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Sign in with password</h2>
              <p className="text-slate-500 text-sm">{email}</p>
            </div>

            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoFocus
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-lg"
              />

              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              {migrationResult && (
                <p className="text-sm text-emerald-600 text-center">{migrationResult}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-violet-300 text-white py-3.5 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <button
              onClick={() => setMode('magic')}
              className="w-full text-sm text-slate-500 hover:text-violet-600 mt-4"
            >
              Forgot password? Use magic link instead
            </button>
          </>
        )}
      </div>
    </div>
  )
}
