# Buttons

## Variants

### Primary (The Main CTA)

Solid orange background, white text. **ONE per visible viewport.**

```tsx
<Button variant="default">Get Your Checklist</Button>
```

```
bg-orange-600 text-white hover:bg-orange-700
rounded-lg px-6 py-3 font-semibold text-lg
min-h-[44px]
transition-colors duration-[50ms]
```

- Full-width on mobile (`w-full` below `sm:`)
- Pill shape optional for landing pages (`rounded-full`)
- Start CTA text with a verb: "Get", "See", "Find", "Start"

### Secondary

Orange outline or orange text link. Supports the primary, never competes.

**Outline variant:**
```tsx
<Button variant="outline">Share Results</Button>
```
```
border-orange-600 text-orange-600 bg-transparent
hover:bg-orange-50
rounded-lg px-6 py-3 font-medium text-base
```

**Link variant:**
```tsx
<Button variant="link">View details</Button>
```
```
text-orange-600 underline-offset-4 hover:underline
font-medium text-base p-0
```

### Ghost

For navigation actions, close buttons, icon-only actions. No orange.

```
text-slate-600 hover:bg-slate-100
rounded-lg px-3 py-2
```

### Destructive

For delete, remove, cancel actions. Red, used sparingly.

```
bg-red-600 text-white hover:bg-red-700
rounded-lg px-6 py-3
```

---

## Sizes

| Size | Height | Padding | Font | Use |
|------|--------|---------|------|-----|
| **sm** | 36px (`h-9`) | `px-3 py-2` | `text-sm` | Inline actions, table rows |
| **default** | 44px (`h-11`) | `px-6 py-3` | `text-base` | Standard buttons |
| **lg** | 48px (`h-12`) | `px-8 py-3` | `text-lg` | Landing page CTAs |

All sizes maintain 44px minimum touch target (sm uses padding to reach it).

---

## States

| State | Treatment |
|-------|-----------|
| **Hover** | Darken background by one shade (600→700). 50ms transition. |
| **Active/Pressed** | Darken further (700→800). Scale not needed at 50ms. |
| **Disabled** | 50% opacity, `cursor-not-allowed`, no hover effect |
| **Loading** | Replace text with spinner, maintain width, disable clicks |
| **Focus** | 2px ring in CTA orange, offset 2px |

---

## Rules

1. **ONE primary button per viewport.** If you need two actions, one is primary, one is secondary.
2. **Orange = clickable.** If it's orange, clicking it MUST do something.
3. **Verb-first labels.** "Get your plan" not "Your plan". "Upload records" not "Records upload".
4. **No orange ghost buttons.** Ghost buttons are navigation/utility — they use slate.
5. **Full-width on mobile.** Primary buttons go `w-full` below `sm:` breakpoint.
6. **Sticky CTA on long mobile pages.** Fixed bottom bar with primary CTA for scroll-heavy pages.

---

## Source

Component: `src/components/ui/button.tsx`
Mobile variant: `src/components/ui/mobile-optimized-button.tsx`
