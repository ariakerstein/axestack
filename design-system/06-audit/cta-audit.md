# CTA Color Audit

**Focused audit for CTA color discipline. Orange (#EA580C) must ONLY appear on clickable elements.**

---

## Step 1: Find All Orange Usage

Search the file for any of these:
- `orange-600`, `orange-500`, `orange-700`, `orange-50`
- `#EA580C`, `#F97316`, `#C2410C`, `#FFF7ED`
- `--cta`, `var(--cta)`
- `text-orange`, `bg-orange`, `border-orange`
- Old colors that may still be CTA-like: `cyan`, `#06B6D4`, `teal`, `magenta`, `#C026D3`

---

## Step 2: Classify Each Instance

For each orange usage, answer:

| Question | PASS | FAIL |
|----------|------|------|
| Is this element clickable? | Button, link, interactive control | Static text, decorative, icon-only |
| Does clicking it trigger an action? | Navigation, form submit, toggle | Nothing happens |
| Is it the right variant? | Primary = solid bg, Secondary = outline/text | Solid orange on secondary action |
| Is there only ONE primary (solid) orange per viewport? | Single primary CTA visible | Multiple competing solid orange buttons |

---

## Step 3: Check for Missing Orange

Elements that SHOULD be orange but aren't:
- [ ] Primary action button → should be solid orange
- [ ] Text links that navigate → should be orange text
- [ ] Active tab indicator → should be orange
- [ ] Interactive chevrons/arrows → should be orange

---

## Step 4: Check for Competing Colors

Elements that might confuse with CTA:
- [ ] **Amber/yellow anything** → Remove. Too close to orange.
- [ ] **Red badges** on non-error states → Could read as "urgent, click me"
- [ ] **Blue links** in body text → Acceptable for informational links (non-primary)
- [ ] **Colored backgrounds** on sections → Should be neutral (white/slate)

---

## Common Violations

| Violation | Fix |
|-----------|-----|
| Orange icon that isn't clickable | Change to `text-slate-400` or `text-slate-500` |
| Orange header/section title | Change to `text-slate-900` (Trust Navy) |
| Orange background on a card | Change to `bg-white` with `shadow-sm` |
| Orange badge/tag | Change to appropriate status color or `bg-slate-100` |
| Two solid orange buttons in one viewport | Demote one to outline or link variant |
| Amber/yellow warning | Change to Info (blue) or Error (red) |
| Old teal/cyan CTA still present | Replace with orange |
| Old magenta CTA still present | Replace with orange |

---

## Report Format

```
FILE: [filepath]
LINE [N]: [PASS/FAIL] — [element] uses [color] — [is/isn't] clickable
...

SUMMARY:
- Orange on clickable: [N] instances (PASS)
- Orange on non-clickable: [N] instances (FAIL)
- Missing orange on interactive: [N] instances (WARN)
- Competing CTA colors: [N] instances (FAIL)
- Legacy colors (cyan/magenta/teal): [N] instances (FAIL)
```
