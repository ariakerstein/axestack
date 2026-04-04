# Typography

## Font

**Inter** — clean, highly legible sans-serif. Already loaded via Google Fonts.

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

---

## Scale

| Level | Size | Tailwind | Weight | Use |
|-------|------|----------|--------|-----|
| **Hero** | 30px | `text-3xl` | `font-semibold` (600) | Page titles, landing headlines |
| **Section** | 20px | `text-xl` | `font-semibold` (600) | Section headers, card titles |
| **Body** | 18px | `text-lg` | `font-normal` (400) | Body copy, CTAs, descriptions |
| **Secondary** | 16px | `text-base` | `font-normal` (400) | Supporting text, form labels |
| **Meta** | 14px | `text-sm` | `font-normal` (400) | Timestamps, badges, captions |
| **Tiny** | 12px | `text-xs` | `font-medium` (500) | Legal text only — AVOID |

### Rules

- **Minimum interactive text**: 16px (`text-base`). Nothing smaller on buttons, links, or form inputs.
- **Minimum readable text**: 14px (`text-sm`). Use sparingly for metadata only.
- **Mobile inputs**: Must be 16px+ to prevent iOS auto-zoom.

---

## Line Height

| Context | Tailwind | Ratio | Why |
|---------|----------|-------|-----|
| **Headings** | `leading-tight` | 1.25 | Compact, scannable |
| **Body text** | `leading-relaxed` | 1.625 | Generous for cognitive fatigue / chemo brain |
| **UI labels** | `leading-normal` | 1.5 | Default comfortable |

---

## Color

- **Headings**: Trust Navy `#0F172A` (`text-slate-900`)
- **Body**: Body Text `#475569` (`text-slate-600`)
- **Muted**: Muted Text `#64748B` (`text-slate-500`)
- **Links**: CTA Orange `#EA580C` (`text-orange-600`) — clickable text only
- **Error text**: `#DC2626` (`text-red-600`)
- **Success text**: `#16A34A` (`text-green-600`)

---

## Frontloading

Every heading and body text must front-load the most important information:

| Bad | Good |
|-----|------|
| "Our analysis has identified 3 missing tests" | "3 tests missing from your plan" |
| "Click here to get started" | "Get your checklist" |
| "We have found that your treatment..." | "Your treatment may be missing..." |

First 2-3 words carry the meaning. Users scan, they don't read.

---

## Dark Mode

- Headings: `text-slate-100` (light)
- Body: `text-slate-300`
- Muted: `text-slate-400`
- Links remain orange (CTA Orange adjusts slightly brighter in dark mode)
