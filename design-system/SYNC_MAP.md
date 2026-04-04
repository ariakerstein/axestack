# Design System Sync Map

**When you change a doc, update its preview. When you change a preview, update its doc.**

This file maps each markdown doc to its corresponding preview page. If you modify one side, you MUST check and update the other.

| Markdown Doc | Preview Page | What to sync |
|-------------|-------------|-------------|
| `00-principles.md` | All pages (general rules) | If a principle changes, verify all pages still follow it |
| `01-tokens/colors.md` | `pages/Colors.tsx` | Color values, roles, NEVER list |
| `01-tokens/typography.md` | `pages/Typography.tsx` | Font scale, weights, examples |
| `01-tokens/spacing.md` | `pages/Spacing.tsx` | Grid values, page layout, touch targets |
| `01-tokens/motion.md` | All pages (timing) | Transition durations |
| `02-components/buttons.md` | `pages/Buttons.tsx` | Variants, sizes, states, rules |
| `02-components/cards.md` | `pages/Cards.tsx` | Card types, FeatureCard, StatusCard |
| `02-components/forms.md` | `pages/Forms.tsx` | Input states, validation, border system, types |
| `02-components/navigation.md` | `pages/Navigation.tsx` | Tabs, breadcrumbs, sidebar, bottom nav |
| `02-components/overlays.md` | *(no dedicated page yet)* | — |
| `02-components/feedback.md` | `pages/Feedback.tsx` | Toasts, alerts, skeleton, progress, steps, upload |
| `02-components/data-display.md` | `pages/Badges.tsx` | Badges, avatars, metrics, icons |
| `03-patterns/page-layouts.md` | `pages/PageLayouts.tsx` | Layout templates, breakpoints, section pattern |
| `03-patterns/conversion-flows.md` | `pages/ConversionFlows.tsx` | Wizard, email capture, sticky CTA, upsell |
| `03-patterns/onboarding.md` | `pages/Onboarding.tsx` | Activation, checklist, progressive profile |
| `03-patterns/mobile-first.md` | `pages/MobileFirst.tsx` | Phone frame, section anatomy, touch targets |
| `04-communication/voice-and-tone.md` | `pages/VoiceTone.tsx` | Voice attributes, forbidden language, tone contexts |
| `04-communication/jtbd-profiles.md` | `pages/JTBDProfiles.tsx` | 4 profiles, jobs, objections, AHA moments |
| `04-communication/influence-patterns.md` | `pages/Influence.tsx` | PCP, FATE, micro-compliance, Lego |
| `04-communication/objection-handling.md` | `pages/Objections.tsx` | Universal/profile objections, placement |
| `04-communication/copy-patterns.md` | `pages/CopyPatterns.tsx` | Headlines, CTAs, frontloading, formulas |
| `05-metrics/aarrr-framework.md` | `pages/AARRR.tsx` | Funnel stages, activation focus, checklists |
| `05-metrics/qualitative-feedback.md` | `pages/QualitativeFeedback.tsx` | 5 techniques, placement rules, when to collect |
| `05-metrics/value-delivery.md` | `pages/ValueDelivery.tsx` | Two phases, tiers, 5-second test, audit criteria |
