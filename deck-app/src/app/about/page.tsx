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
            <p className="text-slate-400">Building for the era of the AI-enabled patient</p>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-6 text-slate-300">
          <p className="text-lg">
            I've spent 15 years building products at scale (Facebook, Walmart Labs, J&J) and in healthcare
            (Grand Rounds, where I led second opinions during the pandemic). I studied molecular biology
            before tech. That training shapes how I think about hard problems.
          </p>

          <p>
            I run <a href="https://www.cancerhackerlab.com/" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">Cancer Hacker Lab</a>, a healthtech accelerator helping founders build products for patients.
            This site exists to give those founders (and others) tools I wish I had, starting with pitch decks.
          </p>

          <p>
            My other focus is <a href="https://navis.health" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">Navis Health</a>: AI-native second opinions for cancer patients. NCI-level guidance in minutes instead of weeks, at a fraction of the cost.
          </p>

          <p className="text-slate-400">
            Battled cancer in 2018 as a new dad. That made healthcare personal, not just professional.
          </p>

          <h2 className="text-xl font-semibold text-white pt-4">Things I believe</h2>

          <div className="bg-slate-800 p-6 rounded-xl space-y-4">
            <p><span className="text-teal-400 font-semibold">Speed matters.</span> Artificial deadlines cut extraneous nonsense. Bumping against reality is the best corrective to self-delusion. Do it often.</p>
            <p><span className="text-teal-400 font-semibold">Earn your dopamine.</span> Push for breakthroughs and hard work. The things that matter most come from immersion.</p>
            <p><span className="text-teal-400 font-semibold">Rebel against bloat.</span> You can tell when software was built by committee. Empower small teams to do great work.</p>
            <p><span className="text-teal-400 font-semibold">Ripple and learn.</span> Modify, get signal from the world, ripple again with new knowledge. Momentum compounds.</p>
            <p><span className="text-teal-400 font-semibold">Pull over push.</span> Enthusiasm matters. It's easier to do things you'd do even if you didn't need the money. Energy is the critical ingredient.</p>
            <p><span className="text-teal-400 font-semibold">Don't shave spikes.</span> People spike in interesting ways. Nurture those differences instead of smoothing them out.</p>
            <p><span className="text-teal-400 font-semibold">Create new blueprints.</span> What invisible limitations are holding you back? The laws of physics are the only real limit.</p>
          </div>

          <h2 className="text-xl font-semibold text-white pt-4">Why Prompt Deck?</h2>

          <p className="text-lg italic text-slate-400">
            "Everyone has a plan until they get punched in the mouth."
          </p>

          <p>
            We'll get you ready to enter the arena. Building a great pitch deck is much harder than it seems.
            You're using two parts of your brain at once: storytelling and visual design.
            There's a reason graphic novels have an author <em>and</em> an illustrator.
          </p>

          <p>
            Working with founders at Cancer Hacker Lab, I kept seeing the same struggles: burying the lede,
            vague answers, "we have no competitors." Weeks of work torn apart in meeting one.
          </p>

          <p>
            Prompt Deck handles the design so you can focus on the story. Answer 6 questions, get a deck
            that follows investor best practices, then iterate until it's pitch perfect.
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
