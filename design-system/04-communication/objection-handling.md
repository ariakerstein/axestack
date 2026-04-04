# Objection Handling in UI

**Every user has reasons NOT to act. Great UI addresses these before the user articulates them.**

---

## Universal Objections (All Profiles)

### "I trust my oncologist"
- **Never contradict this.** Validate, then reframe.
- UI: "Help YOUR oncologist by bringing these questions" / "Supporting your doctor with data"
- Frame as collaboration: "Give your oncologist a complete picture"
- Avoid: any language suggesting their doctor is wrong or incomplete

### "This is too expensive"
- Show free value FIRST. Never lead with price.
- Price anchor: "$4,000 at major cancer centers" → "$49 here"
- Use Lego technique: present both facts, let them connect
- UI: Free checklist → Expert review as upsell with anchor price visible

### "I'm too overwhelmed to deal with this"
- **"Just one step" framing.** Never show the whole journey at once.
- UI: Single CTA, progressive disclosure, wizard flow
- Copy: "2 minutes" / "Just tell us your cancer type" / "We'll handle the rest"
- Design: maximum whitespace, minimal elements, one question at a time

### "AI can't understand my case"
- Lead with human expertise, AI is the enabler.
- UI: "Board-certified oncologists review your case" (primary), "AI helps organize your records" (secondary)
- Trust signals: credentials, institutional affiliations, review process
- Never: "Our AI analyzed..." as the first thing they see

### "I don't have my records"
- Remove the blocker entirely.
- UI: "Start without records" path — answer questions, get checklist based on diagnosis info alone
- Alternative: "Email us your records" / "We can request them for you"
- Never gate value behind record upload

---

## Profile-Specific Objections

### Newly Diagnosed
| Objection | UI Response |
|-----------|------------|
| "I don't even know what questions to ask" | "We give you the exact questions — just bring this to your appointment" |
| "I'm scared to know more" | Progressive disclosure: headline reassures, details behind "Show more" |
| "This seems too good to be true" | Founder story + credentials + specific methodology (NCCN guidelines) |

### Treatment-Stage
| Objection | UI Response |
|-----------|------------|
| "I'm already in treatment, too late" | "It's never too late to optimize. 1 in 3 second opinions change treatment." |
| "I don't have energy for this" | "5 minutes before your appointment" — minimal time commitment |
| "My numbers are fine, I don't need this" | "Good — let's make sure nothing is being missed" (validation + safety net) |

### Recurrent/Advanced
| Objection | UI Response |
|-----------|------------|
| "I've tried everything" | Show novel options: biomarker-specific trials, off-label drugs, emerging research |
| "Trials are a last resort / guinea pig" | "Clinical trials give access to tomorrow's treatments today" |
| "No one can help me" | Specific stories of patients with similar situations who found options |

### Caregiver
| Objection | UI Response |
|-----------|------------|
| "This isn't my decision to make" | "Share this with [patient] — let them decide" (empowers, doesn't overstep) |
| "The patient doesn't want to deal with this" | "Handle the research so they don't have to" |
| "I don't understand medical terms" | "Everything in plain language. Medical terms explained on tap." |

---

## Where to Place Objection Handlers

### Landing Pages
- Below the hero: handle the #1 objection (trust)
- Before pricing: handle the cost objection (anchor + value)
- Before final CTA: handle the overwhelm objection ("just 2 minutes")

### Wizards
- At email capture step: "We'll never spam you. Just your results."
- At payment step: Price anchor + satisfaction guarantee
- At upload step: "Or skip this — start with just your diagnosis"

### In-App
- Empty states: "Not sure where to start? Try asking a question."
- Before complex features: "This takes about 2 minutes"
- After delivering value: "Want an expert to review this?" (natural upsell after value)

---

## Objection Mining (Qualitative)

Actively collect objection data from users. See `05-metrics/qualitative-feedback.md` for techniques:

- Post-step: "What almost prevented you from doing this?"
- At drop-off points: "What's holding you back?"
- Post-conversion: "What surprised you?" (reveals pre-conversion doubts)

Use this data to update this document regularly.
