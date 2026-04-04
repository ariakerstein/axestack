import { colors } from './tokens';

/**
 * Empty State
 *
 * Shown when there's no content. ALWAYS has a CTA — never a dead end.
 * Centered layout with large icon, title, description, and action button.
 */
export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCta,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  onCta?: () => void;
}) {
  return (
    <div className="text-center py-12">
      {icon ? (
        <div className="mb-4">{icon}</div>
      ) : (
        <svg className="w-12 h-12 mx-auto mb-4" style={{ color: colors.borderStrong }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      <p className="text-lg font-semibold mb-1" style={{ color: colors.text }}>{title}</p>
      <p className="text-base mb-4" style={{ color: colors.textMuted }}>{description}</p>
      <button
        type="button"
        onClick={onCta}
        className="rounded-lg px-6 py-3 font-semibold min-h-[44px] transition-colors duration-[50ms]"
        style={{ backgroundColor: colors.orange, color: 'white' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.orangeHover; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.orange; }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
