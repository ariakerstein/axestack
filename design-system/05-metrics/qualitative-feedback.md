# Qualitative Feedback Collection

## Why Qualitative > Quantitative (For Now)

Quantitative tells you WHAT happened. Qualitative tells you WHY. At our stage, WHY is more valuable:
- Why did they convert? (so we can amplify)
- Why did they drop off? (so we can fix)
- What do they value most? (so we can double down)
- What holds them back? (so we can address)

---

## Collection Techniques

### 1. Post-Action Micro-Surveys (Typeform-Style)

One question, immediately after a state change. Inline, not popup. Feels conversational.

**After completing a step:**
> "What almost prevented you from doing this?"
> [Open text field]

This reveals reservation points — the objections they overcame. Pure gold for improving the step.

**After seeing results:**
> "What surprised you most?"
> [Open text field]

Reveals whether we're meeting/exceeding/missing expectations.

### 2. The "Why Not Lower?" Technique

**After a key action, ask:**
> "How ready were you to [take this step]? (1-10)"
> [Slider]

Then, regardless of their answer, follow up:
> "Why didn't you answer a significantly LOWER number?"

**Why this works**: It forces them to articulate their POSITIVE reasons for acting. They defend their decision by explaining what convinced them. This is far more useful than asking "why did you do it?" which gets rationalized answers.

Example: User rated 7/10 readiness for uploading records.
- Follow-up: "Why didn't you answer a 3 or 4?"
- Their answer: "Because I already trust that you'll find something useful, and my doctor hasn't been catching everything."
- What you learn: Trust is established, AND they have unmet needs with their current doctor.

### 3. Exit Intent / Drop-Off

When a user appears to be leaving (or pauses for 30+ seconds in a flow):

> "What's holding you back?"
> [3-4 options + open text]
> - "I need to think about it"
> - "I don't have what I need right now"
> - "I'm not sure this is for me"
> - "Something else: ___"

Keep this lightweight. One question. Not a survey.

### 4. Post-Conversion Objection Mining (CRE-Style)

After they convert (sign up, pay, share), ask ONE question:

> "What was the #1 thing that almost stopped you from [action]?"

This is the Conversion Rate Experts technique. The answers become your objection-handling copy.

Common patterns you'll find:
- Price concerns → Better price anchoring needed
- Trust concerns → More credentials/social proof needed
- Effort concerns → Simpler flow needed
- Relevance concerns → Better personalization needed

### 5. Thumbs Up/Down + Context

Current thumbs up is good. Enhance:

- **Thumbs up**: No follow-up needed (don't interrupt positive moment)
- **Thumbs down**: Show optional text field: "How could this be better?"
- Track by feature/context for pattern analysis

---

## Placement Rules

### Do
- Inline, below the action they just completed
- One question at a time
- Optional (never blocking)
- Contextual to what they just did
- Styled as conversational (not "SURVEY" header)

### Don't
- Popup modals interrupting flow
- Long multi-question surveys
- Feedback that competes with the primary CTA
- Asking before they've experienced value
- Asking every session (rate-limit: once per key action per user)

---

## Implementation Pattern

```tsx
// Lightweight inline feedback component
<MicroFeedback
  trigger="after_action"
  action="upload_record"
  question="What almost prevented you from uploading?"
  type="open_text"      // or "scale" or "multiple_choice"
  position="inline"     // not "modal"
  rateLimit="once_per_user_per_action"
/>
```

Store in `analytics_events` table with:
- `event_type`: "qualitative_feedback"
- `context`: which action triggered it
- `question`: the question asked
- `response`: their answer
- `profile_type`: which JTBD profile

---

## When to Collect

| Moment | Question | Technique |
|--------|----------|-----------|
| After wizard completion | "What almost stopped you?" | Post-action (#1) |
| After first value delivery | "What surprised you?" | Post-action (#1) |
| After payment | "What almost prevented you?" | CRE objection mining (#4) |
| At drop-off | "What's holding you back?" | Exit intent (#3) |
| After sharing | "Why did you share this?" | Post-action (#1) |
| After 7 days active | Readiness scale + "why not lower?" | Technique #2 |

---

## Using the Data

- Update `objection-handling.md` with new objections discovered
- Update `jtbd-profiles.md` with real user language (replace assumptions)
- Feed into copy: use their exact words in headlines and CTAs
- Prioritize features that address the most common "what held you back" answers
