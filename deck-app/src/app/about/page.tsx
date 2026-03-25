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
            <p className="text-slate-400">Serial founder • Ex-Facebook PM</p>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-6 text-slate-300">
          <p className="text-lg">
            I've spent 15 years building products that reach millions of people — first at Facebook,
            then as a founder multiple times over.
          </p>

          <h2 className="text-xl font-semibold text-white pt-4">Background</h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-2 h-2 bg-teal-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-semibold text-white">Facebook (Meta)</p>
                <p className="text-sm text-slate-400">Product Manager, News Feed. Shipped features to 2B+ users.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-2 h-2 bg-teal-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-semibold text-white">Grand Rounds (acquired)</p>
                <p className="text-sm text-slate-400">Led the largest second opinion product in the US during the pandemic.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-2 h-2 bg-teal-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-semibold text-white">Multiple startups</p>
                <p className="text-sm text-slate-400">Founded and built companies in healthcare, consumer, and developer tools.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-2 h-2 bg-teal-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-semibold text-white">
                  <a href="https://www.cancerhackerlab.com/" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">
                    Cancer Hacker Lab ↗
                  </a>
                </p>
                <p className="text-sm text-slate-400">Founder in healthcare accelerator focused on cancer innovation.</p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white pt-4">Why I built this</h2>

          <p>
            I've created 50+ pitch decks over my career — for my own startups, for friends raising,
            and while advising early-stage founders. The same patterns kept emerging:
          </p>

          <ul className="list-disc list-inside space-y-2 text-slate-400">
            <li>Founders burying the lede with feature lists instead of problems</li>
            <li>Vague answers like "enterprises" instead of specific customers</li>
            <li>"We have no competitors" (instant credibility killer)</li>
            <li>Decks that take weeks to make, then get torn apart in the first meeting</li>
          </ul>

          <p>
            This tool codifies everything I've learned about what makes investors say yes.
            The 6 questions aren't random — they're the forcing functions that separate
            fundable pitches from forgettable ones.
          </p>

          <h2 className="text-xl font-semibold text-white pt-4">The philosophy</h2>

          <div className="bg-slate-800 p-6 rounded-xl space-y-3">
            <p><span className="text-teal-400 font-semibold">Premise before polish.</span> A beautiful deck with a weak premise loses. An ugly deck with a killer insight wins.</p>
            <p><span className="text-teal-400 font-semibold">Specificity over generality.</span> "Mike, a caregiver in Ohio" beats "healthcare customers."</p>
            <p><span className="text-teal-400 font-semibold">Pushback is caring.</span> If your answer is vague, the tool will tell you. Better to hear it here than from an investor.</p>
          </div>

          <h2 className="text-xl font-semibold text-white pt-4">Connect</h2>

          <div className="flex gap-4">
            <a
              href="https://linkedin.com/in/ariakerstein"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:underline"
            >
              LinkedIn
            </a>
            <a
              href="https://twitter.com/ariakerstein"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:underline"
            >
              Twitter
            </a>
            <a
              href="https://github.com/ariakerstein"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:underline"
            >
              GitHub
            </a>
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
