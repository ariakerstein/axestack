# Core Principles

## Philosophy: "Clarity is Kindness"

Our users are in crisis — newly diagnosed, mid-treatment, or caring for someone who is. They cannot process complex navigation, decorative UI, or ambiguous messaging. Every pixel must earn its place.

The UI acts as a **life vest**: transitioning users from overwhelm to confident action.

---

## The CTA Isolation Rule

**#EA580C (Orange-600) signals what matters most RIGHT NOW.**

Orange draws the eye. It marks the thing the user should focus on — the action they need to take, the information that answers their question, the element that moves them forward in their journey.

### Orange IS for:
- Primary buttons (solid orange background, white text)
- Secondary buttons (orange outline or orange text link)
- Active tab indicators
- Interactive chevrons/arrows that trigger actions
- Key information that directly serves the user's JTBD (e.g., "3 tests missing" in a care gap card)
- The single most important element on screen that answers "what should I do next?"

### Orange is NEVER for:
- Decorative use — orange must always earn its place
- Background colors or section fills
- Decorative icons or illustrations
- Multiple competing elements (if everything is orange, nothing is)
- Borders on passive elements
- Generic emphasis — use bold or layout hierarchy instead

**Test**: Point at any orange element. Does it serve the user's current job-to-be-done? Is it the thing they came here to find or do? If no, remove the orange.

---

## Optimistic Foundation

The UI is mostly neutral — but it isn't cold. Subtle violet-to-teal gradients run through the product as a signature warmth layer: behind hero sections, on background orbs, as soft washes on cards and section backgrounds. This isn't decoration for its own sake — it's emotional design. A cancer patient landing on a page that feels warm and alive is more likely to trust it than one that feels like a hospital terminal.

### Functional color still has ONE job each:

- **Orange** = this matters most right now — the action to take, the answer to their question, the thing that moves them forward
- **Green** = this is good / done / valid
- **Red** = this is bad / error / urgent
- **Blue** = this needs info / attention (not urgent)
- **Violet** = people (care circle) AND ambient warmth (gradients)

### The gradient layer:

Violet-to-teal gradients are the product's visual signature. They add optimism without competing with functional color.

**Where gradients belong:**
- Hero section backgrounds (`from-violet-50 via-white to-teal-50`)
- Decorative background orbs (`bg-violet-400/20`, `bg-teal-400/10`)
- Card hover/highlight washes (`from-violet-50/50`)
- Section divider lines (`from-transparent via-violet-400/50 to-transparent`)
- Text gradients on marketing headings (`from-violet-600 via-fuchsia-500 to-orange-500`)
- Button shadows on primary actions (`shadow-violet-500/25`)

