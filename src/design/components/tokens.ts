/**
 * Design System Tokens
 *
 * CSS variable references as typed constants.
 * All values auto-switch between light/dark via preview-theme.css.
 * Use these instead of raw 'var(--p-*)' strings for autocomplete.
 */

export const colors = {
  // Surfaces
  bg: 'var(--p-bg)',
  surface: 'var(--p-surface)',
  surfaceAlt: 'var(--p-surface-alt)',
  surfaceHover: 'var(--p-surface-hover)',

  // Text
  text: 'var(--p-text)',
  textBody: 'var(--p-text-body)',
  textMuted: 'var(--p-text-muted)',
  textFaint: 'var(--p-text-faint)',
  textLabel: 'var(--p-text-label)',

  // Borders
  border: 'var(--p-border)',
  borderSubtle: 'var(--p-border-subtle)',
  borderStrong: 'var(--p-border-strong)',

  // Inputs
  inputBg: 'var(--p-input-bg)',

  // Status
  green: 'var(--p-green)',
  greenText: 'var(--p-green-text)',
  greenLight: 'var(--p-green-light)',
  greenFocus: 'var(--p-green-focus)',
  greenGlow: 'var(--p-green-glow)',

  red: 'var(--p-red)',
  redText: 'var(--p-red-text)',
  redLight: 'var(--p-red-light)',

  blue: 'var(--p-blue)',
  blueText: 'var(--p-blue-text)',
  blueLight: 'var(--p-blue-light)',

  violet: 'var(--p-violet)',
  violetLight: 'var(--p-violet-light)',

  // CTA
  orange: 'var(--p-orange)',
  orangeHover: 'var(--p-orange-hover)',
  orangeLight: 'var(--p-orange-light)',

  // Do/Don't
  doBg: 'var(--p-do-bg)',
  doBorder: 'var(--p-do-border)',
  doText: 'var(--p-do-text)',
  dontBg: 'var(--p-dont-bg)',
  dontBorder: 'var(--p-dont-border)',
  dontText: 'var(--p-dont-text)',

  // Skeleton
  skeleton: 'var(--p-skeleton)',
} as const;

export const timing = {
  fast: '50ms',
} as const;

export const spacing = {
  touchTarget: '44px',
  cardPadding: '24px',
  sectionGap: '48px',
} as const;
