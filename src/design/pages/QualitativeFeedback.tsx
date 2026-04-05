import { Link } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { SectionHeading, InlineFeedback } from '../components';

/* ---------- 1. Post-Action Micro-Survey ---------- */
function PostActionDemo() {
  const [uploaded, setUploaded] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleUpload = () => {
    setUploaded(true);
    setShowQuestion(false);
    setSubmitted(false);
    setAnswer('');
    setTimeout(() => setShowQuestion(true), 1200);
  };

  const reset = useCallback(() => {
    setUploaded(false);
    setShowQuestion(false);
    setSubmitted(false);
    setAnswer('');
  }, []);

  return (
    <div>
      {!uploaded ? (
        <button
          onClick={handleUpload}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-100"
          style={{ backgroundColor: 'var(--p-orange)', color: '#fff' }}
        >
          Upload Record
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--p-green-light)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <span className="text-sm font-medium" style={{ color: 'var(--p-green-text)' }}>Record uploaded successfully</span>
          </div>
          {showQuestion && !submitted && (
            <div
              className="p-4 rounded-xl space-y-3"
              style={{
                backgroundColor: 'var(--p-surface-alt)',
                border: '1px solid var(--p-border-subtle)',
                animation: 'fadeIn 0.4s ease',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>
                What almost prevented you from doing this?
              </p>
              <input
                type="text"
                autoFocus
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type here (optional)..."
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--p-input-bg)',
                  border: '1px solid var(--p-border)',
                  color: 'var(--p-text)',
                }}
              />
              <button
                onClick={() => setSubmitted(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer min-h-[44px]"
                style={{ backgroundColor: 'var(--p-orange)', color: '#fff' }}
              >
                Submit
              </button>
            </div>
          )}
          {submitted && (
            <p className="text-sm" style={{ color: 'var(--p-green-text)' }}>Thanks for your feedback.</p>
          )}
          <button onClick={reset} className="text-xs underline cursor-pointer" style={{ color: 'var(--p-text-faint)' }}>Reset demo</button>
        </div>
      )}
    </div>
  );
}

/* ---------- 2. Why Not Lower ---------- */
const SCALE_NAMES: Record<number, string> = { 1: '😰 Not ready', 5: '😐 Maybe', 10: '💪 Let\'s go' };
const WNL_QUESTION = 'How ready were you to upload your records?';

