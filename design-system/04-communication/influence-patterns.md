# Influence Patterns for UI

UI-applicable techniques distilled from the full influence guide. These are ethical tools for helping cancer patients take actions that serve THEIR interests.

> Full reference: `prompts/influence-guide.md` (576 lines, covers the complete framework)

---

## PCP Model (Every Page)

**Perception → Context → Permission**

Every page and section should follow this cascade:

### Perception (First Impression)
What does the user perceive in the first 2 seconds?
- Clear headline (benefit-first)
- Trust signals visible (badges, credentials, social proof)
- Clean, uncluttered layout
- One clear path forward

### Context (Why This Matters for THEM)
Why should this specific person care?
- Personalized to their cancer type/stage
- Addresses their emotional state
- References their specific situation
- Handles their top objection

### Permission (Easy Next Step)
What micro-action can they take right now?
- Low-friction CTA ("See your results" not "Sign up now")
- Feels like their choice, not our push
- Small commitment before big ask

**Audit**: For every page, can you point to the P, C, and P elements?

---

## FATE Sequence (Onboarding)

**Focus → Authority → Tribe → Emotion**

Use this for first-run onboarding and landing pages:

### Focus
Break their autopilot. Use novelty to grab attention.
- Specific stat: "84% of cancer patients never seek a second opinion"
- Personal question: "What cancer type were you diagnosed with?"
- Not generic: "Welcome to our platform"

### Authority
Establish credibility immediately.
- "Board-certified oncologists"
- "Based on NCCN guidelines"
- "Used by 1,200 patients"
- Founder story (cancer survivors)

### Tribe
Show they're not alone. Others like them use this.
- "Sarah, breast cancer Stage II, found 3 missing tests"
- "1 in 3 second opinion patients had treatment changes"
- Caregiver testimonials for caregiver audience

### Emotion
Connect to what they WANT to feel.
- Relief: "You're not missing anything"
- Control: "Here's your plan"
- Hope: "There are options you haven't seen"
- Match emotion to JTBD profile (see `jtbd-profiles.md`)

---

## Micro-Compliance (Conversion)

**Many small yeses before the real ask.**

Each small commitment increases the likelihood of the next. Our wizard flow uses this:

```
"What's your role?" (easy yes — tap a button)
↓
"What cancer type?" (personal, but still easy)
↓
"What stage?" (deeper investment)
↓
"Where should we send your results?" (email — feels natural after 3 yeses)
```

### Design Rules for Micro-Compliance
- Start with the EASIEST question (tap, not type)
- Increase commitment gradually
- Each step should feel like it brings them closer to value
- Never skip steps — the sequence builds investment
- Progress indicator shows momentum

**Research**: Freedman & Fraser (1966) — people who agreed to a small request first were 4x more likely to agree to a large one.

---

## Lego Technique (Social Proof)

**Give two pieces of information. Let the user's brain connect them.**

Never state the conclusion — when users connect the dots themselves, the idea feels like THEIRS, not yours.

### Examples

**Don't**: "You should get a second opinion because treatment changes are common."

**Do**:
- Fact 1: "1 in 3 second opinion patients had treatment changes" (MSK study)
- Fact 2: "84% of cancer patients never seek a second opinion"
- (User connects: "I should get a second opinion")

**Don't**: "Our service is much cheaper than alternatives."

**Do**:
- Fact 1: "Second opinions at major cancer centers cost $3,000-4,000"
- Fact 2: "Your personalized checklist: $49"
- (User connects: "This is a no-brainer")

### UI Application
- Place these two facts visually close but separate
- Don't add a "Therefore..." sentence
- Let white space between them create the connection
- Works in hero sections, pricing comparisons, and social proof blocks

---

## Identity Statements (Framing)

Move from goal language to identity language:

| Goal Statement (Weak) | Identity Statement (Strong) |
|----------------------|---------------------------|
| "I want to manage my care" | "I'm someone who takes control" |
| "I should get a second opinion" | "I'm the kind of person who doesn't leave things to chance" |
| "I need to organize records" | "I stay on top of my health" |

### UI Application
- Use identity-affirming language in CTAs: "Take control of your care" not "Use our tool"
- Post-action confirmation: "You're taking charge" not "Action completed"
- Onboarding: "You're already ahead of 84% of patients"

---

## Negative-First Contrasting (Objection Handling)

Present the negative state first, then the positive. The contrast amplifies the positive.

**Pattern**: "[Bad current state] → [Good state with us]"

- "Waiting 2 weeks for answers → Get yours in 24 hours"
- "Drowning in medical jargon → Plain language you understand"
- "$4,000 at a cancer center → $49 here"

Use this in:
- Hero sections
- Feature comparisons
- Pricing pages
- Email subject lines

---

## Ethical Boundary

Every technique here must pass one test:

**"Are we helping them toward what THEY want, or engineering for us?"**

Cancer patients want:
- To not miss anything
- To feel in control
- To understand their options
- To take the right next step

If a design element helps them do those things, it's ethical. If it just extracts data or money without serving them, remove it.

---

## Quick Reference

| Technique | Where to Use | Key Principle |
|-----------|-------------|---------------|
| PCP Model | Every page | Perception → Context → Permission |
| FATE | Landing, onboarding | Focus → Authority → Tribe → Emotion |
| Micro-Compliance | Conversion flows, wizards | Small yeses build to big yes |
| Lego Technique | Social proof, pricing | Two facts, user connects them |
| Identity Statements | CTAs, confirmation screens | "You ARE" not "You should" |
| Negative-First | Comparisons, hero sections | Bad state → good state |
