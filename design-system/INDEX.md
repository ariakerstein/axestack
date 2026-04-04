# Navis Design System

**Canonical source of truth for all UI, communication, and conversion decisions.**

> This is a quality gate, not just documentation. If a request violates these principles, push back.

## Quick Start

1. Read `00-principles.md` before creating any UI
2. Read `06-audit/` before reviewing any UI
3. Read `04-communication/jtbd-profiles.md` to understand WHO sees each screen

## File Index

| File | Summary | When to Read |
|------|---------|--------------|
| **Foundation** | | |
| `00-principles.md` | Core philosophy, CTA rule, guardian principle | Before ANY UI work |
| `01-tokens/colors.md` | Canonical palette, functional roles, dark mode | Choosing colors, reviewing color usage |
| `01-tokens/typography.md` | Font scale, weights, line-heights | Setting text styles |
| `01-tokens/spacing.md` | 4pt grid, page/card/section spacing | Laying out elements |
| `01-tokens/motion.md` | 50ms max transitions, reduced motion | Adding any animation or transition |
| **Components** | | |
| `02-components/buttons.md` | Primary/Secondary/Ghost, CTA rules | Creating or styling buttons |
| `02-components/cards.md` | Card types, shadows, padding | Creating card layouts |
| `02-components/forms.md` | Inputs, validation, mobile sizing | Building forms |
| `02-components/navigation.md` | Tabs, breadcrumbs, active states | Navigation UI |
| `02-components/overlays.md` | Sheets, modals, popovers, tooltips | Overlay/popup UI |
| `02-components/feedback.md` | Toasts, alerts, skeletons, progress | Status/feedback UI |
| `02-components/data-display.md` | Badges, tables, progress bars | Displaying data/status |
| **Patterns** | | |
| `03-patterns/page-layouts.md` | Page templates, responsive patterns | Creating new pages |
| `03-patterns/conversion-flows.md` | Wizards, email capture, upsell | Building conversion funnels |
| `03-patterns/onboarding.md` | First-run, checklists, progressive disclosure | Onboarding flows |
| `03-patterns/mobile-first.md` | Mobile layout, sticky CTAs, objection handling | Any mobile-facing work (MOST users) |
| **Communication** | | |
| `04-communication/voice-and-tone.md` | Writing style, forbidden language | Writing any user-facing copy |
| `04-communication/jtbd-profiles.md` | Full JTBD for 4 archetypes | Understanding WHO sees this UI |
| `04-communication/influence-patterns.md` | PCP, FATE, micro-compliance, Lego technique | Designing persuasion flows |
| `04-communication/objection-handling.md` | Objections by profile + UI responses | Addressing user hesitation |
| `04-communication/copy-patterns.md` | Headlines, CTAs, frontloading, formulas | Writing headlines, CTAs, card copy |
| **Metrics** | | |
| `05-metrics/aarrr-framework.md` | Pirate metrics mapped to design | Planning features by funnel stage |
| `05-metrics/qualitative-feedback.md` | CRE-style feedback collection | Adding feedback collection points |
| `05-metrics/value-delivery.md` | Time-to-understand, time-to-experience | Optimizing first-run value |
| **Audit** | | |
| `06-audit/audit-checklist.md` | Full page audit (design + JTBD + influence) | Reviewing any page or component |
| `06-audit/cta-audit.md` | CTA color discipline check | Auditing orange usage |
| `06-audit/accessibility-audit.md` | WCAG AA, touch targets, contrast | Accessibility review |

## Preview

Run `npm run preview:design` to view the live component library at `src/design/` (separate from production build).

## Cross-References

- **Sync map (doc ↔ preview):** `design-system/SYNC_MAP.md` — check this when changing any doc or preview page
- Canonical components: `src/design/components/index.ts`
- Full influence guide: `prompts/influence-guide.md`
- Full communication guide: `prompts/navis-communication.md`
- Component source: `src/components/ui/`
- Design tokens (code): `src/lib/design-system.ts`
