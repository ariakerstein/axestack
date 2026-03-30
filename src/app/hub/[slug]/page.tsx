'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface Update {
  id: string
  content: string
  createdAt: string
}

interface Hub {
  id: string
  slug: string
  patientName: string
  updates: Update[]
  subscribers: string[]
  createdAt: string
}

export default function HubViewPage() {
  const params = useParams()
  const slug = params.slug as string

  const [hub, setHub] = useState<Hub | null>(null)
  const [loading, setLoading] = useState(true)
  const [newUpdate, setNewUpdate] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showSubscribe, setShowSubscribe] = useState(false)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    // Load hub from localStorage
    const hubs = JSON.parse(localStorage.getItem('careCircleHubs') || '[]') as Hub[]
    const foundHub = hubs.find(h => h.slug === slug)

    if (foundHub) {
      setHub(foundHub)
      // Check if this browser created the hub (simple ownership for now)
      setIsOwner(true) // For demo, assume creator is viewing
    }
    setLoading(false)
  }, [slug])

  const handlePostUpdate = () => {
    if (!hub || !newUpdate.trim()) return

    const update: Update = {
      id: crypto.randomUUID(),
      content: newUpdate.trim(),
      createdAt: new Date().toISOString()
    }

    const updatedHub = {
      ...hub,
      updates: [update, ...hub.updates]
    }

    // Update localStorage
    const hubs = JSON.parse(localStorage.getItem('careCircleHubs') || '[]') as Hub[]
    const hubIndex = hubs.findIndex(h => h.slug === slug)
    if (hubIndex !== -1) {
      hubs[hubIndex] = updatedHub
      localStorage.setItem('careCircleHubs', JSON.stringify(hubs))
    }

    setHub(updatedHub)
    setNewUpdate('')
  }

  const handleCopyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubscribe = () => {
    if (!hub || !email.trim()) return

    const updatedHub = {
      ...hub,
      subscribers: [...hub.subscribers, email.trim()]
    }

    // Update localStorage
    const hubs = JSON.parse(localStorage.getItem('careCircleHubs') || '[]') as Hub[]
    const hubIndex = hubs.findIndex(h => h.slug === slug)
    if (hubIndex !== -1) {
      hubs[hubIndex] = updatedHub
      localStorage.setItem('careCircleHubs', JSON.stringify(hubs))
    }

    setHub(updatedHub)
    setSubscribed(true)
    setShowSubscribe(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </main>
    )
  }

  if (!hub) {
    return (
      <main className="min-h-screen bg-white text-slate-900">
        <div className="max-w-xl mx-auto px-8 py-24 text-center">
          <div className="text-5xl mb-6">😕</div>
          <h1 className="text-2xl font-bold mb-4">CareCircle Not Found</h1>
          <p className="text-slate-600 mb-8">This hub doesn't exist or the link may be incorrect.</p>
          <Link
            href="/hub"
            className="inline-block bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-xl"
          >
            Create Your Own CareCircle
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/hub" className="text-slate-500 hover:text-slate-900 text-sm transition-colors">
            ← Back
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">opencancer.ai</span>
            <span className="text-slate-400 text-sm">/</span>
            <span className="font-medium text-slate-700">CareCircle</span>
          </Link>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <span className="text-green-600">✓</span>
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <span>🔗</span>
                <span>Share Link</span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Hub Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 text-center">
          <div className="text-4xl mb-4">💝</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{hub.patientName}</h1>
          <p className="text-slate-500 text-sm">
            CareCircle created {formatRelativeDate(hub.createdAt)}
          </p>

          {!subscribed && !isOwner && (
            <div className="mt-4">
              {!showSubscribe ? (
                <button
                  onClick={() => setShowSubscribe(true)}
                  className="text-rose-600 hover:text-rose-700 text-sm font-medium"
                >
                  Get notified of new updates →
                </button>
              ) : (
                <div className="flex gap-2 max-w-xs mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    onClick={handleSubscribe}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Subscribe
                  </button>
                </div>
              )}
            </div>
          )}

          {subscribed && (
            <p className="mt-4 text-green-600 text-sm">
              ✓ You'll be notified of new updates
            </p>
          )}
        </div>

        {/* Post Update (Owner Only) */}
        {isOwner && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h2 className="font-semibold text-slate-900 mb-4">Post an Update</h2>
            <textarea
              value={newUpdate}
              onChange={(e) => setNewUpdate(e.target.value)}
              placeholder="How are you feeling? Any news to share?"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="flex justify-between items-center mt-4">
              <p className="text-slate-500 text-sm">
                {hub.subscribers.length} {hub.subscribers.length === 1 ? 'person' : 'people'} subscribed
              </p>
              <button
                onClick={handlePostUpdate}
                disabled={!newUpdate.trim()}
                className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 disabled:from-slate-300 disabled:to-slate-300 text-white font-semibold px-6 py-2 rounded-xl transition-all"
              >
                Post Update
              </button>
            </div>
          </div>
        )}

        {/* Updates Feed */}
        <div className="space-y-4">
          {hub.updates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <div className="text-3xl mb-3">📝</div>
              <p className="text-slate-600">No updates yet.</p>
              {isOwner && (
                <p className="text-slate-500 text-sm mt-2">
                  Post your first update to let people know how you're doing.
                </p>
              )}
            </div>
          ) : (
            hub.updates.map((update) => (
              <div key={update.id} className="bg-white rounded-2xl border border-slate-200 p-6">
                <p className="text-slate-900 whitespace-pre-wrap">{update.content}</p>
                <p className="text-slate-400 text-sm mt-4">
                  {formatDate(update.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Share CTA */}
        <div className="mt-8 bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-200 p-6 text-center">
          <p className="text-slate-600 mb-3">Know someone who could use this?</p>
          <Link
            href="/hub"
            className="inline-block bg-white border border-rose-300 hover:border-rose-400 text-rose-600 font-semibold px-6 py-2 rounded-xl transition-all"
          >
            Create a CareCircle
          </Link>
        </div>

        {/* Cross-link to other tools */}
        <div className="mt-6 text-center">
          <Link
            href="/cancer-checklist"
            className="text-slate-500 hover:text-violet-600 text-sm transition-colors"
          >
            Need help preparing for appointments? Try the Cancer Checklist →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-8 bg-white mt-12">
        <div className="max-w-2xl mx-auto flex justify-between items-center text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">← Home</Link>
          <a href="https://axestack.com" className="hover:text-slate-900 transition-colors">axestack</a>
        </div>
      </footer>
    </main>
  )
}
