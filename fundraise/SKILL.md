---
name: fundraise
description: Review pitch decks for investor-readiness. Premise-first analysis with Kawasaki 10/20/30 as guardrails.
---

# Fundraise Skill

A pitch deck review skill that prioritizes **"do I believe this and want to invest?"** over **"are the fonts big enough?"**

## Commands

- `/fundraise review <deck>` - Full deck audit (premise → content → structure)
- `/fundraise premise <deck>` - Just the believability check
- `/fundraise objections` - Generate investor Q&A prep
- `/fundraise sources` - Audit claim sources

## Supported Formats

| Format | How to Use |
|--------|------------|
| **URL** | `/fundraise review https://example.com/deck.html` |
| **PDF** | `/fundraise review ~/Documents/deck.pdf` |
| **Local HTML** | `/fundraise review ~/projects/pitch/deck.html` |
| **Images** | `/fundraise review ~/Desktop/slide1.png` (one slide at a time) |

Claude Code can read PDFs natively (extracts text + visuals per page).

---

## Operating Philosophy

1. **Premise before polish.** A beautiful deck with a weak premise loses. An ugly deck with a killer insight wins.
2. **Kawasaki as heuristic, not law.** 10/20/30 is a forcing function, not scripture. 24pt in the right context is fine.
3. **Investors bet on conviction.** Hedging language ("exploring," "potentially," "might") signals uncertainty.
4. **Painkiller > vitamin.** Hair-on-fire problems beat nice-to-haves.
5. **GTM clarity is underrated.** "Partnerships" is not a GTM strategy.
6. **Avoid AI slop.** Output should be direct, specific, and actionable. No generic praise or filler.

---

## Scoring Rubric (30 pts)

### Phase 0: PREMISE & CONVICTION (15 pts)

| Criterion | Pts | What to Score |
|-----------|-----|---------------|
| **Clarity** | 3 | Can I explain this to someone else in 30 seconds? No jargon soup. |
| **Problem Urgency** | 3 | Painkiller or vitamin? Hair-on-fire problem or "nice to have"? |
| **Believability** | 3 | Do I believe THIS team can execute? Credentials + traction + insight. |
| **Upside** | 3 | If this works, is it 100x? Venture-scale or lifestyle business? |
| **Non-consensus** | 3 | Is there a contrarian insight? "Everyone thinks X, but actually Y" |

### Phase 1: CONTENT & PROOF (10 pts)

| Criterion | Pts | What to Score |
|-----------|-----|---------------|
| **GTM Clarity** | 3 | HOW do you acquire customers? Channel, wedge, motion. Not "partnerships." |
| **Traction** | 3 | Numbers WITH timeframes. "1K users in 8 weeks" not "1K users." |
| **Business Model** | 2 | ONE clear way you make money. Not "exploring options." |
| **The Ask** | 2 | Specific $ amount + specific use of funds + milestones it unlocks. |

### Phase 2: STRUCTURE & DESIGN (5 pts)

| Criterion | Pts | What to Score |
|-----------|-----|---------------|
| **Kawasaki** | 3 | ≤10 slides, ≥30pt fonts (heuristic), one idea per slide |
| **Visual** | 2 | Hierarchy, consistency, no broken images, no text walls |

### Scoring Bands

| Score | Verdict |
|-------|---------|
| 27-30 | **Investor Ready** — Send it |
| 22-26 | **Almost Ready** — Fix 2-3 items |
| 17-21 | **Needs Work** — Structural issues |
| <17 | **Rethink** — Premise or story problems |

---

## Phase 0: Premise Deep Dive

### The 30-Second Test
After reading the deck, can you answer:
1. What do they do? (one sentence)
2. Why does it matter? (the problem)
3. Why now? (timing/wedge)
4. Why them? (team unfair advantage)

If any answer is unclear, the deck fails Phase 0.

### Vitamin vs. Painkiller

