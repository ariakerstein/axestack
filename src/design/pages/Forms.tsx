import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useFieldState, validators } from '../components/useFieldState';
import { RadioButtonGroup } from '../components/RadioButtonGroup';

const HOSPITALS = [
  'Memorial Sloan Kettering Cancer Center',
  'MD Anderson Cancer Center',
  'Dana-Farber Cancer Institute',
  'Mayo Clinic',
  'Johns Hopkins Hospital',
  'Cleveland Clinic',
  'Massachusetts General Hospital',
  'UCSF Medical Center',
  'Stanford Health Care',
  'UCLA Medical Center',
  'Mount Sinai Hospital',
  'Northwestern Memorial Hospital',
];

function RadioButtonGroupDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const options = ['Not started', 'In treatment', 'Completed', 'Monitoring'];

  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--p-text)' }}>Treatment Status</label>
      <RadioButtonGroup
        options={options}
        selected={selected}
        onChange={setSelected}
        required
      />
      <p className="text-xs mt-1" style={{ color: 'var(--p-text-faint)' }}>
        {!selected ? 'Required — blue outline. Select one to see green.' : `Selected: ${selected} — green. Others reset to gray.`}
      </p>
    </div>
  );
}

function SearchableSelect() {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const searchTerm = focused ? inputValue : '';
  const filtered = searchTerm
    ? HOSPITALS.filter(h => h.toLowerCase().includes(searchTerm.toLowerCase()))
    : HOSPITALS;

  const displayValue = focused ? inputValue : (selected || '');

  const borderStyle: React.CSSProperties = focused
    ? { borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--p-green-focus)', boxShadow: '0 0 0 3px var(--p-green-glow)' }
    : selected
      ? { borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--p-green)' }
      : { borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--p-border)' };

  const handleSelect = (hospital: string) => {
    setSelected(hospital);
    setInputValue('');
    setIsOpen(false);
    setFocused(false);
  };

  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--p-text)' }}>
        Hospital <span style={{ color: 'var(--p-text-faint)' }} className="font-normal">(optional)</span>
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder="Search hospitals..."
          value={displayValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setSelected(null);
            setIsOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setIsOpen(true);
            setInputValue('');
          }}
          onBlur={() => {
            // Delay so click on option fires first
            setTimeout(() => {
              setFocused(false);
              setIsOpen(false);
            }, 200);
          }}
          className="w-full rounded-lg py-3 pr-10 text-base min-h-[44px] outline-none transition-all duration-[50ms]"
          style={{ ...borderStyle, paddingLeft: 40, backgroundColor: 'var(--p-input-bg)', color: 'var(--p-text)' }}
        />
        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--p-text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--p-text-faint)', transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>

        {isOpen && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg shadow-lg max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
            {filtered.map((hospital) => (
              <button
                key={hospital}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(hospital)}
                className="w-full text-left px-3 py-2.5 text-base transition-colors duration-[50ms] first:rounded-t-lg last:rounded-b-lg"
                style={{ color: selected === hospital ? 'var(--p-green)' : 'var(--p-text-body)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--p-surface-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {hospital}
              </button>
            ))}
          </div>
        )}
        {isOpen && filtered.length === 0 && inputValue && (
          <div className="absolute z-10 mt-1 w-full rounded-lg shadow-lg px-3 py-3 text-sm" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)', color: 'var(--p-text-muted)' }}>
            No hospitals found for "{inputValue}"
          </div>
        )}
      </div>
      <p className="text-xs mt-1" style={{ color: 'var(--p-text-faint)' }}>
        {selected ? `Selected: ${selected} — green border` : 'Combobox — type to filter, click to select. Green on focus/selection.'}
      </p>
    </div>
  );
}

