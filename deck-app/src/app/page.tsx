import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Hero */}
      <div className="text-center max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Generate an investor-ready pitch deck
          <span className="text-teal-400"> in 5 minutes</span>
        </h1>
        <p className="text-xl text-slate-400 mb-12">
          Answer 6 questions. Get a 10-slide deck. No design skills needed.
        </p>
        <Link
          href="/create"
          className="inline-block bg-teal-500 hover:bg-teal-600 text-white text-xl font-semibold px-8 py-4 rounded-lg transition-colors"
        >
          Create Your Deck
        </Link>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-4xl">
        <div className="bg-slate-800 p-6 rounded-xl">
          <div className="text-3xl mb-4">AI</div>
          <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
          <p className="text-slate-400">Claude generates your deck from your answers. No templates to fill.</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl">
          <div className="text-3xl mb-4">10</div>
          <h3 className="text-xl font-semibold mb-2">Kawasaki 10/20/30</h3>
          <p className="text-slate-400">10 slides, 30pt fonts, investor-ready structure.</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl">
          <div className="text-3xl mb-4">{"</>"}</div>
          <h3 className="text-xl font-semibold mb-2">Export HTML</h3>
          <p className="text-slate-400">Download your deck as HTML. Edit in any code editor.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-24 text-slate-500 text-sm">
        Built with <a href="https://github.com/ariakerstein/axestack" className="text-teal-400 hover:underline">axestack</a>
      </footer>
    </main>
  )
}
