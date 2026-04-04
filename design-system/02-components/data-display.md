# Data Display

## Badges

Small labels for status, category, or metadata.

### Variants

| Variant | Style | Use |
|---------|-------|-----|
| **Default** | `bg-slate-100 text-slate-700` | Generic category |
| **Success** | `bg-green-50 text-green-700` | Verified, complete, matched |
| **Error** | `bg-red-50 text-red-700` | Missing, overdue, failed |
| **Info** | `bg-blue-50 text-blue-700` | New, informational, pending |
| **Care Circle** | `bg-violet-50 text-violet-700` | People, relationships |

```
rounded-full px-3 py-1 text-xs font-medium
```

### Rules
- **No orange badges.** Orange = clickable. Badges are informational.
- **No amber/yellow badges.** Amber doesn't exist in our palette.
- Badges are not buttons — they don't have hover states or click handlers
- Maximum 2 badges per element

---

## Tables

For structured data display (admin, records, results).

```
w-full text-left
```

### Header
```
bg-slate-50 text-sm font-medium text-slate-500
px-4 py-3 border-b border-slate-200
```

### Row
```
px-4 py-3 border-b border-slate-100
text-base text-slate-900
hover:bg-slate-50
```

### Rules
- Sortable columns: icon indicator (chevron), clickable header
- On mobile: horizontal scroll with sticky first column, or collapse to card layout
- Zebra striping optional: `even:bg-slate-50`

---

## Metric / Stat Display

For showing key numbers (test gaps, progress, scores).

```
flex flex-col items-center
```

- Number: `text-3xl font-bold text-slate-900`
- Label: `text-sm text-slate-500`
- Trend indicator: green arrow up / red arrow down (not orange)

---

## Avatar

For care circle members, profile photos.

```
rounded-full bg-violet-100 text-violet-600
flex items-center justify-center
font-semibold
```

| Size | Dimension | Font |
|------|-----------|------|
| **sm** | 32px (`w-8 h-8`) | `text-xs` |
| **md** | 40px (`w-10 h-10`) | `text-sm` |
| **lg** | 56px (`w-14 h-14`) | `text-lg` |

- Uses violet (Care Circle color) for initials fallback
- Image: `object-cover rounded-full`
- Group: overlap with `-space-x-2`, max 4 visible + "+N"

---

## Icons

All from **lucide-react**.

| Size | Dimension | Use |
|------|-----------|-----|
| **sm** | 16px | Inline with text, badges |
| **md** | 20-24px | Buttons, nav, cards |
| **lg** | 32px | Empty states, feature highlights |

### Color Rules
- **Interactive icons** (inside CTA buttons/links): inherit parent color (orange from CTA parent). Icon should be part of a clickable element, never a standalone orange icon.
- **Decorative icons** (in cards, lists, metadata): `text-slate-400` or `text-slate-500`
- **Status icons**: match status color (green/red/blue)
- **Never** standalone orange icons outside of a button or link element

---

## Rules

1. **No orange on informational elements** — badges, metrics, decorative icons stay in their lane
2. **Tables collapse to cards on mobile** — don't force horizontal scroll unless necessary
3. **Avatars use violet** — the Care Circle color, warm and human
4. **Icons from lucide-react only** — one icon library, consistent style

---

## Source

Components: `src/components/ui/badge.tsx`, `table.tsx`, `avatar.tsx`, `src/components/ui/icons.tsx`
