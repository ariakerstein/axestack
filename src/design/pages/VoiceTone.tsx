import { Link } from 'react-router-dom';
import { useState } from 'react';
import { SectionHeading } from '../components';

const voiceAttributes = [
  {
    name: 'Empathetic',
    good: '"This is scary. Here\'s what you can do."',
    bad: '"Sorry for your diagnosis. We hope..."',
  },
  {
    name: 'Clear',
    good: '"3 tests may be missing"',
    bad: '"Our analysis suggests potential gaps"',
  },
  {
    name: 'Authoritative',
    good: '"NCCN guidelines recommend..."',
    bad: '"You might want to maybe consider..."',
  },
  {
    name: 'Action-oriented',
    good: '"Ask your oncologist about..."',
    bad: '"It\'s important to be aware of..."',
  },
];

const benefitsNotFeatures = [
  { dont: 'Upload records', do_: 'Find gaps in your care' },
  { dont: 'NCCN-recommended tests', do_: 'See what tests you may need' },
  { dont: 'AI-powered analysis', do_: 'Get answers in 24 hours' },
  { dont: 'Questions for your doctor', do_: 'Know exactly what to ask' },
  { dont: 'Clinical trial matching', do_: 'Find trials near you' },
  { dont: 'Care circle management', do_: 'Keep your family in the loop' },
];

const forbiddenLanguage = [
  { bad: 'Loved one (repeated / in-app)', replacement: 'Their actual name or "them" — see Loved One Rule below', why: 'Generic when you already know their name' },
  { bad: 'The patient', replacement: 'Their name or "you"', why: 'Dehumanizing' },
  { bad: 'Fight/battle/warrior', replacement: 'Your care journey', why: 'Not everyone identifies with combat metaphors' },
  { bad: 'We understand how you feel', replacement: 'We\'ve been there — here\'s what helped us', why: 'Founded by survivors, so empathy is authentic. But keep it specific, not generic.' },
  { bad: 'Don\'t worry', replacement: 'Here\'s what you can do', why: 'Dismissive of valid fear' },
  { bad: 'Just', replacement: 'Remove the word entirely', why: 'Minimizes difficulty' },
  { bad: 'Click here', replacement: 'Describe the action: "Get your checklist"', why: 'Non-descriptive' },
  { bad: 'Learn more', replacement: 'Specific: "See which tests you need"', why: 'Vague, passive' },
  { bad: 'Submit', replacement: '"Get My Results" / "Continue"', why: 'Cold, form-like' },
  { bad: 'AI (prominent)', replacement: '"Expert-backed" or just don\'t mention it', why: 'Creates distance' },
  { bad: 'Comprehensive/robust', replacement: 'Be specific about what\'s included', why: 'Marketing fluff' },
];

const toneContexts = [
  { id: 'error', label: 'Error', tone: 'Direct, solution-focused', example: 'Upload failed. Try a smaller file or different format.' },
  { id: 'success', label: 'Success', tone: 'Warm, brief', example: 'Record uploaded. We\'ll analyze it shortly.' },
  { id: 'onboarding', label: 'Onboarding', tone: 'Encouraging, simple', example: 'Let\'s start with your cancer type.' },
  { id: 'medical', label: 'Medical', tone: 'Clear, factual', example: 'NCCN recommends BRCA testing for all breast cancer patients.' },
  { id: 'empty', label: 'Empty state', tone: 'Helpful, action-oriented', example: 'No records yet. Upload your first to find care gaps.' },
  { id: 'payment', label: 'Payment', tone: 'Honest, anchored', example: 'What costs $4,000 elsewhere — $199 here.' },
];

