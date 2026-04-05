'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ExternalLink } from 'lucide-react'

interface Advisor {
  name: string
  role: string
  org?: string
  image?: string
  linkedin?: string
}

const ADVISORS: Advisor[] = [
  {
    name: 'Chris Apfel, MD, PhD',
    role: 'Anesthesiologist & Health Tech Founder',
    org: 'SageMedic',
  },
  {
    name: 'Freddy Nguyen, PhD',
    role: 'MIT Catalyst Fellow',
    org: 'Health Innovation',
  },
  {
    name: 'Brad Power',
    role: 'Founder',
    org: 'Cancer Patient Lab',
  },
  {
    name: 'Anthony Magliocco, MD',
    role: 'Pathologist & CEO',
    org: 'Protean BioDiagnostics',
  },
  {
    name: 'Malek Faham, MD, PhD',
    role: 'Venture Partner',
    org: 'Illumina Ventures',
  },
  {
    name: 'Dan Mosedale, PhD',
    role: 'Human Genome Project Alum',
    org: 'Genomics Research',
  },
  {
    name: 'Kent Griffin',
    role: 'Former PayPal, Included Health',
    org: 'Operations & Growth',
  },
  {
    name: 'Michael Meiners',
    role: 'Former AthenaHealth',
    org: 'Healthcare Tech',
  },
  {
    name: 'Aaron Rich',
    role: 'Product Leader',
    org: 'Google',
  },
  {
    name: 'Anne Aula, PhD',
    role: 'UX Research Leader',
    org: 'Google, Verily',
  },
  {
    name: 'Magnus Hillestad',
    role: 'Co-founder',
    org: 'Sanity.io',
  },
  {
    name: 'Zoya Mohiuddin',
    role: 'Clinical Affairs',
    org: 'Medical Devices',
  },
]

export default function AdvisorsPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1">
        {/* Header */}
        <section className="bg-slate-900 text-white py-16 px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Advisors</h1>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Experts in oncology, genomics, health tech, and patient advocacy helping guide our mission.
            </p>
          </div>
        </section>

        {/* Advisors Grid */}
        <section className="py-16 px-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {ADVISORS.map((advisor) => (
                <div
                  key={advisor.name}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition-all"
                >
                  {/* Avatar placeholder */}
                  <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-slate-400">
                      {advisor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-900 text-center text-sm">
                    {advisor.name}
                  </h3>
                  <p className="text-xs text-slate-500 text-center mt-1">
                    {advisor.role}
                  </p>
                  {advisor.org && (
                    <p className="text-xs text-slate-400 text-center">
                      {advisor.org}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 px-8 bg-slate-50 border-t border-slate-200">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Want to advise?</h2>
            <p className="text-slate-600 mb-4">
              We're always looking for experts who care about improving cancer care.
            </p>
            <a
              href="mailto:ari@opencancer.ai?subject=Advisor Interest"
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  )
}