export default function PreviewForms() {
  const email = useFieldState(true, validators.email);
  const cancerType = useFieldState(true);
  const phone = useFieldState(false, validators.phone);
  const website = useFieldState(false, validators.url);
  const notes = useFieldState(false);
  const stage = useFieldState(true);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Forms</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>Interactive demo. Focus, type, blur to see state changes. Green = valid/focused. Blue = required empty. Red = error.</p>

        {/* Why This System */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Why This System</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--p-text-body)' }}>
            Users in cancer treatment have reduced cognitive capacity. The color-coded border system gives instant visual feedback:
          </p>
          <ul className="text-sm space-y-2" style={{ color: 'var(--p-text-body)' }}>
            <li className="flex items-center gap-3">
              <span className="inline-block w-5 h-5 rounded flex-shrink-0" style={{ border: '2px solid var(--p-blue)' }} />
              <span><strong style={{ color: 'var(--p-text)' }}>Blue border</strong> = "Still need to fill this" (required, empty)</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="inline-block w-5 h-5 rounded flex-shrink-0" style={{ border: '2px solid var(--p-green)' }} />
              <span><strong style={{ color: 'var(--p-text)' }}>Green border</strong> = "Done" or "Working on this" (valid/focused)</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="inline-block w-5 h-5 rounded flex-shrink-0" style={{ border: '2px solid var(--p-red)' }} />
              <span><strong style={{ color: 'var(--p-text)' }}>Red border</strong> = "Something's wrong" (error)</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="inline-block w-5 h-5 rounded flex-shrink-0" style={{ border: '1px solid var(--p-border)' }} />
              <span><strong style={{ color: 'var(--p-text)' }}>Gray border</strong> = "Optional, no pressure" (optional, empty)</span>
            </li>
          </ul>
        </div>

        {/* Live Interactive Form */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--p-text)' }}>Live Form Demo</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>Try typing, focusing, and blurring each field.</p>
          <div className="space-y-4 max-w-md">
            {/* Email - required */}
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--p-text)' }}>Email</label>
              <input
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                className="w-full rounded-lg p-3 text-base min-h-[44px] outline-none transition-all duration-[50ms]"
                style={{ ...email.borderStyle, backgroundColor: 'var(--p-input-bg)', color: 'var(--p-text)' }}
                {...email.inputProps}
              />
              {email.state === 'error' && (
                <p className="text-sm mt-1" style={{ color: 'var(--p-red)' }}>Enter a valid email address</p>
              )}
              <p className="text-xs mt-1" style={{ color: 'var(--p-text-faint)' }}>
                State: <span className="font-medium">{email.state}</span>
                {!email.value && ' — required, blue border'}
              </p>
            </div>

            {/* Cancer Type - required, select with chevron */}
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--p-text)' }}>Cancer Type</label>
              <div className="relative">
                <select
                  className="w-full rounded-lg p-3 pr-10 text-base min-h-[44px] outline-none appearance-none transition-all duration-[50ms]"
                  style={{ ...cancerType.borderStyle, backgroundColor: 'var(--p-input-bg)', color: 'var(--p-text)' }}
                  {...cancerType.inputProps}
                >
                  <option value="">Select your cancer type</option>
                  <option value="breast">Breast</option>
                  <option value="lung">Lung</option>
                  <option value="prostate">Prostate</option>
                  <option value="colorectal">Colorectal</option>
                </select>
                <svg className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--p-text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--p-text-faint)' }}>
                State: <span className="font-medium">{cancerType.state}</span> — dropdown with chevron indicator
              </p>
            </div>

            {/* Radio Button Group - required, few options */}
            <RadioButtonGroupDemo />

            {/* Searchable Select - functional */}
            <SearchableSelect />

            {/* Phone - optional */}
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--p-text)' }}>
                Phone <span style={{ color: 'var(--p-text-faint)' }} className="font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                inputMode="tel"
                placeholder="+1 (555) 123-4567"
                className="w-full rounded-lg p-3 text-base min-h-[44px] outline-none transition-all duration-[50ms]"
                style={{ ...phone.borderStyle, backgroundColor: 'var(--p-input-bg)', color: 'var(--p-text)' }}
                {...phone.inputProps}
              />
              {phone.state === 'error' && (
                <p className="text-sm mt-1" style={{ color: 'var(--p-red)' }}>Enter a valid phone number</p>
              )}
              <p className="text-xs mt-1" style={{ color: 'var(--p-text-faint)' }}>
                State: <span className="font-medium">{phone.state}</span>
                {!phone.value && ' — optional, gray border'}
              </p>
            </div>

            {/* Website - optional */}
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--p-text)' }}>
                Doctor's website <span style={{ color: 'var(--p-text-faint)' }} className="font-normal">(optional)</span>
              </label>
              <input
                type="url"
                inputMode="url"
                placeholder="https://doctor-name.com"
                className="w-full rounded-lg p-3 text-base min-h-[44px] outline-none transition-all duration-[50ms]"
                style={{ ...website.borderStyle, backgroundColor: 'var(--p-input-bg)', color: 'var(--p-text)' }}
                {...website.inputProps}
              />
              {website.state === 'error' && (
                <p className="text-sm mt-1" style={{ color: 'var(--p-red)' }}>Enter a valid URL (https://...)</p>
              )}
              <p className="text-xs mt-1" style={{ color: 'var(--p-text-faint)' }}>
                State: <span className="font-medium">{website.state}</span>
              </p>
            </div>

            {/* Notes - optional, textarea */}
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--p-text)' }}>
                Tell us more <span style={{ color: 'var(--p-text-faint)' }} className="font-normal">(optional)</span>
              </label>
              <textarea
                placeholder="Any details about your diagnosis..."
                className="w-full rounded-lg p-3 text-base min-h-[100px] leading-relaxed resize-y outline-none transition-all duration-[50ms]"
                style={{ ...notes.borderStyle, backgroundColor: 'var(--p-input-bg)', color: 'var(--p-text)' }}
                {...notes.inputProps}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--p-text-faint)' }}>
                State: <span className="font-medium">{notes.state}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Checkbox & Radio */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>Checkbox & Radio</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--p-text-muted)' }}>Checked = green fill. Unchecked = slate border.</p>
          <div className="space-y-3 max-w-md">
            <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
              <input type="checkbox" className="w-5 h-5 rounded accent-green-600" style={{ borderColor: 'var(--p-border-strong)' }} defaultChecked />
              <span className="text-base" style={{ color: 'var(--p-text)' }}>I am the patient</span>
            </label>
            <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
              <input type="checkbox" className="w-5 h-5 rounded accent-green-600" style={{ borderColor: 'var(--p-border-strong)' }} />
              <span className="text-base" style={{ color: 'var(--p-text)' }}>I am a caregiver</span>
            </label>
            <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--p-border-subtle)' }}>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--p-text)' }}>Stage</p>
              {['Stage I', 'Stage II', 'Stage III', 'Stage IV', 'Unknown'].map((stage) => (
                <label key={stage} className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                  <input type="radio" name="stage" className="w-5 h-5 accent-green-600" style={{ borderColor: 'var(--p-border-strong)' }} />
                  <span className="text-base" style={{ color: 'var(--p-text)' }}>{stage}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* State Reference */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>State Reference</h2>
          <div className="space-y-3 max-w-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded flex-shrink-0" style={{ border: '2px solid var(--p-blue)' }} />
              <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>Required + empty + not focused → blue</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded flex-shrink-0" style={{ border: '2px solid var(--p-green-focus)', boxShadow: '0 0 0 2px var(--p-green-glow)' }} />
              <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>Focused (any) → green + glow</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded flex-shrink-0" style={{ border: '2px solid var(--p-green)' }} />
              <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>Unfocused + valid → green</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded flex-shrink-0" style={{ border: '2px solid var(--p-red)' }} />
              <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>Unfocused + error → red</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded flex-shrink-0" style={{ border: '1px solid var(--p-border)' }} />
              <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>Optional + empty → gray</span>
            </div>
          </div>
        </div>

        {/* Input Types */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>Input Types</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--p-text-muted)' }}>Always use the most specific type for validation + correct mobile keyboard.</p>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--p-border)' }}>
                <th className="text-left py-2 font-medium" style={{ color: 'var(--p-text-muted)' }}>Data</th>
                <th className="text-left py-2 font-medium" style={{ color: 'var(--p-text-muted)' }}>type</th>
                <th className="text-left py-2 font-medium" style={{ color: 'var(--p-text-muted)' }}>inputMode</th>
              </tr>
            </thead>
            <tbody style={{ color: 'var(--p-text-body)' }}>
              <tr style={{ borderBottom: '1px solid var(--p-border-subtle)' }}><td className="py-2">Email</td><td><code>email</code></td><td><code>email</code></td></tr>
              <tr style={{ borderBottom: '1px solid var(--p-border-subtle)' }}><td className="py-2">Phone</td><td><code>tel</code></td><td><code>tel</code></td></tr>
              <tr style={{ borderBottom: '1px solid var(--p-border-subtle)' }}><td className="py-2">Website</td><td><code>url</code></td><td><code>url</code></td></tr>
              <tr style={{ borderBottom: '1px solid var(--p-border-subtle)' }}><td className="py-2">Number</td><td><code>number</code></td><td><code>numeric</code></td></tr>
              <tr><td className="py-2">Free text</td><td><code>text</code></td><td><code>text</code></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