| Signal | Vitamin (weak) | Painkiller (strong) |
|--------|----------------|---------------------|
| Language | "helps," "enables," "improves" | "eliminates," "solves," "removes" |
| Urgency | "when you have time" | "before your next decision" |
| Buyer | "would be nice" | "I need this yesterday" |
| Budget | Discretionary | Mandatory/urgent |
| Proof | "People say they want..." | "People are paying/doing..." |

### Believability Signals

| Strong | Weak |
|--------|------|
| "I built this at Google and saw the gap" | "We're passionate about this space" |
| "500 users in 3 weeks, no marketing" | "We have interest from..." |
| "Ex-Stripe, ex-Square founding team" | "Combined 50 years experience" |
| Named investors/advisors | "In discussions with investors" |
| "Customers asked for this" | "We think the market wants..." |

### Conviction Red Flags
- "We're exploring several revenue models"
- "If we can capture just 1% of the market..."
- Hedging language: "potentially," "might," "could"
- No stated endgame or 5-year vision
- Defensive positioning ("we're not trying to be X")
- Vision without wedge: "We're the future of X" but no clear entry point

---

## Phase 1: Content Checklist

### The 10 Required Slides

| # | Slide | Must Answer |
|---|-------|-------------|
| 1 | **Title** | Who + What (2 sentences max) |
| 2 | **Problem** | Pain with DATA (not emotion) |
| 3 | **Why Now/Wedge** | Market timing + entry point |
| 4 | **Solution** | How you fix it (not features) |
| 5 | **Team** | Why YOU win (credentials) |
| 6 | **Business Model** | How you make money (ONE model) |
| 7 | **Competition** | Honest positioning (never "none") |
| 8 | **Traction** | Metrics WITH timeframes |
| 9 | **Path/Milestones** | What you prove with this raise |
| 10 | **Ask** | $ amount + use of funds |

### GTM Red Flags
- "We'll partner with..." (vague)
- "Enterprise sales" with no enterprise traction
- "Viral growth" with no viral mechanics explained
- "B2B2C" without naming the B
- No CAC/LTV discussion at growth stage
- "Word of mouth" as primary channel
- "Content marketing" without content or audience

### Traction Rules
- **Always include timeframes**: "1,000 users in 8 weeks" beats "1,000 users"
- **Show velocity, not just size**: Growth rate matters more than absolute numbers at seed
- **Match stage to metrics**:
  - Pre-seed: User signal, waitlist, LOIs, pilot commitments
  - Seed: Active users, retention, early revenue
  - Series A: Revenue, unit economics, clear path to scale

---

## Phase 2: Structure & Design

### Kawasaki 10/20/30 (as heuristic)

- **10 slides** maximum — more concepts = less retention
- **20 minutes** maximum — even with 1-hour slot
- **30-point font** minimum — forces you to cut to salient points

This is guidance, not law. 12 slides with a killer story beats 10 slides of filler.

### Font Size Guide (Tailwind)

| Tailwind | Pixels | Guidance |
|----------|--------|----------|
| text-xs | 12px | Too small |
| text-sm | 14px | Too small |
| text-base | 16px | Too small |
| text-lg | 18px | Footnotes only |
| text-xl | 20px | Captions only |
| text-2xl | 24px | Body minimum (acceptable) |
| text-3xl | 30px | Body ideal |
| text-4xl | 36px | Headlines |
| text-5xl+ | 48px+ | Hero stats |

### Design Principles

From **a16z**:
- "Design quality signals founder quality"
- One great stat beats five forgettable ones
- Clean, believable growth graph beats cluttered metrics

From **YC**:
- "Visually boring slides" — clear, large text, no flash
- Each slide = one idea in <5 seconds
- You're the lead; slides are supporting cast

### Design Checklist
- [ ] One idea per slide
- [ ] Max 6 bullet points per slide
- [ ] Visual hierarchy: headline > stats > body > footnote
- [ ] Consistent spacing across slides
- [ ] No broken images
- [ ] No walls of text

---

## Investor Questions Checklist

### Must Answer

