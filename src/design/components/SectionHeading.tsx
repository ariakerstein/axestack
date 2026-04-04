import { colors } from './tokens';

/**
 * Section Heading
 *
 * Color-coded section headers that match their content's sentiment.
 * If content uses red numbers → variant="danger".
 * If content is positive/instructional → variant="success".
 * If content is informational → variant="info".
 *
 * Rule: heading color must match content color-coding.
 */
export function SectionHeading({
  children,
  variant = 'default',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'danger' | 'success' | 'info';
  className?: string;
}) {
  const colorMap = {
    default: colors.textMuted,
    danger: colors.redText,
    success: colors.greenText,
    info: colors.blueText,
  };

  return (
    <h3
      className={`text-sm font-semibold uppercase tracking-wider ${className}`}
      style={{ color: colorMap[variant] }}
    >
      {children}
    </h3>
  );
}
