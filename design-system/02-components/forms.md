# Forms

## Why This System

The color-coded border system exists for one reason: **users should INSTANTLY see what they need to do.** At a glance — without reading labels or help text — they can scan the form and know:

- **Blue border** = "I still need to fill this in" (required + empty)
- **Green border** = "This is done" (valid value) or "I'm working on this" (focused)
- **Red border** = "Something's wrong here" (validation error)
- **Gray border** = "This is optional, no pressure" (optional + empty)

This eliminates the cognitive load of figuring out "what's left?" — the borders tell the story. Cancer patients in treatment have reduced cognitive capacity. Every second of confusion we save matters.

---

## Input

```
bg-white border border-slate-200 rounded-lg
p-3 text-base text-slate-900
min-h-[44px]
placeholder:text-slate-400
focus:ring-2 focus:ring-green-500 focus:border-green-500
transition-colors duration-[50ms]
```

- Dark mode: `bg-slate-900 border-slate-700 text-white`
- **16px minimum font** on mobile (prevents iOS auto-zoom)
- Focus ring uses **green** (you're actively working on it = positive reinforcement)

---

## Textarea

Same as Input, plus:
```
min-h-[100px] resize-y
leading-relaxed
```

---

## Select

Same visual treatment as Input. Uses native select on mobile for best UX.

```
appearance-none bg-white border border-slate-200 rounded-lg
p-3 pr-10 text-base
min-h-[44px]
```

Chevron indicator: slate-500, positioned right.

---

## Checkbox & Radio

```
w-5 h-5 rounded border-slate-300
checked:bg-green-600 checked:border-green-600
focus:ring-2 focus:ring-green-500
```

- 20px size (5 * 4px grid)
- Touch target: wrap in label with `min-h-[44px]` padding
- Checked/selected state uses **green** (valid selection = green, same as valid inputs)
- Unchecked uses default slate border

---

## Select (Dropdown)

Same visual treatment as Input, plus a chevron indicator:

```
appearance-none bg-white rounded-lg
p-3 pr-10 text-base
min-h-[44px]
```

- Chevron icon: `text-slate-400`, positioned right, `pointer-events-none`
- Use native select on mobile for best UX
- **When to use**: 6+ options, or when the list is dynamic

## Radio Button Group

For 2-5 static options, prefer a visible button group over a dropdown:

```
flex flex-wrap gap-2
```

Each option:
```
px-4 py-2.5 rounded-lg border-2 border-slate-200 cursor-pointer min-h-[44px]
checked: border-green-600 bg-green-50
```

- Selected state = green border + subtle green background
- All options visible at once — no hidden state
- **When to use**: 2-5 options that are short labels

## Combobox (Searchable Select)

For long lists (hospitals, drugs, doctors) where the user needs to search:

```
relative
input: pl-10 pr-10 (space for search icon left, chevron right)
```

- Search icon: `text-slate-400`, left side
- Chevron icon: `text-slate-400`, right side
- Dropdown list appears on focus, filtered by input
- **When to use**: 10+ options, or user likely knows what they're searching for

## Labels

```
text-sm font-medium text-slate-900
mb-1.5
```

- Always above the input, never inline
- Required indicator: red asterisk `*` (not orange)
- **Optional indicator**: Add `(optional)` in `text-slate-400 font-normal` after the label text. If a field is optional, say so explicitly.

---

## Input States (4-State System)

Inputs have 4 visual states based on required status and validation. The border color always communicates what the user needs to do.

### Required + Empty (Not Focused)
```
border-blue-500 border-2
```
Blue outline = "this still needs your attention." Clear visual signal of what's left to fill.

### Focused (Any field)
```
border-green-500 border-2 ring-2 ring-green-500/20
```
Green = "you're actively working here." Applies to ALL focused fields regardless of required/optional status.

### Unfocused + Valid
```
border-green-600 border-2
```
Green outline persists after valid input. "This one's done."

### Unfocused + Error
```
border-red-600 border-2
```
Red = "this needs fixing." Error message below:
```
text-sm text-red-600 mt-1
```

### Unfocused + Empty + Required
```
border-blue-500 border-2
```
Blue = "this still needs your attention."

### Unfocused + Empty + Optional
```
border-slate-200
```
Standard subtle border. No pressure.

### State Summary

| State | Border | Signal |
|-------|--------|--------|
| **Focused (any)** | `border-green-500 border-2 ring-2 ring-green-500/20` | "You're here, keep going" |
| **Unfocused + valid** | `border-green-600 border-2` | "Done, all good" |
| **Unfocused + error** | `border-red-600 border-2` | "Fix this" |
| **Unfocused + empty + required** | `border-blue-500 border-2` | "Fill this in" |
| **Unfocused + empty + optional** | `border-slate-200` | No pressure |

**Green is the universal positive signal:** focused = green, valid = green, checked = green. Orange is NEVER used on form elements.

### Info/Help
```
text-sm text-slate-500 mt-1
```
Help text below input in muted color.

---

## Form Layout

```
flex flex-col gap-4
```

- One field per row on mobile
- Side-by-side only above `sm:` breakpoint for related short fields (first/last name)
- Submit button at bottom, full-width on mobile
- Progressive: show one question at a time for wizards (see `03-patterns/conversion-flows.md`)

---

## Input Types

**Always use the most specific `type` attribute.** This enables browser-native validation, shows the correct mobile keyboard, and powers our border-color state system.

| Data | `type` | `inputMode` | Why |
|------|--------|-------------|-----|
| **Email** | `email` | `email` | Validates format, shows @ keyboard |
| **Phone** | `tel` | `tel` | Shows numeric keypad |
| **URL/Website** | `url` | `url` | Validates format, shows .com keyboard |
| **Number** | `number` | `numeric` | Validates numeric, shows number pad |
| **Password** | `password` | — | Masks input |
| **Search** | `search` | `search` | Shows search keyboard + clear button |
| **Date** | `date` | — | Native date picker |
| **Free text** | `text` | `text` | Default, no validation |

**Never use `type="text"` when a more specific type exists.** "test" in an email field should immediately show red border on blur because `type="email"` knows it's invalid.

---

## Validation Behavior

1. **On blur (leaving field)**: Validate immediately. If the value exists but is invalid → red border + error message. If valid → green border.
2. **On input (while typing)**: Don't show errors while typing (let them finish). But DO clear errors in real-time as they fix the value.
3. **On submit**: Validate all fields, scroll to first error.
4. **Required + empty on blur**: Switch from blue to blue (stays blue — they haven't tried yet). Only show red if they submitted the form.

---

## Rules

1. **44px minimum touch target** for all form elements
2. **16px font minimum** on mobile inputs
3. **Green for focus, valid, and checked states.** Green = positive signal across all form elements.
4. **Blue for required empty fields.** Blue = "still needs attention."
5. **No orange anywhere on form elements** — not on focus rings, not on checkboxes, not on radio buttons. Orange is for CTA buttons only.
6. **No orange labels or help text** — orange is for clickable elements
7. **Always use specific input types** (`email`, `tel`, `url`, `number`) — never `text` when a specific type applies
8. **Validate on blur**, show errors immediately when value is invalid

---

## Source

Components: `src/components/ui/input.tsx`, `form.tsx`, `select.tsx`, `checkbox.tsx`, `radio-group.tsx`, `label.tsx`
Mobile: `src/components/ui/mobile-optimized-input.tsx`
