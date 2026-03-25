---
name: deck
description: Generate investor-ready pitch decks from guided discovery. HTML + Tailwind output.
---

# Deck Skill

A guided deck generator that asks forcing questions, then outputs a complete HTML + Tailwind pitch deck with auto-review.

## Commands

- `/deck` or `/deck new` - Start guided discovery flow
- `/deck from <file>` - Generate from existing brief/notes
- `/deck iterate` - Refine existing deck based on feedback
- `/deck template` - Show blank template structure

---

## Operating Philosophy

1. **Questions before slides.** No deck without understanding the business first.
2. **Specificity over polish.** "Jane, VP Ops at Stripe" beats "enterprise customers."
3. **One answer per question.** Sequential flow, no batching.
4. **Pushback is caring.** Vague answers get re-asked.
5. **Complete > perfect.** Ship a full deck, iterate later.
6. **Self-review built in.** Every deck runs through fundraise framework.

---

## Phase 0: Context Check

Before asking questions, check for existing context:

```
1. Read CLAUDE.md, README.md for product context
2. Check for existing decks in ./pitches/ or ./public/pitches/
3. Look for investor materials, one-pagers, briefs
4. Pre-fill what can be inferred
```

If context exists, confirm: "I found [X]. Should I build from this or start fresh?"

---

## Phase 1: Discovery (6 Forcing Questions)

Ask ONE question at a time. Wait for response. No batching.

### Question Flow

| # | Question | What You're Looking For |
|---|----------|------------------------|
| 1 | **What do you do in one sentence?** | "We help [X] do [Y] by [Z]" format. No jargon. |
| 2 | **Who is desperate for this? Name a real person or title.** | Specific role + context. Not "enterprises" or "SMBs." |
| 3 | **What are they doing today without you?** | Current workaround reveals pain intensity. |
| 4 | **What's your unfair advantage?** | Ex-[company], domain expert, existing traction, unique insight. |
| 5 | **How do you make money? Pick ONE model.** | SaaS, usage, marketplace, transaction fee. No "exploring." |
| 6 | **How much are you raising, and what milestone does it unlock?** | $X to achieve Y (not a shopping list). |

### Pushback Patterns

If answer is vague, re-ask with specificity prompt:

| Vague Answer | Pushback |
|--------------|----------|
| "Enterprise customers" | "Name one person at one company who would buy this." |
| "We're exploring revenue models" | "Gun to your head, which one would you ship tomorrow?" |
| "Huge market" | "What's your SOM? How many can you actually reach in year 1?" |
| "No competitors" | "What do people use today? Excel? Manual process? Competitor X?" |
| "Various use cases" | "Which ONE use case would you bet the company on?" |

### Escape Hatch

If user signals impatience ("just build it"), allow max 2 more critical questions, then proceed with available info. Flag gaps in output.

---

## Phase 2: Deck Generation

Generate a complete 10-slide HTML + Tailwind deck.

### Slide Structure

| # | Slide | Content Formula |
|---|-------|-----------------|
| 1 | **Title** | Company name + one-line positioning |
| 2 | **Problem** | Pain with DATA (stat, cost, time lost). Not emotion. |
| 3 | **Why Now** | Market timing + wedge (what changed?) |
| 4 | **Solution** | How you fix it. Outcome, not features. |
| 5 | **How It Works** | 3-step process or demo screenshot |
| 6 | **Business Model** | ONE clear revenue model + pricing |
| 7 | **Traction** | Metrics WITH timeframes. Velocity > size. |
| 8 | **Competition** | Honest 2x2 or comparison table. Never "none." |
| 9 | **Team** | Why YOU win. Credentials + unfair advantages. |
| 10 | **Ask** | $ amount + use of funds + milestone unlocked |

### HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Company] - Pitch Deck</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .slide { min-height: 100vh; scroll-snap-align: start; }
    html { scroll-snap-type: y mandatory; scroll-behavior: smooth; }
  </style>
</head>
<body class="bg-slate-900 text-white">
  <!-- Slides here -->
