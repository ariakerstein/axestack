import Link from 'next/link'

export default function AboutPage() {
  return (
    <main className="min-h-screen px-8 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link href="/" className="text-teal-400 hover:underline text-sm mb-8 inline-block">
          ← Back to home
        </Link>

        {/* Header */}
        <div className="flex items-center gap-6 mb-8">
          <img
            src="/ari.png"
            alt="Ari Akerstein"
            className="w-40 h-40 rounded-full object-cover shadow-lg border-2 border-teal-400/30"
          />
          <div>
            <h1 className="text-3xl font-bold">Ari Akerstein</h1>
            <p className="text-slate-400">Building for the AI-enabled patient</p>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-6 text-slate-300">
          {/* Current focus */}
          <div className="bg-teal-500/10 border border-teal-500/30 p-4 rounded-xl">
            <p className="font-semibold text-teal-400 mb-1">Currently building</p>
            <p className="text-white">
              <a href="https://navis.health" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">
                Navis Health AI ↗
              </a>
              {' '}— AI-powered second opinions for cancer patients. Get NCI-level guidance in 24 hours, not 2 weeks.
            </p>
          </div>

          <p className="text-lg">
            I run <a href="https://www.cancerhackerlab.com/" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">Cancer Hacker Lab</a>, a healthtech accelerator helping founders build products for patients.
            This site exists to give those founders (and others) tools I wish I had — starting with pitch decks.
          </p>

          <p>
            I've spent 15 years building products at scale (Facebook, Walmart Labs, J&J) and in healthcare
            (Grand Rounds, where I led second opinions during the pandemic). I studied molecular biology
            before tech — that training shapes how I think about hard problems.
          </p>

          <p className="text-slate-400">
            Battled cancer in 2018 as a new dad. That experience made healthcare personal, not just professional.
          </p>

          <h2 className="text-xl font-semibold text-white pt-4">The thread</h2>

          <div className="space-y-3 text-sm text-slate-400">
            <p><span className="text-white">MS Molecular Biology</span> — SFSU/UCSF. Lab research before deciding academia wasn't my path.</p>
            <p><span className="text-white">Invented CoreWheels</span> — Fitness product on Amazon, inspired by gymnastic strength training.</p>
            <p><span className="text-white">Big tech product leadership</span> — Facebook, Walmart Labs, J&J. Built things that reached billions.</p>
            <p><span className="text-white">Healthcare product</span> — Grand Rounds/Included Health. Led virtual specialty care and second opinions.</p>
            <p><span className="text-white">Now: Cancer Hacker Lab + Navis</span> — Running the accelerator. Building Navis. Making tools for founders.</p>
          </div>

          <h2 className="text-xl font-semibold text-white pt-4">Things I believe</h2>

          <div className="bg-slate-800 p-6 rounded-xl space-y-4">
            <p><span className="text-teal-400 font-semibold">Speed matters.</span> Artificial deadlines cut extraneous nonsense. Bumping against reality is the best corrective to self-delusion. Do it often.</p>
            <p><span className="text-teal-400 font-semibold">Earn your dopamine.</span> Push for breakthroughs and hard work. The things that matter most come from immersion.</p>
            <p><span className="text-teal-400 font-semibold">Rebel against bloat.</span> You can tell when software was built by committee. Empower small teams to do great work.</p>
            <p><span className="text-teal-400 font-semibold">Ripple and learn.</span> Modify, get signal from the world, ripple again with new knowledge. Momentum compounds.</p>
          </div>

          <h2 className="text-xl font-semibold text-white pt-4">Why I built Prompt Deck</h2>

          <p>
            After creating 50+ pitch decks over my career, the same patterns kept emerging:
            founders burying the lede, vague answers, claiming "no competitors."
            Decks that take weeks to make get torn apart in meeting one.
          </p>

          <p>
            The 6 questions aren't random — they're forcing functions that separate fundable pitches
            from forgettable ones. If your answer is vague, the tool pushes back. Better here than from an investor.
          </p>

          <h2 className="text-xl font-semibold text-white pt-4">Connect</h2>

          <div className="flex gap-4">
            <a href="https://linkedin.com/in/ariakerstein" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">LinkedIn</a>
            <a href="https://x.com/aakerstein" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">X</a>
            <a href="https://github.com/ariakerstein" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">GitHub</a>
            <a href="https://www.seeingpatients.com/" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">Blog</a>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 pt-8 border-t border-slate-800 text-center">
          <p className="text-slate-400 mb-4">Ready to build your deck?</p>
          <Link
            href="/create"
            className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Create Your Deck
          </Link>
        </div>
      </div>
    </main>
  )
}
