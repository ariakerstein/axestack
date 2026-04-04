/**
 * Custom checkbox for design preview pages.
 * Uses CSS variables, works in light + dark mode.
 * Replaces native <input type="checkbox"> which looks bad in dark mode.
 */
export function CheckItem({
  checked,
  onChange,
  children,
  className = '',
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex items-start gap-3 w-full text-left rounded-xl p-3 min-h-[44px] cursor-pointer transition-all duration-[50ms] ${className}`}
      style={{
        backgroundColor: checked ? 'var(--p-green-light)' : 'var(--p-surface-alt)',
      }}
    >
      <div
        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-[50ms]"
        style={{
          backgroundColor: checked ? 'var(--p-green)' : 'transparent',
          border: checked ? 'none' : '2px solid var(--p-border-strong)',
        }}
      >
        {checked && (
          <svg className="w-3 h-3" style={{ color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span
        className="text-sm flex-1"
        style={{
          color: checked ? 'var(--p-green-text)' : 'var(--p-text-body)',
          textDecoration: checked ? 'line-through' : 'none',
        }}
      >
        {children}
      </span>
    </button>
  );
}
