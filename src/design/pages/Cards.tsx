import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FeatureCard, StatusCard, SectionHeading } from '../components';

export default function PreviewCards() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Cards</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>White surface, whisper-soft shadows, rounded-2xl.</p>

        {/* Standard Card */}
        <SectionHeading className="mb-3">Standard Card</SectionHeading>
        <div className="rounded-2xl shadow-sm p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Find missing tests</h3>
          <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--p-text-body)' }}>
            See which NCCN-recommended tests your plan may be missing, specific to your cancer type and stage.
          </p>
          <button className="rounded-lg px-6 py-3 font-semibold min-h-[44px] transition-colors duration-[50ms]" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--p-orange-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--p-orange)'}>
            Get Your Checklist
          </button>
        </div>

        {/* Feature Card (Compact) */}
        <SectionHeading className="mb-3">Feature Card (Compact)</SectionHeading>
        <div className="space-y-3 mb-8">
          {[
            { icon: '🔬', title: 'Clinical Trials', desc: 'Trials within 50 miles matching your biomarkers' },
            { icon: '📋', title: 'Test Checklist', desc: 'NCCN-recommended tests for your diagnosis' },
            { icon: '💬', title: 'Ask a Question', desc: 'Get answers specific to your cancer type' },
          ].map((item) => (
            <FeatureCard
              key={item.title}
              icon={item.icon}
              title={item.title}
              description={item.desc}
            />
          ))}
        </div>

        {/* Action Card */}
        <SectionHeading className="mb-3">Action Card</SectionHeading>
        <div className="rounded-2xl shadow-sm p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xl font-semibold" style={{ color: 'var(--p-text)' }}>Prep for your appointment</h3>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-blue-bg)', color: 'var(--p-badge-blue-text)' }}>5 min</span>
          </div>
          <p className="text-base mb-4" style={{ color: 'var(--p-text-body)' }}>
            Get 5 specific questions for your oncologist, based on your diagnosis and treatment stage.
          </p>
          <button className="rounded-lg px-6 py-3 font-semibold min-h-[44px] transition-colors duration-[50ms]" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--p-orange-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--p-orange)'}>
            Start Prep
          </button>
        </div>

        {/* Status Card */}
        <SectionHeading className="mb-3">Status Card</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <StatusCard
            title="Missing Tests"
            subtitle="BRCA, HER2, Oncotype DX"
            status="error"
            statusLabel="3 gaps found"
          />
          <StatusCard
            title="Appointments"
            subtitle="Next: Dr. Smith, April 10"
            status="success"
            statusLabel="All clear"
          />
        </div>

        {/* Sheet-Based Cards */}
        <SectionHeading className="mb-3">Sheet-Based Card</SectionHeading>
        <div className="rounded-2xl shadow-sm p-6 mb-4" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-body)' }}>
            Cards that expand into a bottom sheet on mobile. The card IS the trigger — orange accent on the action element only.
          </p>
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--p-text-muted)' }}>
            Props: <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--p-surface-alt)', color: 'var(--p-text)' }}>open</code>{' '}
            <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--p-surface-alt)', color: 'var(--p-text)' }}>onOpenChange</code>{' '}
            <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--p-surface-alt)', color: 'var(--p-text)' }}>hideTrigger</code>
          </p>

          {/* Component list */}
          <div className="space-y-2 mb-6">
            {[
              { name: 'TrialsMatchCard', path: '@/components/trials/', desc: 'NCI clinical trial matching' },
              { name: 'ResearchMatchCard', path: '@/components/research/', desc: 'PubMed literature search' },
              { name: 'ConnectChartCard', path: '@/components/chart/', desc: 'Flexpa chart connection' },
              { name: 'FinancialNavigatorCard', path: '@/components/financial/', desc: 'Financial assistance finder' },
            ].map((card) => (
              <div key={card.name} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--p-surface-alt)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>{card.name}</p>
                  <p className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{card.desc}</p>
                </div>
                <code className="text-xs" style={{ color: 'var(--p-text-faint)' }}>{card.path}</code>
              </div>
            ))}
          </div>

          {/* Interactive trigger-to-sheet demo */}
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--p-text-muted)' }}>Trigger-to-sheet pattern</p>
          <div className="relative">
            {/* Trigger card */}
            <div
              className="rounded-2xl shadow-sm p-4 flex items-center gap-4 cursor-pointer transition-colors duration-[50ms]"
              style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
              onClick={() => setSheetOpen(true)}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--p-surface-alt)', color: 'var(--p-text-muted)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>Clinical Trials</p>
                <p className="text-xs" style={{ color: 'var(--p-text-muted)' }}>Tap to find matching trials</p>
              </div>
              <svg className="w-5 h-5" style={{ color: 'var(--p-orange)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>

            {/* Sheet overlay (simulated) */}
            {sheetOpen && (
              <div className="mt-3 rounded-2xl shadow-lg overflow-hidden" style={{ border: '1px solid var(--p-border)' }}>
                <div className="flex justify-center pt-3 pb-1" style={{ backgroundColor: 'var(--p-surface)' }}>
                  <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--p-border)' }} />
                </div>
                <div className="p-6" style={{ backgroundColor: 'var(--p-surface)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--p-text)' }}>Clinical Trials</h3>
                    <button
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--p-surface-alt)', color: 'var(--p-text-muted)' }}
                      onClick={() => setSheetOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <p className="text-sm mb-4" style={{ color: 'var(--p-text-body)' }}>Sheet content goes here. Full feature UI loads when the card trigger is tapped.</p>
                  <button className="rounded-lg px-6 py-3 font-semibold min-h-[44px] transition-colors duration-[50ms]" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }}>
                    Find Matching Trials
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>Click the card above to see the sheet expand. In production, sheets slide up as a bottom drawer on mobile.</p>
        </div>

        <div className="mb-8" />

        {/* Rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-dont-bg)', border: '1px solid var(--p-dont-border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--p-dont-text)' }}>DON'T</h3>
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--p-orange-light)', border: '1px solid var(--p-orange)' }}>
              <p className="text-sm" style={{ color: 'var(--p-red-text)' }}>Orange card background</p>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--p-red-text)' }}>Cards should be white, not colored</p>
          </div>
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-do-bg)', border: '1px solid var(--p-do-border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--p-do-text)' }}>DO</h3>
            <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
              <p className="text-sm" style={{ color: 'var(--p-green-text)' }}>White card with subtle shadow</p>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--p-green-text)' }}>Clean, elevated surface</p>
          </div>
        </div>
      </div>
    </div>
  );
}
