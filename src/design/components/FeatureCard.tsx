import { colors } from './tokens';
import { useState } from 'react';

/**
 * Feature Card (Compact)
 *
 * Clickable card with icon, orange title, description, and chevron.
 * Whole card is interactive — hover shows orange border.
 * Used for feature discovery (ExploreCard pattern).
 */
export function FeatureCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full rounded-2xl shadow-sm p-4 flex items-center gap-4 cursor-pointer text-left transition-all duration-[50ms]"
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${hovered ? colors.orange : colors.border}`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: colors.surfaceAlt }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold" style={{ color: colors.orange }}>{title}</p>
        <p className="text-sm truncate" style={{ color: colors.textMuted }}>{description}</p>
      </div>
      <svg className="w-5 h-5 flex-shrink-0" style={{ color: colors.orange }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
