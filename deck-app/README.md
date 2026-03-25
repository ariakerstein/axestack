# Deck Generator Web App

Web interface for the `/deck` skill. Generate investor-ready pitch decks from guided discovery.

## Architecture

```
deck.axestack.com
├── /                    # Landing page
├── /create              # 6-question wizard
├── /dashboard           # Your decks
├── /deck/[id]           # View + edit deck
│   ├── Edit tab         # Chat-based editing
│   ├── Score tab        # Scorecard breakdown
│   └── Feedback tab     # Investor feedback tracker
└── /api/
    ├── generate         # Create deck from answers
    ├── edit             # Apply chat edits
    ├── score            # Score deck
    └── feedback/analyze # Pattern analysis
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** shadcn/ui + Tailwind CSS
- **Database:** Supabase
- **Auth:** Supabase Auth
- **AI:** Anthropic Claude API
- **Hosting:** Vercel

## Setup

### 1. Generate UI with v0.dev

Paste prompts from `V0_PROMPT.md` into [v0.dev](https://v0.dev)

### 2. Create Next.js Project

```bash
npx create-next-app@latest deck-app --typescript --tailwind --app
cd deck-app
npx shadcn-ui@latest init
```

### 3. Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 4. Deploy to Vercel

```bash
vercel
```

## Features

### Discovery Wizard
- 6 forcing questions (one per screen)
- Pushback hints for vague answers
- Progress indicator

### Deck Generation
- Calls Claude API with SKILL.md prompt
- Outputs 10-slide HTML + Tailwind deck
- Auto-scores against fundraise rubric

### Chat Editing
- Natural language edits ("make GTM more specific")
- Real-time preview updates
- Change highlighting

### Feedback Tracking
- Log investor quotes
- Auto-detect themes
- Pattern analysis across conversations
- Compare feedback to deck scores

### Dashboard
- View all decks
- Status tracking (Draft/Ready/Shared)
- Quick actions (Edit, Duplicate, Share)

## API Reference

### POST /api/generate

```json
{
  "answers": {
    "oneLiner": "We help cancer patients get second opinions fast",
    "desperatePerson": "Mike, caregiver for his mom",
    "currentSolution": "Fragmented: Google, 3-week waits, $4K services",
    "unfairAdvantage": "Led largest 2nd opinion product + FB Newsfeed",
    "businessModel": "per_transaction",
    "raise": { "amount": "$500K", "milestone": "1,000 paying patients" }
  }
}
```

Returns:
```json
{
  "html": "<!DOCTYPE html>...",
  "score": 24,
  "scoreBreakdown": { "clarity": 3, "urgency": 3, ... },
  "gaps": ["GTM could be more specific", "Add traction timeframes"]
}
```

### POST /api/edit

```json
{
  "deckId": "uuid",
  "message": "Make the problem slide more urgent with specific stats"
}
```

Returns:
```json
{
  "updatedHtml": "<!DOCTYPE html>...",
  "changes": ["Slide 2: Added 84% stat, rewrote headline"],
  "response": "I've updated the problem slide with..."
}
```

## Roadmap

- [ ] v0.dev UI generation
- [ ] Supabase setup
- [ ] Claude API integration
- [ ] Chat editing
- [ ] Feedback tracking
- [ ] Share links (public preview)
- [ ] PDF export
- [ ] Team collaboration
