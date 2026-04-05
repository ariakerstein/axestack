import { Link } from 'react-router-dom';

const neutralColors = [
  { name: 'Heading Text', hex: '#0A0A0A', tw: 'neutral-950', role: 'Headings, primary text', rule: 'Default for all headings' },
  { name: 'Body Text', hex: '#525252', tw: 'neutral-600', role: 'Body copy, descriptions', rule: 'Default for paragraphs' },
  { name: 'Muted Text', hex: '#737373', tw: 'neutral-500', role: 'Metadata, timestamps, hints', rule: 'Minimum for non-essential text' },
  { name: 'Background', hex: '#FAFAFA', tw: 'neutral-50', role: 'Page background', rule: 'Light mode default canvas' },
  { name: 'Surface', hex: '#FFFFFF', tw: 'white', role: 'Cards, modals, sheets', rule: 'Elevated surfaces' },
  { name: 'Surface Alt', hex: '#F5F5F5', tw: 'neutral-100', role: 'Section backgrounds, zebra rows', rule: 'Subtle differentiation' },
  { name: 'Border', hex: '#E5E5E5', tw: 'neutral-200', role: 'Dividers, card borders', rule: 'Subtle, never heavy' },
];

const semanticColors = [
  { name: 'CTA Orange', hex: '#EA580C', tw: 'orange-600', role: 'What matters most right now', rule: 'The action, the answer, the thing that moves them forward' },
  { name: 'CTA Orange Hover', hex: '#C2410C', tw: 'orange-700', role: 'Hover/pressed states', rule: 'Only on elements already orange' },
  { name: 'CTA Orange Light', hex: '#FFF7ED', tw: 'orange-50', role: 'Subtle active/selected bg', rule: 'Only behind an orange-labeled element' },
  { name: 'Success', hex: '#16A34A', tw: 'green-600', role: 'Checkmarks, verified, positive states', rule: 'Confirmed/complete actions' },
  { name: 'Error', hex: '#DC2626', tw: 'red-600', role: 'Errors, destructive actions, urgent warnings', rule: 'Problems requiring action' },
  { name: 'Info', hex: '#2563EB', tw: 'blue-600', role: 'Informational, non-CTA links, mild warnings', rule: 'FYI-level communication' },
  { name: 'Care Circle', hex: '#8B5CF6', tw: 'violet-500', role: 'People, avatars, relationships', rule: 'Human/social elements' },
];

