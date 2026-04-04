# Mobile-First Design

**CRITICAL: Most users are on mobile. This is the primary viewport, not an afterthought.**

---

## Core Mobile Layout

Every mobile screen follows this structure:

```
┌─────────────────────┐
│  Header (compact)    │
├─────────────────────┤
│                     │
│  Section Headline   │  ← Benefit-first, scannable
│  Objection handler  │  ← Address #1 concern
│  [  PRIMARY CTA  ]  │  ← Full-width orange
│                     │
├─────────────────────┤
│                     │
│  Next Section...    │
│                     │
├─────────────────────┤
│  Sticky CTA (if     │  ← Appears after scroll
│  long page)         │
└─────────────────────┘
```

---

## Section-by-Section Design

For each section on a page, document and design for:

1. **User mindset**: What are they thinking/feeling at this scroll position?
2. **Biggest objection**: What might stop them from continuing?
3. **Objection handler**: How does this section address that objection?
4. **CTA**: What's the one action? Is it visible without scrolling past the section?

### Example: Landing Page Hero

| Element | Content |
|---------|---------|
| **Mindset** | "I just got diagnosed. I'm scared. Is this legit?" |
| **Objection** | "How do I know this is trustworthy?" |
| **Handler** | Trust badges, founder credentials, "board-certified oncologists" |
| **CTA** | "Get Your Free Checklist" (full-width orange) |

---

## Touch Targets

```
min-h-[44px] min-w-[44px]
```

**44px minimum for ALL interactive elements.** No exceptions.

- Buttons: at least 44px tall
- Links: wrap in sufficient padding
- Checkboxes/radios: 44px tap area via label
- Close buttons: 44px, even if the icon is 16px

---

## Safe Areas

For devices with notches, home indicators, rounded corners:

```css
padding-bottom: env(safe-area-inset-bottom);
padding-top: env(safe-area-inset-top);
```

Tailwind utilities: `pb-safe`, `pt-safe`, `safe-x`, `safe-y`

Apply to:
- Fixed bottom elements (sticky CTAs, bottom nav)
- Full-screen overlays
- Sheet footers

---

## Input Handling

- **Font size 16px+** on all inputs — prevents iOS auto-zoom
- **Native selects** on mobile — better UX than custom dropdowns
- **`inputmode` attribute** — show appropriate keyboard (email, numeric, tel)
- **No multi-column forms** on mobile — always single column
- **Autocomplete attributes** — reduce typing

---

## Navigation

- **Sheet-first**: Bottom drawers, not centered modals
- **Hamburger menu**: For secondary navigation
- **Bottom tabs**: If app-like feel is needed (max 5 items)
- **No hover-dependent features**: Everything must work with tap
- **Swipe gestures**: Back navigation, sheet dismissal

---

## Viewport

```css
width: 100vw;
overflow-x: clip; /* Prevent horizontal scroll */
```

- Lock viewport width
- Never allow horizontal scrolling
- Use `dvh` for full-height layouts (dynamic viewport height)

---

## Content Priorities on Mobile

| Priority | What | Why |
|----------|------|-----|
| 1 | Primary CTA | The ONE thing to do |
| 2 | Value proposition | Why they should act |
| 3 | Trust signal | Why they should trust us |
| 4 | Supporting content | Details for those who need them |

Everything else: hide behind "Show more" or remove.

---

## Sticky CTA Pattern

For pages that scroll (landing pages, long results):

```
fixed bottom-0 inset-x-0
bg-white/95 backdrop-blur-sm
border-t border-slate-200
p-4 pb-safe
z-50
```

- Appears after 400px scroll
- ONE button, full-width, primary orange
- Fades in (50ms)
- Hides when user scrolls back to top hero area

---

## Performance on Mobile

- Images: lazy load below fold, proper sizing with `srcset`
- Fonts: Inter preloaded, no FOUT
- Interactions: 50ms max response time
- Skeleton states: show immediately while content loads
- Bundle: code-split routes for fast initial load

---

## Rules

1. **Design at 375px first.** Scale UP, never down.
2. **One CTA per viewport.** Always visible without scrolling past it.
3. **Section = Headline + Objection + CTA.** Rhythm that converts.
4. **44px touch targets.** No tiny buttons or links.
5. **No horizontal scroll.** Ever.
6. **Sheet over dialog.** Bottom drawers are native mobile UX.
7. **Full-width buttons.** Primary CTAs go edge-to-edge (with padding).
8. **Test on real devices.** Emulators lie about touch targets and safe areas.
