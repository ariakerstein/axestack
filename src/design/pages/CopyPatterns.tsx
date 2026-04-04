import { Link } from 'react-router-dom';
import { useState } from 'react';
import { SectionHeading } from '../components';

const frontloadExamples = [
  { bad: 'Our platform helps you find missing tests', good: 'Missing tests? Find them in 2 minutes', highlight: 'Missing tests?' },
  { bad: 'Click here to get started with your care', good: 'Get your checklist', highlight: 'Get your' },
  { bad: 'We\'ve analyzed your records and found...', good: '3 gaps found in your care plan', highlight: '3 gaps found' },
  { bad: 'Based on NCCN guidelines, you may need...', good: '2 tests recommended for your cancer type', highlight: '2 tests recommended' },
  { bad: 'Thank you for uploading your document', good: 'Record uploaded. Analyzing now.', highlight: 'Record uploaded.' },
];

const headlineFormulas = [
  {
    name: 'Problem \u2192 Promise',
    template: '[Scary stat/problem]. [What we do about it].',
    examples: [
      '84% of patients miss critical tests. See what YOU might be missing.',
      'Second opinions cost $4,000. Yours is $49.',
    ],
  },
  {
    name: 'Stat \u2192 Question',
    template: '[Specific number]. [Question that creates curiosity].',
    examples: [
      '1 in 3 patients had treatment changes after a second opinion. Will you?',
      '35% of second opinions lead to treatment changes. What about yours?',
    ],
  },
  {
    name: 'Before \u2192 After',
    template: '[Current painful state] \u2192 [Better state with us].',
    examples: [
      'Waiting 2 weeks for answers \u2192 Get yours in 24 hours',
      'Drowning in medical jargon \u2192 Plain language you understand',
    ],
  },
  {
    name: 'Identity \u2192 Action',
    template: '[Who you are] \u2192 [What you do].',
    examples: [
      'You\'re taking control of your care. Start here.',
      'Caregivers who don\'t miss anything use this.',
    ],
  },
];

const primaryCTAs = [
  'Get Your Free Checklist',
  'See What Tests You Need',
  'Find Clinical Trials Near You',
  'Start Your Second Look',
  'Upload Your Records',
  'Prep for Your Appointment',
];

const neverCTAs = [
  { text: 'Submit', why: 'cold' },
  { text: 'Click here', why: 'generic' },
  { text: 'Learn more', why: 'passive — be specific about what they\'ll learn' },
  { text: 'Sign up', why: 'delay until after value' },
  { text: 'Buy now', why: 'transactional — frame around what they GET' },
];

const cardExamples = [
  { headline: 'Find missing tests', body: 'See which NCCN-recommended tests your plan may be missing.', cta: 'Get Your Checklist' },
  { headline: 'Prep for your next appointment', body: '5 questions to ask your oncologist, specific to your diagnosis.', cta: 'Start Prep' },
  { headline: 'Match clinical trials', body: 'Trials within 50 miles that match your cancer type and biomarkers.', cta: 'Find Trials' },
];

const archetypeCopy = [
  { profile: 'Newly Diagnosed', headline: 'Reassuring + specific', cta: '"Get your [specific thing]"', tone: 'Calm, grounding' },
  { profile: 'Treatment-Stage', headline: 'Practical + time-bounded', cta: '"Prep for [specific event]"', tone: 'Efficient, empowering' },
  { profile: 'Recurrent / Advanced', headline: 'Possibility + novel', cta: '"Find [new options]"', tone: 'Hopeful, thorough' },
  { profile: 'Caregiver', headline: 'Action + sharing', cta: '"Share with [name/doctor]"', tone: 'Supportive, organized' },
];

