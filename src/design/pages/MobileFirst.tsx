import { Link } from 'react-router-dom';
import { useState } from 'react';
import { SectionHeading } from '../components';

export default function PreviewMobileFirst() {
  const [expandedSection, setExpandedSection] = useState<string | null>('hero');

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Mobile-First Design</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>
          Design at 375px first. Scale up, never down. Most users are on mobile.
        </p>

        {/* ── Phone Frame ── */}
        <SectionHeading className="mb-3">Section Rhythm</SectionHeading>
        <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
          Every mobile screen follows: Headline → Objection handler → CTA → next section.
        </p>

        <div className="flex justify-center mb-8">
          <div
            className="rounded-[2rem] overflow-hidden relative"
            style={{
              width: 375,
              border: '3px solid var(--p-border-strong)',
              backgroundColor: 'var(--p-bg)',
            }}
          >
            {/* Status bar */}
            <div className="px-6 py-2 flex justify-between items-center" style={{ backgroundColor: 'var(--p-surface)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--p-text)' }}>9:41</span>
              <div className="flex gap-1 items-center">
                <div className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: 'var(--p-text)' }} />
              </div>
            </div>

            {/* Header */}
            <div className="px-4 py-3" style={{ backgroundColor: 'var(--p-surface)', borderBottom: '1px solid var(--p-border)' }}>
              <div className="text-sm font-bold" style={{ color: 'var(--p-text)' }}>navis.care</div>
            </div>

            {/* Section 1: Hero */}
            <div className="px-4 py-6" style={{ borderBottom: '1px solid var(--p-border-subtle)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--p-orange)' }}>
                Headline
              </div>
              <div className="text-xl font-semibold mb-2 leading-tight" style={{ color: 'var(--p-text)' }}>
                Know you're not missing anything
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1 mt-3" style={{ color: 'var(--p-blue-text)' }}>
                Objection handler
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--p-green-light)' }}>
                  <svg className="w-3 h-3" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>Board-certified oncologists</span>
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--p-green-text)' }}>
                CTA
              </div>
              <button
                className="w-full rounded-lg py-3 font-semibold text-sm min-h-[44px]"
                style={{ backgroundColor: 'var(--p-orange)', color: 'white' }}
              >
                Get Your Free Checklist
              </button>
            </div>

            {/* Section 2 */}
            <div className="px-4 py-6" style={{ borderBottom: '1px solid var(--p-border-subtle)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--p-orange)' }}>
                Headline
              </div>
              <div className="text-lg font-semibold mb-2" style={{ color: 'var(--p-text)' }}>
                How it works
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1 mt-2" style={{ color: 'var(--p-blue-text)' }}>
                Objection handler
              </div>
              <div className="text-sm mb-3" style={{ color: 'var(--p-text-body)' }}>
                Start in 2 minutes. No uploads required.
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--p-green-text)' }}>
                CTA
              </div>
              <button
                className="w-full rounded-lg py-3 font-semibold text-sm min-h-[44px]"
                style={{ backgroundColor: 'var(--p-surface-alt)', color: 'var(--p-text)', border: '1px solid var(--p-border)' }}
              >
                See How It Works
              </button>
            </div>

            {/* Section 3 */}
            <div className="px-4 py-6">
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--p-orange)' }}>
                Headline
              </div>
              <div className="text-lg font-semibold mb-2" style={{ color: 'var(--p-text)' }}>
                Trusted by 2,400+ patients
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1 mt-2" style={{ color: 'var(--p-blue-text)' }}>
                Objection handler
              </div>
              <div className="text-sm mb-3" style={{ color: 'var(--p-text-body)' }}>
                "Learned more in 30 min than 2 years with other doctors"
              </div>
            </div>
          </div>
        </div>

        {/* ── Section Anatomy ── */}
        <SectionHeading className="mb-3">Section Anatomy</SectionHeading>
        <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
          Click to expand. Every section addresses: user mindset, objection, handler, and CTA.
        </p>

        <div className="space-y-3 mb-8">
          {[
            {
              id: 'hero',
              title: 'Hero Section',
              mindset: 'Just diagnosed, scared. "Is this legit?"',
              objection: 'How do I know this is trustworthy?',
              handler: 'Trust badges, founder credentials, "board-certified oncologists"',
              cta: 'Get Your Free Checklist (full-width orange)',
            },
            {
              id: 'how',
              title: 'How It Works',
              mindset: 'Interested but skeptical. "Sounds too good — what\'s the catch?"',
              objection: 'This seems complicated or time-consuming.',
              handler: '"Start in 2 minutes, no uploads required"',
              cta: 'See How It Works (secondary)',
            },
            {
              id: 'social',
              title: 'Social Proof',
              mindset: 'Warming up. "Has this actually helped anyone like me?"',
              objection: 'No one I know has used this.',
              handler: 'Patient testimonials, specific outcomes, numbers',
              cta: 'Read Patient Stories',
            },
          ].map((section) => {
            const isOpen = expandedSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setExpandedSection(isOpen ? null : section.id)}
                className="w-full text-left rounded-2xl p-5 transition-all duration-[50ms] cursor-pointer"
                style={{
                  backgroundColor: 'var(--p-surface)',
                  border: `1px solid ${isOpen ? 'var(--p-orange)' : 'var(--p-border)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold" style={{ color: 'var(--p-text)' }}>{section.title}</span>
                  <svg
                    className="w-4 h-4 transition-transform duration-200"
                    style={{
                      color: 'var(--p-text-muted)',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {isOpen && (
                  <div className="mt-3 space-y-3">
                    {[
                      { label: 'User Mindset', value: section.mindset, color: 'var(--p-blue-text)' },
                      { label: 'Biggest Objection', value: section.objection, color: 'var(--p-red-text)' },
                      { label: 'Handler', value: section.handler, color: 'var(--p-green-text)' },
                      { label: 'CTA', value: section.cta, color: 'var(--p-orange)' },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: row.color }}>
                          {row.label}
                        </div>
                        <div className="text-sm mt-0.5" style={{ color: 'var(--p-text-body)' }}>{row.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Touch Target Checker ── */}
        <SectionHeading variant="danger" className="mb-3">Touch Target Checker</SectionHeading>
        <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
          44px minimum for ALL interactive elements. No exceptions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Correct */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-do-bg)', border: '1px solid var(--p-do-border)' }}>
            <SectionHeading variant="success" className="mb-3">Correct: 44px</SectionHeading>
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg px-6 font-semibold text-sm"
                style={{
                  backgroundColor: 'var(--p-orange)',
                  color: 'white',
                  minHeight: 44,
                  height: 44,
                }}
              >
                Get Started
              </button>
              <div className="flex items-center gap-1">
                <div style={{ height: 44, width: 1, backgroundColor: 'var(--p-green)' }} />
                <span className="text-xs font-mono" style={{ color: 'var(--p-green-text)' }}>44px</span>
              </div>
            </div>
          </div>

          {/* Incorrect */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-dont-bg)', border: '1px solid var(--p-dont-border)' }}>
            <SectionHeading variant="danger" className="mb-3">Too small: 28px</SectionHeading>
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg px-4 text-xs font-medium"
                style={{
                  backgroundColor: 'var(--p-orange)',
                  color: 'white',
                  minHeight: 28,
                  height: 28,
                }}
              >
                Get Started
              </button>
              <div className="flex items-center gap-1">
                <div style={{ height: 28, width: 1, backgroundColor: 'var(--p-red)' }} />
                <span className="text-xs font-mono" style={{ color: 'var(--p-red-text)' }}>28px</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content Priority Pyramid ── */}
        <SectionHeading variant="info" className="mb-3">Content Priority Pyramid</SectionHeading>
        <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
          On mobile, ruthlessly prioritize. Everything else: hide or remove.
        </p>

        <div className="flex flex-col items-center gap-2 mb-8">
          {[
            { label: '1. Primary CTA', desc: 'The ONE thing to do', width: '100%', bg: 'var(--p-orange)', text: 'white' },
            { label: '2. Value Proposition', desc: 'Why they should act', width: '80%', bg: 'var(--p-orange-light)', text: 'var(--p-orange)' },
            { label: '3. Trust Signal', desc: 'Why they should trust us', width: '60%', bg: 'var(--p-green-light)', text: 'var(--p-green-text)' },
            { label: '4. Supporting', desc: 'Details for those who need them', width: '40%', bg: 'var(--p-surface-alt)', text: 'var(--p-text-muted)' },
          ].map((layer, i) => (
            <div
              key={i}
              className="rounded-xl py-3 px-4 text-center"
              style={{ width: layer.width, backgroundColor: layer.bg, maxWidth: 480 }}
            >
              <div className="text-sm font-semibold" style={{ color: layer.text }}>{layer.label}</div>
              <div className="text-xs mt-0.5" style={{ color: layer.text, opacity: 0.8 }}>{layer.desc}</div>
            </div>
          ))}
          <div className="text-xs mt-1 italic" style={{ color: 'var(--p-text-faint)' }}>
            Everything else: hide behind "Show more" or remove
          </div>
        </div>

        {/* ── 8 Rules ── */}
        <SectionHeading className="mb-3">8 Mobile-First Rules</SectionHeading>
        <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: 'var(--p-text-body)' }}>
          <li><strong style={{ color: 'var(--p-text)' }}>Design at 375px first.</strong> Scale UP, never down.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>One CTA per viewport.</strong> Always visible without scrolling past it.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>Section = Headline + Objection + CTA.</strong> Rhythm that converts.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>44px touch targets.</strong> No tiny buttons or links.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>No horizontal scroll.</strong> Ever.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>Sheet over dialog.</strong> Bottom drawers are native mobile UX.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>Full-width buttons.</strong> Primary CTAs go edge-to-edge (with padding).</li>
          <li><strong style={{ color: 'var(--p-text)' }}>Test on real devices.</strong> Emulators lie about touch targets and safe areas.</li>
        </ol>
      </div>
    </div>
  );
}