</body>
</html>
```

### Design Defaults

| Element | Style |
|---------|-------|
| Background | `bg-slate-900` (dark) or `bg-white` (light) |
| Headlines | `text-5xl font-bold` (48px+) |
| Body | `text-2xl` minimum (24px) |
| Stats | `text-7xl font-bold` (72px) |
| Spacing | `p-16` slide padding, generous whitespace |
| Accent | Teal (`text-teal-400`) for CTAs, highlights |

### Anti-Patterns (Never)

- Font smaller than 24px for body text
- More than 6 bullet points per slide
- Walls of text
- "No competitors" claim
- Metrics without timeframes
- Multiple revenue models
- Vague GTM ("partnerships")

---

## Phase 3: Self-Review

After generating, automatically evaluate against fundraise framework.

### Quick Scorecard

| Category | Check |
|----------|-------|
| **Clarity** | Can explain in 30 seconds? |
| **Problem** | Painkiller or vitamin? |
| **Believability** | Team credentials + traction? |
| **GTM** | How acquire customers? |
| **Ask** | Specific amount + use? |

### Flag Gaps

If discovery had weak answers, flag in output:

```
## GAPS TO ADDRESS

- [ ] **GTM unclear** - User said "partnerships" but no specific channel
- [ ] **Traction missing** - No metrics provided, using placeholder
- [ ] **Team slide weak** - Need credentials beyond "passionate"
```

---

## Phase 4: Output

### File Location

Save deck to: `./pitches/deck-[date].html`

Example: `./pitches/deck-2026-03-25.html`

### Provide User

1. File path to generated deck
2. Quick scorecard (Phase 3)
3. Top 3 improvements to make
4. Command to iterate: `/deck iterate`

---

## Example Flow

```
User: /deck

Claude: I'll help you build a pitch deck. Let me check for existing context...

Found README.md with product description. Should I build from this or start fresh?

User: Start fresh

Claude: Got it. Let's go through 6 questions. One at a time.

**Question 1/6: What do you do in one sentence?**
Format: "We help [X] do [Y] by [Z]"

User: We help cancer patients get second opinions faster

Claude: Good start. Let me push for more specificity.

"Cancer patients" is broad. Which cancer? Which stage of their journey?
And "faster" — faster than what? What's the current timeline?

User: We help newly diagnosed cancer patients get expert second opinions
in 24 hours instead of 2 weeks, for $99 instead of $4,000.

Claude: That's specific. Moving on.

**Question 2/6: Who is desperate for this? Name a real person or title.**

[...continues through all 6 questions...]

Claude: Got what I need. Generating your deck...

## DECK GENERATED

Saved to: ./pitches/deck-2026-03-25.html

### Quick Score: 24/30 (Almost Ready)

| Category | Score | Note |
|----------|-------|------|
| Clarity | 3/3 | Clear one-liner |
| Problem | 3/3 | Painkiller with data |
| GTM | 2/3 | Need channel specifics |
| Traction | 2/3 | Add timeframes |
| Ask | 3/3 | Clear amount + use |

### Top 3 Improvements

1. **GTM**: Add specific acquisition channel beyond "content marketing"
2. **Traction**: Include timeframes ("50 patients in 8 weeks")
3. **Competition**: Add speed comparison to table

Run `/deck iterate` to refine, or `/fundraise review` for full audit.
```

---

## Integration with Fundraise Skill

The deck skill generates; the fundraise skill reviews.

```
/deck           → Generate new deck
/fundraise review ./pitches/deck.html → Full audit
/fundraise feedback add "..." → Log investor reactions
/fundraise feedback analyze → Find patterns
/deck iterate   → Apply feedback to deck
```

---

## Advanced: Generate from Brief

If user has existing materials:

```
/deck from ./notes/investor-brief.md
```

Read the file, extract answers to the 6 questions, generate deck. Flag any missing pieces.

---

## References

- Kawasaki 10/20/30 Rule
- a16z Pitch Deck Guidelines
- YC: How to Pitch Your Company
- Andrew Chen's Investor Metrics Deck
