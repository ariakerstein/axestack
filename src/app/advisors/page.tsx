'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

interface Advisor {
  name: string
  role: string
  image: string
}

const ADVISORS: Advisor[] = [
  {
    name: 'Chris Apfel, MD, PhD, MBA',
    role: 'Founder & CEO, @SageMedic',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/5761840d-8d31-4c56-a09e-c6f27510bc5a/Chris-Apfel-Nature-removebg-preview.png',
  },
  {
    name: 'Brad Power',
    role: 'Founder, Cancer Patient Lab | Stanford · Survivor',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/48fdd96b-71a0-41f9-bc5f-f1ae27636b95/Screenshot+2024-09-11+at+7.36.59%E2%80%AFPM.png',
  },
  {
    name: 'Kaumudi Bhawe, PhD',
    role: 'Chief Scientific Officer | Genentech · Cancer Commons',
    image: 'https://navis.health/team/kaumudi.jpg',
  },
  {
    name: 'Malek Faham, PhD',
    role: 'Inventor & Entrepreneur | Chief Scientist @ Illumina Ventures',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/296ba56a-1771-48d2-a541-c5cd9ec7373a/1517739834418.jpg',
  },
  {
    name: 'Anne Aula',
    role: 'UX Leader | Ex-Google, Verily, One Medical',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/1dda8c88-1974-43c9-a97c-f620c37dc6bb/A-62.JPG',
  },
  {
    name: 'Dan Mosedale',
    role: 'Engineering Leadership | Human Genome Project · Mozilla',
    image: 'https://navis.health/team/dan.jpg',
  },
  {
    name: 'Kent Griffin',
    role: 'Product Executive | Ex-PayPal, Included Health, Doctor On Demand',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/5312b070-f7e0-4f20-b97a-f01c1b5cc28b/1702698399985.jpg',
  },
  {
    name: 'Anthony M. Magliocco, MD',
    role: 'President & CEO, Protean BioDiagnostics',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/de0bbdd8-6a9d-49ec-8631-fc28d5ad0b3b/IMG_1551.jpg',
  },
  {
    name: 'Zoya Mohiuddin, MD',
    role: 'Clinical Affairs | Specialty Care & Patient Navigation',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/3d97f81c-3d72-4933-acd0-d45a78af3fcf/1556106251882.jpg',
  },
  {
    name: 'Magnus Hillestadt',
    role: 'Co-founder and CEO @ Sanity.io',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/822cf456-df57-4960-8c0d-72eb59b60f26/Screenshot+2024-09-20+at+11.51.32%E2%80%AFAM.png',
  },
  {
    name: 'Aaron Rich',
    role: 'Product Leader | Google',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/81f70409-4cec-4035-b19c-3a6830f07272/1516263236012.jpg',
  },
  {
    name: 'Michael Meiners',
    role: 'Director, Enterprise/B2B Sales @AthenaHealth',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/faf0cf26-bf5c-415d-abd7-1c5aa38aac47/1700608757095.jpg',
  },
  {
    name: 'Freddy Nguyen, MD, PhD',
    role: 'MIT Catalyst Fellow | Health Innovation',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/68ca0a15-37cd-4a0f-9bcb-d2f63f006c60/Freddy_Nguyen_Headshot_V13.png',
  },
  {
    name: 'Marty Tenenbaum, PhD',
    role: 'Founder, Cancer Commons | AI Pioneer',
    image: 'https://navis.health/pitchAssets/marty.webp',
  },
  {
    name: 'Larry Cornett, PhD',
    role: 'Coach & Fractional Leader | Ex-Apple, IBM, eBay, Yahoo',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/bb1290d0-64dc-4025-b697-8c6b2688391c/Larry+Cornett+-+Profile+Photos+for+Social+media+-+Alaska+cropped.jpeg',
  },
  {
    name: 'Richard Anders, JD',
    role: 'Founder, MA Medical Angels | Harvard / MIT',
    image: 'https://navis.health/pitchAssets/richardAnders.png',
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
              Leaders from Google, Meta, Illumina, PayPal, MIT, Stanford, and Harvard.
              Venture partners, physicians, scientists, and operators helping guide our mission.
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
                  {/* Photo */}
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden bg-slate-100 ring-2 ring-slate-200">
                    <img
                      src={advisor.image}
                      alt={advisor.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-400">${advisor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>`
                        }
                      }}
                    />
                  </div>

                  <h3 className="font-semibold text-slate-900 text-center text-sm">
                    {advisor.name}
                  </h3>
                  <p className="text-xs text-slate-500 text-center mt-1 leading-relaxed">
                    {advisor.role}
                  </p>
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
