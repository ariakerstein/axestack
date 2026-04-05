<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design System — Think From It, Always

**Every UI decision starts from our design system.** Not as a checklist to satisfy, but as the foundation to think from. Before writing any UI code, read `design-system/INDEX.md` and `design-system/00-principles.md`.

**When creating anything NEW:**
- It MUST follow our design system: components, flows, communication patterns, JTBD profiles, influence patterns — everything
- Check `src/design/components/index.ts` for canonical components before building anything inline. NEVER recreate what exists.
- Import via: `import { RadioButtonGroup, StepIndicator } from '@/design/components';`
- Think through the full flow: who arrives here, from where, what do they feel, what's the next step, what objections do they have?

**When touching anything EXISTING:**
- Progressively migrate parts to the canonical design system. Every touch should leave the code more aligned.
- Ask how deep to go, but push toward cleanup — the sooner we consolidate, the faster we move.
- When fixing a component, fix it in `src/design/components/` so all consumers get the fix.

**When reviewing ANY screen:**
- Run `/design-audit [file]` for automated checks
- Check JTBD alignment: `design-system/04-communication/jtbd-profiles.md`
- **GUARDIAN RULE:** Push back on generic work that violates our principles. "Good enough" is not good enough.

**Docs ↔ Preview sync — MANDATORY (do NOT commit without this):**
`design-system/*.md` and `src/design/pages/*.tsx` are two sides of one system. When you change one, update the other **in the same commit**. Check `design-system/SYNC_MAP.md` for the mapping. Never commit one side without the other.

**Quick reference:** CTA orange only on clickable. No amber/yellow. Benefits not features. Frontload info. 50ms transitions. Mobile primary. Green for progress/valid/focus. Blue for required empty. Scroll to top on page transitions. Emojis on options where they add instant comprehension.
