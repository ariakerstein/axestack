'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Heart, Brain, Users, Dumbbell, Utensils, Sparkles, CheckCircle, Calendar, User, ArrowRight, Shield, X } from 'lucide-react'
import { Navbar } from '@/components/Navbar'

const PROGRAM_PILLARS = [
  {
    icon: Heart,
    title: 'Emotional Wellbeing',
    description: 'If your emotional health is compromised, so is your ability to fight off disease. We help "unpack" emotional issues that factor negatively into healing.',
    offerings: ['Individual Counseling', 'Couples Counseling', 'Workshops', 'Support Groups'],
    color: 'rose',
  },
  {
    icon: Users,
    title: 'Social Connection',
    description: 'Social connection is a strong protective factor when it comes to staving off recurrence. Build your "tribe" with others who understand.',
    offerings: ['Social Wellbeing Workshops', 'Community Events', 'Cohort Activities'],
    color: 'blue',
  },
  {
    icon: Brain,
    title: 'Stress Reduction',
    description: 'Mindfulness-based stress reduction has a significant positive effect on mental health. Learn restorative techniques of deep relaxation.',
    offerings: ['Meditation', 'Yoga', 'Stress Management Workshops'],
    color: 'purple',
  },
  {
    icon: Utensils,
    title: 'Enhanced Nutrition',
    description: 'Licensed nutritionists create an eating regimen that reduces inflammation, promotes insulin reduction, and helps the body heal.',
    offerings: ['Individual Counseling', 'Supplement Regimen', 'Cooking Demos'],
    color: 'green',
  },
  {
    icon: Dumbbell,
    title: 'Physical Movement',
    description: 'Physical activity slows stress-related hormones and lowers cancer risk. We help design the movement program right for you.',
    offerings: ['Gentle Movement', 'Full Exercise Classes', 'Movement Workshops'],
    color: 'amber',
  },
  {
    icon: Sparkles,
    title: 'Positive Mindset',
    description: 'Cancer "thrivers" have a strong sense of purpose. We work with you to "translate" this moment into a "turn point" toward the life you want.',
    offerings: ['Mindset Workshops', '"Turn Point" Workshop', 'Building Your A-Team'],
    color: 'indigo',
  },
]

