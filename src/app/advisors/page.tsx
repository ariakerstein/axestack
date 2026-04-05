'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

interface Advisor {
  name: string
  role: string
  image: string
}

// Full list matching CHL accelerator page - same order
const ADVISORS: Advisor[] = [
  {
    name: 'Ari Akerstein, MS',
    role: 'Co-Founder/CEO @CHL | Product Leader | Ex-Meta',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/1b0c4b7c-4a7e-4f8c-8c1c-6f8c0e5a5b5e/ari.jpg',
  },
  {
    name: 'Richard Anders, JD',
    role: 'Founder, MA Medical Angels | Harvard / MIT',
    image: 'https://navis.health/pitchAssets/richardAnders.png',
  },
  {
    name: 'Chris Apfel, MD, PhD, MBA',
    role: 'Founder & CEO, @SageMedic',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/5761840d-8d31-4c56-a09e-c6f27510bc5a/Chris-Apfel-Nature-removebg-preview.png',
  },
  {
    name: 'Anne Aula',
    role: 'UX Leader | Ex-Google, Verily, One Medical',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/1dda8c88-1974-43c9-a97c-f620c37dc6bb/A-62.JPG',
  },
  {
    name: 'Larry Cornett, PhD',
    role: 'Coach and fractional leader | Ex-Apple, IBM, eBay, Yahoo',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/bb1290d0-64dc-4025-b697-8c6b2688391c/Larry+Cornett+-+Profile+Photos+for+Social+media+-+Alaska+cropped.jpeg',
  },
  {
    name: 'Malek Faham, PhD',
    role: 'Inventor and entrepreneur | Chief Scientist @ Illumina Ventures',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/296ba56a-1771-48d2-a541-c5cd9ec7373a/1517739834418.jpg',
  },
  {
    name: 'Dan Mosedale',
    role: 'Engineering Leadership | Human Genome Project · Mozilla',
    image: 'https://navis.health/team/dan.jpg',
  },
  {
    name: 'Kent Griffin',
    role: 'Product Executive | Ex-Paypal, Included Health, Doctor On Demand',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/5312b070-f7e0-4f20-b97a-f01c1b5cc28b/1702698399985.jpg',
  },
  {
    name: 'Eric Grossberg',
    role: 'Co-Founder/Executive Chairman | Brilliant Earth',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/eric-grossberg.jpg',
  },
  {
    name: 'Magnus Hillestadt',
    role: 'Co-founder and CEO @ Sanity.io',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/822cf456-df57-4960-8c0d-72eb59b60f26/Screenshot+2024-09-20+at+11.51.32%E2%80%AFAM.png',
  },
  {
    name: 'Anthony M. Magliocco, MD FRCPC FCAP',
    role: 'President & CEO, Protean BioDiagnostics',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/de0bbdd8-6a9d-49ec-8631-fc28d5ad0b3b/IMG_1551.jpg',
  },
  {
    name: 'Zoya Mohiuddin, MD',
    role: 'Clinical Affairs | Specialty Care & Patient Navigation',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/3d97f81c-3d72-4933-acd0-d45a78af3fcf/1556106251882.jpg',
  },
  {
    name: 'Michael Meiners',
    role: 'Director, Enterprise/B2B Sales @AthenaHealth',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/faf0cf26-bf5c-415d-abd7-1c5aa38aac47/1700608757095.jpg',
  },
  {
    name: 'Brian Morton',
    role: 'Managing Partner @Morbak Consulting | Revenue Cycle | Clinical Ops | EMR',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/brian-morton.jpg',
  },
  {
    name: 'Noah Nasser',
    role: 'Chief Executive Officer at dātma',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/noah-nasser.jpg',
  },
  {
    name: 'Laurel Nelson',
    role: 'Founder and CEO @ InnovexDx',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/laurel-nelson.jpg',
  },
  {
    name: 'Freddy Nguyen, MD, PhD',
    role: 'Physician-Scientist Fellow @ MIT | CEO/Co-Founder Nine Diagnostics',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/68ca0a15-37cd-4a0f-9bcb-d2f63f006c60/Freddy_Nguyen_Headshot_V13.png',
  },
  {
    name: 'Frank Austin Nothaft, PhD',
    role: 'Founder/CEO @Translating Science PBC',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/frank-nothaft.jpg',
  },
  {
    name: 'Scott Petinga',
    role: 'Fortune 500 Brand Marketer | Healthcare Founder & Advocate',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/scott-petinga.jpg',
  },
  {
    name: 'Brad Power',
    role: 'CEO CancerPatientLab | Co-Founder @CHL Accelerator',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/48fdd96b-71a0-41f9-bc5f-f1ae27636b95/Screenshot+2024-09-11+at+7.36.59%E2%80%AFPM.png',
  },
  {
    name: 'Aaron Rich',
    role: 'UX Research Leader | Project Starline @ Google',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/81f70409-4cec-4035-b19c-3a6830f07272/1516263236012.jpg',
  },
  {
    name: 'Roger Royse',
    role: 'Corporate and Tax Partner at Haynes and Boone, LLP',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/roger-royse.jpg',
  },
  {
    name: 'Chris Schuler',
    role: 'VP Venture Partnerships, Varia Ventures | Patient Advocate',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/chris-schuler.jpg',
  },
  {
    name: 'Gareth Sessel, MD, MS',
    role: 'Chief Growth and Product Officer | Physician-Engineer and AI specialist',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/gareth-sessel.jpg',
  },
  {
    name: 'Elijah Shirman, PhD',
    role: 'Scientist, Entrepreneur | Wyss Institute @ Harvard, Tufts Biomedical Eng',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/elijah-shirman.jpg',
  },
  {
    name: 'Marty Tenenbaum, PhD',
    role: 'AI Pioneer | Founder, Cancer Commons',
    image: 'https://navis.health/pitchAssets/marty.webp',
  },
  {
    name: 'David Thompson',
    role: 'Legal executive | Headway, ex-Included Health',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/david-thompson.jpg',
  },
  {
    name: 'Elizabeth A. Varga, MS, CGC',
    role: 'Director of Clinical Genomics R&D, Nationwide Children\'s Hospital',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/elizabeth-varga.jpg',
  },
  {
    name: 'Vidya Venkatesh',
    role: 'Product, Commercial Strategy in Oncology Dx | ex-GRAIL, Exact Sciences',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/vidya-venkatesh.jpg',
  },
  {
    name: 'Jane Wilkinson, PhD',
    role: 'Co-Founder & President CANCollaborate | (Fmr) Exec Dir @MIT Koch Institute',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/jane-wilkinson.jpg',
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
              Venture partners, physicians, scientists, and operators supporting CHL founders.
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
            <h2 className="text-xl font-bold text-slate-900 mb-4">Want to advise CHL founders?</h2>
            <a
              href="mailto:ari@opencancer.ai?subject=Advisor Interest"
              className="inline-flex items-center gap-2 bg-[#C66B4A] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#B35E40] transition-colors"
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
