# Page Layouts

## Base Page Template

Every page follows this structure:

```tsx
<div className="min-h-screen bg-background">
  <Header />           {/* Fixed top, compact */}
  <main className="max-w-5xl mx-auto px-6 pt-10 pb-12">
    {/* Page content */}
  </main>
  <Footer />           {/* Optional, light */}
</div>
```

---

## Layout Types

### Hub Layout (Home/CareHub)

Tabbed interface — the main app view.

```
Header (compact, sticky)
├── Tab Bar (Care | Records | Circle)
├── Active Tab Content
│   ├── Section 1 (e.g., Ask Bar)
│   ├── Section 2 (e.g., Gaps Preview)
│   └── Section 3 (e.g., Explore Cards)
└── Optional: Sticky bottom CTA (mobile)
```

- Tabs switch content instantly (0ms)
- Each tab has its own scroll position
- File: `src/pages/CareHub.tsx`

### Landing Page Layout

Full-width, conversion-focused. No app chrome.

```
Hero Section (value prop + primary CTA)
├── Social proof / trust signals
├── Feature sections (alternating)
├── Objection handling section
├── Final CTA (repeated)
└── Footer (minimal)
```

- No sidebar, no tabs
- Sticky mobile CTA after 400px scroll
- Each section: Headline → Objection handler → CTA
- Files: `src/pages/lp/*.tsx`, `src/pages/Index.tsx`

### Wizard/Funnel Layout

Step-by-step flow. One question per view.

```
Progress indicator (top)
├── Step content (centered, max-w-md)
│   ├── Question / prompt
│   ├── Input / selection
│   └── Continue button (primary CTA)
└── Back link (secondary, text)
```

- Centered content, narrow width (`max-w-md`)
- Progress bar or step dots at top
- Back = text link, Continue = primary orange button
- File: `src/pages/SecondOpinion.tsx` (PersonalizationWizard)

### Detail/Record Layout

For viewing documents, results, or detailed content.

```
Breadcrumb navigation
├── Title + metadata
├── Content body (generous leading-relaxed)
├── Related actions (cards)
└── Back navigation
```

---

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|-----------|-------|----------|
| **Mobile** | < 640px | Single column, full-width cards, sticky CTA, sheet navigation |
| **Tablet** | 640-1024px | 2-column grids, side-by-side cards |
| **Desktop** | > 1024px | Optional sidebar, wider content, dialog over sheet |

**Mobile is the primary viewport.** Design mobile first, enhance for larger screens.

---

## Section Pattern (Mobile)

Every scrollable section follows this rhythm:

```
Headline (frontloaded benefit)
↓
Address the #1 objection for this moment
↓
CTA (visible without scrolling from section start)
↓
Next section...
```

This maps to the PCP model: Perception (headline) → Context (objection handling) → Permission (CTA).

---

## Rules

1. **Max content width: 1024px** (`max-w-5xl`). Don't stretch full-width.
2. **Page padding: `px-6 pt-10 pb-12`** consistently.
3. **One primary CTA visible** at any scroll position on mobile.
4. **Section spacing: `py-12` or `gap-12`** between major sections.
5. **No full-width colored backgrounds** on app pages (landing pages can use subtle backgrounds).
