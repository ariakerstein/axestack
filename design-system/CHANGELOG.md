# Design System Changelog

## 2026-04-04 — Initial Release

**Created the complete Navis design system.**

### Foundation
- Established canonical color palette with CTA Orange (#EA580C) as the single interactive color
- Removed conflicting color schemes (Magenta, Teal, Cyan, Green) across 4 previous sources
- Set 50ms max for all transitions
- Defined 4pt spacing grid and typography scale

### Components
- Documented all 7 component categories: Buttons, Cards, Forms, Navigation, Overlays, Feedback, Data Display
- Mapped to existing `src/components/ui/` implementations

### Patterns
- Page layouts (Hub, Landing, Wizard, Detail)
- Conversion flow patterns (wizard, email capture, upsell)
- Onboarding patterns (progressive, value-first)
- Mobile-first design (primary viewport)

### Communication
- Voice & tone guide distilled from navis-communication.md
- Full JTBD profiles for 4 archetypes (Newly Diagnosed, Treatment-Stage, Recurrent/Advanced, Caregiver)
- Influence patterns for UI (PCP, FATE, micro-compliance, Lego technique)
- Objection handling by profile
- Copy patterns with frontloading rules

### Metrics
- AARRR framework mapped to design decisions
- Qualitative feedback collection techniques (CRE-style, "why not lower?", exit intent)
- Value delivery standards (instant understanding, minutes to experience)

### Audit
- Full page audit checklist (10 sections, weighted scoring)
- CTA-specific audit checklist
- Accessibility audit (WCAG AA)

### Tooling
- `/design-audit` skill for automated auditing with puppeteer screenshots
- React preview pages at `npm run preview:design` (excluded from production build)
