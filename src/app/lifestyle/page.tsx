'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Heart, Brain, Users, Dumbbell, Utensils, Sparkles, CheckCircle, Calendar, User, ArrowRight, Shield, X } from 'lucide-react'
import { Navbar } from '@/components/Navbar'

const PROGRAM_PILLARS = [
  {
    icon: Heart,
    title: 'Emotional Wellbeing',
    description: 'One-on-one counseling sessions to strengthen resilience and navigate the emotional challenges of diagnosis.',
    color: 'rose',
  },
  {
    icon: Users,
    title: 'Social Connection',
    description: 'Group support sessions with your cohort. Build "tribe" with others who understand your journey.',
    color: 'blue',
  },
  {
    icon: Brain,
    title: 'Stress Reduction',
    description: 'Meditation and yoga classes to address the biological impact of stress on cancer outcomes.',
    color: 'purple',
  },
  {
    icon: Utensils,
    title: 'Enhanced Nutrition',
    description: 'Personalized nutrition sessions to optimize your immune system and reduce inflammation.',
    color: 'green',
  },
  {
    icon: Dumbbell,
    title: 'Physical Movement',
    description: 'Movement classes to increase aerobic capacity and build muscle mass during treatment.',
    color: 'amber',
  },
  {
    icon: Sparkles,
    title: 'Positive Mindset',
    description: 'Mindset workshops and consultations to cultivate clarity and forward momentum.',
    color: 'indigo',
  },
]

const PROGRAM_INCLUDES = [
  'Introductory consultation with team leader including lab review',
  '2 additional individual sessions with your team leader',
  'Emotional Wellbeing Workshop + 4 individual counseling sessions',
  'Social Wellbeing Workshop + 4 group support sessions',
  'Stress Reduction Workshop + 12 meditation/yoga classes',
  'Enhanced Nutrition Workshop + 2 individual nutrition sessions',
  'Physical Movement Workshop + 12 movement classes',
  'Positive Mindset Workshop + individual mindset consultation',
  '24 cohort Q&A sessions and community activities',
]

