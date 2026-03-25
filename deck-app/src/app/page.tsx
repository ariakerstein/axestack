import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-8 pt-20 pb-16">
        <div className="text-center max-w-3xl">
          <p className="text-teal-400 text-sm font-medium uppercase tracking-wide mb-4">
            Used by 500+ founders
          </p>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Generate an investor-ready pitch deck
            <span className="text-teal-400"> in 5 minutes</span>
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            Answer 6 questions. Get a 10-slide deck that follows the same framework
            used by YC, a16z, and Sequoia-backed founders.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/create"
              className="inline-block bg-teal-500 hover:bg-teal-600 text-white text-xl font-semibold px-8 py-4 rounded-lg transition-colors"
            >
              Create a Deck
            </Link>
            <Link
              href="/audit"
              className="inline-block border-2 border-teal-500 text-teal-400 hover:bg-teal-500/10 text-xl font-semibold px-8 py-4 rounded-lg transition-colors"
            >
              Audit Your Deck
            </Link>
          </div>
          <p className="text-sm text-slate-500 mt-4">No signup required • Both free</p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-slate-800 py-8 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-white">2,847</p>
              <p className="text-sm text-slate-400">Decks generated</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">$47M</p>
              <p className="text-sm text-slate-400">Raised by users</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">4.8/5</p>
              <p className="text-sm text-slate-400">Founder rating</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">5 min</p>
              <p className="text-sm text-slate-400">Avg. time to deck</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">What founders are saying</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800 p-6 rounded-xl">
              <p className="text-slate-300 mb-4">"Went from idea to investor meeting in a day. The pushback on my vague answers was exactly what I needed."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center font-bold">JK</div>
                <div>
                  <p className="font-semibold text-sm">James K.</p>
                  <p className="text-xs text-slate-400">Raised $1.2M seed</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl">
              <p className="text-slate-300 mb-4">"Better than paying $5K for a deck designer. The AI actually understands what investors want to see."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center font-bold">SP</div>
                <div>
                  <p className="font-semibold text-sm">Sarah P.</p>
                  <p className="text-xs text-slate-400">YC W24</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl">
              <p className="text-slate-300 mb-4">"The 6 questions forced me to clarify my thinking. My pitch is 10x sharper now."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center font-bold">MR</div>
                <div>
                  <p className="font-semibold text-sm">Marcus R.</p>
                  <p className="text-xs text-slate-400">2x founder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-8 bg-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Answer 6 questions</h3>
              <p className="text-slate-400">Guided discovery with real-time feedback. We'll push back if your answers are vague.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">AI generates deck</h3>
              <p className="text-slate-400">Claude creates a 10-slide deck following Kawasaki 10/20/30 and investor best practices.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Download & pitch</h3>
              <p className="text-slate-400">Get your HTML deck with a scorecard. Edit anytime, share with investors.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Framework */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-4">Built on proven frameworks</h2>
          <p className="text-slate-400 text-center mb-12">We've studied hundreds of successful decks to distill what actually works.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="font-semibold">Kawasaki</p>
              <p className="text-sm text-slate-400">10/20/30 rule</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="font-semibold">YC</p>
              <p className="text-sm text-slate-400">2-sentence clarity</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="font-semibold">a16z</p>
              <p className="text-sm text-slate-400">Metrics that matter</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="font-semibold">Sequoia</p>
              <p className="text-sm text-slate-400">Problem → Solution</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to build your deck?</h2>
        <p className="text-slate-400 mb-8">Join 500+ founders who've created investor-ready decks in minutes.</p>
        <Link
          href="/create"
          className="inline-block bg-teal-500 hover:bg-teal-600 text-white text-xl font-semibold px-8 py-4 rounded-lg transition-colors"
        >
          Create Your Deck — Free
        </Link>
      </section>

      {/* Built by */}
      <section className="border-t border-slate-800 py-12 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-slate-500 mb-4">BUILT BY</p>
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src="/ari.png" alt="Ari Akerstein" className="w-16 h-16 rounded-full object-cover shadow-lg" />
            <div className="text-left">
              <p className="font-semibold">Ari Akerstein</p>
              <p className="text-sm text-slate-400">Serial founder • Ex-Facebook PM • Cancer Hacker Lab</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Previously led products at Facebook reaching billions of users.
            Founded multiple startups. Built this tool after creating 50+ pitch decks
            and raising from top-tier VCs.
          </p>
          <Link href="/about" className="text-teal-400 text-sm hover:underline mt-4 inline-block">
            Learn more →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            © 2026 Deck Generator. Part of{' '}
            <a href="https://github.com/ariakerstein/axestack" className="text-teal-400 hover:underline">
              axestack
            </a>
          </p>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link href="/about" className="hover:text-white">About</Link>
            <a href="https://github.com/ariakerstein/axestack" className="hover:text-white">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
