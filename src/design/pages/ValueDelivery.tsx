import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { CheckItem } from '../components/CheckItem';
import { SectionHeading } from '../components';

/* ---------- 5-Second Test ---------- */
function FiveSecondTest() {
  const [phase, setPhase] = useState<'ready' | 'showing' | 'questions' | 'done'>('ready');
  const [countdown, setCountdown] = useState(5);
  const [answers, setAnswers] = useState({ does: '', forWhom: '', getWhat: '' });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTest = () => {
    setPhase('showing');
    setCountdown(5);
    setAnswers({ does: '', forWhom: '', getWhat: '' });
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('questions');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div>
      {phase === 'ready' && (
        <div className="text-center py-8">
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-body)' }}>
            A mock landing page will appear for 5 seconds. Study it, then answer 3 questions.
          </p>
          <button
            onClick={startTest}
            className="px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ backgroundColor: 'var(--p-orange)', color: '#fff' }}
          >
            Start 5-Second Test
          </button>
        </div>
      )}

      {phase === 'showing' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: 'var(--p-text-muted)' }}>Mock landing page</span>
            <span className="text-lg font-bold" style={{ color: 'var(--p-orange)' }}>{countdown}s</span>
          </div>
          <div className="rounded-xl p-6 space-y-4" style={{ backgroundColor: 'var(--p-surface-alt)', border: '1px solid var(--p-border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--p-green-light)' }}>
                <svg className="w-4 h-4" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <span className="text-lg font-semibold" style={{ color: 'var(--p-text)' }}>Navis</span>
            </div>
            <h3 className="text-2xl font-bold leading-tight" style={{ color: 'var(--p-text)' }}>
              Find out if you're missing critical cancer tests — in 2 minutes
            </h3>
            <p className="text-base" style={{ color: 'var(--p-text-body)' }}>
              For cancer patients and caregivers. Get a personalized checklist of recommended tests based on your diagnosis, stage, and treatment history.
            </p>
            <div className="flex gap-3">
              <div className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--p-orange)', color: '#fff' }}>
                Get Your Checklist
              </div>
              <div className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--p-text-muted)', border: '1px solid var(--p-border)' }}>
                See a Sample
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === 'questions' && (
        <div className="space-y-4">
          <p className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>Time's up! Answer from memory:</p>
          <div className="space-y-3">
            <div>
              <label className="text-sm block mb-1" style={{ color: 'var(--p-text-label)' }}>1. What does it do?</label>
              <input
                type="text"
                value={answers.does}
                onChange={(e) => setAnswers({ ...answers, does: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--p-input-bg)', border: '1px solid var(--p-border)', color: 'var(--p-text)' }}
              />
            </div>
            <div>
              <label className="text-sm block mb-1" style={{ color: 'var(--p-text-label)' }}>2. Who is it for?</label>
              <input
                type="text"
                value={answers.forWhom}
                onChange={(e) => setAnswers({ ...answers, forWhom: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--p-input-bg)', border: '1px solid var(--p-border)', color: 'var(--p-text)' }}
              />
            </div>
            <div>
              <label className="text-sm block mb-1" style={{ color: 'var(--p-text-label)' }}>3. What do you get?</label>
              <input
                type="text"
                value={answers.getWhat}
                onChange={(e) => setAnswers({ ...answers, getWhat: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--p-input-bg)', border: '1px solid var(--p-border)', color: 'var(--p-text)' }}
              />
            </div>
          </div>
          <button
            onClick={() => setPhase('done')}
            className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
            style={{ backgroundColor: 'var(--p-orange-light)', color: 'var(--p-orange)' }}
          >
            See Results
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--p-blue-light)', borderLeft: '3px solid var(--p-blue)' }}>
            <SectionHeading variant="info" className="mb-1">Principle</SectionHeading>
            <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>
              If users can answer all 3 questions correctly after 5 seconds, your first view is delivering instant value comprehension. If not, the landing page needs work.
            </p>
          </div>
          <div className="space-y-2">
            {[
              { label: 'What does it do?', answer: answers.does, expected: 'Finds missing cancer tests' },
              { label: 'Who is it for?', answer: answers.forWhom, expected: 'Cancer patients and caregivers' },
              { label: 'What do you get?', answer: answers.getWhat, expected: 'Personalized test checklist' },
            ].map((q) => (
              <div key={q.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--p-surface-alt)' }}>
                <div className="flex-1">
                  <p className="text-xs font-medium" style={{ color: 'var(--p-text-muted)' }}>{q.label}</p>
                  <p className="text-sm" style={{ color: 'var(--p-text)' }}>Your answer: {q.answer || '(blank)'}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--p-green-text)' }}>Target: {q.expected}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setPhase('ready')}
            className="text-xs underline cursor-pointer"
            style={{ color: 'var(--p-text-faint)' }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Reducing Time-to-Value Checklist ---------- */
const ttvStrategies = [
  'No signup required before experiencing value',
  'No upload required before showing initial results',
  'Minimal questions before delivering personalized output',
  'Pre-fill from context (UTM tells us cancer type from ad)',
  'Progressive loading: show partial results as they come',
  'Skeleton states that reveal content incrementally',
  'Alternative paths: "Don\'t have records? Start with diagnosis info"',
  'Sample results available without any input',
];

/* ---------- Audit Criteria ---------- */
const auditCriteria = [
  'Can user understand the value without signing up?',
  'Can user experience value in under 3 minutes?',
  'Is there a "no input" preview available?',
  'Are there alternative paths if the primary path has friction?',
  'Does the loading state show progress or intermediate value?',
  'Is the first result personalized (not generic)?',
  'Is the AHA moment clear and shareable?',
];

/* ---------- Main ---------- */
export default function PreviewValueDelivery() {
  const [ttvChecked, setTtvChecked] = useState<Record<number, boolean>>({});
  const [auditChecked, setAuditChecked] = useState<Record<number, boolean>>({});

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Value Delivery</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>
          Two phases: understanding value instantly and experiencing value in seconds. Every feature must pass both tests.
        </p>

        {/* Two Phases */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--p-green-light)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--p-text)' }}>Understanding Value</h3>
                <span className="text-xs font-medium" style={{ color: 'var(--p-green-text)' }}>Instant</span>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>
              The user must understand what they'll get within the FIRST VIEW — before scrolling, before clicking. The value is self-evident.
            </p>
          </div>
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--p-blue-light)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--p-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--p-text)' }}>Experiencing Value</h3>
                <span className="text-xs font-medium" style={{ color: 'var(--p-blue-text)' }}>Seconds to minutes</span>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>
              The user actually receives personalized, actionable output. Quick flow leads to personalized result. Always deliver quick value before requiring deep investment.
            </p>
          </div>
        </div>

        {/* Value Delivery Tiers */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="info" className="mb-1">Value Delivery Tiers</SectionHeading>
          <p className="text-sm mb-5" style={{ color: 'var(--p-text-muted)' }}>Target times for experiencing value, from excellent to acceptable.</p>
          <div className="space-y-3">
            {/* Excellent */}
            <div className="flex items-center gap-4">
              <div className="w-20 text-right">
                <span className="text-xs font-semibold" style={{ color: 'var(--p-green-text)' }}>&lt; 60s</span>
              </div>
              <div className="flex-1">
                <div className="rounded-lg py-3 px-4" style={{ backgroundColor: 'var(--p-green-light)', border: '1px solid var(--p-green)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--p-green-text)' }}>Excellent</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--p-text-body)' }}>Instant personalized result from just cancer type + stage</span>
                </div>
              </div>
            </div>
            {/* Good */}
            <div className="flex items-center gap-4">
              <div className="w-20 text-right">
                <span className="text-xs font-semibold" style={{ color: 'var(--p-blue-text)' }}>1-3 min</span>
              </div>
              <div style={{ flex: '0 0 75%' }}>
                <div className="rounded-lg py-3 px-4" style={{ backgroundColor: 'var(--p-blue-light)', border: '1px solid var(--p-blue)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--p-blue-text)' }}>Good</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--p-text-body)' }}>Quick wizard flow leads to personalized checklist</span>
                </div>
              </div>
            </div>
            {/* Acceptable */}
            <div className="flex items-center gap-4">
              <div className="w-20 text-right">
                <span className="text-xs font-semibold" style={{ color: 'var(--p-orange)' }}>3-5 min</span>
              </div>
              <div style={{ flex: '0 0 55%' }}>
                <div className="rounded-lg py-3 px-4" style={{ backgroundColor: 'var(--p-orange-light)', border: '1px solid var(--p-orange)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--p-orange)' }}>Acceptable</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--p-text-body)' }}>Upload + analysis with skeleton preview</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--p-text-faint)' }}>If value takes &gt; 5 minutes, show intermediate value earlier in the flow.</p>
        </div>

        {/* Value Delivery Patterns */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="info" className="mb-1">Value Delivery Patterns</SectionHeading>
          <p className="text-sm mb-5" style={{ color: 'var(--p-text-muted)' }}>Always deliver quick value BEFORE requiring deep investment. Don&rsquo;t gate everything behind upload.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--p-green-light)', border: '1px solid var(--p-green)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--p-green-text)' }}>Instant Value (No Input)</p>
              <ul className="space-y-1 text-xs" style={{ color: 'var(--p-text-body)' }}>
                <li>Show sample results for their cancer type on the landing page</li>
                <li>Display aggregate stats (&ldquo;35% of second opinions change treatment&rdquo;)</li>
                <li>Preview what they&rsquo;ll get: &ldquo;Here&rsquo;s what a checklist looks like&rdquo;</li>
              </ul>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--p-blue-light)', border: '1px solid var(--p-blue)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--p-blue-text)' }}>Quick Value (Minimal Input)</p>
              <ul className="space-y-1 text-xs" style={{ color: 'var(--p-text-body)' }}>
                <li>Cancer type &rarr; personalized test checklist (2 inputs, 30 seconds)</li>
                <li>Single question &rarr; AI answer (type and wait)</li>
                <li>Upload &rarr; immediate &ldquo;processing&rdquo; with partial results</li>
              </ul>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--p-orange-light)', border: '1px solid var(--p-orange)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--p-orange)' }}>Deep Value (Requires Investment)</p>
              <ul className="space-y-1 text-xs" style={{ color: 'var(--p-text-body)' }}>
                <li>Full record upload &rarr; comprehensive gap analysis</li>
                <li>Multi-step wizard &rarr; expert-reviewed report</li>
                <li>Profile completion &rarr; ongoing care monitoring</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 5-Second Test */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="info" className="mb-1">5-Second Test</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
            Show the landing page for 5 seconds. Can users tell you what it does, who it's for, and what they get?
          </p>
          <FiveSecondTest />
        </div>

        {/* Reducing Time-to-Value */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="success" className="mb-1">Reducing Time-to-Value</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>Strategies for removing friction and showing value sooner.</p>
          <div className="space-y-2">
            {ttvStrategies.map((item, i) => {
              const isChecked = !!ttvChecked[i];
              return (
                <CheckItem key={i} checked={isChecked} onChange={() => setTtvChecked((prev) => ({ ...prev, [i]: !prev[i] }))}>
                  {item}
                </CheckItem>
              );
            })}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>
            {Object.values(ttvChecked).filter(Boolean).length} / {ttvStrategies.length} checked
          </p>
        </div>

        {/* Audit Criteria */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-1">Audit Criteria</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>For any feature, check these 7 points before shipping.</p>
          <div className="space-y-2">
            {auditCriteria.map((item, i) => {
              const isChecked = !!auditChecked[i];
              return (
                <CheckItem key={i} checked={isChecked} onChange={() => setAuditChecked((prev) => ({ ...prev, [i]: !prev[i] }))}>
                  {item}
                </CheckItem>
              );
            })}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>
            {Object.values(auditChecked).filter(Boolean).length} / {auditCriteria.length} checked
          </p>
        </div>
      </div>
    </div>
  );
}