export default function LifestylePage() {
  const [showContactModal, setShowContactModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cancerType: '',
    message: '',
    shareRecords: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // Send to API
    try {
      await fetch('/api/lifestyle-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
    } catch (err) {
      console.error('Failed to submit inquiry:', err)
    }

    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee]">
      <Navbar />

      {/* Hero */}
      <section className="relative px-8 pt-12 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Back link */}
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-8">
            ← Back to Home
          </Link>

          <div className="max-w-2xl mx-auto text-center">
            {/* Logo */}
            <img
              src="/logos/cclm-logo.png"
              alt="CCLM"
              className="h-12 w-auto mx-auto mb-6"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />

            <span className="inline-block bg-rose-100 text-rose-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
              8-Week Science-Based Program
            </span>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Cancer Lifestyle Management
            </h1>
            <p className="text-lg text-slate-600 mb-8">
              Emotional wellbeing, nutrition, exercise, stress reduction, and community support—all under one roof. Built for cancer patients, by someone who's been there.
            </p>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900">8</p>
                <p className="text-xs text-slate-500">Weeks</p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900">75+</p>
                <p className="text-xs text-slate-500">Sessions</p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900">6</p>
                <p className="text-xs text-slate-500">Pillars</p>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => setShowContactModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-8 py-4 rounded-xl shadow-lg transition-all inline-flex items-center gap-2"
            >
              Schedule Free Consultation <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-sm text-slate-500 mt-3">
              No commitment · Speak directly with the CCLM team
            </p>
          </div>
        </div>
      </section>

      {/* Patient Testimonial */}
      <section className="py-12 px-8 bg-gradient-to-br from-rose-50 to-amber-50 border-y border-rose-100">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-rose-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-slate-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Brian K.</p>
                <p className="text-sm text-slate-500">Cancer Patient · Working with Dr. Ness</p>
              </div>
            </div>
            <blockquote className="text-lg text-slate-700 italic mb-4">
              "What would I miss the most if I didn't have Cindy? She is always pushing me—fly to Milwaukee for this therapy, get this second opinion, try this approach. She's like having an assistant who's entirely focused on your cancer care. When a scan showed a big mass and I panicked thinking my treatment wasn't working, she kept me grounded. She's not just a therapist—she's a coach who ensures you're going down the right path."
            </blockquote>
            <p className="text-slate-600 text-sm">
              Brian initially thought his wife was getting a therapist after surgery. Instead, they found a cancer coach who has become an essential part of their care team—meeting weekly and providing personalized guidance through every step of the journey.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-12 px-8 bg-white border-y border-slate-200">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xl text-slate-700 italic">
            "At CCLM, we understand that a cancer diagnosis can be overwhelming. Our team of educated, compassionate professionals promise to bring our 'human' to your 'human.'"
          </p>
          <p className="text-sm text-slate-500 mt-4">— The Center for Cancer Lifestyle Management</p>
        </div>
      </section>

      {/* 6 Pillars */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Six Pillars of Cancer Lifestyle Management</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Our program spans six specific areas—each based on crucial published scientific studies—to help you feel steadier, more supported, and better equipped to navigate your journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PROGRAM_PILLARS.map((pillar, i) => {
              const Icon = pillar.icon
              const bgColors: Record<string, string> = {
                rose: 'bg-rose-100',
                blue: 'bg-blue-100',
                purple: 'bg-purple-100',
                green: 'bg-green-100',
                amber: 'bg-amber-100',
                indigo: 'bg-indigo-100',
              }
              const iconColors: Record<string, string> = {
                rose: 'text-rose-600',
                blue: 'text-blue-600',
                purple: 'text-purple-600',
                green: 'text-green-600',
                amber: 'text-amber-600',
                indigo: 'text-indigo-600',
              }
              return (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-all">
                  <div className={`w-12 h-12 ${bgColors[pillar.color]} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${iconColors[pillar.color]}`} />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{pillar.title}</h3>
                  <p className="text-sm text-slate-600">{pillar.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 px-8 bg-white border-y border-slate-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">What's Included</h2>
            <p className="text-slate-600">
              Over 75 touchpoints via individual and virtual group sessions over eight weeks.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {PROGRAM_INCLUDES.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-lg p-4">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Dr. Ness */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-1">
              <img
                src="/team/cindy-ness.jpg"
                alt="Dr. Cindy Ness"
                className="w-full rounded-xl shadow-lg"
              />
            </div>
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">About Dr. Cindy Ness</h2>
              <div className="space-y-4 text-slate-600">
                <p>
                  Dr. Ness brings an impassioned and informed determination to improving the care and experience of individuals diagnosed with cancer. Her training as a psychologist and an anthropologist—doctorates from Harvard University and the University of Pennsylvania, respectively—affords her a unique lens with which to understand the emotional world of individuals living with a physical illness.
                </p>
                <p>
                  Dr. Ness' introduction to the world of cancer was an outgrowth of her own cancer diagnosis. After surgery and radiation, she did what she could to cobble together a regimen with the goal of lessening the likelihood of recurrence.
                </p>
                <p>
                  Immersed in a sea of competing and conflicting health claims and with no unified guidance, she began to envision a program that she wished she could have found for herself—bringing together the care that she wanted all under one roof. This was to become The Center for Cancer Lifestyle Management.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 mt-6">
                <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">
                  PhD, Harvard University
                </span>
                <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">
                  EdD, University of Pennsylvania
                </span>
                <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">
                  Cancer Survivor
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-8 bg-gradient-to-br from-rose-50 to-amber-50 border-t border-rose-100">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur rounded-full px-4 py-2 mb-6 shadow-sm">
            <Shield className="w-4 h-4 text-rose-600" />
            <span className="text-sm text-slate-700">Partnered with opencancer.ai</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to Transform Your Cancer Journey?</h2>
          <p className="text-slate-600 mb-8">
            Schedule a free consultation to learn how the CCLM program can support your physical and emotional wellbeing during and beyond treatment.
          </p>
          <button
            onClick={() => setShowContactModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-rose-600/25 transition-all inline-flex items-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Schedule Free Consultation
          </button>
          <p className="text-xs text-slate-500 mt-4">
            No commitment required. Speak directly with the CCLM team.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600">Home</Link>
            <span>·</span>
            <Link href="/about" className="hover:text-slate-600">About</Link>
            <span>·</span>
            <a href="https://www.cancerlifestylemgmt.com/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">CCLM Website</a>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      {showContactModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowContactModal(false)}
          />
          <div className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-rose-50 to-amber-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Schedule Consultation</h2>
                <p className="text-sm text-slate-500">Connect with the CCLM team</p>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Request Submitted!</h3>
                  <p className="text-slate-600 mb-4">
                    The CCLM team will reach out to you within 1-2 business days.
                  </p>
                  <button
                    onClick={() => setShowContactModal(false)}
                    className="text-rose-600 hover:text-rose-700 font-medium"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      placeholder="First and last name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cancer Type</label>
                    <input
                      type="text"
                      value={formData.cancerType}
                      onChange={(e) => setFormData({ ...formData, cancerType: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      placeholder="e.g., Breast cancer, Stage II"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tell us about your situation (optional)</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                      placeholder="What are you hoping to get from the program?"
                    />
                  </div>

                  {/* Records sharing consent */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.shareRecords}
                        onChange={(e) => setFormData({ ...formData, shareRecords: e.target.checked })}
                        className="mt-1 w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Share my opencancer.ai records with CCLM</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          This helps Dr. Ness understand your situation before your consultation. Your records remain private and encrypted.
                        </p>
                      </div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <User className="w-5 h-5" />
                        Request Consultation
                      </>
                    )}
                  </button>

                  <p className="text-xs text-slate-400 text-center">
                    Your information is private and will only be shared with CCLM.
                  </p>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  )
}
