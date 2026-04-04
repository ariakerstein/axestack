# Spacing

## Grid

**4pt base grid.** All spacing values are multiples of 4px.

```
spacing(1)  = 4px    — micro gap
spacing(2)  = 8px    — tight gap
spacing(3)  = 12px   — compact padding
spacing(4)  = 16px   — default gap
spacing(5)  = 20px   — comfortable gap
spacing(6)  = 24px   — card padding
spacing(8)  = 32px   — section gap
spacing(10) = 40px   — generous gap
spacing(12) = 48px   — section padding
spacing(16) = 64px   — major section break
```

---

## Page Layout

```
Page padding:     px-6 pt-10 pb-12    (24px sides, 40px top, 48px bottom)
Max width:        max-w-5xl           (1024px for content)
Container center: mx-auto
```

---

## Component Spacing

| Element | Padding | Tailwind |
|---------|---------|----------|
| **Card** | 24px all | `p-6` |
| **Card compact** | 16px all | `p-4` |
| **Button** | 12px vertical, 24px horizontal | `py-3 px-6` |
| **Input** | 12px all | `p-3` |
| **Modal/Sheet** | 24px all | `p-6` |

---

## Between Elements

| Relationship | Gap | Tailwind |
|-------------|-----|----------|
| **Between cards** | 16-24px | `gap-4` or `gap-6` |
| **Between sections** | 48px | `py-12` or `gap-12` |
| **Between form fields** | 16px | `gap-4` |
| **Between icon and text** | 8px | `gap-2` |
| **Between badge and text** | 4-8px | `gap-1` or `gap-2` |

---

## Touch Targets

**Minimum 44px** for all interactive elements (buttons, links, checkboxes, etc.).

```css
min-height: 44px;
min-width: 44px;
```

This is an accessibility requirement (WCAG) and iOS/Android standard. No exceptions.

---

## Whitespace as Design

Generous spacing = visual "deep breath". Cancer patients are overwhelmed — cramped UI makes it worse.

- Prefer `gap-6` over `gap-4` when in doubt
- Never reduce spacing to "fit more in"
- Empty space is not wasted space — it's clarity
