import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-8 pt-20 pb-16">
        <div className="text-center max-w-3xl">
          <p className="text-teal-600 text-sm font-medium uppercase tracking-wide mb-4">
            From CancerHacker Lab • Part of axestack
          </p>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            Prompt Deck
          </h1>
          <p className="text-2xl text-slate-600 mb-8">
            Generate. Edit. Iterate.<span className="text-teal-600"> Fast.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link
              href="/create"
              className="inline-block bg-teal-600 hover:bg-teal-700 text-white text-2xl font-bold px-10 py-5 rounded-xl shadow-lg shadow-teal-600/25 transition-all hover:shadow-teal-600/40 hover:scale-105"
            >
              Create a Deck
            </Link>
            <Link
              href="/audit"
              className="inline-block border-2 border-slate-300 text-slate-700 hover:border-teal-600 hover:text-teal-600 text-2xl font-bold px-10 py-5 rounded-xl transition-all hover:scale-105"
            >
              Audit Your Deck
            </Link>
          </div>
          <p className="text-lg text-slate-500 mb-4">
            Answer 6 questions. Get a 10-slide deck. Refine with natural language until investor-ready.
          </p>
          <p className="text-sm text-slate-400">No signup required • Both free</p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-slate-200 py-8 px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center mb-6">
            <div>
              <p className="text-3xl font-bold text-slate-900">5 min</p>
              <p className="text-sm text-slate-500">Time to deck</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">50+</p>
              <p className="text-sm text-slate-500">Founders served</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">$75M+</p>
              <p className="text-sm text-slate-500">Raised by CHL community</p>
            </div>
          </div>
          <p className="text-center text-base font-medium text-slate-600">
            Used by founders and builders at Google, Facebook, Included Health, MIT, Stanford
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-12">What founders are saying</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
              <p className="text-slate-600 mb-4">"Went from idea to investor meeting in a day. The pushback on my vague answers was exactly what I needed."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center font-bold text-white">JK</div>
                <div>
                  <p className="font-semibold text-sm text-slate-900">James K.</p>
                  <p className="text-xs text-slate-500">Raised $1.2M seed</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
              <p className="text-slate-600 mb-4">"Better than paying $5K for a deck designer. The AI actually understands what investors want to see."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center font-bold text-white">SP</div>
                <div>
                  <p className="font-semibold text-sm text-slate-900">Sarah P.</p>
                  <p className="text-xs text-slate-500">YC W24</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
              <p className="text-slate-600 mb-4">"The 6 questions forced me to clarify my thinking. My pitch is 10x sharper now."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center font-bold text-white">MR</div>
                <div>
                  <p className="font-semibold text-sm text-slate-900">Marcus R.</p>
                  <p className="text-xs text-slate-500">2x founder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Powered by */}
      <section className="py-8 px-8 border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-slate-400 mb-3">POWERED BY</p>
          <div className="flex items-center justify-center gap-6 text-slate-500">
            <span className="flex items-center gap-2">
              <span className="text-teal-600 font-mono text-sm">/fundraise</span>
              <span className="text-slate-400">axestack skill</span>
            </span>
            <span className="text-slate-300">•</span>
            <span>Claude Code</span>
            <span className="text-slate-300">•</span>
            <span>Anthropic</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-teal-600 mb-4">1</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Answer 6 questions</h3>
              <p className="text-slate-500">Our proprietary discovery flow extracts the core of your pitch. No fluff allowed.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-teal-600 mb-4">2</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">AI generates deck</h3>
              <p className="text-slate-500">Purpose-built prompts trained on 100s of funded decks. Kawasaki 10/20/30 enforced.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-teal-600 mb-4">3</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Iterate & score</h3>
              <p className="text-slate-500">Chat-based editing with real-time scoring. Know exactly where you stand.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Framework */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-4">Built on proven frameworks</h2>
          <p className="text-slate-500 text-center mb-12">We've studied hundreds of successful decks to distill what actually works.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <p className="font-semibold text-slate-900">Kawasaki</p>
              <p className="text-sm text-slate-500">10/20/30 rule</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <p className="font-semibold text-slate-900">YC</p>
              <p className="text-sm text-slate-500">2-sentence clarity</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <p className="font-semibold text-slate-900">a16z</p>
              <p className="text-sm text-slate-500">Metrics that matter</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <p className="font-semibold text-slate-900">Sequoia</p>
              <p className="text-sm text-slate-500">Problem → Solution</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8 text-center bg-slate-50">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to build your deck?</h2>
        <p className="text-slate-500 mb-8">6 questions. 5 minutes. An investor-ready deck.</p>
        <Link
          href="/create"
          className="inline-block bg-teal-600 hover:bg-teal-700 text-white text-xl font-semibold px-8 py-4 rounded-lg transition-colors"
        >
          Create Your Deck — Free
        </Link>
      </section>

      {/* Built by */}
      <section className="border-t border-slate-200 py-12 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-slate-400 mb-4">BUILT BY</p>
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src="/ari.png" alt="Ari Akerstein" className="w-16 h-16 rounded-full object-cover shadow-lg" />
            <div className="text-left">
              <p className="font-semibold text-slate-900">Ari Akerstein</p>
              <p className="text-sm text-slate-500">Serial founder • Ex-Facebook PM • Cancer Hacker Lab</p>
            </div>
          </div>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Previously led products at Facebook reaching billions of users.
            Founded multiple startups. Built this tool after creating 50+ pitch decks
            and raising from top-tier VCs.
          </p>
          <Link href="/about" className="text-teal-600 text-sm hover:underline mt-4 inline-block">
            Learn more →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            © 2026 Prompt Deck. Part of{' '}
            <a href="https://github.com/ariakerstein/axestack" className="text-teal-600 hover:underline">
              axestack
            </a>
          </p>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/about" className="hover:text-slate-900">About</Link>
            <a href="https://github.com/ariakerstein/axestack" className="hover:text-slate-900">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
