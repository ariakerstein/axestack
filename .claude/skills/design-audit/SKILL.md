---
name: design-audit
description: >-
  Audit any page or component against the Navis design system. Checks visual design,
  CTA discipline, JTBD alignment, influence patterns, user flow continuity,
  accessibility, and takes screenshots. Use when asked to "audit", "review design",
  "check this page", "design review", or "/design-audit".
argument-hint: <filepath> | <url> | all
---

# /design-audit

Audit any page or component against the Navis design system. Checks visual design, CTA discipline, JTBD alignment, influence patterns, user flow continuity, accessibility, and takes screenshots.

## Usage

```
/design-audit src/pages/Index.tsx              # Audit a specific file
/design-audit src/components/home/ExploreCard.tsx  # Audit a component
/design-audit http://localhost:5173/           # Audit a live URL (screenshots)
/design-audit all                              # Audit all key pages
```

## Steps

### 1. Load Audit Checklists

Read these files to prepare audit criteria:
- `design-system/06-audit/audit-checklist.md` — master checklist (10 sections)
- `design-system/06-audit/cta-audit.md` — CTA color discipline
- `design-system/06-audit/accessibility-audit.md` — WCAG AA checks
- `design-system/04-communication/jtbd-profiles.md` — user profiles
- `design-system/04-communication/influence-patterns.md` — persuasion patterns
- `design-system/00-principles.md` — core principles

### 2. Code Audit

Read the target file(s) and check:

**CTA Discipline:**
- Search for `orange-600`, `orange-500`, `orange-700`, `#EA580C`, `--cta` usage
- Every orange instance → is the element interactive?
- Check for legacy colors: `cyan`, `teal`, `#06B6D4`, `magenta`, `#C026D3`, `amber`, `yellow`
- Count primary CTAs per likely viewport

**Typography & Spacing:**
- Font sizes match scale (14/16/18/20/30px)
- Spacing uses 4pt grid values
- Touch targets ≥ 44px

**Communication:**
- Check for forbidden language ("loved one", "just", "click here", "learn more", "submit")
- Check if copy leads with benefits, not features
- Check if CTA text starts with a verb

### 3. JTBD Audit

Identify which user profile sees this page/component:
- Which of the 4 profiles (Newly Diagnosed, Treatment-Stage, Recurrent/Advanced, Caregiver)?
- Is the emotional state acknowledged in the UI?
- Is the #1 objection for this profile handled before the CTA?
- Is there ONE clear next step?
- Can the user reach their AHA moment from here?

If the page serves multiple profiles, check each path.

### 4. Influence Audit

Check for influence pattern usage:
- **PCP flow**: Is there a clear Perception → Context → Permission cascade?
- **Micro-compliance**: Are there small yeses before big asks?
- **Lego technique**: Are social proof facts presented as two separate pieces for the user to connect?
- **Identity statements**: Does copy use "you are" framing, not "you should"?
- **Negative-first contrasting**: Are comparisons structured as bad state → good state?

### 5. Flow Continuity Audit

**CRITICAL: Never audit a page in isolation. Understand the full flow.**

Before evaluating the page, map out:
- **Where did the user come FROM?** (Which page/action/ad leads here? What's their emotional state on arrival?)
- **What happened BEFORE this page?** (What micro-commitments have they made? What do they already know?)
- **Where should they go AFTER?** (What's the next step in the funnel? Does this page push them there?)
- **What's the FULL journey?** (Trace the path from acquisition to this page to the final goal)

Check for:
- [ ] **Entry context acknowledged.** If they came from a cancer-type-specific ad, does this page reflect that cancer type?
- [ ] **Previous commitments honored.** If they already selected their cancer type, don't ask again.
- [ ] **Next step exists and is clear.** Every page must have ONE clear forward path.
- [ ] **Forward momentum maintained.** The user should never feel "stuck" or "now what?"
- [ ] **Consistency with preceding page.** Same language, same promises, same visual style.
- [ ] **Consistency with following page.** What this page promises, the next page must deliver.
- [ ] **No dead ends.** Every outcome (success, error, empty state) has a forward path.
- [ ] **UTM/context preserved.** Attribution data carries through the entire flow.

Simulate the flow by reading the source pages before and after this one. If you find a break in the flow (e.g., the landing page says "Get answers in 24 hours" but the next page says nothing about timing), flag it.

### 6. Visual Audit (If URL provided or dev server running)

Use the `/browse` or `/gstack` skill to:
- Navigate to the page
- Screenshot at 375px width (mobile — primary viewport)
- Screenshot at 1280px width (desktop)
- Check visually:
  - Is the primary CTA immediately visible?
  - Is there only one prominent orange element per viewport?
  - Is the visual hierarchy clear (headline → content → CTA)?
  - Does the page look clean and uncluttered?
  - Do the sections follow the headline → objection → CTA rhythm?

### 7. Guardian Mode

If the audit finds violations, don't just list them — explain:
- **WHY it's wrong** in the context of the specific JTBD profile
- **What would actually work** for these users in this emotional state
- **Specific code changes** with line numbers

Push back HARD on generic implementations. "This button says 'Learn More' — for a newly diagnosed patient who is terrified and needs a clear next step, this is actively harmful. Change to 'See What Tests You Need' — specific, actionable, addresses their fear of missing something."

### 8. Output Report

```markdown
# Design Audit: [filename or URL]

## Summary
Score: [N]/100
Profile: [which JTBD profile(s)]
Status: [PASS / NEEDS WORK / FAIL]

## CTA Discipline ([score]/15)
- [PASS/FAIL] [finding with line number]
...

## Visual Hierarchy ([score]/10)
...

## Mobile Readiness ([score]/15)
...

## JTBD Alignment ([score]/20)
...

## Influence Patterns ([score]/10)
...

## Communication ([score]/10)
...

## Value Delivery ([score]/10)
...

## Flow Continuity ([score]/10)
- Where user comes from: [page/action]
- Where user goes next: [page/action]
- [PASS/FAIL] Context from previous page preserved
- [PASS/FAIL] Forward path clear and consistent
- [PASS/FAIL] No dead ends
...

## Accessibility ([score]/5)
...

## Dark Mode ([score]/3)
...

## Feedback Points ([score]/2)
...

## Screenshots
[Mobile 375px]
[Desktop 1280px]

## Fixes Required
1. [Priority] Line [N]: [what to change and why]
2. ...
```
