import { Link } from 'react-router-dom';

export default function PreviewButtons() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Buttons</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>ONE primary CTA per viewport. Orange = clickable.</p>

        {/* Primary */}
        <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--p-text)' }}>Primary (Solid Orange)</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>ONE per viewport. The main action.</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--p-text-faint)' }}>sm (36px / h-9)</p>
              <button className="rounded-lg px-3 py-2 font-semibold text-sm h-9 min-h-[44px] transition-colors duration-[50ms]" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--p-orange-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--p-orange)'}>
                Add Record
              </button>
            </div>
            <div className="text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--p-text-faint)' }}>default (44px / h-11)</p>
              <button className="rounded-lg px-6 py-3 font-semibold text-base min-h-[44px] transition-colors duration-[50ms]" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--p-orange-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--p-orange)'}>
                Get Your Checklist
              </button>
            </div>
            <div className="text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--p-text-faint)' }}>lg (48px / h-12)</p>
              <button className="rounded-lg px-8 py-3 font-semibold text-lg min-h-[48px] transition-colors duration-[50ms]" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--p-orange-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--p-orange)'}>
                Start Your Second Look
              </button>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs mb-2" style={{ color: 'var(--p-text-faint)' }}>Full-width on mobile:</p>
            <button className="w-full rounded-lg px-6 py-3 font-semibold text-lg min-h-[44px] transition-colors duration-[50ms]" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--p-orange-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--p-orange)'}>
              Get Your Free Checklist
            </button>
          </div>
        </div>

        {/* Secondary */}
        <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--p-text)' }}>Secondary (Outline / Link)</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>Supports primary, never competes.</p>
          <div className="flex flex-wrap items-center gap-4">
            <button className="bg-transparent rounded-lg px-6 py-3 font-medium text-base min-h-[44px] transition-colors duration-[50ms]" style={{ border: '2px solid var(--p-orange)', color: 'var(--p-orange)' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--p-orange-light)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              Share Results
            </button>
            <button className="underline underline-offset-4 font-medium text-base p-0 transition-colors duration-[50ms]" style={{ color: 'var(--p-orange)' }} onMouseOver={e => e.currentTarget.style.color = 'var(--p-orange-hover)'} onMouseOut={e => e.currentTarget.style.color = 'var(--p-orange)'}>
              View details
            </button>
            <button className="underline underline-offset-4 font-medium text-base p-0 transition-colors duration-[50ms]" style={{ color: 'var(--p-orange)' }} onMouseOver={e => e.currentTarget.style.color = 'var(--p-orange-hover)'} onMouseOut={e => e.currentTarget.style.color = 'var(--p-orange)'}>
              Skip for now
            </button>
          </div>
        </div>

        {/* Ghost */}
        <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--p-text)' }}>Ghost</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>Navigation, close, utility. No orange.</p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-lg px-3 py-2 min-h-[44px] transition-colors duration-[50ms]" style={{ color: 'var(--p-text-body)' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--p-surface-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              Cancel
            </button>
            <button className="rounded-lg px-3 py-2 min-h-[44px] transition-colors duration-[50ms]" style={{ color: 'var(--p-text-body)' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--p-surface-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              Back
            </button>
            <button className="rounded-lg p-2 min-h-[44px] min-w-[44px] transition-colors duration-[50ms]" style={{ color: 'var(--p-text-body)' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--p-surface-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Destructive */}
        <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--p-text)' }}>Destructive</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>Delete, remove. Red, used sparingly.</p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-lg px-6 py-3 font-semibold min-h-[44px] transition-colors duration-[50ms]" style={{ backgroundColor: 'var(--p-red)', color: 'white' }}>
              Delete Record
            </button>
          </div>
        </div>

        {/* States */}
        <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--p-text)' }}>States</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <button className="rounded-lg px-6 py-3 font-semibold min-h-[44px]" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }}>
              Default
            </button>
            <button className="rounded-lg px-6 py-3 font-semibold min-h-[44px]" style={{ backgroundColor: 'var(--p-orange-hover)', color: 'white' }}>
              Hover
            </button>
            <button className="rounded-lg px-6 py-3 font-semibold min-h-[44px]" style={{ backgroundColor: 'var(--p-orange-active, #c2410c)', color: 'white' }}>
              Active/Pressed
            </button>
            <button className="rounded-lg px-6 py-3 font-semibold min-h-[44px] opacity-50 cursor-not-allowed" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }}>
              Disabled
            </button>
            <button className="rounded-lg px-6 py-3 font-semibold min-h-[44px] pointer-events-none inline-flex items-center gap-2" style={{ backgroundColor: 'var(--p-orange)', color: 'white', opacity: 0.8 }}>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading...
            </button>
            <button className="rounded-lg px-6 py-3 font-semibold min-h-[44px]" style={{ backgroundColor: 'var(--p-orange)', color: 'white', boxShadow: '0 0 0 2px var(--p-surface), 0 0 0 4px var(--p-orange)' }}>
              Focused
            </button>
          </div>
        </div>

        {/* Do / Don't */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-dont-bg)', border: '1px solid var(--p-dont-border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--p-dont-text)' }}>DON'T</h3>
            <div className="space-y-2">
              <button className="rounded-lg px-4 py-2 text-sm" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }}>Submit</button>
              <p className="text-xs" style={{ color: 'var(--p-red-text)' }}>Generic "Submit" label</p>
              <div className="flex gap-2">
                <button className="rounded-lg px-4 py-2 text-sm" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }}>Action 1</button>
                <button className="rounded-lg px-4 py-2 text-sm" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }}>Action 2</button>
              </div>
              <p className="text-xs" style={{ color: 'var(--p-red-text)' }}>Two solid orange buttons competing</p>
            </div>
          </div>
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-do-bg)', border: '1px solid var(--p-do-border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--p-do-text)' }}>DO</h3>
            <div className="space-y-2">
              <button className="rounded-lg px-4 py-2 text-sm" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }}>Get Your Checklist</button>
              <p className="text-xs" style={{ color: 'var(--p-green-text)' }}>Verb-first, specific label</p>
              <div className="flex gap-2 items-center">
                <button className="rounded-lg px-4 py-2 text-sm" style={{ backgroundColor: 'var(--p-orange)', color: 'white' }}>Get Checklist</button>
                <button className="underline text-sm" style={{ color: 'var(--p-orange)' }}>Skip for now</button>
              </div>
              <p className="text-xs" style={{ color: 'var(--p-green-text)' }}>One primary + one text link</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
