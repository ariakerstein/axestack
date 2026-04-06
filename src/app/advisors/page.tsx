'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

interface Advisor {
  name: string
  role: string
  image: string
}

// Helper to generate avatar URL
function getAvatarUrl(name: string): string {
  const encoded = encodeURIComponent(name.split(',')[0].trim())
  return `https://ui-avatars.com/api/?name=${encoded}&background=64748b&color=fff&size=200&font-size=0.4`
}

// Full list matching CHL accelerator page - same order with working image URLs
const ADVISORS: Advisor[] = [
  {
    name: 'Ari Akerstein, MS',
    role: 'Co-Founder/CEO @CHL | Product Leader | Ex-Meta',
    image: '/team/ari.webp',
  },
  {
    name: 'Richard Anders, JD',
    role: 'Founder, MA Medical Angels | Harvard / MIT',
    image: '/team/richard.webp',
  },
  {
    name: 'Chris Apfel, MD, PhD, MBA',
    role: 'Founder & CEO, @SageMedic',
    image: '/team/chris.webp',
  },
  {
    name: 'Anne Aula',
    role: 'UX Leader | Ex-Google, Verily, One Medical',
    image: '/team/anne.webp',
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
    image: '/team/dan.webp',
  },
  {
    name: 'Kent Griffin',
    role: 'Product Executive | Ex-Paypal, Included Health, Doctor On Demand',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/5312b070-f7e0-4f20-b97a-f01c1b5cc28b/1702698399985.jpg',
  },
  {
    name: 'Eric Grossberg',
    role: 'Co-Founder/Executive Chairman | Brilliant Earth',
    image: '/team/eric.webp',
  },
  {
    name: 'Magnus Hillestadt',
    role: 'Co-founder and CEO @ Sanity.io',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/822cf456-df57-4960-8c0d-72eb59b60f26/Screenshot+2024-09-20+at+11.51.32%E2%80%AFAM.png',
  },
  {
    name: 'Anthony M. Magliocco, MD FRCPC FCAP',
    role: 'President & CEO, Protean BioDiagnostics',
    image: '/team/anthony.webp',
  },
  {
    name: 'Zoya Mohiuddin, MD',
    role: 'Clinical Affairs | Specialty Care & Patient Navigation',
    image: '/team/zoya.webp',
  },
  {
    name: 'Michael Meiners',
    role: 'Director, Enterprise/B2B Sales @AthenaHealth',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/faf0cf26-bf5c-415d-abd7-1c5aa38aac47/1700608757095.jpg',
  },
  {
    name: 'Brian Morton',
    role: 'Managing Partner @Morbak Consulting | Revenue Cycle | Clinical Ops | EMR',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/fc6254c9-83c7-46e0-a961-88255f825423/Screenshot+2024-09-30+at+3.41.45%E2%80%AFPM.png',
  },
  {
    name: 'Noah Nasser',
    role: 'Chief Executive Officer at dātma',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/e4cf88d2-e441-4741-a594-c0be954f1e9d/1646150805014.jpg',
  },
  {
    name: 'Laurel Nelson',
    role: 'Founder and CEO @ InnovexDx',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/ce580f78-0717-46ff-aa03-c8c9f44a8110/laurel.jpg',
  },
  {
    name: 'Freddy Nguyen, MD, PhD',
    role: 'Physician-Scientist Fellow @ MIT | CEO/Co-Founder Nine Diagnostics',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/68ca0a15-37cd-4a0f-9bcb-d2f63f006c60/Freddy_Nguyen_Headshot_V13.png',
  },
  {
    name: 'Frank Austin Nothaft, PhD',
    role: 'Founder/CEO @Translating Science PBC',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/3a8ab3f3-c0d6-4201-87b9-38b251534f44/1552363010923.jpg',
  },
  {
    name: 'Scott Petinga',
    role: 'Fortune 500 Brand Marketer | Healthcare Founder & Advocate',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/74b6256b-b027-44fa-8ab8-8b2a4e2a2e91/Screen+Shot+2020-10-24+at+1.57.51+PM.png',
  },
  {
    name: 'Brad Power',
    role: 'CEO CancerPatientLab | Co-Founder @CHL Accelerator',
    image: '/team/brad.webp',
  },
  {
    name: 'Aaron Rich',
    role: 'UX Research Leader | Project Starline @ Google',
    image: '/team/aaron.webp',
  },
  {
    name: 'Roger Royse',
    role: 'Corporate and Tax Partner at Haynes and Boone, LLP',
    image: '/team/roger.webp',
  },
  {
    name: 'Chris Schuler',
    role: 'VP Venture Partnerships, Varia Ventures | Patient Advocate',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/f4291153-a32f-43ae-ab82-fccf87f210f8/210428_Chris_Schuler_007.jpg',
  },
  {
    name: 'Gareth Sessel, MD, MS',
    role: 'Chief Growth and Product Officer | Physician-Engineer and AI specialist',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/3a1f5c91-316b-4771-b899-89ebd7818b6e/0-2.jpg',
  },
  {
    name: 'Elijah Shirman, PhD',
    role: 'Scientist, Entrepreneur | Wyss Institute @ Harvard, Tufts Biomedical Eng',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/fa921995-66ac-4e4c-99be-2e88fbf1ce1c/IMG_1581.jpg',
  },
  {
    name: 'Marty Tenenbaum, PhD',
    role: 'AI Pioneer | Founder, Cancer Commons',
    image: '/team/marty.webp',
  },
  {
    name: 'David Thompson',
    role: 'Legal executive | Headway, ex-Included Health',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/48145bbe-56c9-4964-a84e-a4836c2b1d6c/dt-headshot.jpg',
  },
  {
    name: 'Elizabeth A. Varga, MS, CGC',
    role: 'Director of Clinical Genomics R&D, Nationwide Children\'s Hospital',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/8ab6aaba-8603-487e-9b02-d49d096271f4/Liz.jpeg',
  },
  {
    name: 'Vidya Venkatesh',
    role: 'Product, Commercial Strategy in Oncology Dx | ex-GRAIL, Exact Sciences',
    image: 'https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/24d921eb-8d4e-45fe-84f2-c98ae1f381bf/Vidya_Venkatesh.jpg',
  },
  {
    name: 'Jane Wilkinson, PhD',
    role: 'Co-Founder & President CANCollaborate | (Fmr) Exec Dir @MIT Koch Institute',
    image: '/team/jane.webp',
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
                      src={advisor.image || getAvatarUrl(advisor.name)}
                      alt={advisor.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to ui-avatars if image fails
                        const target = e.target as HTMLImageElement
                        if (!target.src.includes('ui-avatars.com')) {
                          target.src = getAvatarUrl(advisor.name)
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
