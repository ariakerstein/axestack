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
        </div>
      </div>
    </div>
  );
}
