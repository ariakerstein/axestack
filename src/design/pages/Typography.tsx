import { Link } from 'react-router-dom';

export default function PreviewTypography() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Typography</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>Inter font family. Generous line heights for cognitive fatigue.</p>

        <div
          className="rounded-2xl p-6 space-y-8"
          style={{
            backgroundColor: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
          }}
        >
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--p-text-label)' }}>Hero — 30px / text-3xl / font-semibold</p>
            <p className="text-3xl font-semibold" style={{ color: 'var(--p-text)' }}>3 tests missing from your care plan</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--p-text-label)' }}>Section — 20px / text-xl / font-semibold</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--p-text)' }}>Find clinical trials near you</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--p-text-label)' }}>Body — 18px / text-lg / font-normal / leading-relaxed</p>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--p-text-body)' }}>NCCN guidelines recommend BRCA testing for all breast cancer patients diagnosed under age 60. This test can reveal treatment options you might be missing.</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--p-text-label)' }}>Secondary — 16px / text-base / font-normal</p>
            <p className="text-base" style={{ color: 'var(--p-text-body)' }}>Supporting text for form labels and secondary content.</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--p-text-label)' }}>Meta — 14px / text-sm / font-normal</p>
            <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>Updated 2 hours ago</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--p-text-label)' }}>Tiny — 12px / text-xs (legal only, AVOID)</p>
            <p className="text-xs" style={{ color: 'var(--p-text-label)' }}>Terms and conditions apply. Not medical advice.</p>
          </div>
        </div>

        {/* Font Family */}
        <div
          className="mt-8 rounded-2xl p-6"
          style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
        >
          <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--p-text)' }}>Font</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--p-text-body)' }}><strong>Inter</strong> &mdash; clean, highly legible sans-serif.</p>
          <div className="rounded-xl p-3 font-mono text-xs" style={{ backgroundColor: 'var(--p-surface-alt)', color: 'var(--p-text-body)' }}>
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
          </div>
        </div>

        {/* Rules */}
        <div
          className="mt-8 rounded-2xl p-6"
          style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
        >
          <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--p-text)' }}>Rules</h2>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--p-text-body)' }}>
            <li><strong>Minimum interactive text:</strong> 16px (<code>text-base</code>). Nothing smaller on buttons, links, or form inputs.</li>
            <li><strong>Minimum readable text:</strong> 14px (<code>text-sm</code>). Use sparingly for metadata only.</li>
            <li><strong>Mobile inputs:</strong> Must be 16px+ to prevent iOS auto-zoom.</li>
          </ul>
        </div>

        {/* Line Height */}
        <div
          className="mt-8 rounded-2xl p-6"
          style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>Line Height</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--p-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--p-surface-alt)' }}>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Context</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Tailwind</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Ratio</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--p-text-muted)' }}>Why</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { context: 'Headings', tw: 'leading-tight', ratio: '1.25', why: 'Compact, scannable' },
                  { context: 'Body text', tw: 'leading-relaxed', ratio: '1.625', why: 'Generous for cognitive fatigue / chemo brain' },
                  { context: 'UI labels', tw: 'leading-normal', ratio: '1.5', why: 'Default comfortable' },
                ].map((row, i) => (
                  <tr key={row.context} style={{ backgroundColor: i % 2 === 0 ? 'var(--p-surface)' : 'var(--p-surface-alt)', borderTop: '1px solid var(--p-border-subtle)' }}>
                    <td className="px-5 py-3 text-sm font-medium" style={{ color: 'var(--p-text)' }}>{row.context}</td>
                    <td className="px-5 py-3"><code className="text-xs" style={{ color: 'var(--p-text-body)' }}>{row.tw}</code></td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--p-text-body)' }}>{row.ratio}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--p-text-muted)' }}>{row.why}</td>
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
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>Color by Role</h2>
          <div className="space-y-3">
            <p className="text-xl font-semibold" style={{ color: 'var(--p-text)' }}>Heading: Trust Navy (#0F172A)</p>
            <p className="text-lg" style={{ color: 'var(--p-text-body)' }}>Body: Body Text (#475569)</p>
            <p className="text-base" style={{ color: 'var(--p-text-muted)' }}>Muted: Muted Text (#64748B)</p>
            <a href="#" className="text-lg text-orange-600 block">Link: CTA Orange (#EA580C) — clickable only</a>
            <p className="text-base" style={{ color: 'var(--p-red)' }}>Error: Red 600 (#DC2626)</p>
            <p className="text-base" style={{ color: 'var(--p-green)' }}>Success: Green 600 (#16A34A)</p>
          </div>
        </div>

        <div
          className="mt-8 rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>Frontloading</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-3 rounded-xl"
                style={{
                  backgroundColor: 'var(--p-dont-bg)',
                  border: '1px solid var(--p-dont-border)',
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--p-dont-text)' }}>BAD (buried lead)</p>
                <p className="text-base" style={{ color: 'var(--p-text-body)' }}>Our analysis has identified 3 missing tests</p>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{
                  backgroundColor: 'var(--p-do-bg)',
                  border: '1px solid var(--p-do-border)',
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--p-do-text)' }}>GOOD (frontloaded)</p>
                <p className="text-base" style={{ color: 'var(--p-text-body)' }}>3 tests missing from your plan</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-3 rounded-xl"
                style={{
                  backgroundColor: 'var(--p-dont-bg)',
                  border: '1px solid var(--p-dont-border)',
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--p-dont-text)' }}>BAD</p>
                <p className="text-base" style={{ color: 'var(--p-text-body)' }}>Click here to get started</p>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{
                  backgroundColor: 'var(--p-do-bg)',
                  border: '1px solid var(--p-do-border)',
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--p-do-text)' }}>GOOD</p>
                <p className="text-base" style={{ color: 'var(--p-text-body)' }}>Get your checklist</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dark Mode */}
        <div
          className="mt-8 rounded-2xl p-6"
          style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>Dark Mode</h2>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--p-text-body)' }}>
            <li>Headings: <code>text-slate-100</code> (light)</li>
            <li>Body: <code>text-slate-300</code></li>
            <li>Muted: <code>text-slate-400</code></li>
            <li>Links remain orange (CTA Orange adjusts slightly brighter in dark mode)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
