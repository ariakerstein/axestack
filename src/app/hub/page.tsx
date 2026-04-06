'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useActivityLog } from '@/hooks/useActivityLog'
import { Navbar } from '@/components/Navbar'

export default function HubPage() {
  const router = useRouter()
  const [step, setStep] = useState<'intro' | 'create'>('intro')
  const [patientName, setPatientName] = useState('')
  const [creating, setCreating] = useState(false)

  const { trackEvent } = useAnalytics()
  const { logActivity } = useActivityLog()

  const handleCreate = async () => {
    if (!patientName.trim()) return

    setCreating(true)

    // Generate a simple slug
    const slug = patientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
      '-' + Math.random().toString(36).substring(2, 6)

    // Store in localStorage for now (will move to Supabase)
    const hub = {
      id: crypto.randomUUID(),
      slug,
      patientName: patientName.trim(),
      updates: [],
      subscribers: [],
      createdAt: new Date().toISOString()
    }

    // Get existing hubs or create new array
    const existingHubs = JSON.parse(localStorage.getItem('careCircleHubs') || '[]')
    existingHubs.push(hub)
    localStorage.setItem('careCircleHubs', JSON.stringify(existingHubs))

    // Track hub creation
    trackEvent('hub_created', {
      hub_slug: slug,
      total_hubs: existingHubs.length,
    })

    // Log to patient graph - CareCircle creation is a caregiver invite activity
    logActivity({
      activityType: 'caregiver_invite',
      metadata: {
        hubSlug: slug,
        hubName: patientName.trim(),
      },
    })

    // Navigate to the new hub
    router.push(`/hub/${slug}`)
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Navbar />
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-8 pt-16 pb-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C66B4A]/20 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-[#D4836A]/15 rounded-full blur-3xl" />

        <div className="relative text-center max-w-2xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-slate-400 text-sm">/</span>
            <span className="font-medium text-slate-700">CareCircle</span>
          </div>

          <div className="text-5xl mb-6">💝</div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C66B4A] via-[#D4836A] to-[#C66B4A]">
              CareCircle
            </span>
          </h1>

          <p className="text-xl text-slate-600 mb-4 font-light">
            One link to keep your loved ones updated.
          </p>

          <p className="text-slate-500 mb-10 max-w-lg mx-auto">
            Stop repeating yourself. Create a private hub where you post updates once, and everyone who cares about you stays informed.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-8">
        <div className="max-w-xl mx-auto">
          {step === 'intro' && (
            <div className="space-y-8">
              {/* How it works */}
              <div className="bg-gradient-to-br from-orange-50 to-white border border-[#C66B4A]/30 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">How It Works</h2>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#C66B4A]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#C66B4A] font-bold">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Create your CareCircle</h3>
                      <p className="text-slate-600 text-sm">Get a private link you control</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#C66B4A]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#C66B4A] font-bold">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Share with family & friends</h3>
                      <p className="text-slate-600 text-sm">Text or email the link to your people</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#C66B4A]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#C66B4A] font-bold">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Post updates when ready</h3>
                      <p className="text-slate-600 text-sm">Everyone stays informed without the repeat calls</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why this matters */}
              <div className="bg-slate-50 rounded-xl p-6">
                <p className="text-slate-600 text-center italic">
                  "When I was going through treatment, I was exhausted. But everyone wanted updates.
                  CareCircle would have saved me so much energy."
                </p>
                <p className="text-slate-500 text-sm text-center mt-2">— Ari, cancer survivor</p>
              </div>

              {/* CTA */}
              <button
                onClick={() => setStep('create')}
                className="w-full bg-[#C66B4A] hover:bg-[#B35E40] text-white text-lg font-semibold py-4 rounded-xl transition-all hover:scale-[1.02]"
              >
                Create Your CareCircle
              </button>
            </div>
          )}

          {step === 'create' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <button
                onClick={() => setStep('intro')}
                className="text-slate-500 hover:text-slate-900 text-sm mb-6 transition-colors"
              >
                ← Back
              </button>

              <h2 className="text-2xl font-bold text-slate-900 mb-2">Create Your CareCircle</h2>
              <p className="text-slate-600 mb-8">This will be the name people see when they visit your hub.</p>

              <div className="space-y-6">
                <div>
                  <label htmlFor="patientName" className="block text-sm font-medium text-slate-700 mb-2">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    id="patientName"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g., John's Journey"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C66B4A] focus:border-transparent text-lg"
                    autoFocus
                  />
                  <p className="text-slate-500 text-sm mt-2">
                    Tip: Some people use their name, others use something like "Mom's Updates"
                  </p>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!patientName.trim() || creating}
                  className="w-full bg-[#C66B4A] hover:bg-[#B35E40] disabled:bg-slate-300 text-white text-lg font-semibold py-4 rounded-xl transition-all hover:scale-[1.02] disabled:hover:scale-100"
                >
                  {creating ? 'Creating...' : 'Create CareCircle'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-slate-900">Built for Patients</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="text-2xl mb-3">🔒</div>
              <h3 className="font-semibold text-slate-900 mb-2">Private by Default</h3>
              <p className="text-slate-600 text-sm">Only people with your link can see updates. You control who knows.</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="text-2xl mb-3">⚡</div>
              <h3 className="font-semibold text-slate-900 mb-2">Update Once</h3>
              <p className="text-slate-600 text-sm">Post when you have energy. No more repeating yourself 15 times.</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="text-2xl mb-3">💬</div>
              <h3 className="font-semibold text-slate-900 mb-2">Reduce the Noise</h3>
              <p className="text-slate-600 text-sm">People can check in without calling. You rest; they stay informed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cross-link */}
      <section className="py-12 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-slate-600 mb-4">Need help preparing for your next appointment?</p>
          <Link
            href="/cancer-checklist"
            className="inline-block border border-slate-300 hover:border-orange-600 text-slate-700 hover:text-orange-600 font-semibold px-6 py-3 rounded-xl transition-all"
          >
            Try the Cancer Checklist →
          </Link>
        </div>
      </section>

    </main>
  )
}
