import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-8 pt-24 pb-16 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-teal-900/20 via-slate-950 to-slate-950" />

        <div className="relative text-center max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400">
              patientstack
            </span>
          </h1>

          <p className="text-2xl md:text-3xl text-slate-300 mb-4 font-light">
            Tools for the AI-enabled patient.
          </p>

          <p className="text-lg text-slate-500 mb-10 max-w-xl mx-auto">
            Tools to help you understand your diagnosis, prepare for appointments, and advocate for yourself.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <a
              href="https://navis.health"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-lg font-semibold px-8 py-4 rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-teal-500/25"
            >
              Try Navis Health
            </a>
            <Link
              href="/about"
              className="inline-block border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-lg font-semibold px-8 py-4 rounded-xl transition-all bg-slate-900/50"
            >
              About
            </Link>
          </div>

          <p className="text-sm text-slate-600">
            Built by a cancer survivor. Open source.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-12 px-8 border-y border-slate-800">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-slate-400">
            In 2018, I was diagnosed with cancer as a new dad. The medical system gave me data.
            What I needed was <span className="text-slate-300">clarity</span>.
          </p>
        </div>
      </section>

      {/* Tools */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">The Tools</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Navis */}
            <a href="https://navis.health" target="_blank" rel="noopener noreferrer" className="group bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-teal-500/50 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">🧬</span>
                <h3 className="text-lg font-semibold text-white group-hover:text-teal-400">/second-opinion</h3>
                <span className="text-xs text-teal-400">Live</span>
              </div>
              <p className="text-slate-400 text-sm">
                AI-powered second opinions for cancer patients. NCI-level guidance in minutes.
              </p>
            </a>

            {/* Journey */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">🗺️</span>
                <h3 className="text-lg font-semibold text-white">/journey</h3>
                <span className="text-xs text-slate-500">CLI</span>
              </div>
              <p className="text-slate-400 text-sm">
                Map your patient journey. Understand what's ahead, identify pain points.
              </p>
            </div>

            {/* Translate */}
            <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">📖</span>
                <h3 className="text-lg font-semibold text-white">/translate</h3>
                <span className="text-xs text-emerald-400">Coming</span>
              </div>
              <p className="text-slate-400 text-sm">
                Medical jargon → plain English. Understand your lab results and reports.
              </p>
            </div>

            {/* Advocate */}
            <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">💪</span>
                <h3 className="text-lg font-semibold text-white">/advocate</h3>
                <span className="text-xs text-emerald-400">Coming</span>
              </div>
              <p className="text-slate-400 text-sm">
                Prepare for appointments. Know what to ask. Don't leave confused.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-16 px-8 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Resources</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <a href="https://navis.health" target="_blank" rel="noopener noreferrer" className="group bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-teal-500/50 transition-all text-center">
              <span className="text-2xl block mb-2">🧬</span>
              <h3 className="font-semibold text-white group-hover:text-teal-400">Navis Health</h3>
              <p className="text-slate-500 text-sm">AI second opinions</p>
            </a>

            <a href="https://cancerhackerlab.com" target="_blank" rel="noopener noreferrer" className="group bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-fuchsia-500/50 transition-all text-center">
              <span className="text-2xl block mb-2">🔬</span>
              <h3 className="font-semibold text-white group-hover:text-fuchsia-400">Cancer Hacker Lab</h3>
              <p className="text-slate-500 text-sm">Healthtech accelerator</p>
            </a>

            <a href="https://ariakerstein.com/chemolog" target="_blank" rel="noopener noreferrer" className="group bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-orange-500/50 transition-all text-center">
              <span className="text-2xl block mb-2">📔</span>
              <h3 className="font-semibold text-white group-hover:text-orange-400">Chemolog</h3>
              <p className="text-slate-500 text-sm">My cancer journal</p>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-8 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-2xl text-slate-400 italic mb-4">
            "The best patient is an informed patient."
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <a
              href="https://navis.health"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:scale-105"
            >
              Get Started with Navis
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">patientstack</p>
            <p className="text-sm text-slate-500">Tools for the AI-enabled patient</p>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="https://navis.health" className="hover:text-white transition-colors">Navis</a>
            <a href="https://cancerhackerlab.com" className="hover:text-white transition-colors">CHL</a>
            <a href="https://axestack.vercel.app" className="hover:text-white transition-colors">axestack</a>
            <a href="https://ariakerstein.com" className="hover:text-white transition-colors">Blog</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
