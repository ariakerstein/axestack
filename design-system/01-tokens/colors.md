# Color Palette

**Canonical source. Supersedes all previous color definitions in CLAUDE.md, design.md, design-tokens.json, and index.css.**

---

## Monochrome by Default

The UI is black, white, and gray. Color appears ONLY when it carries meaning. Everything else is neutral grayscale — headers, body text, borders, backgrounds, cards. This is not minimalism for aesthetics. It's clarity for people in crisis.

---

## Functional Palette

Every color has ONE job. No color serves double duty.

### Neutral Foundation (grayscale only)

| Token | Hex | Tailwind | Role | Rule |
|-------|-----|----------|------|------|
| **Heading Text** | `#0A0A0A` | `neutral-950` | Headings, primary text | Default for all headings |
| **Body Text** | `#525252` | `neutral-600` | Body copy, descriptions | Default for paragraphs |
| **Muted Text** | `#737373` | `neutral-500` | Metadata, timestamps, hints | Minimum for non-essential text |
| **Background** | `#FAFAFA` | `neutral-50` | Page background | Light mode default canvas |
| **Surface** | `#FFFFFF` | `white` | Cards, modals, sheets | Elevated surfaces |
| **Surface Alt** | `#F5F5F5` | `neutral-100` | Section backgrounds, zebra rows | Subtle differentiation |
| **Border** | `#E5E5E5` | `neutral-200` | Dividers, card borders | Subtle, never heavy |

### Semantic Colors (meaning only)

| Token | Hex | Tailwind | Role | Rule |
|-------|-----|----------|------|------|
| **CTA Orange** | `#EA580C` | `orange-600` | What matters most right now | The action, the answer, the thing that moves them forward |
| **CTA Orange Hover** | `#C2410C` | `orange-700` | Hover/pressed states | Only on elements already orange |
| **CTA Orange Light** | `#FFF7ED` | `orange-50` | Subtle active/selected bg | Only behind an orange-labeled element |
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
  /* Neutral foundation */
  --foreground: 0 0% 4%;           /* #0A0A0A - Heading Text */
  --body: 0 0% 32%;                /* #525252 */
  --muted-foreground: 0 0% 45%;    /* #737373 */

  --background: 0 0% 98%;          /* #FAFAFA */
  --surface: 0 0% 100%;            /* #FFFFFF */
  --surface-alt: 0 0% 96%;         /* #F5F5F5 */
  --border: 0 0% 90%;              /* #E5E5E5 */

  /* Semantic — color carries meaning */
  --cta: 24 95% 48%;               /* #EA580C */
  --cta-hover: 21 90% 41%;         /* #C2410C */
  --cta-foreground: 0 0% 100%;     /* white text on CTA */
  --cta-light: 33 100% 96%;        /* #FFF7ED */

  --success: 142 71% 35%;          /* #16A34A */
  --error: 0 72% 51%;              /* #DC2626 */
  --info: 217 91% 60%;             /* #2563EB */
  --care-circle: 258 58% 66%;      /* #8B5CF6 */
}
```

## Dark Mode

Auto-detect via `prefers-color-scheme`. User override stored in `localStorage('navis-theme')`.

```css
.dark {
  /* Neutral foundation — same hue-free approach */
  --foreground: 0 0% 98%;          /* #FAFAFA */
  --body: 0 0% 83%;                /* #D4D4D4 */
  --muted-foreground: 0 0% 64%;    /* #A3A3A3 */

  --background: 0 0% 4%;           /* #0A0A0A */
  --surface: 0 0% 9%;              /* #171717 */
  --surface-alt: 0 0% 15%;         /* #262626 */
  --border: 0 0% 25%;              /* #404040 */

  /* Semantic — slightly brighter for dark bg */
  --cta: 24 95% 53%;
  --cta-hover: 21 90% 48%;
  --cta-light: 24 50% 15%;

  --success: 142 71% 45%;
  --error: 0 72% 60%;
  --info: 217 91% 67%;
  --care-circle: 258 58% 72%;
}
```

---

## NEVER List

- Orange as decoration — it must always serve the user's current job-to-be-done
- Orange on multiple competing elements (if everything is orange, nothing is)
- Orange backgrounds on sections, cards, or containers (unless it IS a button)
- Orange icons that aren't meaningful to the current task
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
- Slate-tinted grays (`slate-*`) → replaced by neutral grays (`neutral-*`)
