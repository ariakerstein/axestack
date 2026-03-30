// Curated color schemes for pitch decks
// Each scheme has bg, surface, text, muted, accent, and accent-text

export interface ColorScheme {
  id: string
  name: string
  preview: string // gradient preview for picker
  colors: {
    bg: string
    surface: string
    text: string
    muted: string
    accent: string
    accentText: string
    border: string
  }
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    preview: 'from-slate-900 to-slate-800',
    colors: {
      bg: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      muted: '#94a3b8',
      accent: '#38bdf8',
      accentText: '#0f172a',
      border: '#334155',
    },
  },
  {
    id: 'clean',
    name: 'Clean',
    preview: 'from-white to-slate-100',
    colors: {
      bg: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      muted: '#64748b',
      accent: '#0d9488',
      accentText: '#ffffff',
      border: '#e2e8f0',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    preview: 'from-blue-900 to-cyan-800',
    colors: {
      bg: '#0c4a6e',
      surface: '#075985',
      text: '#f0f9ff',
      muted: '#7dd3fc',
      accent: '#22d3ee',
      accentText: '#0c4a6e',
      border: '#0369a1',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    preview: 'from-orange-500 to-rose-600',
    colors: {
      bg: '#1c1917',
      surface: '#292524',
      text: '#fef3c7',
      muted: '#fbbf24',
      accent: '#f97316',
      accentText: '#1c1917',
      border: '#44403c',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    preview: 'from-emerald-800 to-green-900',
    colors: {
      bg: '#022c22',
      surface: '#064e3b',
      text: '#ecfdf5',
      muted: '#6ee7b7',
      accent: '#34d399',
      accentText: '#022c22',
      border: '#047857',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    preview: 'from-purple-900 to-indigo-900',
    colors: {
      bg: '#1e1b4b',
      surface: '#312e81',
      text: '#f5f3ff',
      muted: '#c4b5fd',
      accent: '#a78bfa',
      accentText: '#1e1b4b',
      border: '#4338ca',
    },
  },
  {
    id: 'coral',
    name: 'Coral',
    preview: 'from-rose-100 to-pink-100',
    colors: {
      bg: '#fff1f2',
      surface: '#ffe4e6',
      text: '#881337',
      muted: '#be123c',
      accent: '#f43f5e',
      accentText: '#ffffff',
      border: '#fecdd3',
    },
  },
  {
    id: 'monochrome',
    name: 'Mono',
    preview: 'from-neutral-900 to-neutral-800',
    colors: {
      bg: '#171717',
      surface: '#262626',
      text: '#fafafa',
      muted: '#a3a3a3',
      accent: '#fafafa',
      accentText: '#171717',
      border: '#404040',
    },
  },
]

// Generate CSS custom properties from a scheme
export function schemeToCss(scheme: ColorScheme): string {
  return `
    :root {
      --deck-bg: ${scheme.colors.bg};
      --deck-surface: ${scheme.colors.surface};
      --deck-text: ${scheme.colors.text};
      --deck-muted: ${scheme.colors.muted};
      --deck-accent: ${scheme.colors.accent};
      --deck-accent-text: ${scheme.colors.accentText};
      --deck-border: ${scheme.colors.border};
    }
  `
}

// Generate full theme styles for iframe injection
export function schemeToStyles(scheme: ColorScheme): string {
  return `
    body {
      margin: 0;
      background: ${scheme.colors.bg} !important;
      color: ${scheme.colors.text} !important;
    }
    section {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${scheme.colors.bg} !important;
      color: ${scheme.colors.text} !important;
      position: relative;
      padding: 4rem;
    }
    /* Slide chrome positioning */
    .slide-header {
      position: absolute;
      top: 2rem;
      left: 2rem;
    }
    .slide-logo {
      position: absolute;
      top: 2rem;
      right: 2rem;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      background: ${scheme.colors.surface};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      opacity: 0.7;
    }
    .slide-number {
      position: absolute;
      bottom: 2rem;
      right: 2rem;
      font-size: 0.875rem;
      color: ${scheme.colors.muted};
    }
    h1, h2, h3, h4, h5, h6 {
      color: ${scheme.colors.text} !important;
    }
    p, li, span:not(.accent), div:not(.card):not(.accent) {
      color: ${scheme.colors.muted} !important;
    }
    .card, [class*="bg-white"], [class*="bg-slate-"], [class*="bg-gray-"] {
      background: ${scheme.colors.surface} !important;
      border-color: ${scheme.colors.border} !important;
    }
    .accent, [class*="text-teal"], [class*="text-blue"], [class*="bg-teal"], [class*="bg-blue"] {
      color: ${scheme.colors.accent} !important;
    }
    [class*="bg-teal"], [class*="bg-blue"], button {
      background: ${scheme.colors.accent} !important;
      color: ${scheme.colors.accentText} !important;
    }
    table { border-color: ${scheme.colors.border} !important; }
    th, td { border-color: ${scheme.colors.border} !important; color: ${scheme.colors.muted} !important; }
    th { color: ${scheme.colors.text} !important; }
  `
}

// Unsplash image categories for pitch decks
export const UNSPLASH_CATEGORIES = [
  { id: 'technology', label: 'Tech', query: 'technology abstract minimal' },
  { id: 'business', label: 'Business', query: 'business office modern' },
  { id: 'data', label: 'Data', query: 'data visualization abstract' },
  { id: 'team', label: 'Team', query: 'diverse team collaboration' },
  { id: 'growth', label: 'Growth', query: 'growth chart upward' },
  { id: 'innovation', label: 'Innovation', query: 'innovation futuristic' },
  { id: 'nature', label: 'Nature', query: 'nature minimal clean' },
  { id: 'abstract', label: 'Abstract', query: 'abstract gradient shapes' },
]
