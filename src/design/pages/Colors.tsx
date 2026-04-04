import { Link } from 'react-router-dom';

const neutralColors = [
  { name: 'Heading Text', hex: '#0A0A0A', tw: 'neutral-950', role: 'Headings, primary text', rule: 'Default for all headings' },
  { name: 'Body Text', hex: '#525252', tw: 'neutral-600', role: 'Body copy', rule: 'Default for paragraphs' },
  { name: 'Muted Text', hex: '#737373', tw: 'neutral-500', role: 'Metadata, hints', rule: 'Non-essential text only' },
  { name: 'Background', hex: '#FAFAFA', tw: 'neutral-50', role: 'Page background', rule: 'Light mode canvas' },
  { name: 'Surface', hex: '#FFFFFF', tw: 'white', role: 'Cards, modals', rule: 'Elevated surfaces' },
  { name: 'Surface Alt', hex: '#F5F5F5', tw: 'neutral-100', role: 'Section backgrounds', rule: 'Subtle differentiation' },
  { name: 'Border', hex: '#E5E5E5', tw: 'neutral-200', role: 'Dividers, borders', rule: 'Subtle, never heavy' },
];

const semanticColors = [
  { name: 'CTA Orange', hex: '#EA580C', tw: 'orange-600', role: 'What matters most right now', rule: 'Actions, answers, the thing that moves them forward' },
  { name: 'CTA Orange Hover', hex: '#C2410C', tw: 'orange-700', role: 'Hover/pressed states', rule: 'Only on already-orange elements' },
  { name: 'CTA Orange Light', hex: '#FFF7ED', tw: 'orange-50', role: 'Subtle active bg', rule: 'Behind orange-labeled elements' },
  { name: 'Success', hex: '#16A34A', tw: 'green-600', role: 'Verified, positive', rule: 'Confirmed/complete' },
  { name: 'Error', hex: '#DC2626', tw: 'red-600', role: 'Errors, urgent', rule: 'Problems requiring action' },
  { name: 'Info', hex: '#2563EB', tw: 'blue-600', role: 'Informational', rule: 'FYI-level, mild warnings' },
  { name: 'Care Circle', hex: '#8B5CF6', tw: 'violet-500', role: 'People, relationships', rule: 'Human/social elements' },
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

        <div
          className="mt-12 rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>NEVER</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: 'var(--p-dont-bg)',
                border: '1px solid var(--p-dont-border)',
              }}
            >
              <p className="font-medium mb-2" style={{ color: 'var(--p-dont-text)' }}>Orange on non-clickable text</p>
              <p style={{ color: 'var(--p-orange)' }} className="line-through">This heading is orange but not a link</p>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: 'var(--p-dont-bg)',
                border: '1px solid var(--p-dont-border)',
              }}
            >
              <p className="font-medium mb-2" style={{ color: 'var(--p-dont-text)' }}>Amber/yellow for anything</p>
              <p style={{ color: 'var(--p-orange)' }} className="line-through">Warning: too close to CTA orange</p>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: 'var(--p-do-bg)',
                border: '1px solid var(--p-do-border)',
              }}
            >
              <p className="font-medium mb-2" style={{ color: 'var(--p-do-text)' }}>Orange only on clickable</p>
              <button style={{ color: 'var(--p-orange)' }} className="underline">This link IS clickable</button>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: 'var(--p-do-bg)',
                border: '1px solid var(--p-do-border)',
              }}
            >
              <p className="font-medium mb-2" style={{ color: 'var(--p-do-text)' }}>Use Info or Error for warnings</p>
              <p style={{ color: 'var(--p-blue)' }}>Info: Profile incomplete</p>
              <p style={{ color: 'var(--p-red)' }}>Error: Upload failed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