const PROGRAM_INCLUDES = [
  { title: 'Introductory Consultation', desc: 'Individual consultation with team leader including lab review' },
  { title: '2 Team Leader Sessions', desc: 'Additional individual sessions with your team leader' },
  { title: 'Emotional Wellbeing Workshop', desc: 'Key concepts and experiential analysis of your personal situation' },
  { title: '4 Counseling Sessions', desc: 'Individual emotional wellbeing counseling sessions' },
  { title: 'Social Wellbeing Workshop', desc: 'Biology of social connection and how it mitigates cancer' },
  { title: '4 Group Support Sessions', desc: 'Group support sessions with your cohort' },
  { title: 'Stress Reduction Workshop', desc: 'Impact of stress on cancer biology and outcomes' },
  { title: '12 Meditation & Yoga Classes', desc: 'Weekly stress reduction classes to address your needs' },
  { title: 'Nutrition Workshop', desc: 'Overview of key nutrition concepts for cancer care' },
  { title: '2 Nutrition Sessions', desc: 'Individual sessions to set up your customized nutrition program' },
  { title: 'Movement Workshop', desc: 'Importance of exercise on your biology' },
  { title: '12 Movement Classes', desc: 'Classes to increase aerobic capacity and build muscle mass' },
  { title: 'Positive Mindset Workshop', desc: 'Plus individual mindset consultation for your needs' },
  { title: '24 Q&A Sessions', desc: 'Cohort events and activities meant to build "tribe"' },
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

          <div className="grid md:grid-cols-5 gap-8 items-center">
            {/* Cindy's photo - shows first on mobile */}
            <div className="md:col-span-2 order-first md:order-last">
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100">
                <img
                  src="/team/cindy-ness.jpg"
                  alt="Dr. Cindy Ness"
                  className="w-full rounded-xl mb-3"
                />
                <div className="text-center">
                  <p className="font-semibold text-slate-900">Dr. Cindy Ness, PhD, EdD</p>
                  <p className="text-sm text-slate-500">Founder · Harvard · Penn · Cancer Survivor</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="md:col-span-3">
              {/* Logo */}
              <img
                src="/logos/cclm-logo.png"
                alt="CCLM"
                className="h-10 w-auto mb-6"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />

              <span className="inline-block bg-rose-100 text-rose-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
                1-on-1 Sessions Available Now
              </span>
              <h1 className="text-4xl font-bold text-slate-900 mb-4">
                Cancer & Chronic Illness Coaching
              </h1>
              <p className="text-lg text-slate-600 mb-6">
                Psychotherapy attuned to the emotional challenges of cancer—plus lifestyle factors that research shows can strengthen both body and mind.
              </p>

              {/* Pricing info */}
              <div className="bg-white/80 rounded-xl p-4 mb-6 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-900">$360 per session</span>
                  <span className="text-sm text-green-600 font-medium">Insurance may cover 50-80%</span>
                </div>
                <p className="text-xs text-slate-500">Out-of-network reimbursement available for most insurance plans</p>
              </div>

              {/* CTA */}
              <button
                onClick={() => setShowContactModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all inline-flex items-center gap-2"
              >
                Schedule Introductory Session <ArrowRight className="w-4 h-4" />
              </button>
            </div>
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

      {/* Approach */}
      <section className="py-12 px-8 bg-white border-y border-slate-200">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">The Approach</h2>
          <p className="text-slate-600 mb-6">
            Being diagnosed with cancer or a chronic illness can make you feel like your world has been turned upside down. Dr. Ness provides psychotherapy attuned to the depression, anxiety, anger, fear, and regret frequently experienced—while also addressing longstanding emotional issues that can weigh people down for years.
          </p>
          <p className="text-slate-600 mb-6">
            When someone is interested, she incorporates <strong>lifestyle factors</strong>—diet, exercise, sleep, and stress management—that current peer-reviewed research shows can significantly bolster the immune system and create a less hospitable environment for illness to take hold.
          </p>
          <p className="text-lg text-slate-700 italic text-center">
            "These elements are not just supportive of physical health; they play a crucial role in emotional resilience and overall wellbeing. By addressing lifestyle alongside psychotherapy, we create a comprehensive approach to strengthening both body and mind."
          </p>
          <p className="text-sm text-slate-500 mt-4 text-center">— Dr. Cindy Ness</p>
        </div>
      </section>

      {/* 6 Pillars */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Areas of Focus</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Six areas we address in sessions—each grounded in research—to help you feel steadier, more supported, and better equipped to navigate your journey.
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
                  <p className="text-sm text-slate-600 mb-3">{pillar.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {pillar.offerings.map((o, j) => (
                      <span key={j} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{o}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* What 1:1 Sessions Cover */}
      <section className="py-16 px-8 bg-white border-y border-slate-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">What We Work On Together</h2>
            <p className="text-slate-600">
              Personalized coaching sessions tailored to your unique situation and goals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: 'Processing Your Diagnosis', desc: 'Navigate the emotional impact of cancer or chronic illness' },
              { title: 'Managing Fear & Anxiety', desc: 'Tools for coping with uncertainty and medical anxiety' },
              { title: 'Treatment Navigation', desc: 'Support in understanding options and making decisions' },
              { title: 'Lifestyle Integration', desc: 'Diet, exercise, sleep, and stress management guidance' },
              { title: 'Building Your Care Team', desc: 'Strategies for assembling and coordinating your "A-Team"' },
              { title: 'Relationship Support', desc: 'Navigate changes in family dynamics and relationships' },
              { title: 'Finding Purpose', desc: 'Transform this moment into a "turn point" toward the life you want' },
              { title: 'Ongoing Advocacy', desc: 'Someone in your corner pushing for the best outcomes' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-lg p-4">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 text-sm">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet the Team */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Meet the Team</h2>

          <div className="space-y-12">
            {/* Dr. Cindy Ness */}
            <div className="grid md:grid-cols-4 gap-6 items-start">
              <div className="md:col-span-1">
                <img
                  src="/team/cindy-ness.jpg"
                  alt="Dr. Cindy Ness"
                  className="w-full rounded-xl shadow-lg"
                />
              </div>
              <div className="md:col-span-3">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Dr. Cindy Ness, PhD, EdD</h3>
                <p className="text-rose-600 font-medium text-sm mb-3">Founder & Executive Director</p>
                <p className="text-slate-600 mb-4">
                  Dr. Ness brings doctorates from Harvard and Penn to her mission of improving cancer care. Her own cancer diagnosis led her to envision a program bringing together emotional wellbeing, nutrition, exercise, and community—all under one roof. This became The Center for Cancer Lifestyle Management.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">Harvard</span>
                  <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">Penn</span>
                  <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">Cancer Survivor</span>
                </div>
              </div>
            </div>

            {/* Sonia Satra */}
            <div className="grid md:grid-cols-4 gap-6 items-start">
              <div className="md:col-span-1">
                <img
                  src="/team/sonia-satra.png"
                  alt="Sonia Satra"
                  className="w-full rounded-xl shadow-lg"
                />
              </div>
              <div className="md:col-span-3">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Sonia Satra</h3>
                <p className="text-rose-600 font-medium text-sm mb-3">Mindset & Movement Coach</p>
                <p className="text-slate-600 mb-4">
                  Sonia is a mindset and fitness thought leader who integrates mind, body, and emotion to create lasting change. Founder of Moticise, she's a certified Life Coach, NLP Practitioner, and holistic health coach. She leads the program's movement classes and mindset workshops.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">Life Coach</span>
                  <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">NLP Practitioner</span>
                  <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">Moticise Founder</span>
                </div>
              </div>
            </div>

            {/* Dr. Harold Brodsky */}
            <div className="grid md:grid-cols-4 gap-6 items-start">
              <div className="md:col-span-1">
                <img
                  src="/team/harold-brodsky.png"
                  alt="Dr. Harold Brodsky"
                  className="w-full rounded-xl shadow-lg"
                />
              </div>
              <div className="md:col-span-3">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Dr. Harold Brodsky</h3>
                <p className="text-rose-600 font-medium text-sm mb-3">Nutrition & Wellness</p>
                <p className="text-slate-600 mb-4">
                  Dr. Brodsky focuses on improving internal health by correcting nutritional deficiencies that increase disease risk. He shows patients how changes in nutrition can help overcome disease and create a better way of life. A graduate of NYU with 20+ years serving veterans through the VA Healthcare System.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">NYU Graduate</span>
                  <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">VA Healthcare</span>
                  <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">Nutrition</span>
                </div>
              </div>
            </div>

            {/* Bobbie Marchand */}
            <div className="grid md:grid-cols-4 gap-6 items-start">
              <div className="md:col-span-1">
                <img
                  src="/team/bobbie-marchand.png"
                  alt="Bobbie Marchand"
                  className="w-full rounded-xl shadow-lg"
                />
              </div>
              <div className="md:col-span-3">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Bobbie Marchand</h3>
                <p className="text-rose-600 font-medium text-sm mb-3">Yoga & Meditation</p>
                <p className="text-slate-600 mb-4">
                  A graduate of Canada's National Ballet School, Bobbie's own cancer diagnosis revealed the power of daily yoga practice. "As a Survivor, I know my experience would have been vastly different without these tools." Her sessions empower and calm, nurturing the body while settling the mind and nervous system.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">Cancer Survivor</span>
                  <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">Yoga Teacher</span>
                  <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">National Ballet School</span>
                </div>
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
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to Get Started?</h2>
          <p className="text-slate-600 mb-4">
            Dr. Ness is smart, empathic, and brings a sense of humor even to tough situations. Schedule an introductory session to see if it's a good fit.
          </p>
          <p className="text-sm text-slate-500 mb-8">
            <strong>$360 per session</strong> · Most out-of-network insurance reimburses 50-80%
          </p>
          <button
            onClick={() => setShowContactModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-rose-600/25 transition-all inline-flex items-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Schedule Introductory Session
          </button>
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
            <Link href="/about" className="hover:text-slate-600">About</Link>
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
                <h2 className="text-xl font-bold text-slate-900">Schedule Session</h2>
                <p className="text-sm text-slate-500">Connect with Dr. Cindy Ness</p>
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
                    Dr. Ness will reach out to you within 1-2 business days to schedule your session.
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
                        <p className="text-sm font-medium text-slate-700">Share my opencancer.ai records with Dr. Ness</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          This helps Dr. Ness understand your situation before your session. Your records remain private and encrypted.
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
                        Request Session
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
