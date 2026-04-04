'use client'

import Link from 'next/link'
import { Shield, Database, Bot, Lock, AlertTriangle } from 'lucide-react'
import { Navbar } from '@/components/Navbar'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-8 py-16">

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-slate-500" />
            <h1 className="text-3xl font-bold">Privacy & Terms</h1>
          </div>
          <p className="text-slate-600">Last updated: April 2026</p>
        </div>

        {/* Not Medical Advice - Most Important */}
        <section className="mb-10 p-6 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xl font-bold text-amber-900 mb-2">Not Medical Advice</h2>
              <p className="text-amber-800">
                opencancer.ai is an <strong>educational and research tool</strong>. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your oncologist or healthcare provider before making any medical decisions. AI outputs should be validated against primary sources and discussed with your care team.
              </p>
            </div>
          </div>
        </section>

        {/* Data We Collect */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-slate-500" />
            <h2 className="text-xl font-bold">What We Store</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p>When you create an account and use opencancer.ai, we store:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Account info:</strong> Email address, name, cancer type (if provided)</li>
              <li><strong>Uploaded records:</strong> Medical documents you upload for translation</li>
              <li><strong>Chat history:</strong> Questions you ask and AI responses</li>
              <li><strong>Usage analytics:</strong> Page views, feature usage (anonymized)</li>
            </ul>
            <p className="mt-4">
              All data is stored in <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">Supabase</a> with encryption at rest. Your data is associated with your account and accessible only to you.
            </p>
          </div>
        </section>

        {/* What We DON'T Do */}
        <section className="mb-10 p-6 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-bold text-green-900">What We Don't Do</h2>
          </div>
          <ul className="space-y-2 text-green-800">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> We <strong>never sell</strong> your data
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> We don't share data with advertisers
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> We don't use your records to train AI models
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> We don't contact you for marketing (unless you opt in)
            </li>
          </ul>
        </section>

        {/* Third-Party Services */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-slate-500" />
            <h2 className="text-xl font-bold">Third-Party Services</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p>To provide AI-powered features, your queries may be processed by:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Anthropic (Claude):</strong> For AI chat and document analysis</li>
              <li><strong>OpenAI:</strong> For certain AI features</li>
              <li><strong>Google (Gemini):</strong> For document processing</li>
            </ul>
            <p className="mt-4">
              These providers have their own privacy policies and data handling practices. When you submit a query, relevant context is sent to these services for processing. We recommend reviewing their policies:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
              <li><a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">Anthropic Privacy Policy</a></li>
              <li><a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">OpenAI Privacy Policy</a></li>
              <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">Google Privacy Policy</a></li>
            </ul>
          </div>
        </section>

        {/* Partner Services */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Partner Integrations</h2>
          <div className="space-y-4 text-slate-600">
            <p>Some features are powered by partner organizations:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong><a href="https://biomcp.org" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">BioMCP</a>:</strong> Research library queries (read-only, no data storage)</li>
              <li><strong><a href="https://openonco.org" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">OpenOnco</a>:</strong> Precision testing information</li>
              <li><strong><a href="https://cancerpatientlab.org" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">Cancer Patient Lab</a>:</strong> Community features and events</li>
            </ul>
            <p className="mt-4">
              Each partner maintains their own privacy practices. Data shared with partners is limited to what's necessary for the specific feature.
            </p>
          </div>
        </section>

        {/* PHI Warning */}
        <section className="mb-10 p-6 bg-slate-100 border border-slate-200 rounded-xl">
          <h2 className="text-xl font-bold mb-3">About Protected Health Information</h2>
          <p className="text-slate-600">
            While we implement encryption and security best practices, <strong>opencancer.ai is not a HIPAA-covered entity</strong>. If you work in healthcare or have organizational compliance requirements, consult your compliance team before uploading patient data. For personal use, understand that your data traverses third-party AI services as described above.
          </p>
        </section>

        {/* Open Source */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Open Source & Transparency</h2>
          <p className="text-slate-600">
            opencancer.ai is open source. You can review our code, data handling practices, and contribute improvements on{' '}
            <a href="https://github.com/ariakerstein/opencancer-skills" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">GitHub</a>.
          </p>
        </section>

        {/* Data Deletion */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Data Deletion</h2>
          <p className="text-slate-600">
            You can delete your account and all associated data at any time. Contact{' '}
            <a href="mailto:info@opencancer.ai" className="text-slate-600 hover:underline">info@opencancer.ai</a>{' '}
            to request complete data deletion.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-10 p-6 bg-slate-50 border border-slate-200 rounded-xl">
          <h2 className="text-xl font-bold mb-3 text-slate-900">Questions?</h2>
          <p className="text-slate-800">
            For privacy questions or concerns, email{' '}
            <a href="mailto:info@opencancer.ai" className="font-semibold hover:underline">info@opencancer.ai</a>
          </p>
        </section>

      </div>
    </main>
  )
}
