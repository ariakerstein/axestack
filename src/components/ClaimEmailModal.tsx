'use client'

import { useState, useEffect } from 'react'
import { X, Mail, Check, AlertCircle, Sparkles, ArrowRight, FileText, Loader2, Shield } from 'lucide-react'

interface ClaimEmailModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  userId?: string | null
  onSuccess?: (email: string) => void
}

export function ClaimEmailModal({ isOpen, onClose, sessionId, userId, onSuccess }: ClaimEmailModalProps) {
  const [username, setUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Debounced availability check
  useEffect(() => {
    if (username.length < 3) {
      setAvailable(null)
      setError(null)
      return
    }

    setChecking(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/email/claim?username=${encodeURIComponent(username)}`)
        const data = await res.json()
        setAvailable(data.available)
        setError(data.error || null)
      } catch {
        setError('Failed to check availability')
      } finally {
        setChecking(false)
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [username])

  const handleClaim = async () => {
    if (!available || claiming) return

    setClaiming(true)
    setError(null)

    try {
      const res = await fetch('/api/email/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          sessionId,
          userId
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to claim email')
        return
      }

      setSuccess(data.email_address)
      onSuccess?.(data.email_address)
    } catch {
      setError('Failed to claim email address')
    } finally {
      setClaiming(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Claim Your Email</h2>
              <p className="text-white/80">Get your own @opencancer.ai address</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {success ? (
            /* Success state */
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">You're all set!</h3>
                <p className="text-lg font-semibold text-violet-600 mt-2">{success}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-left">
                <h4 className="font-semibold text-slate-900 mb-2">What's next:</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    Forward medical documents to your new email
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    Attachments auto-appear in your Records Vault
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    Use it as your medical contact email
                  </li>
                </ul>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all"
              >
                Got it!
              </button>
            </div>
          ) : (
            <>
              {/* Value proposition */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-sm text-slate-600">
                  Forward medical emails to store securely and auto-update your case file. Your records become a living document that grows with each email.
                </p>
              </div>

              {/* Username input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Choose your username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="yourname"
                    className={`w-full px-4 py-3 pr-32 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-lg font-medium text-slate-900 placeholder:text-slate-400 ${
                      error ? 'border-red-300' : available ? 'border-emerald-300' : 'border-slate-300'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                    @opencancer.ai
                  </div>
                </div>

                {/* Status indicator */}
                <div className="mt-2 h-5">
                  {checking && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking availability...
                    </div>
                  )}
                  {!checking && error && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}
                  {!checking && available && username.length >= 3 && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <Check className="w-4 h-4" />
                      {username}@opencancer.ai is available!
                    </div>
                  )}
                </div>
              </div>

              {/* How it works */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-3">How it works:</h4>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex flex-col items-center gap-1 text-slate-600">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-violet-600" />
                    </div>
                    <span className="text-xs text-center">Forward<br/>email</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                  <div className="flex flex-col items-center gap-1 text-slate-600">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-violet-600" />
                    </div>
                    <span className="text-xs text-center">Stored<br/>securely</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                  <div className="flex flex-col items-center gap-1 text-slate-600">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-violet-600" />
                    </div>
                    <span className="text-xs text-center">Case file<br/>updated</span>
                  </div>
                </div>
              </div>

              {/* Claim button */}
              <button
                onClick={handleClaim}
                disabled={!available || claiming || username.length < 3}
                className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Claim {username || 'your'}@opencancer.ai
                  </>
                )}
              </button>

              <p className="text-xs text-slate-500 text-center">
                Free forever. Your data stays private and secure.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
