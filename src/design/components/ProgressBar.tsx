import { colors } from './tokens';

/**
 * Progress Bar
 *
 * Always GREEN fill — progress is positive, not a CTA.
 * Never use orange for progress bars.
 */
export function ProgressBar({
  value,
  label,
}: {
  /** Progress value between 0 and 1 */
  value: number;
  /** Optional label shown above the bar */
  label?: string;
}) {
  const percent = Math.min(1, Math.max(0, value)) * 100;

  return (
    <div>
      {label && (
        <p className="text-sm mb-1" style={{ color: colors.textMuted }}>{label}</p>
      )}
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.skeleton }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percent}%`,
            backgroundColor: colors.green,
          }}
        />
      </div>
    </div>
  );
}
