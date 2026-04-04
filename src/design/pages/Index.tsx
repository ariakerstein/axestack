import { Link } from 'react-router-dom';
import { useState } from 'react';

const keyColors = [
  { name: 'CTA Orange', hex: '#EA580C' },
  { name: 'Trust Navy', hex: '#0F172A' },
  { name: 'Body Text', hex: '#475569' },
  { name: 'Background', hex: '#F8FAFC' },
  { name: 'Surface', hex: '#FFFFFF' },
  { name: 'Border', hex: '#E2E8F0' },
  { name: 'Success', hex: '#16A34A' },
  { name: 'Error', hex: '#DC2626' },
  { name: 'Info', hex: '#2563EB' },
  { name: 'Care Circle', hex: '#8B5CF6' },
];

const sections = [
  {
    title: 'Foundation',
    pages: [
      { path: '/colors', title: 'Colors', description: 'Canonical palette with functional roles' },
      { path: '/typography', title: 'Typography', description: 'Font scale, weights, line-heights' },
      { path: '/spacing', title: 'Spacing', description: '4pt grid, page layout, touch targets' },
    ],
  },
  {
    title: 'Components',
    pages: [
      { path: '/buttons', title: 'Buttons', description: 'Primary, Secondary, Ghost, Destructive' },
      { path: '/cards', title: 'Cards', description: 'Standard, Feature, Action, Status' },
      { path: '/forms', title: 'Forms', description: 'Inputs, selects, validation states' },
      { path: '/navigation', title: 'Navigation', description: 'Tabs, breadcrumbs, sidebar, bottom nav' },
      { path: '/feedback', title: 'Feedback', description: 'Toasts, alerts, skeletons, progress' },
      { path: '/badges', title: 'Badges', description: 'Status, feature, care circle badges' },
    ],
  },
  {
    title: 'Communication',
    pages: [
      { path: '/voice-tone', title: 'Voice & Tone', description: 'Writing style, forbidden language' },
      { path: '/jtbd-profiles', title: 'JTBD Profiles', description: '4 user archetypes, emotional states' },
      { path: '/influence', title: 'Influence Patterns', description: 'PCP, FATE, micro-compliance, Lego' },
      { path: '/objections', title: 'Objection Handling', description: 'Objections by profile + UI responses' },
      { path: '/copy-patterns', title: 'Copy Patterns', description: 'Headlines, CTAs, frontloading' },
    ],
  },
  {
    title: 'Patterns',
    pages: [
      { path: '/conversion-flows', title: 'Conversion Flows', description: 'Wizard demo, email capture, upsell' },
      { path: '/mobile-first', title: 'Mobile-First', description: '375px viewport, section rhythm' },
      { path: '/page-layouts', title: 'Page Layouts', description: 'Hub, Landing, Wizard, Detail templates' },
      { path: '/onboarding', title: 'Onboarding', description: 'First-run, activation, checklists' },
    ],
  },
  {
    title: 'Metrics',
    pages: [
      { path: '/aarrr', title: 'AARRR Metrics', description: 'Pirate funnel mapped to design' },
      { path: '/qualitative-feedback', title: 'Qualitative Feedback', description: 'CRE techniques, micro-surveys' },
      { path: '/value-delivery', title: 'Value Delivery', description: 'Time-to-value, instant vs deep' },
    ],
  },
];

function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleClick = async () => {
    await navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-7 h-7 rounded-full cursor-pointer transition-transform duration-[50ms] hover:scale-125"
        style={{
          backgroundColor: hex,
          border: hex === '#FFFFFF' || hex === '#F8FAFC' || hex === '#E2E8F0'
            ? '1px solid var(--p-border)'
            : 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
        title={`${name}: ${hex}`}
      />
      {(hovered || copied) && (
        <div
          className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs font-mono whitespace-nowrap pointer-events-none"
          style={{
            backgroundColor: 'var(--p-surface)',
            color: copied ? 'var(--p-green)' : 'var(--p-text)',
            border: '1px solid var(--p-border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {copied ? 'Copied!' : `${name} ${hex}`}
        </div>
      )}
    </div>
  );
}

export default function PreviewIndex() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>
          Navis Design System
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--p-text-body)' }}>
          Live component preview using actual production components and tokens.
        </p>

        {/* Color swatches */}
        <div className="flex items-center gap-2 mb-10 flex-wrap">
          {keyColors.map((c) => (
            <ColorSwatch key={c.hex} name={c.name} hex={c.hex} />
          ))}
          <span className="text-xs ml-2" style={{ color: 'var(--p-text-faint)' }}>Click to copy hex</span>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--p-text-muted)' }}>
                {section.title}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {section.pages.map((page) => (
                  <Link
                    key={page.path}
                    to={page.path}
                    className="block rounded-xl p-4 transition-all duration-[50ms]"
                    style={{
                      backgroundColor: 'var(--p-surface)',
                      border: '1px solid var(--p-border)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--p-orange)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--p-border)'; }}
                  >
                    <h3 className="text-base font-semibold mb-0.5" style={{ color: 'var(--p-text)' }}>
                      {page.title}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{page.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs" style={{ color: 'var(--p-text-faint)' }}>
          This preview is excluded from production builds. Run with <code>npm run preview:design</code>
        </p>
      </div>
    </div>
  );
}
