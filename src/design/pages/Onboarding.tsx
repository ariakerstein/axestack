import { Link } from 'react-router-dom';
import { useState } from 'react';
import { SectionHeading } from '../components';

const checklistItems = [
  { id: 'profile', label: 'Complete your profile', desc: 'Cancer type and stage' },
  { id: 'upload', label: 'Upload your first record', desc: 'Lab results, pathology, or imaging' },
  { id: 'ask', label: 'Ask your first question', desc: 'Get answers specific to your diagnosis' },
  { id: 'invite', label: 'Invite a caregiver', desc: 'Share results with your care circle' },
];

const timelinePoints = [
  { label: 'Cancer type', when: 'First interaction', position: 0 },
  { label: 'Stage', when: 'Showing checklist', position: 1 },
  { label: 'Treatment status', when: 'Showing questions', position: 2 },
  { label: 'Email', when: 'After showing value', position: 3 },
  { label: 'Name', when: 'At signup', position: 4 },
  { label: 'Caregiver info', when: 'After first value', position: 5 },
];

export default function PreviewOnboarding() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Onboarding</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>
          Value in seconds. Experience value before creating an account.
        </p>

        {/* ── Activation Timeline ── */}
        <SectionHeading className="mb-3">Activation Timeline</SectionHeading>
        <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
          What "activated" means per profile, and the time target to get there.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { profile: 'Newly Diagnosed', activation: 'Sees personalized test checklist', time: '< 2 min' },
            { profile: 'Treatment-Stage', activation: 'Gets answer to a specific question', time: '< 3 min' },
            { profile: 'Recurrent', activation: 'Sees matched clinical trials', time: '< 3 min' },
            { profile: 'Caregiver', activation: 'Shares a result with care circle', time: '< 5 min' },
          ].map((item) => (
            <div
              key={item.profile}
              className="rounded-2xl p-4"
              style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
            >
              <div className="text-sm font-semibold mb-2" style={{ color: 'var(--p-text)' }}>{item.profile}</div>
              <div className="text-xs mb-3" style={{ color: 'var(--p-text-body)' }}>{item.activation}</div>
              <div
                className="inline-block rounded-full px-4 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--p-surface-alt)', color: 'var(--p-text-muted)', border: '1px solid var(--p-border)' }}
              >
                {item.time}
              </div>
            </div>
          ))}
        </div>

        {/* ── Getting Started Checklist ── */}
        <SectionHeading className="mb-3">Getting Started Checklist</SectionHeading>
        <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
          Click items to check them off. Persistent on home page until all complete.
        </p>

        <div
          className="rounded-2xl p-5 mb-8 mx-auto"
          style={{
            backgroundColor: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
            maxWidth: 480,
          }}
        >
          {/* Progress header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>Getting started</div>
            <div className="text-xs font-medium" style={{ color: 'var(--p-text-muted)' }}>
              {completed.size} of {checklistItems.length} complete
            </div>
          </div>

          {/* Progress bar — always green, never orange */}
          <div className="h-2 rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'var(--p-surface-alt)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(completed.size / checklistItems.length) * 100}%`,
                backgroundColor: 'var(--p-green)',
              }}
            />
          </div>

          {/* Items */}
          <div className="space-y-1">
            {checklistItems.map((item) => {
              const done = completed.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className="w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all duration-[50ms] cursor-pointer min-h-[44px]"
                  style={{
                    backgroundColor: done ? 'var(--p-green-light)' : 'var(--p-surface-alt)',
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{
                      backgroundColor: done ? 'var(--p-green)' : 'transparent',
                      border: done ? 'none' : '2px solid var(--p-border-strong)',
                    }}
                  >
                    {done && (
                      <svg className="w-3.5 h-3.5" style={{ color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium transition-all duration-200"
                      style={{
                        color: done ? 'var(--p-green-text)' : 'var(--p-text)',
                        textDecoration: done ? 'line-through' : 'none',
                      }}
                    >
                      {item.label}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* All done message */}
          {completed.size === checklistItems.length && (
            <div className="mt-4 text-center rounded-xl py-3" style={{ backgroundColor: 'var(--p-green-light)' }}>
              <div className="text-sm font-semibold" style={{ color: 'var(--p-green-text)' }}>
                All done! You're set up.
              </div>
            </div>
          )}
        </div>

        {/* ── Progressive Profile Building ── */}
        <SectionHeading className="mb-3">Progressive Profile Building</SectionHeading>
        <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
          Don't ask for everything at signup. Collect data as it becomes relevant.
        </p>

        <div className="rounded-2xl p-5 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          {/* Timeline line */}
          <div className="relative">
            {/* Horizontal line */}
            <div
              className="absolute top-3 left-3 right-3 h-px"
              style={{ backgroundColor: 'var(--p-border)' }}
            />

            <div className="flex justify-between relative">
              {timelinePoints.map((point, i) => (
                <div key={point.label} className="flex flex-col items-center" style={{ width: `${100 / timelinePoints.length}%` }}>
                  {/* Dot */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center relative z-10"
                    style={{
                      backgroundColor: i === 0 ? 'var(--p-orange)' : 'var(--p-surface)',
                      border: `2px solid ${i === 0 ? 'var(--p-orange)' : 'var(--p-border-strong)'}`,
                    }}
                  >
                    {i === 0 && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'white' }} />
                    )}
                  </div>

                  {/* Label */}
                  <div className="mt-2 text-center">
                    <div className="text-xs font-semibold" style={{ color: 'var(--p-text)' }}>{point.label}</div>
                    <div className="text-xs mt-0.5 hidden sm:block" style={{ color: 'var(--p-text-faint)' }}>{point.when}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-6 pt-4" style={{ borderTop: '1px solid var(--p-border-subtle)' }}>
            <svg className="w-4 h-4" style={{ color: 'var(--p-orange)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="text-xs" style={{ color: 'var(--p-text-muted)' }}>
              Collect only what's needed NOW. Ask for more as context demands it.
            </span>
          </div>
        </div>

        {/* ── Value Preview Pattern ── */}
        <SectionHeading className="mb-3">Value Preview Pattern</SectionHeading>
        <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
          Before asking the user to do something, show them what they'll get. Partial reveal → "Get the full version by [action]".
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Before */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
            <SectionHeading className="mb-3">Before: Preview / Teaser</SectionHeading>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>Genetic testing (BRCA1/BRCA2)</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>HER2 status confirmation</span>
              </div>
              {/* Blurred items */}
              <div className="space-y-2" style={{ filter: 'blur(4px)', userSelect: 'none' }}>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--p-skeleton)' }} />
                  <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>Oncotype DX recurrence score</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--p-skeleton)' }} />
                  <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>MRI if dense breast tissue</span>
                </div>
              </div>
            </div>
            <div
              className="rounded-xl py-2.5 text-center text-sm font-medium"
              style={{
                backgroundColor: 'var(--p-surface-alt)',
                border: '1px solid var(--p-border)',
                color: 'var(--p-text-muted)',
              }}
            >
              Sign up to see full checklist
            </div>
          </div>

          {/* After */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-green)' }}>
            <SectionHeading className="mb-3">After: Full Result</SectionHeading>
            <div className="space-y-2 mb-4">
              {[
                'Genetic testing (BRCA1/BRCA2)',
                'HER2 status confirmation',
                'Oncotype DX recurrence score',
                'MRI if dense breast tissue',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--p-green-light)' }}>
                    <svg className="w-3 h-3" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>{item}</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-center" style={{ color: 'var(--p-green-text)' }}>
              Full checklist unlocked
            </div>
          </div>
        </div>

        {/* ── 6 Rules ── */}
        <SectionHeading className="mb-3">Rules</SectionHeading>
        <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: 'var(--p-text-body)' }}>
          <li><strong style={{ color: 'var(--p-text)' }}>Value before account.</strong> Never require signup to experience value.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>2-minute activation target.</strong> If it takes longer, simplify the flow.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>Progressive data collection.</strong> Ask only what's needed NOW.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>Preview what they'll get.</strong> Before every ask, show the reward.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>Checklist over tutorial.</strong> Actionable steps, not passive walkthrough.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>localStorage for partial progress.</strong> Never lose user data to a page refresh.</li>
        </ol>
      </div>
    </div>
  );
}