export default function PreviewVoiceTone() {
  const [showGood, setShowGood] = useState<Record<string, boolean>>({});
  const [activeContext, setActiveContext] = useState('error');

  const toggleAttribute = (name: string) => {
    setShowGood((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const activeCtx = toneContexts.find((c) => c.id === activeContext)!;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Voice & Tone</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>
          A calm, knowledgeable guide. Not a chatbot. Not a doctor. Not a salesperson.
        </p>

        {/* Voice Attributes */}
        <section className="mb-10">
          <SectionHeading className="mb-4">Voice Attributes</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {voiceAttributes.map((attr) => {
              const isGood = showGood[attr.name] ?? true;
              return (
                <div
                  key={attr.name}
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold" style={{ color: 'var(--p-text)' }}>{attr.name}</h3>
                    <button
                      onClick={() => toggleAttribute(attr.name)}
                      className="text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-colors duration-100"
                      style={{
                        backgroundColor: isGood ? 'var(--p-do-bg)' : 'var(--p-dont-bg)',
                        color: isGood ? 'var(--p-do-text)' : 'var(--p-dont-text)',
                        border: `1px solid ${isGood ? 'var(--p-do-border)' : 'var(--p-dont-border)'}`,
                      }}
                    >
                      {isGood ? 'Good' : 'Bad'}
                    </button>
                  </div>
                  <p
                    className="text-sm italic"
                    style={{ color: isGood ? 'var(--p-green-text)' : 'var(--p-red-text)' }}
                  >
                    {isGood ? attr.good : attr.bad}
                  </p>
                  <p className="text-xs mt-2" style={{ color: 'var(--p-text-faint)' }}>
                    Click toggle to compare
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Benefits Not Features */}
        <section className="mb-10">
          <SectionHeading className="mb-4">Benefits, Not Features</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
            Every piece of copy frames what the USER gets, not what the PRODUCT does.
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--p-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--p-surface-alt)' }}>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>
                    Feature Copy (DON'T)
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>
                    Benefit Copy (DO)
                  </th>
                </tr>
              </thead>
              <tbody>
                {benefitsNotFeatures.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: i % 2 === 0 ? 'var(--p-surface)' : 'var(--p-surface-alt)',
                      borderTop: '1px solid var(--p-border-subtle)',
                    }}
                  >
                    <td className="px-5 py-3">
                      <span className="text-sm line-through" style={{ color: 'var(--p-red-text)' }}>{row.dont}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--p-green-text)' }}>{row.do_}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Forbidden Language */}
        <section className="mb-10">
          <SectionHeading variant="danger" className="mb-4">Forbidden Language</SectionHeading>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--p-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--p-surface-alt)' }}>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Never Say</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Say Instead</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Why</th>
                </tr>
              </thead>
              <tbody>
                {forbiddenLanguage.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: i % 2 === 0 ? 'var(--p-surface)' : 'var(--p-surface-alt)',
                      borderTop: '1px solid var(--p-border-subtle)',
                    }}
                  >
                    <td className="px-5 py-3">
                      <span className="text-sm line-through" style={{ color: 'var(--p-red-text)' }}>{row.bad}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--p-green-text)' }}>{row.replacement}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{row.why}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Loved One Rule */}
        <section className="mb-10">
          <SectionHeading className="mb-4">The &ldquo;Loved One&rdquo; Rule</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
            &ldquo;Loved one&rdquo; is how caregivers naturally describe the person they&rsquo;re caring for &mdash; it&rsquo;s identity language, not a euphemism.
            The real problem is lazy repetition and using it as a substitute for specificity.
          </p>
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--p-text)' }}>
            Prefer the patient&rsquo;s name when you have it. Use &ldquo;loved one&rdquo; sparingly in contexts where you don&rsquo;t.
          </p>
          <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid var(--p-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--p-surface-alt)' }}>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Context</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Use it?</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Why</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { context: 'Ads / SEO / first-visit copy', ok: true, why: 'Matches caregiver search intent, no name available yet' },
                  { context: 'Caregiver onboarding (pre-profile)', ok: true, why: 'Identity-affirming, builds trust before you have a name' },
                  { context: 'Caregiver onboarding (post-name)', ok: false, why: 'Now you have specificity — use their name' },
                  { context: 'In-app after profile exists', ok: false, why: 'You know who they\'re caring for' },
                  { context: 'Patient-facing copy', ok: false, why: 'Patients don\'t refer to themselves this way' },
                  { context: 'Overused on the same page', ok: false, why: 'If it starts feeling like a refrain, you\'ve overdone it' },
                ].map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: i % 2 === 0 ? 'var(--p-surface)' : 'var(--p-surface-alt)',
                      borderTop: '1px solid var(--p-border-subtle)',
                    }}
                  >
                    <td className="px-5 py-3">
                      <span className="text-sm" style={{ color: 'var(--p-text)' }}>{row.context}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium" style={{ color: row.ok ? 'var(--p-green-text)' : 'var(--p-red-text)' }}>
                        {row.ok ? 'Yes, sparingly' : 'No'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{row.why}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--p-surface-alt)', border: '1px solid var(--p-border-subtle)' }}
          >
            <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>
              <strong>Don&rsquo;t lean on it.</strong> A couple of natural uses on a page is fine. But if it starts feeling like a refrain, vary your language &mdash;
              &ldquo;them,&rdquo; &ldquo;they,&rdquo; the patient&rsquo;s name, or a natural alternative that fits the tone
              (e.g., &ldquo;someone you care about,&rdquo; &ldquo;the person you&rsquo;re supporting,&rdquo; &ldquo;your family member&rdquo;).
              Use your judgment to pick what reads best in context.
            </p>
          </div>
        </section>

        {/* Tone by Context */}
        <section className="mb-10">
          <SectionHeading variant="info" className="mb-4">Tone by Context</SectionHeading>
          <div className="flex flex-wrap gap-2 mb-4">
            {toneContexts.map((ctx) => (
              <button
                key={ctx.id}
                onClick={() => setActiveContext(ctx.id)}
                className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors duration-100"
                style={{
                  backgroundColor: activeContext === ctx.id ? 'var(--p-orange)' : 'var(--p-surface)',
                  color: activeContext === ctx.id ? '#fff' : 'var(--p-text-body)',
                  border: `1px solid ${activeContext === ctx.id ? 'var(--p-orange)' : 'var(--p-border)'}`,
                }}
              >
                {ctx.label}
              </button>
            ))}
          </div>
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
          >
            <SectionHeading className="mb-2">
              Tone: {activeCtx.tone}
            </SectionHeading>
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--p-surface-alt)', border: '1px solid var(--p-border-subtle)' }}
            >
              <p className="text-base" style={{ color: 'var(--p-text)' }}>{activeCtx.example}</p>
            </div>
          </div>
        </section>

        {/* Patient Name References */}
        <section className="mb-10">
          <SectionHeading className="mb-4">Patient Name References</SectionHeading>
          <ul className="space-y-3">
            {[
              { rule: 'Use their actual name when available', example: 'Sarah\u2019s care plan' },
              { rule: 'When name unknown', example: '\u201cyour\u201d (speaking to patient) or \u201cthem\u201d (speaking to caregiver)' },
              { rule: 'For caregiver view', example: '[Patient name]\u2019s records \u2014 not \u201cYour loved one\u2019s records\u201d' },
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl p-4"
                style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>{item.rule}:</span>
                <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>{item.example}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
