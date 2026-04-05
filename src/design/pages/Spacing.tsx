import { Link } from 'react-router-dom';

const spacingTokens = [
  { name: 'spacing(1)', value: '4px', tw: 'gap-1', use: 'Micro gap' },
  { name: 'spacing(2)', value: '8px', tw: 'gap-2', use: 'Tight gap, icon-text' },
  { name: 'spacing(3)', value: '12px', tw: 'gap-3 / p-3', use: 'Compact padding, inputs' },
  { name: 'spacing(4)', value: '16px', tw: 'gap-4 / p-4', use: 'Default gap, between fields' },
  { name: 'spacing(5)', value: '20px', tw: 'gap-5 / p-5', use: 'Comfortable gap' },
  { name: 'spacing(6)', value: '24px', tw: 'gap-6 / p-6', use: 'Card padding, between cards' },
  { name: 'spacing(8)', value: '32px', tw: 'gap-8', use: 'Section gap' },
  { name: 'spacing(10)', value: '40px', tw: 'pt-10', use: 'Page top padding' },
  { name: 'spacing(12)', value: '48px', tw: 'pb-12 / py-12', use: 'Page bottom, section spacing' },
  { name: 'spacing(16)', value: '64px', tw: 'gap-16 / py-16', use: 'Major section break' },
];

export default function PreviewSpacing() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Spacing</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>4pt base grid. All values are multiples of 4px.</p>

        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            backgroundColor: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
          }}
        >
          {spacingTokens.map((s) => (
            <div key={s.name} className="flex items-center gap-4">
              <div className="w-32 text-sm flex-shrink-0" style={{ color: 'var(--p-text-muted)' }}>
                <code>{s.tw}</code>
              </div>
              <div
                className="rounded"
                style={{
                  backgroundColor: 'var(--p-orange-light)',
                  width: s.value,
                  height: '24px',
                  minWidth: s.value,
                }}
              />
              <div className="flex-1">
                <span className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>{s.value}</span>
                <span className="text-sm ml-2" style={{ color: 'var(--p-text-muted)' }}>{s.use}</span>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-8 rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>Page Layout Template</h2>
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--p-surface-alt)',
              border: '2px dashed var(--p-border-strong)',
            }}
          >
            <div className="text-xs mb-2" style={{ color: 'var(--p-text-faint)' }}>px-6 pt-10 pb-12 max-w-5xl mx-auto</div>
            <div
              className="rounded-xl p-6 mb-4"
              style={{
                backgroundColor: 'var(--p-surface)',
                border: '1px solid var(--p-border)',
              }}
            >
              <div className="text-xs" style={{ color: 'var(--p-text-faint)' }}>Card: p-6, rounded-2xl, shadow-sm</div>
            </div>
            <div className="text-xs mb-2" style={{ color: 'var(--p-text-faint)' }}>gap-4 between cards</div>
            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: 'var(--p-surface)',
                border: '1px solid var(--p-border)',
              }}
            >
              <div className="text-xs" style={{ color: 'var(--p-text-faint)' }}>Card: p-6</div>
            </div>
          </div>
        </div>

        {/* Component Spacing */}
        <div className="mt-8 rounded-2xl p-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>Component Spacing</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--p-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--p-surface-alt)' }}>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Element</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Padding</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Tailwind</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { element: 'Card', padding: '24px all', tw: 'p-6' },
                  { element: 'Card compact', padding: '16px all', tw: 'p-4' },
                  { element: 'Button', padding: '12px vertical, 24px horizontal', tw: 'py-3 px-6' },
                  { element: 'Input', padding: '12px all', tw: 'p-3' },
                  { element: 'Modal/Sheet', padding: '24px all', tw: 'p-6' },
                ].map((row, i) => (
                  <tr key={row.element} style={{ backgroundColor: i % 2 === 0 ? 'var(--p-surface)' : 'var(--p-surface-alt)', borderTop: '1px solid var(--p-border-subtle)' }}>
                    <td className="px-5 py-3 text-sm font-medium" style={{ color: 'var(--p-text)' }}>{row.element}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--p-text-body)' }}>{row.padding}</td>
                    <td className="px-5 py-3"><code className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{row.tw}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Between Elements */}
        <div className="mt-8 rounded-2xl p-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>Between Elements</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--p-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--p-surface-alt)' }}>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Relationship</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Gap</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Tailwind</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { rel: 'Between cards', gap: '16-24px', tw: 'gap-4 or gap-6' },
                  { rel: 'Between sections', gap: '48px', tw: 'py-12 or gap-12' },
                  { rel: 'Between form fields', gap: '16px', tw: 'gap-4' },
                  { rel: 'Between icon and text', gap: '8px', tw: 'gap-2' },
                  { rel: 'Between badge and text', gap: '4-8px', tw: 'gap-1 or gap-2' },
                ].map((row, i) => (
                  <tr key={row.rel} style={{ backgroundColor: i % 2 === 0 ? 'var(--p-surface)' : 'var(--p-surface-alt)', borderTop: '1px solid var(--p-border-subtle)' }}>
                    <td className="px-5 py-3 text-sm font-medium" style={{ color: 'var(--p-text)' }}>{row.rel}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--p-text-body)' }}>{row.gap}</td>
                    <td className="px-5 py-3"><code className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{row.tw}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div
          className="mt-8 rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>Touch Target: 44px minimum</h2>
          <div className="flex items-center gap-4">
            <button
              className="min-h-[44px] min-w-[44px] rounded-lg px-6 py-3 font-semibold"
              style={{ backgroundColor: 'var(--p-orange)', color: '#fff' }}
            >
              44px button
            </button>
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center text-xs"
              style={{
                border: '2px dashed var(--p-border-strong)',
                color: 'var(--p-text-faint)',
              }}
            >
              44px
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>
            Accessibility requirement (WCAG) and iOS/Android standard. No exceptions.
          </p>
        </div>

        {/* Whitespace as Design */}
        <div className="mt-8 rounded-2xl p-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--p-text)' }}>Whitespace as Design</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-body)' }}>
            Generous spacing = visual &ldquo;deep breath&rdquo;. Cancer patients are overwhelmed &mdash; cramped UI makes it worse.
          </p>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--p-text-body)' }}>
            <li>Prefer <code>gap-6</code> over <code>gap-4</code> when in doubt</li>
            <li>Never reduce spacing to &ldquo;fit more in&rdquo;</li>
            <li>Empty space is not wasted space &mdash; it&rsquo;s clarity</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
