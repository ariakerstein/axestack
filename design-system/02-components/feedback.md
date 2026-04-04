# Feedback & Status

## Toast (Sonner)

Brief notification for action results. Auto-dismisses.

```
bg-white rounded-xl shadow-lg border border-slate-200
p-4 flex items-center gap-3
```

### Variants

| Type | Icon Color | Use |
|------|-----------|-----|
| **Success** | Green `#16A34A` | Action completed ("Record uploaded") |
| **Error** | Red `#DC2626` | Action failed ("Upload failed, try again") |
| **Info** | Blue `#2563EB` | FYI notification ("New results available") |

- Position: top-center on mobile, top-right on desktop
- Duration: 4 seconds, dismissible
- No orange toasts — orange is for CTAs
- Appears in 50ms

---

## Alert

Persistent inline message. Stays until dismissed or resolved.

```
rounded-xl p-4 flex items-start gap-3
border-l-4
```

| Type | Border | Background | Icon |
|------|--------|------------|------|
| **Error** | `border-red-600` | `bg-red-50` | AlertCircle red |
| **Info** | `border-blue-600` | `bg-blue-50` | Info blue |
| **Success** | `border-green-600` | `bg-green-50` | CheckCircle green |

- No amber/warning variant (see `01-tokens/colors.md`)
- Title: `font-semibold text-slate-900`
- Body: `text-slate-600 text-sm`

---

## Skeleton Loading

Used while content loads. Preferred over spinners.

```
bg-slate-200 rounded animate-pulse
```

- Match the shape of the content being loaded
- For text: multiple lines at varying widths
- For cards: full card skeleton with rounded corners
- For images: aspect-ratio matched rectangle
- Duration: CSS animation (continuous, subtle)

---

## Progress

### Progress Bar
```
bg-slate-200 rounded-full h-2
```
Fill: `bg-green-600 rounded-full` — progress is positive, green reinforces "you're doing well." Never orange (too close to error).

### Step Indicator
For wizards/multi-step flows:
```
flex items-center gap-2
```
- Completed step: green circle with checkmark
- Current step: green solid circle (active, progressing)
- Future step: slate-200 circle (inactive)

### File Upload
- Dedicated drop zone: dashed border, hover turns green
- **Full-page drop zone**: entire page becomes a drop target when dragging files (like Slack). Green overlay with "Drop your file anywhere" message.
- Accepted formats and size limit shown in help text

---

## Empty States

When there's no content to show.

```
text-center py-12
```

- Icon: 48px, slate-300
- Headline: `text-lg font-semibold text-slate-900` — frontloaded benefit
- Description: `text-base text-slate-500` — what to do
- CTA: Primary button to take action

Example: "No records yet" → "Upload your first record to find gaps in your care"

---

## Rules

1. **No orange toasts or alerts** — orange is for CTAs only
2. **Skeletons over spinners** — always match content shape
3. **Front-load feedback text** — "Record uploaded" not "Your record has been successfully uploaded"
4. **Empty states have CTAs** — never a dead end
5. **4-second toast duration** — enough to read, not annoying

---

## Source

Components: `src/components/ui/sonner.tsx`, `toast.tsx`, `alert.tsx`, `skeleton.tsx`, `progress.tsx`