function WhyNotLowerDemo() {
  const [step, setStep] = useState<'score' | 'why' | 'done'>('score');
  const [value, setValue] = useState<number | null>(null);

  const handleSelect = (n: number) => {
    setValue(n);
    setStep('why');
  };

  const isLowest = value !== null && value <= 2;

  return (
    <div>
      {/* Step 1: Score */}
      {step === 'score' && (
        <div className="flex flex-col items-center text-center py-6 space-y-6">
          <p className="text-lg font-semibold" style={{ color: 'var(--p-text)' }}>{WNL_QUESTION}</p>
          <div className="w-full max-w-sm">
            <div className="grid grid-cols-5 sm:grid-cols-10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => handleSelect(n)}
                  className="py-3 text-sm font-semibold cursor-pointer transition-all duration-[50ms] min-h-[44px]"
                  style={{
                    backgroundColor: 'var(--p-surface)',
                    color: 'var(--p-text-body)',
                    border: '1px solid var(--p-border)',
                    marginLeft: n > 1 && n !== 6 ? '-1px' : '0',
                    marginTop: n > 5 ? '-1px' : '0',
                    borderRadius:
                      n === 1 ? '8px 0 0 0'
                      : n === 5 ? '0 8px 0 0'
                      : n === 6 ? '0 0 0 8px'
                      : n === 10 ? '0 0 8px 0'
                      : '0',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-2 px-0.5">
              {[1, 5, 10].map((n) => (
                <span key={n} className="text-xs" style={{ color: 'var(--p-text-faint)' }}>
                  {SCALE_NAMES[n]}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Follow-up */}
      {step === 'why' && value !== null && (
        <div className="flex flex-col items-center text-center py-6 space-y-4">
          <p className="text-lg font-semibold" style={{ color: 'var(--p-text)' }}>
            {isLowest
              ? 'What would make you more ready, like 7 or 8?'
              : `Why not significantly lower, like ${Math.max(1, value - 4)}?`
            }
          </p>
          <p className="text-xs italic" style={{ color: 'var(--p-text-muted)' }}>{WNL_QUESTION} {value}</p>
          <div className="w-full max-w-sm text-left">
            <InlineFeedback
              label=""
              placeholder="e.g. Because I trust the analysis will find something useful..."
              onSubmit={() => setStep('done')}
              autoFocus
            />
          </div>
          <button onClick={() => { setValue(null); setStep('score'); }} className="text-xs cursor-pointer" style={{ color: 'var(--p-text-faint)' }}>&larr; Change score</button>
        </div>
      )}

      {/* Step 3: Insight */}
      {step === 'done' && (
        <div className="flex flex-col items-center text-center py-6 space-y-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--p-green-light)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div className="w-full max-w-sm text-left p-4 rounded-xl" style={{ backgroundColor: 'var(--p-blue-light)', borderLeft: '3px solid var(--p-blue)' }}>
            <SectionHeading variant="info" className="mb-1">What this reveals</SectionHeading>
            <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>
              By asking "why not lower?" users defend their decision by articulating <strong style={{ color: 'var(--p-text)' }}>positive reasons</strong> for acting.
              This is far more useful than "why did you do it?" which gets rationalized answers.
            </p>
          </div>
          <button onClick={() => { setValue(null); setStep('score'); }} className="text-xs underline cursor-pointer" style={{ color: 'var(--p-text-faint)' }}>Reset demo</button>
        </div>
      )}
    </div>
  );
}

/* ---------- 3. Exit Intent ---------- */
function ExitIntentDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const options = [
    '🤔 I need to think about it',
    "📋 I don't have what I need right now",
    "❓ I'm not sure this is for me",
  ];

  return (
    <div className="space-y-3">
      {!submitted ? (
        <>
          <p className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>What's holding you back?</p>
          <div className="space-y-2">
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="exit"
                  checked={selected === opt}
                  onChange={() => setSelected(opt)}
                  className="accent-green-600 cursor-pointer"
                />
                <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>{opt}</span>
              </label>
            ))}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="exit"
                checked={selected === 'other'}
                onChange={() => setSelected('other')}
                className="accent-green-600 cursor-pointer"
              />
              <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>Something else</span>
            </label>
            {selected === 'other' && (
              <input
                type="text"
                autoFocus
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Tell us..."
                className="w-full rounded-lg px-3 py-3 text-sm outline-none min-h-[44px] ml-7 transition-all duration-[50ms]"
                style={{
                  backgroundColor: 'var(--p-input-bg)',
                  border: `2px solid ${otherText.trim() ? 'var(--p-green)' : 'var(--p-border)'}`,
                  color: 'var(--p-text)',
                }}
              />
            )}
          </div>
          <button
            onClick={() => selected && setSubmitted(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer min-h-[44px]"
            style={{
              backgroundColor: selected ? 'var(--p-orange)' : 'var(--p-surface-alt)',
              color: selected ? '#fff' : 'var(--p-text-faint)',
            }}
          >
            Submit
          </button>
        </>
      ) : (
        <>
          <p className="text-sm" style={{ color: 'var(--p-green-text)' }}>Thanks — we'll work on making this easier.</p>
          <button onClick={() => { setSelected(null); setOtherText(''); setSubmitted(false); }} className="text-xs underline cursor-pointer" style={{ color: 'var(--p-text-faint)' }}>Reset demo</button>
        </>
      )}
    </div>
  );
}

/* ---------- 4. CRE Objection Mining ---------- */
function CREDemo() {
  const [key, setKey] = useState(0);
  const [done, setDone] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--p-green-light)' }}>
        <svg className="w-5 h-5" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        <span className="text-sm font-medium" style={{ color: 'var(--p-green-text)' }}>Payment complete — Expert Review confirmed</span>
      </div>
      <InlineFeedback
        key={key}
        label="What was the #1 thing that almost stopped you from purchasing?"
        placeholder="e.g. I wasn't sure if it was worth $199..."
        thankYouMessage="Noted — your feedback shapes how we present value to others."
        onSubmit={() => setDone(true)}
        autoFocus
      />
      {done && <button onClick={() => { setKey(k => k + 1); setDone(false); }} className="text-xs underline cursor-pointer" style={{ color: 'var(--p-text-faint)' }}>Reset demo</button>}
    </div>
  );
}

/* ---------- 5. Thumbs Up/Down ---------- */
function ThumbsDemo() {
  const [state, setState] = useState<'idle' | 'up' | 'down'>('idle');
  const [done, setDone] = useState(false);
  const [key, setKey] = useState(0);

  const reset = () => { setState('idle'); setDone(false); setKey(k => k + 1); };

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>Was this result helpful?</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setState('up'); setDone(false); setKey(k => k + 1); }}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg cursor-pointer transition-all duration-100"
          style={{
            backgroundColor: state === 'up' ? 'var(--p-green-light)' : 'var(--p-surface-alt)',
            border: state === 'up' ? '2px solid var(--p-green)' : '1px solid var(--p-border)',
          }}
          title="Thumbs up"
        >
          <svg className="w-5 h-5" style={{ color: state === 'up' ? 'var(--p-green)' : 'var(--p-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" /></svg>
        </button>
        <button
          onClick={() => { setState('down'); setDone(false); setKey(k => k + 1); }}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg cursor-pointer transition-all duration-100"
          style={{
            backgroundColor: state === 'down' ? 'var(--p-red-light)' : 'var(--p-surface-alt)',
            border: state === 'down' ? '2px solid var(--p-red)' : '1px solid var(--p-border)',
          }}
          title="Thumbs down"
        >
          <svg className="w-5 h-5" style={{ color: state === 'down' ? 'var(--p-red)' : 'var(--p-text-muted)', transform: 'rotate(180deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" /></svg>
        </button>
      </div>
      {state === 'up' && (
        <>
          <p className="text-sm" style={{ color: 'var(--p-green-text)' }}>Thanks!</p>
          <InlineFeedback
            key={`up-${key}`}
            label="What almost held you back from trying this?"
            placeholder="e.g. I wasn't sure it would be specific to my case..."
            thankYouMessage="Thanks — this helps us understand what objections to address."
            onSubmit={() => setDone(true)}
          />
        </>
      )}
      {state === 'down' && (
        <InlineFeedback
          key={`down-${key}`}
          label="How could this be better?"
          placeholder="Tell us what to improve..."
          thankYouMessage="Thanks — we'll look into this."
          onSubmit={() => setDone(true)}
        />
      )}
      {done && <button onClick={reset} className="text-xs underline cursor-pointer" style={{ color: 'var(--p-text-faint)' }}>Reset demo</button>}
    </div>
  );
}

/* ---------- Placement Rules ---------- */
const doRules = [
  'Inline, below the action they just completed',
  'One question at a time',
  'Optional and never blocking the user',
  'Contextual to what they just did',
  'Styled as conversational (not "SURVEY" header)',
];

const dontRules = [
  'Popup modals that interrupt the flow',
  'Long multi-question surveys',
  'Feedback competing with the primary CTA',
  'Asking before they have experienced value',
  'Asking every session (rate-limit: once per key action per user)',
];

/* ---------- When to Collect ---------- */
const whenToCollect = [
  { moment: 'After wizard completion', question: '"What almost stopped you?"', technique: 'Post-action micro-survey (#1)' },
  { moment: 'After first value delivery', question: '"What surprised you?"', technique: 'Post-action micro-survey (#1)' },
  { moment: 'After payment', question: '"What almost prevented you?"', technique: 'CRE objection mining (#4)' },
  { moment: 'At drop-off', question: '"What\'s holding you back?"', technique: 'Exit intent (#3)' },
  { moment: 'After sharing', question: '"Why did you share this?"', technique: 'Post-action micro-survey (#1)' },
  { moment: 'After 7 days active', question: 'Readiness scale + "why not lower?"', technique: 'Technique #2' },
];

/* ---------- Main Component ---------- */
export default function PreviewQualitativeFeedback() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Qualitative Feedback</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>
          Five collection techniques — each shown as an interactive demo. Quantitative tells you WHAT happened. Qualitative tells you WHY.
        </p>

        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        {/* 1. Post-Action Micro-Survey */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="info" className="mb-1">1. Post-Action Micro-Survey</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>One question, immediately after a state change. Inline, not popup. Feels conversational.</p>
          <PostActionDemo />
        </div>

        {/* 2. Why Not Lower */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="info" className="mb-1">2. The "Why Not Lower?" Technique</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>Forces users to articulate positive reasons for acting by asking why they didn't rate lower.</p>
          <WhyNotLowerDemo />
        </div>

        {/* 3. Exit Intent */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="info" className="mb-1">3. Exit Intent</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>When a user appears to be leaving or pauses for 30+ seconds. One question, not a survey.</p>
          <ExitIntentDemo />
        </div>

        {/* 4. CRE Objection Mining */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="info" className="mb-1">4. CRE Objection Mining</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>After conversion, ask ONE question. The answers become your objection-handling copy.</p>
          <CREDemo />
        </div>

        {/* 5. Thumbs Up/Down */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="info" className="mb-1">5. Thumbs Up/Down + Context</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>Thumbs down = "How could this be better?" Thumbs up = optional "What almost held you back?" to mine objections from satisfied users.</p>
          <ThumbsDemo />
        </div>

        {/* Placement Rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-do-bg)', border: '1px solid var(--p-do-border)' }}>
            <SectionHeading variant="success" className="mb-3">DO</SectionHeading>
            <ul className="space-y-2">
              {doRules.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm" style={{ color: 'var(--p-text-body)' }}>
                  <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-dont-bg)', border: '1px solid var(--p-dont-border)' }}>
            <SectionHeading variant="danger" className="mb-3">DON'T</SectionHeading>
            <ul className="space-y-2">
              {dontRules.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm" style={{ color: 'var(--p-text-body)' }}>
                  <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--p-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* When to Collect Table */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="info" className="mb-1">When to Collect</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>Map every key moment to a question and technique.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--p-border)' }}>
                  <th className="py-2 pr-4 font-semibold" style={{ color: 'var(--p-text)' }}>Moment</th>
                  <th className="py-2 pr-4 font-semibold" style={{ color: 'var(--p-text)' }}>Question</th>
                  <th className="py-2 font-semibold" style={{ color: 'var(--p-text)' }}>Technique</th>
                </tr>
              </thead>
              <tbody>
                {whenToCollect.map((row) => (
                  <tr key={row.moment} style={{ borderBottom: '1px solid var(--p-border-subtle)' }}>
                    <td className="py-3 pr-4 font-medium" style={{ color: 'var(--p-text)' }}>{row.moment}</td>
                    <td className="py-3 pr-4 italic" style={{ color: 'var(--p-text-body)' }}>{row.question}</td>
                    <td className="py-3 text-xs" style={{ color: 'var(--p-text-muted)' }}>{row.technique}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Implementation Pattern */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="info" className="mb-1">Implementation Pattern</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
            Lightweight inline feedback component. Store responses in the analytics_events table with context.
          </p>
          <div className="rounded-xl p-4 font-mono text-sm overflow-x-auto" style={{ backgroundColor: 'var(--p-surface-alt)', border: '1px solid var(--p-border-subtle)', color: 'var(--p-text-body)' }}>
            <pre style={{ margin: 0 }}>{`<MicroFeedback
  trigger="after_action"
  action="upload_record"
  question="What almost prevented you from uploading?"
  type="open_text"      // or "scale" or "multiple_choice"
  position="inline"     // not "modal"
  rateLimit="once_per_user_per_action"
/>`}</pre>
          </div>
          <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--p-surface-alt)', border: '1px solid var(--p-border-subtle)' }}>
            <SectionHeading className="mb-2">Storage Schema</SectionHeading>
            <div className="grid grid-cols-2 gap-2">
              {[
                { field: 'event_type', value: '"qualitative_feedback"' },
                { field: 'context', value: 'which action triggered it' },
                { field: 'question', value: 'the question asked' },
                { field: 'response', value: 'their answer' },
                { field: 'profile_type', value: 'which JTBD profile' },
              ].map((row) => (
                <div key={row.field} className="flex items-baseline gap-2">
                  <span className="font-mono text-xs font-semibold" style={{ color: 'var(--p-text)' }}>{row.field}</span>
                  <span className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Using the Data */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="info" className="mb-1">Using the Data</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
            Collected feedback flows back into design decisions. Every insight should update the system.
          </p>
          <div className="space-y-3">
            {[
              { action: 'Update objection-handling.md', detail: 'Add new objections discovered from "what almost stopped you?" responses' },
              { action: 'Update jtbd-profiles.md', detail: 'Replace assumptions with real user language from feedback' },
              { action: 'Feed into copy', detail: 'Use their exact words in headlines and CTAs for stronger resonance' },
              { action: 'Prioritize features', detail: 'Address the most common "what held you back" answers first' },
            ].map((item) => (
              <div
                key={item.action}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{ backgroundColor: 'var(--p-surface-alt)', border: '1px solid var(--p-border-subtle)' }}
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--p-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>{item.action}</p>
                  <p className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
