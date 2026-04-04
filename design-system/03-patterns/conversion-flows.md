# Conversion Flows

## Core Principle: Value Before Ask

Never ask for email, signup, or payment before demonstrating value. The user should already feel "I want this" before we ask for anything.

```
Show value → Small commitment → Show more value → Ask for email → Deliver → Upsell
```

---

## PersonalizationWizard Pattern

Our proven conversion flow. 5 steps, email capture at step 4.

```
Step 1: Persona (Patient or Caregiver)           ← micro-compliance
Step 2: Cancer type selection                      ← personal commitment
Step 3: Stage selection                            ← deepening investment
Step 4: Email capture                              ← gated after 3 yeses
Step 5: Personalized checklist reveal              ← value delivery
```

**Why it works**: By step 4, the user has made 3 small commitments (micro-compliance from influence guide). The email ask feels natural, not extractive. They've already told us about themselves — of course we need their email to send results.

### Design Rules
- One question per step
- Progress indicator visible throughout
- Back button always available (text link, not orange)
- Continue button = primary CTA (full-width on mobile)
- Step 5 reveals value immediately — no "check your email" delay

---

## Email Capture Placement

**NEVER on first contact.** Always after demonstrating value.

| Position | Conversion Rate | Why |
|----------|----------------|-----|
| Homepage popup | Low | No context, no value shown |
| After 1 micro-commitment | Medium | Some investment |
| After 3+ micro-commitments | **High** | Sunk cost + demonstrated value |

Current locations:
- PersonalizationWizard step 4 (primary)
- ExpertReviewSheet (after seeing free checklist)
- TrialForm (after showing matched trials)

---

## Sticky Mobile CTA

For long scroll pages (landing pages, results pages).

```
fixed bottom-0 inset-x-0
bg-white border-t border-slate-200
p-4 pb-safe
z-50
```

- Appears after 400px scroll (not immediately — let them read)
- Contains ONE primary CTA button (full-width)
- Subtle shadow above to separate from content
- Dismiss: scrolling back to top hides it

---

## Expert Upsell Flow

After delivering free value, offer premium.

```
Free checklist delivered
↓
"Want an expert to review your specific case?"
↓
Price anchor: "$4,000 at MSK → $199 here"
↓
CTA: "Get Expert Review"
↓
Stripe Checkout (inline modal)
↓
Thank You page with timeline
```

**Influence patterns applied:**
- Price anchoring ($4K → $199) — Lego technique: present both facts, let user connect them
- Social proof: "35% of second opinions change treatment"
- Urgency: specific to THEIR cancer type and stage

---

## Funnel Tracking

Every conversion step fires analytics:

| Event | When |
|-------|------|
| `wizard_step_[N]` | Each wizard step completed |
| `wizard_email_captured` | Email submitted |
| `cta_click` | Any CTA interaction |
| `checkout_initiated` | Payment flow started |
| `purchase_complete` | Payment succeeded |

UTM parameters preserved through entire flow (`utm_source`, `utm_medium`, `utm_campaign`, `fbclid`).

---

## Rules

1. **Value before ask.** Show what they get before asking for anything.
2. **One question per step.** Wizards over long forms.
3. **Email capture after 3+ micro-commitments.** Not before.
4. **Price anchor against competitors.** Always contextualize cost.
5. **Sticky CTA on mobile scroll pages.** One button, appears after 400px.
6. **Track everything.** Every step, every click, every conversion.
