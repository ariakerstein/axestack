import { colors } from './tokens';

/**
 * Status Card
 *
 * Card with colored left border indicating status.
 * Never use orange border (orange = clickable CTA).
 */
export function StatusCard({
  title,
  subtitle,
  status,
  statusLabel,
}: {
  title: string;
  subtitle?: string;
  status: 'success' | 'error' | 'info';
  statusLabel: string;
}) {
  const statusColors = {
    success: colors.green,
    error: colors.red,
    info: colors.blue,
  };
  const statusTextColors = {
    success: colors.greenText,
    error: colors.redText,
    info: colors.blueText,
  };

  return (
    <div
      className="rounded-2xl shadow-sm p-6"
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderLeft: `4px solid ${statusColors[status]}`,
      }}
    >
      <p className="text-sm font-medium mb-1" style={{ color: statusTextColors[status] }}>{statusLabel}</p>
      <p className="text-xl font-semibold" style={{ color: colors.text }}>{title}</p>
      {subtitle && <p className="text-sm mt-1" style={{ color: colors.textMuted }}>{subtitle}</p>}
    </div>
  );
}