export default function PreviewColors() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Colors</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>Monochrome by default. Color only when it carries meaning.</p>

        <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--p-text)' }}>Neutral Foundation</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>The default UI is grayscale. Headers, body, borders, backgrounds — all neutral.</p>
        <div className="space-y-3 mb-10">
          {neutralColors.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-4 rounded-xl p-4"
              style={{
                backgroundColor: 'var(--p-surface)',
                border: '1px solid var(--p-border)',
              }}
            >
              <div className="w-16 h-16 rounded-xl flex-shrink-0" style={{ backgroundColor: c.hex }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold" style={{ color: 'var(--p-text)' }}>{c.name}</span>
                  <code className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{c.hex}</code>
                  <code className="text-xs" style={{ color: 'var(--p-text-faint)' }}>{c.tw}</code>
                </div>
                <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>{c.role}</p>
                <p className="text-xs" style={{ color: 'var(--p-text-faint)' }}>{c.rule}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--p-text)' }}>Semantic Colors</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>Color appears ONLY when it carries meaning. Orange = clickable. Green = good. Red = bad. Blue = info. Violet = person.</p>
        <div className="space-y-3">
          {semanticColors.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-4 rounded-xl p-4"
              style={{
                backgroundColor: 'var(--p-surface)',
                border: '1px solid var(--p-border)',
              }}
            >
              <div className="w-16 h-16 rounded-xl flex-shrink-0" style={{ backgroundColor: c.hex }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold" style={{ color: 'var(--p-text)' }}>{c.name}</span>
                  <code className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{c.hex}</code>
                  <code className="text-xs" style={{ color: 'var(--p-text-faint)' }}>{c.tw}</code>
                </div>
                <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>{c.role}</p>
                <p className="text-xs" style={{ color: 'var(--p-text-faint)' }}>{c.rule}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Ambient Warmth */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--p-text)' }}>Ambient Warmth (non-interactive only)</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>Subtle violet/teal warmth on non-interactive surfaces. If it&rsquo;s clickable, it&rsquo;s orange. If it&rsquo;s ambient, gradients are welcome.</p>
          <div className="space-y-3 mb-6">
            {[
              { name: 'Violet Wash', hex: '#8B5CF6', tw: 'violet-500', role: 'Background orbs, gradient starts', rule: 'Never on clickable elements or text' },
              { name: 'Violet Light', hex: '#EDE9FE', tw: 'violet-50', role: 'Soft card/section backgrounds', rule: 'Subtle — never saturated enough to compete with CTA' },
              { name: 'Teal Wash', hex: '#14B8A6', tw: 'teal-500', role: 'Gradient endpoints, decorative accents', rule: 'Pairs with violet for signature gradient' },
              { name: 'Teal Light', hex: '#F0FDFA', tw: 'teal-50', role: 'Soft section backgrounds', rule: 'Complementary to violet washes' },
            ].map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-4 rounded-xl p-4"
                style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
              >
                <div className="w-16 h-16 rounded-xl flex-shrink-0" style={{ backgroundColor: c.hex }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold" style={{ color: 'var(--p-text)' }}>{c.name}</span>
                    <code className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{c.hex}</code>
                    <code className="text-xs" style={{ color: 'var(--p-text-faint)' }}>{c.tw}</code>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>{c.role}</p>
                  <p className="text-xs" style={{ color: 'var(--p-text-faint)' }}>{c.rule}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--p-surface-alt)', border: '1px solid var(--p-border-subtle)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Gradient Signatures</p>
            <div className="space-y-1 text-xs font-mono" style={{ color: 'var(--p-text-body)' }}>
              <p>Hero backgrounds: <code>from-violet-50 via-white to-teal-50</code></p>
              <p>Background orbs: <code>bg-violet-400/20</code> or <code>bg-teal-400/10</code></p>
              <p>Text gradients (marketing only): <code>from-violet-600 via-fuchsia-500 to-orange-500</code></p>
              <p>Divider accents: <code>from-transparent via-violet-400/50 to-transparent</code></p>
            </div>
          </div>
        </div>

        {/* CSS Variables & Dark Mode */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--p-text)' }}>CSS Variables (Light)</h2>
            <div className="rounded-xl p-4 font-mono text-xs overflow-x-auto" style={{ backgroundColor: 'var(--p-surface-alt)', color: 'var(--p-text-body)' }}>
              <pre style={{ margin: 0 }}>{`:root {
  --foreground: 0 0% 4%;      /* #0A0A0A */
  --body: 0 0% 32%;           /* #525252 */
  --muted-foreground: 0 0% 45%;
  --background: 0 0% 98%;     /* #FAFAFA */
  --surface: 0 0% 100%;       /* #FFFFFF */
  --surface-alt: 0 0% 96%;    /* #F5F5F5 */
  --border: 0 0% 90%;         /* #E5E5E5 */
  --cta: 24 95% 48%;          /* #EA580C */
  --cta-hover: 21 90% 41%;    /* #C2410C */
  --success: 142 71% 35%;     /* #16A34A */
  --error: 0 72% 51%;         /* #DC2626 */
  --info: 217 91% 60%;        /* #2563EB */
  --care-circle: 258 58% 66%; /* #8B5CF6 */
}`}</pre>
            </div>
          </div>
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--p-text)' }}>Dark Mode Overrides</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--p-text-muted)' }}>Auto-detect via <code>prefers-color-scheme</code>. User override in <code>localStorage('navis-theme')</code>.</p>
            <div className="rounded-xl p-4 font-mono text-xs overflow-x-auto" style={{ backgroundColor: 'var(--p-surface-alt)', color: 'var(--p-text-body)' }}>
              <pre style={{ margin: 0 }}>{`.dark {
  --foreground: 0 0% 98%;     /* #FAFAFA */
  --body: 0 0% 83%;           /* #D4D4D4 */
  --background: 0 0% 4%;      /* #0A0A0A */
  --surface: 0 0% 9%;         /* #171717 */
  --surface-alt: 0 0% 15%;    /* #262626 */
  --border: 0 0% 25%;         /* #404040 */
  --cta: 24 95% 53%;
  --success: 142 71% 45%;
  --error: 0 72% 60%;
  --info: 217 91% 67%;
}`}</pre>
            </div>
          </div>
        </div>

        <div
          className="mt-10 rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>NEVER</h2>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--p-text-body)' }}>
            {[
              'Orange as decoration \u2014 it must always serve the user\u2019s current job-to-be-done',
              'Orange on multiple competing elements (if everything is orange, nothing is)',
              'Orange backgrounds on sections, cards, or containers (unless it IS a button)',
              'Orange icons that aren\u2019t meaningful to the current task',
              'Amber/yellow for any purpose (too close to CTA)',
              'Red for non-error states (red = something is wrong)',
              'Green for non-success states (green = something is confirmed/good)',
              'Violet/teal on clickable elements (ambient warmth is non-interactive only \u2014 clickable = orange)',
              'Gradients so saturated they compete with the CTA or make text hard to read',
              'Using old primary/secondary/accent CSS variables \u2014 migrate to new tokens',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--p-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--p-dont-bg)', border: '1px solid var(--p-dont-border)' }}>
              <p className="font-medium mb-2" style={{ color: 'var(--p-dont-text)' }}>Orange on non-clickable text</p>
              <p style={{ color: 'var(--p-orange)' }} className="line-through">This heading is orange but not a link</p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--p-do-bg)', border: '1px solid var(--p-do-border)' }}>
              <p className="font-medium mb-2" style={{ color: 'var(--p-do-text)' }}>Orange only on clickable</p>
              <button style={{ color: 'var(--p-orange)' }} className="underline">This link IS clickable</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