- [ ] Who are you? What are you building?
- [ ] What problem are you solving? (with data)
- [ ] How big is the market? (TAM/SAM/SOM)
- [ ] How do you make money?
- [ ] Who are the competitors? Why do you win?
- [ ] What traction do you have? (with timeframes)
- [ ] Why is YOUR team the one to build this?
- [ ] How much are you raising? What will you do with it?

### Common Objections to Prepare

- [ ] Why hasn't someone else done this?
- [ ] What's your moat/defensibility?
- [ ] Why now? What changed?
- [ ] How do you acquire customers? CAC?
- [ ] What's the LTV? Unit economics?
- [ ] What are the Series A milestones?
- [ ] Who else is investing?

---

## Source Validation

All statistics and claims should have verifiable sources. Run `/fundraise sources` to audit.

### Required Sources For
- Market size (TAM/SAM/SOM)
- Problem statistics (percentages, dollar amounts)
- Competitor pricing
- Industry benchmarks
- Growth rates

### Source Quality Tiers

| Tier | Source Type | Example |
|------|-------------|---------|
| A | Peer-reviewed / Government | NIH, CDC, JAMA, CMS, Census |
| B | Industry Reports | McKinsey, Gartner, CB Insights |
| C | Reputable News / Research | NYT, WSJ, academic studies |
| D | Company Data | Competitor pricing pages, press releases |
| F | No source / "Common knowledge" | Unverified claims |

---

## Anti-Patterns to Flag

| Pattern | Why It's Bad |
|---------|--------------|
| "No competitors" | Instant credibility kill. Either you're lying or the market doesn't exist. |
| "If we capture just 1%..." | Shows you don't understand your market or GTM. |
| "We're exploring revenue models" | No conviction. Pick one. |
| "Partnerships" as GTM | Vague. Name the partner or describe the motion. |
| Metrics without time | Numbers are meaningless without velocity. |
| "Combined 50 years experience" | Irrelevant. What have you BUILT? |
| Fantasy TAM without SOM | $100B market means nothing if you can't reach it. |
| Reading from slides | Instant disqualification. Know your pitch. |

---

## Output Format

When running `/fundraise review`, output a scorecard table followed by details:

```
## SCORECARD

| Category | Score | Notes |
|----------|-------|-------|
| **PREMISE (15)** | | |
| Clarity | X/3 | [One-line assessment] |
| Problem Urgency | X/3 | [Painkiller or vitamin?] |
| Believability | X/3 | [Team + traction signal] |
| Upside | X/3 | [Venture-scale?] |
| Non-consensus | X/3 | [Contrarian bet clear?] |
| **CONTENT (10)** | | |
| GTM Clarity | X/3 | [How acquire customers?] |
| Traction | X/3 | [Numbers + timeframes?] |
| Business Model | X/2 | [Clear single model?] |
| The Ask | X/2 | [Specific amount + use?] |
| **STRUCTURE (5)** | | |
| Kawasaki | X/3 | [Slides, fonts, density] |
| Visual | X/2 | [Hierarchy, consistency] |
| | | |
| **TOTAL** | **X/30** | **[VERDICT]** |

---

## TOP 3 FIXES

1. **[Category]**: [Specific, actionable fix]
2. **[Category]**: [Specific, actionable fix]
3. **[Category]**: [Specific, actionable fix]

---

## DETAILED NOTES

[Expand on any scores that need explanation. Keep brief.]
```

---

## References

- [Kawasaki 10/20/30 Rule](https://guykawasaki.com/the_102030_rule/)
- [a16z Pitch Deck Guidelines](https://a16z.com/)
- [YC: How to Pitch Your Company](https://www.ycombinator.com/library/4b-how-to-pitch-your-company)
- [Andrew Chen's Investor Metrics Deck](https://andrewchen.com/investor-metrics-deck/)

### Key Stats
- Investors spend 2:42 on a deck before deciding
- a16z sees 3,000+ pitches/year, invests in 15 (0.5%)
- 83% of VCs weight business model most heavily