**Where gradients do NOT belong:**
- On or near orange CTAs (don't compete with the action color)
- On text that needs to be read (body copy, labels, data)
- On form elements or interactive controls
- Layered so thick they obscure content

**Rule:** Gradients are ambient. They set mood, not meaning. If you removed every gradient, the UI should still be perfectly usable and clear. They're the warmth in the room, not the signage.

---

## One Clear Path

Every view funnels the user's eye to a single primary CTA. One view = one primary action.

- Maximum ONE solid orange button per visible viewport
- Secondary actions use outline buttons or text links — never competing visually
- Remove anything that doesn't serve the current step

---

## Progressive Disclosure

Hide complexity until requested. Ask one question at a time. Break workflows into bite-sized steps.

- Accordions for medical detail
- Wizards over long forms
- "Show more" over information dumps
- Default to collapsed, not expanded

---

## Frontload Information

People don't read — they scan. Start every element with its most important content:

- **Headings**: Lead with the benefit, not the category ("Find missing tests" not "Test Gap Analysis")
- **Sentences**: Most important word first ("3 tests missing" not "Our analysis found that 3 tests are missing")
- **CTAs**: Start with the verb ("Get your checklist" not "Click here to get your checklist")
- **Cards**: Headline + one-line value prop visible without expanding
- **Sections**: What they get first, how it works second

---

## Dark Mode Parity

- Default to system preference via `prefers-color-scheme`
- Store user override in localStorage (`navis-theme`)
- Switcher location: hamburger menu or footer — NOT top nav
- Every token, component, and page must work in both modes
- Test both modes before shipping

---

## Mobile is Primary

Most users are on mobile. Design for 375px first, then scale up.

- Every section needs a visible CTA without scrolling
- 44px minimum touch targets
- Sheet-first navigation (bottom drawers, not centered modals)
- Section pattern: Headline → Address objection → CTA → Next section

---

## Create Delight

Small details that make the product feel crafted, not generated. Every interaction is an opportunity.

- Click-to-copy on color codes, hex values, code snippets
- Hover reveals with useful context (tooltips with names, previews)
- Smooth state transitions that feel responsive (50ms)
- Micro-celebrations on completion (green check animation, brief success message)
- Polish empty states — never leave a dead-end screen
- Surprise with specificity: "3 tests missing" is more delightful than "We found gaps"

Delight is not decoration. It's the difference between "this works" and "someone cared."

---

## Instant Performance

The site must feel crispy and immediate, like a native app.

- 50ms max for ALL transitions (hover, focus, overlays, sheets, everything)
- No decorative animations on medical content
- Skeleton states over loading spinners
- Respect `prefers-reduced-motion` (disable even 50ms transitions)

---

## Flow Continuity

Never design a page in isolation. Always understand the full user journey:

1. **Where did they come from?** (Ad, landing page, another screen, email)
2. **What do they already know/feel?** (What commitments have they made? What state are they in?)
3. **Where do they go next?** (What's the single forward path?)
4. **Does the full flow hold together?** (Consistent language, promises kept, no dead ends)

Simulate the complete path from entry to goal before shipping. Inconsistencies between pages break trust and kill conversion.

---

## Page Transition Awareness

Always consider the user's physical viewport position during navigation:

- **Scroll to top on page transitions.** If the user clicks a link or advances a wizard step and the page content changes, scroll to the top. If they're fully scrolled down and land on a new view, they see the footer — not the content.
- **Consider what they'll see first.** After any state change (tab switch, step advance, modal open), verify the most important content is visible without scrolling.
- **Test transitions end-to-end.** Don't just test the destination — test the journey. Click through the full flow, watch what happens at each transition, verify nothing feels broken or disorienting.
- **Wizard steps:** when advancing, scroll the step content into view. When going back, scroll to show the previous step's content.

---

## Strategic Emoji Usage

Emojis at the beginning of option labels reduce cognitive load. It's easier to choose from "✅ Yes | ❌ No" than plain "Yes | No". When there are multiple options and emojis can add meaning, use them — users scan by emoji before reading text.

**When to use:**
- Binary choices: always `✅ / ❌` for yes/no and confirmations
- Radio button groups where options represent different categories
- Dropdown options where emojis differentiate faster than reading
- Navigation items and category selectors
- Status indicators

**When NOT to use:**
- Sequential/numeric options (Stage I, Stage II — numbers are already clear)
- Body text or paragraphs
- CTA button labels (keep them clean and action-focused)
- When all options are similar in nature (emojis add noise without differentiation)

**Canonical examples:**

```
Role:       🙋 Patient | 💛 Caregiver
Cancer:     🎀 Breast | 🫁 Lung | 🔵 Prostate | 🔴 Colorectal
Treatment:  ⏳ Not started | 💊 In treatment | ✅ Completed | 📊 Monitoring
Yes/No:     ✅ Yes | ❌ No
Navigation: 🏠 Home | 📋 Records | 👥 Care Circle
Stages:     Stage I | Stage II | Stage III | Stage IV (no emojis — sequential)
```

**Rule:** One emoji per option label, at the start. If it doesn't add instant comprehension, remove it.

---

## Docs and Preview Stay in Sync

The design system has two representations: markdown docs (`design-system/`) and live preview (`src/design/`). They must stay in sync. **Always update both sides.**

- **Check `design-system/SYNC_MAP.md`** for the mapping between each doc and its preview page.
- When changing a doc → update the corresponding preview page listed in the sync map
- When changing a preview page → update the corresponding doc listed in the sync map
- The preview IS the source of truth for "how it looks." The docs are the source of truth for "why it works that way."
- If they contradict each other, investigate which is correct and fix both.
- **This is not optional.** If you change one side without the other, the system drifts and becomes unreliable.

---

## Anti-Patterns (NEVER)

- Rainbow buttons or gradient CTAs (gradients are ambient, not interactive)
- More than 2 prominent CTAs per viewport
- ALL CAPS labels
- Icon soup (more than 2 decorative icons per card)
- Heavy borders or box shadows
- Cramped spacing (less than 16px between interactive elements)
- Generic placeholder copy ("Lorem ipsum", "Click here", "Learn more")
- Orange on anything non-clickable
- Violet/teal on anything clickable (ambient warmth stays non-interactive)
- Gradients so heavy they feel like a christmas tree — keep them subtle and atmospheric

---

## Canonical Components

Every component in the design system has ONE implementation in `src/design/components/`. Preview pages import from there. The app progressively adopts from there.

**When a component needs fixing, fix it in `src/design/components/` — everywhere that imports it gets the fix automatically.**

Never build a component inline when a canonical version exists. Before creating UI, check `src/design/components/index.ts` for what's available:
- `RadioButtonGroup` — for 2-5 visible options
- `StepIndicator` — wizard progress (done/current/future)
- `ProgressBar` — always green, never orange
- `SectionHeading` — color-coded section headers (danger/success/info/default)
- `CheckItem` — interactive checklist items
- `FeatureCard` — clickable card with icon + orange title + chevron
- `StatusCard` — card with colored left border
- `EmptyState` — icon + title + CTA (never a dead end)
- `MetricDisplay` — big number + label
- `useFieldState` — form field validation + border state management
- `tokens` — CSS variable constants for autocomplete

---

## Heading-Content Color Consistency

If a section's content uses color-coded elements (red numbers for objections, green badges for success), the section heading must use the same color family. Use `SectionHeading` with the appropriate variant:
- `variant="danger"` — objections, errors, warnings (red)
- `variant="success"` — positive outcomes, placement guides (green)
- `variant="info"` — informational, metrics (blue)
- `variant="default"` — neutral sections (gray)

---

## Guardian Principle

**This design system is a quality gate, not just documentation.**

When building UI, if a request would violate JTBD profiles, CTA discipline, influence patterns, or any principle here — **push back and suggest what would actually work**.

The tendency is to build generic, watered-down things that look "fine" but don't move users to action. The job is to keep us on track making world-class, conversion-focused work that serves **specific people in specific emotional states**.

Before building, always ask:
1. **Who** is seeing this? (Which JTBD profile — see `04-communication/jtbd-profiles.md`)
2. **What** do they need to feel/do/know RIGHT NOW?
3. **What** is their biggest objection at this moment?
4. **What** is the ONE next step?

"Good enough" is not good enough.
