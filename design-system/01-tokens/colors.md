# Color Palette

**Canonical source. Supersedes all previous color definitions in CLAUDE.md, design.md, design-tokens.json, and index.css.**

---

## Functional Palette

Every color has ONE job. No color serves double duty.

| Token | Hex | Tailwind | Role | Rule |
|-------|-----|----------|------|------|
| **CTA Orange** | `#EA580C` | `orange-600` | Interactive elements ONLY | Clickable = orange. Not clickable = not orange. |
| **CTA Orange Hover** | `#C2410C` | `orange-700` | Hover/pressed states | Only on elements already orange |
| **CTA Orange Light** | `#FFF7ED` | `orange-50` | Subtle active/selected bg | Only behind an orange-labeled element |
| **Trust Navy** | `#0F172A` | `slate-900` | Headings, primary text | Default for all headings |
| **Body Text** | `#475569` | `slate-600` | Body copy, descriptions | Default for paragraphs |
| **Muted Text** | `#64748B` | `slate-500` | Metadata, timestamps, hints | Minimum for non-essential text |
| **Background** | `#F8FAFC` | `slate-50` | Page background | Light mode default canvas |
| **Surface** | `#FFFFFF` | `white` | Cards, modals, sheets | Elevated surfaces |
| **Surface Alt** | `#F1F5F9` | `slate-100` | Section backgrounds, zebra rows | Subtle differentiation |
| **Border** | `#E2E8F0` | `slate-200` | Dividers, card borders | Subtle, never heavy |
| **Success** | `#16A34A` | `green-600` | Checkmarks, verified, positive states | Confirmed/complete actions |
| **Error** | `#DC2626` | `red-600` | Errors, destructive actions, urgent warnings | Problems requiring action |
| **Info** | `#2563EB` | `blue-600` | Informational, non-CTA links, mild warnings | FYI-level communication |
| **Care Circle** | `#8B5CF6` | `violet-500` | People, avatars, relationships | Human/social elements |

### No Warning Color

There is no amber/yellow warning state. Amber is too close to our orange CTA and creates ambiguity.

- **Mild warning** → Use Info (blue). "Your profile is incomplete" = informational.
- **Urgent warning** → Use Error (red). "Your session expires in 2 minutes" = critical.

Two buckets. No ambiguity.

---

## CSS Variable Mapping

```css
:root {
  --cta: 24 95% 48%;           /* #EA580C */
  --cta-hover: 21 90% 41%;     /* #C2410C */
  --cta-foreground: 0 0% 100%; /* white text on CTA */
  --cta-light: 33 100% 96%;    /* #FFF7ED */

  --foreground: 222 47% 11%;   /* #0F172A - Trust Navy */
  --body: 215 19% 35%;         /* #475569 */
  --muted-foreground: 215 16% 47%; /* #64748B */

  --background: 210 40% 98%;   /* #F8FAFC */
  --surface: 0 0% 100%;        /* #FFFFFF */
  --surface-alt: 210 40% 96%;  /* #F1F5F9 */
  --border: 214 32% 91%;       /* #E2E8F0 */

  --success: 142 71% 35%;      /* #16A34A */
  --error: 0 72% 51%;          /* #DC2626 */
  --info: 217 91% 60%;         /* #2563EB */
  --care-circle: 258 58% 66%;  /* #8B5CF6 */
}
```

## Dark Mode

Auto-detect via `prefers-color-scheme`. User override stored in `localStorage('navis-theme')`.

```css
.dark {
  --cta: 24 95% 53%;           /* Slightly brighter orange for dark bg */
  --cta-hover: 21 90% 48%;
  --cta-light: 24 50% 15%;     /* Muted orange tint */

  --foreground: 210 40% 93%;   /* Light text */
  --body: 214 20% 75%;
  --muted-foreground: 215 20% 55%;

  --background: 222 47% 8%;    /* Deep navy */
  --surface: 222 30% 12%;
  --surface-alt: 222 25% 15%;
  --border: 222 25% 20%;

  --success: 142 71% 45%;
  --error: 0 72% 60%;
  --info: 217 91% 67%;
  --care-circle: 258 58% 72%;
}
```

---

## NEVER List

- Orange (`#EA580C`, `orange-600`, `orange-500`, `orange-700`) on text that isn't a link
- Orange backgrounds on sections, cards, or containers (unless it IS a button)
- Orange icons that aren't interactive
- Amber/yellow for any purpose (too close to CTA)
- Red for non-error states (red = something is wrong)
- Green for non-success states (green = something is confirmed/good)
- Using `primary`, `secondary`, `accent` CSS variables from old theme — migrate to new tokens

---

## Migration Notes

Previous color schemes to deprecate:
- `design.md`: Magenta `#C026D3` → replaced by Orange `#EA580C`
- `CLAUDE.md`: Teal CTAs → replaced by Orange
- `index.css`: Cyan `#06B6D4` as secondary → replaced by Orange
- `design-tokens.json`: Green `#22A252` primary → replaced by canonical palette above