export default function PreviewCopyPatterns() {
  const [activeFormula, setActiveFormula] = useState(0);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Copy Patterns</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>
          Patterns for headlines, CTAs, cards, and per-archetype copy. Frontload everything.
        </p>

        {/* Frontloading */}
        <section className="mb-10">
          <SectionHeading className="mb-2">Rule #1: Frontload</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
            People scan, they don't read. The first 2-3 words of every element must carry the meaning.
          </p>
          <div className="space-y-3">
            {frontloadExamples.map((ex, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--p-dont-bg)', border: '1px solid var(--p-dont-border)' }}
                >
                  <SectionHeading variant="danger" className="mb-1">Bad (buried lead)</SectionHeading>
                  <p className="text-sm" style={{ color: 'var(--p-dont-text)' }}>{ex.bad}</p>
                </div>
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--p-do-bg)', border: '1px solid var(--p-do-border)' }}
                >
                  <SectionHeading variant="success" className="mb-1">Good (frontloaded)</SectionHeading>
                  <p className="text-sm" style={{ color: 'var(--p-do-text)' }}>
                    <strong>{ex.highlight}</strong>{ex.good.replace(ex.highlight, '')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Headline Formulas */}
        <section className="mb-10">
          <SectionHeading className="mb-4">Headline Formulas</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {headlineFormulas.map((f, i) => (
              <button
                key={i}
                onClick={() => setActiveFormula(i)}
                className="rounded-xl p-3 text-left cursor-pointer transition-all duration-100"
                style={{
                  backgroundColor: activeFormula === i ? 'var(--p-orange-light)' : 'var(--p-surface)',
                  border: `2px solid ${activeFormula === i ? 'var(--p-orange)' : 'var(--p-border)'}`,
                }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>{f.name}</p>
              </button>
            ))}
          </div>
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
          >
            <SectionHeading className="mb-1">Template</SectionHeading>
            <p className="text-sm font-mono mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--p-surface-alt)', color: 'var(--p-text-body)' }}>
              {headlineFormulas[activeFormula].template}
            </p>
            <SectionHeading className="mb-2">Examples</SectionHeading>
            <div className="space-y-2">
              {headlineFormulas[activeFormula].examples.map((ex, i) => (
                <div key={i} className="rounded-xl p-4" style={{ backgroundColor: 'var(--p-surface-alt)', border: '1px solid var(--p-border-subtle)' }}>
                  <p className="text-base font-semibold" style={{ color: 'var(--p-text)' }}>{ex}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Patterns */}
        <section className="mb-10">
          <SectionHeading className="mb-4">CTA Patterns</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Primary CTAs */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
            >
              <SectionHeading variant="success" className="mb-3">Primary CTAs (verb-first)</SectionHeading>
              <div className="space-y-2">
                {primaryCTAs.map((cta, i) => (
                  <div key={i}>
                    <button
                      className="px-4 py-2 rounded-xl text-sm font-semibold cursor-default"
                      style={{ backgroundColor: 'var(--p-orange)', color: '#fff' }}
                    >
                      {cta}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Never CTAs */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
            >
              <SectionHeading variant="danger" className="mb-3">Never Use</SectionHeading>
              <div className="space-y-3">
                {neverCTAs.map((cta, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-sm line-through font-medium" style={{ color: 'var(--p-red-text)' }}>{cta.text}</span>
                    <span className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{cta.why}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Card Copy Pattern */}
        <section className="mb-10">
          <SectionHeading className="mb-2">Card Copy Pattern</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
            Headline (5-8 words) + One sentence (what they get) + CTA button.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cardExamples.map((card, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 flex flex-col"
                style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
              >
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--p-text)' }}>{card.headline}</h3>
                <p className="text-sm mb-4 flex-1" style={{ color: 'var(--p-text-body)' }}>{card.body}</p>
                <button
                  className="px-4 py-2 rounded-xl text-sm font-semibold cursor-default self-start"
                  style={{ backgroundColor: 'var(--p-orange)', color: '#fff' }}
                >
                  {card.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Error & Empty State Copy */}
        <section className="mb-10">
          <SectionHeading className="mb-2">Error & Empty State Copy</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
            Errors are direct and solution-focused. Empty states are action-oriented. Every empty state MUST have a CTA — never a dead end.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Error Messages */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: 'var(--p-do-bg)', border: '1px solid var(--p-do-border)' }}
            >
              <SectionHeading variant="success" className="mb-3">Good Error Messages</SectionHeading>
              <div className="space-y-3">
                {[
                  'Upload failed. Try a smaller file (max 25MB) or PDF format.',
                  'Connection lost. Your data is saved \u2014 try again.',
                  'Something went wrong. [Try again] or [contact support].',
                ].map((msg, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--p-do-bg)', border: '1px solid var(--p-do-border)' }}>
                    <p className="text-sm" style={{ color: 'var(--p-do-text)' }}>{msg}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Bad Error Messages */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: 'var(--p-dont-bg)', border: '1px solid var(--p-dont-border)' }}
            >
              <SectionHeading variant="danger" className="mb-3">Bad Error Messages</SectionHeading>
              <div className="space-y-3">
                {[
                  'Error 500: Internal server error.',
                  'Something went wrong.',
                  'An unexpected error has occurred. Please try again later.',
                ].map((msg, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--p-dont-bg)', border: '1px solid var(--p-dont-border)' }}>
                    <p className="text-sm" style={{ color: 'var(--p-dont-text)' }}>{msg}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Empty States */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: 'var(--p-do-bg)', border: '1px solid var(--p-do-border)' }}
            >
              <SectionHeading variant="success" className="mb-3">Good Empty States (with CTA)</SectionHeading>
              <div className="space-y-3">
                {[
                  { text: 'No records yet. Upload your first to find care gaps.', cta: 'Upload Record' },
                  { text: 'No trials matched. Update your profile for better matches.', cta: 'Update Profile' },
                  { text: 'No questions asked yet.', cta: 'Ask: "What tests do I need?"' },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--p-do-bg)', border: '1px solid var(--p-do-border)' }}>
                    <p className="text-sm mb-2" style={{ color: 'var(--p-do-text)' }}>{item.text}</p>
                    <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'var(--p-orange)', color: '#fff' }}>{item.cta}</span>
                  </div>
                ))}
              </div>
            </div>
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: 'var(--p-dont-bg)', border: '1px solid var(--p-dont-border)' }}
            >
              <SectionHeading variant="danger" className="mb-3">Bad Empty States (dead ends)</SectionHeading>
              <div className="space-y-3">
                {[
                  'No records found.',
                  'Nothing to show here.',
                  'Your list is empty.',
                ].map((msg, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--p-dont-bg)', border: '1px solid var(--p-dont-border)' }}>
                    <p className="text-sm" style={{ color: 'var(--p-dont-text)' }}>{msg}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Inverted Pyramid */}
        <section className="mb-10">
          <SectionHeading className="mb-2">Inverted Pyramid</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
            Structure all content with most important information first. Never start with "how it works" or background context. Start with the payoff.
          </p>
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
          >
            <div className="flex flex-col items-center gap-0">
              {[
                { level: '1', label: 'What they get', detail: 'Benefit / outcome', width: '100%', bg: 'var(--p-orange)', color: '#fff' },
                { level: '2', label: 'How it works', detail: '1-2 sentences', width: '75%', bg: 'var(--p-orange-light)', color: 'var(--p-orange)' },
                { level: '3', label: 'Why it\'s credible', detail: 'Trust signal', width: '55%', bg: 'var(--p-surface-alt)', color: 'var(--p-text)' },
                { level: '4', label: 'Details', detail: 'Behind "Show more"', width: '38%', bg: 'var(--p-surface-alt)', color: 'var(--p-text-muted)' },
              ].map((row) => (
                <div
                  key={row.level}
                  className="py-3 px-4 text-center rounded-lg mb-1"
                  style={{ width: row.width, backgroundColor: row.bg, color: row.color }}
                >
                  <p className="text-sm font-semibold">{row.level}. {row.label}</p>
                  <p className="text-xs opacity-80">{row.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Per-Archetype */}
        <section className="mb-10">
          <SectionHeading variant="info" className="mb-4">Per-Archetype Copy Reference</SectionHeading>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--p-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--p-surface-alt)' }}>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Profile</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Headline Style</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>CTA Style</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Tone</th>
                </tr>
              </thead>
              <tbody>
                {archetypeCopy.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: i % 2 === 0 ? 'var(--p-surface)' : 'var(--p-surface-alt)',
                      borderTop: '1px solid var(--p-border-subtle)',
                    }}
                  >
                    <td className="px-5 py-3">
                      <span className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>{row.profile}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>{row.headline}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-mono" style={{ color: 'var(--p-text-body)' }}>{row.cta}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm" style={{ color: 'var(--p-text-muted)' }}>{row.tone}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
