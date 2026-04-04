# opencancer.ai Design System

## Color Palette

### Primary Colors
- **Near Black**: `#0a0a0a` / `slate-900` - Primary text, headers, featured borders
- **Off-White Background**: `#f5f3ee` - Page backgrounds
- **White**: `#ffffff` / `white` - Card backgrounds
- **Terracotta**: `#C66B4A` - Primary accent (CTAs, badges, highlights)
  - Hover: `#B35E40`

### Neutral Grays
- `slate-900` - Headers, primary text
- `slate-700` - Body text
- `slate-600` - Secondary text
- `slate-500` - Muted text
- `slate-400` - Placeholder text
- `stone-200` - Borders
- `stone-100` - Subtle backgrounds

### Usage Rules
1. **Terracotta appears in exactly 3 places:**
   - Primary CTA buttons ("Start Here", main actions)
   - Featured badges ("Most popular", "Trending")
   - Highlighted elements (dates, key accents)

2. **No gradients** - Warmth comes from:
   - Off-white background (`#f5f3ee`)
   - Terracotta accents
   - Not from purple-pink transitions

3. **Everything else**: Black, white, warm gray

## Typography

### Fonts
- System font stack: `-apple-system, 'Helvetica Neue', Arial, sans-serif`

### Hierarchy
- Page titles: `text-4xl md:text-5xl font-bold text-slate-900`
- Section headers: `text-2xl font-bold text-slate-900`
- Card titles: `font-bold text-slate-900`
- Body: `text-slate-700` or `text-slate-600`
- Captions: `text-xs text-slate-400`

## Components

### Buttons

**Primary CTA (Terracotta)**
```
bg-[#C66B4A] hover:bg-[#B35E40] text-white font-semibold rounded-xl shadow-lg shadow-[#C66B4A]/25
```

**Secondary (Black)**
```
bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl
```

**Ghost/Outline**
```
border border-stone-300 hover:border-slate-900 text-slate-700 rounded-xl
```

**Sign In (Nav pill)**
```
border border-stone-300 hover:border-slate-400 text-slate-700 rounded-full
```

### Cards

**Featured Card (thick border)**
```
bg-white border-2 border-slate-900 rounded-xl
```

**Standard Card**
```
bg-white border border-stone-200 rounded-xl hover:border-slate-400
```

### Badges

**Featured Badge (Terracotta)**
```
bg-[#C66B4A] text-white text-[10px] font-medium px-2.5 py-1 rounded
```

**Standard Badge**
```
bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded
```

### Navbar
```
bg-[#f5f3ee] border-b border-stone-200
```

### Footer
```
border-t border-stone-200 py-8
"Free for every patient. Built by a cancer survivor."
```

## Spacing

- Section padding: `py-12 px-8`
- Card padding: `p-5` or `p-6`
- Max content width: `max-w-4xl mx-auto`

## Visual Language

### Logo
- B&W mark in navbar (200x32 nav-lockup-black.svg)
- No gradients in logo
- "Scandinavian, serious, timeless"

### The Rule
> The logo says "Scandinavian, serious, timeless" and the page should match.
> Restraint is what makes it feel sophisticated.

## Files

### Logo Assets (in /public/)
- `favicon.svg` - 32x32 browser tab
- `nav-lockup-black.svg` - 200x32 header nav
- `mark.svg` / `mark-white.svg` - 72x72 standalone
- `og-image.svg` / `og-image.png` - 1200x630 social sharing
- `apple-touch-icon.png` - 180x180 iOS

---

*Design system codified April 2025*
