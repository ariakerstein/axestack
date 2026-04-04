import { colors } from './tokens';

/**
 * Metric Display
 *
 * Shows a key number with a label underneath.
 * Used for dashboards, stats, at-a-glance data.
 */
export function MetricDisplay({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold" style={{ color: colors.text }}>{value}</p>
      <p className="text-sm" style={{ color: colors.textMuted }}>{label}</p>
    </div>
  );
}
