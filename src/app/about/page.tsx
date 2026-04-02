import Link from 'next/link'
import { ArrowLeft, Users, PenLine } from 'lucide-react'

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 px-8 py-16">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to opencancer.ai
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start gap-8 mb-12">
          <img
            src="/ari.png"
            alt="Ari Akerstein"
            className="w-32 h-32 rounded-2xl object-cover shadow-lg ring-2 ring-violet-200"
          />
          <div>
            <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">Ari Akerstein</h1>
            <p className="text-xl text-slate-600 mb-4">Building tools for people who don't have time to waste.</p>
            <div className="flex gap-4">
              <a href="https://linkedin.com/in/ariakerstein" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-violet-600 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="https://x.com/aakerstein" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-violet-600 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://github.com/ariakerstein" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-violet-600 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="https://www.ariakerstein.com/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-violet-600 transition-colors" title="Field Notes">
                <PenLine className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Short Bio */}
        <p className="text-slate-600 text-lg leading-relaxed mb-12">
          Product leader. Cancer survivor. Dad. Previously at Meta, Included Health, Walmart Labs.
        </p>

        {/* Chemolog - Combined with cancer story */}
        <div className="bg-white border-2 border-violet-200 rounded-2xl p-6 mb-12">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <img
              src="/chemologLogo.png"
              alt="Chemolog"
              className="w-36 h-36 object-contain"
            />
            <div className="text-center sm:text-left">
              <h3 className="font-bold text-slate-900 text-xl mb-2">Chemolog</h3>
              <p className="text-slate-600 mb-4">
                In 2018, as a new dad, I battled a blood cancer. I PM'd my own treatment and wrote about it. That experience changed everything.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href="https://www.ariakerstein.com/p/chemolog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors"
                >
                  Read online →
                </a>
                <a
                  href="/Chemolog-ebook.pdf"
                  download
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-300 hover:border-violet-400 text-slate-700 hover:text-violet-600 font-medium rounded-lg transition-colors"
                >
                  Download PDF
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Why opencancer.ai */}
        <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <Users className="w-6 h-6 text-violet-500" />
            Why opencancer.ai?
          </h2>
          <div className="space-y-4 text-slate-600">
            <p>
              After my diagnosis, I spent hundreds of hours translating medical jargon, researching treatments, and figuring out the right questions to ask.
            </p>
            <p>
              Most patients don't have that time. <span className="font-semibold text-slate-900">opencancer.ai is the toolkit I wish I had.</span> It translates your records to plain English, finds clinical trials you'd miss, and helps you ask the questions that matter. All free. All open source.
            </p>
          </div>
        </div>

        {/* What I Believe */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Some Things I Believe</h2>
          <ul className="space-y-3 text-slate-600 text-sm">
            <li className="flex gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span><span className="font-semibold text-slate-900">Pull over push.</span> Enthusiasm matters a lot. Energy is the critical ingredient, both for your own productivity and to motivate teams.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span><span className="font-semibold text-slate-900">Retirement and financial freedom are related but different.</span> The dream is to have work and play converge. Childish curiosity and maturity are not in opposition!</span>
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span><span className="font-semibold text-slate-900">Things that compound are virtuous.</span> Momentum needs focus. Full immersion gets the flywheel revving. The week is probably the right atomic unit; a week is 2% of the year.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span><span className="font-semibold text-slate-900">Speed matters.</span> Artificial deadlines avoid extraneous nonsense. Bumping against reality is the best corrective to self-delusion. Do it often.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span><span className="font-semibold text-slate-900">Ripple and learn, quickly.</span> The world will give you signal. Take that signal. Ripple again with the new knowledge.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span><span className="font-semibold text-slate-900">Do not shave spikes.</span> Kids and adults spike in interesting ways. Nurture those, especially in children.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span><span className="font-semibold text-slate-900">Sin is mostly opportunity cost.</span> Our actions ripple through the universe. What kind of ripples are we putting out there?</span>
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span><span className="font-semibold text-slate-900">The things that matter most come from immersion.</span> To bring back fire you must have first gone to get it.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span><span className="font-semibold text-slate-900">We are information.</span> While alive, and more importantly after we're gone. What kind of information would you like others to carry about you?</span>
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span><span className="font-semibold text-slate-900">You'll never feel ready to have kids.</span> But your parents and grandparents were probably less ready than you. Just do it!</span>
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span><span className="font-semibold text-slate-900">Rebel against bloat.</span> Empower great individuals and smaller teams to do great work.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span><span className="font-semibold text-slate-900">Earn your dopamine.</span> Push for breakthroughs and challenges and hard work.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span><span className="font-semibold text-slate-900">Create new blueprints.</span> The laws of physics are the only limit. What invisible beliefs are holding you back?</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-slate-500 mb-6">Questions? Feedback? Let's talk.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:ari@opencancer.ai"
              className="inline-block bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:scale-105"
            >
              Email Me
            </a>
            <a
              href="https://linkedin.com/in/ariakerstein"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-slate-300 hover:border-violet-400 text-slate-700 hover:text-violet-600 font-semibold px-6 py-3 rounded-xl transition-all"
            >
              Connect on LinkedIn
            </a>
          </div>
        </div>

      </div>
    </main>
  )
}
