import { cn } from './utils';
import tokens from './design-tokens.json';

// Typography helpers
export const typography = {
  heading1: 'text-3xl font-bold',
  heading2: 'text-2xl font-bold',
  heading3: 'text-xl font-semibold',
  heading4: 'text-lg font-semibold',
  heading5: 'text-base font-semibold',
  heading6: 'text-sm font-semibold',
  body: 'text-base',
  bodySmall: 'text-sm',
  caption: 'text-xs',
  mono: 'font-mono',
  code: 'font-mono text-sm bg-muted px-1.5 py-0.5 rounded',
  citation: 'text-blue-400 font-mono text-xs px-1 align-super',
};

// Spacing helpers based on 4pt grid
export const spacing = {
  px: (value: number) => `${value * 4}px`,
  rem: (value: number) => `${value * 0.25}rem`, // 1 unit = 0.25rem = 4px
  class: (value: number) => `p-${value}`, // p-1 = 4px, p-2 = 8px, etc.
};

// Layout helpers
export const layout = {
  container: 'max-w-content mx-auto px-4',
  responsive: {
    stack: 'flex flex-col',
    row: 'flex flex-row',
    grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  },
};

// Button helpers
export const button = {
  base: 'min-h-[44px] min-w-[44px] px-4 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  sizes: {
    sm: 'text-sm px-3',
    md: 'text-base px-4',
    lg: 'text-lg px-6',
  },
};

// Icon helpers
export const icon = {
  base: 'w-6 h-6', // 24px standard
  sizes: {
    sm: 'w-4 h-4', // 16px
    md: 'w-6 h-6', // 24px
    lg: 'w-8 h-8', // 32px
  },
};

// Card helpers
export const card = {
  base: 'bg-card text-card-foreground rounded-lg border shadow-sm',
  header: 'p-4 font-semibold border-b',
  content: 'p-4',
  footer: 'p-4 border-t',
};

// Form element helpers
export const form = {
  input: 'min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  label: 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  select: 'min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  checkbox: 'min-w-[20px] min-h-[20px] rounded border border-primary',
};

// Accessibility helpers
export const a11y = {
  srOnly: 'sr-only',
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  touchTarget: 'min-h-[44px] min-w-[44px]',
};

// Responsive helpers
export const responsive = {
  hidden: {
    mobile: 'hidden xs:block',
    tablet: 'hidden md:block',
    desktop: 'hidden lg:block',
  },
  visible: {
    mobileOnly: 'block xs:hidden',
    tabletOnly: 'hidden xs:block md:hidden',
    desktopOnly: 'hidden lg:block',
  },
};

// Contrast checker for accessibility
export const getContrastRatio = (foreground: string, background: string): number => {
  // This is a simplified version - in a real app you'd want to use a proper color library
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    // Calculate luminance
    const rgb = [r, g, b].map(c => {
      if (c <= 0.03928) {
        return c / 12.92;
      }
      return Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  
  const luminance1 = getLuminance(foreground);
  const luminance2 = getLuminance(background);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

// Check if a contrast ratio meets WCAG AA standards
export const meetsWCAGAA = (contrastRatio: number): boolean => {
  return contrastRatio >= 4.5;
};

// Helper to combine design system classes with custom classes
export const createClassName = (baseClasses: string, customClasses?: string): string => {
  return cn(baseClasses, customClasses);
};

export default {
  typography,
  spacing,
  layout,
  button,
  icon,
  card,
  form,
  a11y,
  responsive,
  getContrastRatio,
  meetsWCAGAA,
  createClassName,
}; 