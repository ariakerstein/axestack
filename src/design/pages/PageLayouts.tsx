import { Link } from 'react-router-dom';
import { useState } from 'react';
import { SectionHeading } from '../components';

type LayoutType = 'hub' | 'landing' | 'wizard' | 'detail';

const layoutMeta: Record<LayoutType, { title: string; desc: string }> = {
  hub: { title: 'Hub Layout', desc: 'Tabbed interface — the main app view (CareHub)' },
  landing: { title: 'Landing Page', desc: 'Full-width, conversion-focused. No app chrome.' },
  wizard: { title: 'Wizard / Funnel', desc: 'Step-by-step flow. One question per view.' },
  detail: { title: 'Detail / Record', desc: 'Viewing documents, results, or detailed content.' },
};

export default function PreviewPageLayouts() {
  const [activeLayout, setActiveLayout] = useState<LayoutType>('hub');

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Page Layouts</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>
          Four layout types power every page. Mobile is the primary viewport.
        </p>

        {/* ── Layout Selector ── */}
        <SectionHeading className="mb-3">Layout Types</SectionHeading>

        <div className="flex gap-1 rounded-xl p-1 mb-6" style={{ backgroundColor: 'var(--p-surface-alt)' }}>
          {(Object.keys(layoutMeta) as LayoutType[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveLayout(key)}
              className="flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-all duration-[50ms] cursor-pointer min-h-[44px]"
              style={{
                backgroundColor: activeLayout === key ? 'var(--p-surface)' : 'transparent',
                color: activeLayout === key ? 'var(--p-text)' : 'var(--p-text-muted)',
                boxShadow: activeLayout === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {layoutMeta[key].title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Layout title + description */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--p-text)' }}>
            {layoutMeta[activeLayout].title}
          </h3>
          <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>
            {layoutMeta[activeLayout].desc}
          </p>
        </div>

        {/* Wireframe */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
        >
          {activeLayout === 'hub' && <HubWireframe />}
          {activeLayout === 'landing' && <LandingWireframe />}
          {activeLayout === 'wizard' && <WizardWireframe />}
          {activeLayout === 'detail' && <DetailWireframe />}
        </div>

        {/* ── Responsive Breakpoints ── */}
        <SectionHeading variant="info" className="mb-3">Responsive Breakpoints</SectionHeading>
        <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
          Mobile is the primary viewport. Design mobile first, enhance for larger screens.
        </p>

        <div className="space-y-3 mb-8">
          {[
            {
              label: 'Mobile',
              range: '< 640px',
              desc: 'Single column, full-width cards, sticky CTA, sheet navigation',
              width: '33%',
              color: 'var(--p-orange)',
              bg: 'var(--p-orange-light)',
            },
            {
              label: 'Tablet',
              range: '640 - 1024px',
              desc: '2-column grids, side-by-side cards',
              width: '66%',
              color: 'var(--p-blue)',
              bg: 'var(--p-blue-light)',
            },
            {
              label: 'Desktop',
              range: '> 1024px',
              desc: 'Optional sidebar, wider content, dialog over sheet',
              width: '100%',
              color: 'var(--p-green)',
              bg: 'var(--p-green-light)',
            },
          ].map((bp) => (
            <div key={bp.label} className="flex items-start gap-4">
              <div className="w-24 flex-shrink-0">
                <div className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>{bp.label}</div>
                <div className="text-xs font-mono" style={{ color: 'var(--p-text-muted)' }}>{bp.range}</div>
              </div>
              <div className="flex-1">
                <div
                  className="h-6 rounded-lg mb-1"
                  style={{ width: bp.width, backgroundColor: bp.bg, border: `1px solid ${bp.color}` }}
                />
                <div className="text-xs" style={{ color: 'var(--p-text-body)' }}>{bp.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Section Pattern ── */}
        <SectionHeading className="mb-3">Section Pattern (Mobile)</SectionHeading>
        <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
          Every scrollable section follows this rhythm. Maps to PCP: Perception → Context → Permission.
        </p>

        <div className="flex flex-col items-center gap-0 mb-8">
          {[1, 2, 3].map((section) => (
            <div key={section} className="w-full max-w-sm">
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--p-border)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--p-text-faint)' }}>Section {section}</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--p-border)' }} />
              </div>
              {[
                { label: 'Headline', color: 'var(--p-orange)', desc: 'Frontloaded benefit' },
                { label: 'Objection', color: 'var(--p-blue)', desc: 'Address #1 concern' },
                { label: 'CTA', color: 'var(--p-green)', desc: 'Visible without scrolling' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3 py-1.5">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>{row.label}</span>
                  <span className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{row.desc}</span>
                </div>
              ))}
              {section < 3 && (
                <div className="flex justify-center py-1">
                  <svg className="w-4 h-4" style={{ color: 'var(--p-text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Rules ── */}
        <SectionHeading className="mb-3">Rules</SectionHeading>
        <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: 'var(--p-text-body)' }}>
          <li><strong style={{ color: 'var(--p-text)' }}>Max content width: 1024px</strong> (<code>max-w-5xl</code>). Don't stretch full-width.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>Page padding: <code>px-6 pt-10 pb-12</code></strong> consistently.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>One primary CTA visible</strong> at any scroll position on mobile.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>Section spacing: <code>py-12</code> or <code>gap-12</code></strong> between major sections.</li>
          <li><strong style={{ color: 'var(--p-text)' }}>No full-width colored backgrounds</strong> on app pages (landing pages can use subtle backgrounds).</li>
        </ol>
      </div>
    </div>
  );
}

/* ── Wireframe Components ── */

function WireBlock({ label, color, height = 40, children }: { label: string; color: string; height?: number; children?: React.ReactNode }) {
  return (
    <div
      className="rounded-lg flex items-center justify-center text-xs font-medium px-3"
      style={{
        backgroundColor: color,
        minHeight: height,
        color: 'var(--p-text)',
        border: '1px solid var(--p-border)',
      }}
    >
      {children || label}
    </div>
  );
}

function HubWireframe() {
  const [activeTab, setActiveTab] = useState('Care');
  return (
    <div className="space-y-2">
      <WireBlock label="Header (compact, sticky)" color="var(--p-surface-alt)" height={36} />
      <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--p-surface-alt)' }}>
        {['Care', 'Records', 'Circle'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 rounded-md py-1.5 text-xs font-medium transition-all duration-[50ms] cursor-pointer"
            style={{
              backgroundColor: activeTab === tab ? 'var(--p-surface)' : 'transparent',
              color: activeTab === tab ? 'var(--p-text)' : 'var(--p-text-muted)',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="space-y-2 pt-1">
        {activeTab === 'Care' && (
          <>
            <WireBlock label="Ask Bar" color="var(--p-orange-light)" height={48} />
            <WireBlock label="Care Gaps Preview" color="var(--p-red-light)" height={56} />
            <WireBlock label="Onboarding Checklist" color="var(--p-green-light)" height={48} />
            <div className="grid grid-cols-2 gap-2">
              <WireBlock label="Explore Card" color="var(--p-blue-light)" height={44} />
              <WireBlock label="Explore Card" color="var(--p-blue-light)" height={44} />
            </div>
          </>
        )}
        {activeTab === 'Records' && (
          <>
            <WireBlock label="Upload Zone" color="var(--p-orange-light)" height={64} />
            <WireBlock label="Document List" color="var(--p-surface-alt)" height={80} />
          </>
        )}
        {activeTab === 'Circle' && (
          <>
            <WireBlock label="Care Circle Members" color="var(--p-blue-light)" height={56} />
            <WireBlock label="Invite Button" color="var(--p-green-light)" height={44} />
          </>
        )}
      </div>
      <WireBlock label="Sticky CTA (mobile only)" color="var(--p-orange-light)" height={36} />
    </div>
  );
}

function LandingWireframe() {
  return (
    <div className="space-y-2">
      <WireBlock label="Hero: Value Prop + Primary CTA" color="var(--p-orange-light)" height={80} />
      <WireBlock label="Social Proof / Trust Signals" color="var(--p-green-light)" height={44} />
      <div className="space-y-2">
        <WireBlock label="Feature Section (alternating)" color="var(--p-blue-light)" height={56} />
        <WireBlock label="Feature Section (alternating)" color="var(--p-blue-light)" height={56} />
      </div>
      <WireBlock label="Objection Handling" color="var(--p-red-light)" height={48} />
      <WireBlock label="Final CTA (repeated)" color="var(--p-orange-light)" height={52} />
      <WireBlock label="Footer (minimal)" color="var(--p-surface-alt)" height={32} />
    </div>
  );
}

function WizardWireframe() {
  const [wizardStep, setWizardStep] = useState(2);
  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--p-text-muted)' }}>
          <span>Step {wizardStep} of 5</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--p-surface-alt)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(wizardStep / 5) * 100}%`, backgroundColor: 'var(--p-orange)' }}
          />
        </div>
      </div>

      <div className="mx-auto" style={{ maxWidth: 320 }}>
        <WireBlock label="Question / Prompt" color="var(--p-surface-alt)" height={32} />
        <div className="mt-3">
          <WireBlock label="Input / Selection Area" color="var(--p-blue-light)" height={80} />
        </div>
        <div className="mt-3">
          <WireBlock label="Continue (Primary CTA)" color="var(--p-orange-light)" height={44} />
        </div>
        <div className="mt-2 text-center">
          <span className="text-xs cursor-pointer" style={{ color: 'var(--p-text-muted)' }}>
            &larr; Back
          </span>
        </div>
      </div>

      <div className="flex justify-center gap-2 pt-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setWizardStep(s)}
            className="w-6 h-6 rounded-full text-xs font-medium cursor-pointer transition-all duration-[50ms]"
            style={{
              backgroundColor: s <= wizardStep ? 'var(--p-orange)' : 'var(--p-surface-alt)',
              color: s <= wizardStep ? 'white' : 'var(--p-text-muted)',
              border: `1px solid ${s <= wizardStep ? 'var(--p-orange)' : 'var(--p-border)'}`,
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailWireframe() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--p-text-muted)' }}>
        <span>Home</span>
        <span>/</span>
        <span>Records</span>
        <span>/</span>
        <span style={{ color: 'var(--p-text)' }}>Lab Results - March 2026</span>
      </div>
      <WireBlock label="Title + Metadata" color="var(--p-surface-alt)" height={48} />
      <WireBlock label="Content Body (generous leading-relaxed)" color="var(--p-surface-alt)" height={120} />
      <div className="grid grid-cols-2 gap-2">
        <WireBlock label="Related Action" color="var(--p-blue-light)" height={44} />
        <WireBlock label="Related Action" color="var(--p-green-light)" height={44} />
      </div>
      <div className="pt-1">
        <span className="text-xs cursor-pointer" style={{ color: 'var(--p-text-muted)' }}>
          &larr; Back to Records
        </span>
      </div>
    </div>
  );
}
