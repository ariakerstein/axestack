# Page Audit Checklist

**Use this to audit any page or component. Run `/design-audit [filepath]` for automated checks.**

---

## 1. CTA Discipline

- [ ] **Orange ONLY on clickable elements.** Scan for any `orange-600`, `#EA580C`, or CTA color on non-interactive elements.
- [ ] **ONE primary CTA per viewport.** No competing solid orange buttons visible simultaneously.
- [ ] **Secondary CTAs are outline or link style.** Never a second solid orange button.
- [ ] **CTA text starts with a verb.** "Get", "See", "Find", "Start" — not "Click here" or "Learn more".
- [ ] **No amber/yellow anywhere.** It doesn't exist in our palette.

See `cta-audit.md` for detailed CTA-specific audit.

---

## 2. Visual Hierarchy

- [ ] **One clear path.** Can you trace the user's eye from headline → content → CTA without distraction?
- [ ] **Frontloaded content.** Do headings/sentences lead with the most important word?
- [ ] **Progressive disclosure.** Is complex content hidden behind expand/show more?
- [ ] **Consistent typography scale.** Are sizes from our scale (14/16/18/20/30px)?
- [ ] **Adequate whitespace.** Generous spacing between sections (`py-12` / `gap-8`+)?

---

## 3. Mobile Readiness

- [ ] **44px touch targets.** All buttons, links, checkboxes ≥ 44px.
- [ ] **Full-width primary CTA on mobile.** Not a tiny centered button.
- [ ] **No horizontal scroll.** Test at 375px width.
- [ ] **16px+ input fonts.** Prevents iOS auto-zoom.
- [ ] **Safe area padding.** Bottom elements use `pb-safe`.
- [ ] **Sheet over dialog on mobile.** Bottom drawers, not centered modals.
- [ ] **Section → Objection → CTA rhythm.** Each scroll section has this pattern.

---

## 4. JTBD Alignment

- [ ] **Profile identified.** Which profile(s) see this screen? (Newly Diagnosed / Treatment / Recurrent / Caregiver)
- [ ] **Emotional state addressed.** Does the UI acknowledge how they FEEL?
- [ ] **Functional job served.** Does this help them DO what they need?
- [ ] **Top objection handled.** Is the #1 objection for this profile addressed before the CTA?
- [ ] **AHA moment visible.** Can they reach their AHA moment from this screen?
- [ ] **Next step clear.** Is there exactly ONE obvious thing to do next?

See `04-communication/jtbd-profiles.md` for full profiles.

---

## 5. Influence Patterns

- [ ] **PCP flow present.** Perception (clear first impression) → Context (personalized relevance) → Permission (easy next step).
- [ ] **Micro-compliance in conversion.** Are there small yeses before the big ask?
- [ ] **Lego technique for social proof.** Two facts presented, conclusion left to user?
- [ ] **Identity-affirming language.** "You're taking control" not "Use our tool"?
- [ ] **Negative-first contrasting.** Bad state → good state pattern for comparisons?

See `04-communication/influence-patterns.md` for technique details.

---

## 6. Flow Continuity

**Never audit a page in isolation. Understand where the user came from and where they go next.**

- [ ] **Entry source identified.** Where does the user arrive from? (Ad, landing page, another app page, email)
- [ ] **Previous context honored.** If they already selected cancer type, don't ask again. If an ad promised "24-hour results", this page must reference that.
- [ ] **Forward path exists.** There is ONE clear next step from this page.
- [ ] **Forward path delivers.** What this page promises, the next page actually provides.
- [ ] **No dead ends.** Every outcome (success, error, empty) has a way forward.
- [ ] **Consistent language.** Same terms used across the flow (don't switch between "checklist" and "report").
- [ ] **UTM/attribution preserved.** Tracking data carries through navigation.
- [ ] **Full flow simulated.** Walk the entire path from entry to goal — no gaps or inconsistencies.

---

## 7. Communication Quality

- [ ] **Benefits, not features.** Copy describes what user GETS, not what product DOES.
- [ ] **No forbidden language.** No "loved one", "just", "click here", "learn more", "submit".
- [ ] **Specific, not vague.** Numbers, timeframes, concrete outcomes.
- [ ] **Tone matches context.** Calm for medical, direct for errors, encouraging for onboarding.
- [ ] **Patient referred to correctly.** Name or "you"/"them", never "the patient" or "loved one".

See `04-communication/voice-and-tone.md` and `copy-patterns.md`.

---

## 8. Value Delivery

- [ ] **Value understood in first view.** Can someone grasp what they get in 5 seconds?
- [ ] **Time-to-value under 3 minutes.** From this screen, how fast to AHA moment?
- [ ] **No value gated behind signup.** Can they experience value first?
- [ ] **Alternative paths for friction.** "Don't have records? Start here instead."

See `05-metrics/value-delivery.md`.

---

## 9. Accessibility

- [ ] **Contrast ratios pass WCAG AA.** 4.5:1 for text, 3:1 for large text.
- [ ] **Focus indicators visible.** Orange ring on focus for interactive elements.
- [ ] **Screen reader labels.** All interactive elements have accessible names.
- [ ] **Reduced motion respected.** `prefers-reduced-motion` disables transitions.

See `accessibility-audit.md` for detailed checks.

---

## 10. Dark Mode

- [ ] **All elements visible in dark mode.** No white-on-white or invisible borders.
- [ ] **Orange CTA still prominent.** Contrast maintained in dark mode.
- [ ] **Status colors adjusted.** Success/error/info slightly brighter for dark backgrounds.
- [ ] **Images/icons work in both modes.** No black icons on dark backgrounds.

---

## 11. Qualitative Feedback

- [ ] **Feedback point exists at key moments.** Post-action, post-value, at drop-off.
- [ ] **Feedback is inline, not modal.** Doesn't compete with primary CTA.
- [ ] **Rate-limited.** User isn't asked the same question repeatedly.

See `05-metrics/qualitative-feedback.md`.

---

## Scoring

| Section | Weight | Score (0-10) |
|---------|--------|-------------|
| CTA Discipline | 12% | |
| Visual Hierarchy | 8% | |
| Mobile Readiness | 12% | |
| JTBD Alignment | 18% | |
| Influence Patterns | 8% | |
| Flow Continuity | 12% | |
| Communication | 10% | |
| Value Delivery | 10% | |
| Accessibility | 5% | |
| Dark Mode | 3% | |
| Feedback Points | 2% | |
| **Total** | **100%** | |

**Pass**: 70+. **Good**: 80+. **Excellent**: 90+.
