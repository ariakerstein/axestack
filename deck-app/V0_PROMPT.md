# v0.dev Prompt for Deck Generator App

Paste this into v0.dev to generate the UI scaffold.

---

## PROMPT 1: Landing + Wizard Flow

```
Build a pitch deck generator app with these pages:

**Landing Page (/)**
- Hero: "Generate an investor-ready pitch deck in 5 minutes"
- Subhead: "Answer 6 questions. Get a 10-slide deck. No design skills needed."
- Big CTA button: "Create Your Deck"
- Below: 3 feature cards (AI-powered, Kawasaki 10/20/30 compliant, Export to HTML)
- Dark theme (slate-900 background, white text, teal-400 accents)

**Create Wizard (/create)**
- Multi-step form with progress indicator (Step 1 of 6)
- One question per step, full screen, centered
- Big input field or textarea for each answer
- "Next" button (disabled until answer provided)
- "Back" button (except step 1)
- Questions:
  1. "What do you do in one sentence?" (placeholder: "We help [X] do [Y] by [Z]")
  2. "Who is desperate for this? Name a specific person or title." (placeholder: "e.g., Mike, a son coordinating his mom's cancer care")
  3. "What are they doing today without you?" (textarea, placeholder: "How do they currently solve this problem?")
  4. "What's your unfair advantage?" (placeholder: "Domain expertise, traction, unique insight...")
  5. "How do you make money? Pick ONE model." (radio buttons: Per transaction, Subscription, Marketplace, Enterprise sales)
  6. "How much are you raising, and what milestone does it unlock?" (two inputs: Amount, Milestone)
- Final step shows summary of all answers with "Generate Deck" button
- Loading state: "Generating your deck..." with spinner

**Preview Page (/preview/[id])**
- Full-screen deck preview (scrollable slides)
- Sidebar with:
  - "Edit" button (opens chat)
  - "Download HTML" button
  - "Copy Link" button
  - Score card (24/30 with breakdown)
- Each slide is a section, scroll-snap enabled

Use shadcn/ui components. Dark theme throughout. Teal (#2dd4bf) as accent color.
```

---

## PROMPT 2: Dashboard

```
Add a dashboard page to the pitch deck generator app:

**Dashboard (/dashboard)**
- Header: "Your Decks" with "New Deck" button (links to /create)
- Grid of deck cards, each showing:
  - Company name (from title slide)
  - Created date
  - Score badge (e.g., "24/30")
  - Status pill (Draft, Ready, Shared)
  - Thumbnail preview of first slide
  - Actions: Edit, Duplicate, Delete, Share
- Empty state: "No decks yet. Create your first one."
- Filter tabs: All, Drafts, Shared

**Deck Detail Page (/deck/[id])**
- Left panel (60%): Full deck preview with slide navigation dots
- Right panel (40%):
  - Tabs: "Edit" | "Score" | "Feedback"
  - Edit tab: Chat interface (see next prompt)
  - Score tab: Scorecard breakdown with tips
  - Feedback tab: List of logged investor feedback quotes

Dark theme, shadcn/ui, same styling as before.
```

---

## PROMPT 3: Chat Edit Interface

```
Add a chat-based edit interface to the deck editor:

**Chat Panel (right side of /deck/[id])**
- Chat history showing conversation
- User messages aligned right (slate-700 bg)
- AI messages aligned left (slate-800 bg)
- Input at bottom: textarea + send button
- Suggested prompts above input:
  - "Make the problem slide more urgent"
  - "Add traction numbers"
  - "Rewrite the ask slide"
  - "Strengthen the team slide"

**Behavior:**
- When user sends message, show typing indicator
- AI responds with suggested changes
- "Apply Changes" button appears after AI response
- Clicking apply updates the deck preview in real-time
- Show diff highlighting on affected slide

**Example flow:**
User: "The GTM is too vague, make it more specific"
AI: "I'll update slide 6 with specific acquisition channels..."
[Apply Changes button]
Preview updates with highlighted changes

Include message history with timestamps. Dark theme.
```

---

## PROMPT 4: Feedback Tracker

```
Add investor feedback tracking to the deck app:

**Feedback Tab (in /deck/[id] right panel)**
- "Add Feedback" button opens modal
- Modal fields:
  - Quote (textarea, required)
  - Investor name/firm (optional)
  - Sentiment (radio: Praise, Concern, Question, Pass)
- List of feedback entries below, each showing:
  - Quote text
  - Investor (if provided)
  - Date
  - Auto-detected theme tag (GTM, Traction, Team, etc.)
  - Sentiment icon (green check, yellow warning, red x)
  - Delete button

**Feedback Analysis View**
- "Analyze Patterns" button
- Shows:
  - Theme frequency chart (bar chart)
  - Sentiment breakdown (pie chart)
  - "Top Issues" list with counts
  - Comparison to deck score (e.g., "GTM flagged by 3 investors, current score 2/3")

Dark theme, teal accents, shadcn/ui components.
```

---

## Full Tech Stack

When setting up the Next.js project:

```
Framework: Next.js 14 (App Router)
UI: shadcn/ui + Tailwind CSS
Database: Supabase (decks, feedback, users)
Auth: Supabase Auth (magic link or Google)
AI: Anthropic Claude API (via API routes)
Hosting: Vercel
```

---

## Database Schema (for Supabase)

```sql
-- Decks table
create table decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  title text,
  answers jsonb, -- stores the 6 discovery answers
  html_content text, -- generated deck HTML
  score integer,
  score_breakdown jsonb,
  status text default 'draft', -- draft, ready, shared
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Feedback table
create table feedback (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references decks on delete cascade,
  quote text not null,
  investor text,
  sentiment text, -- praise, concern, question, pass
  themes text[], -- auto-detected themes
  created_at timestamp default now()
);

-- Chat history table
create table chat_history (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references decks on delete cascade,
  role text, -- user or assistant
  content text,
  created_at timestamp default now()
);
```

---

## API Routes Needed

```
POST /api/generate - Generate deck from answers (calls Claude)
POST /api/edit - Apply chat-based edits (calls Claude)
POST /api/score - Score a deck against rubric
POST /api/feedback/analyze - Analyze feedback patterns
```
