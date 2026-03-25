# Deck Generator

Web app for generating investor-ready pitch decks. Answer 6 questions, get a 10-slide deck.

## Quick Start

```bash
# Install dependencies
npm install

# Add your Anthropic API key
cp .env.example .env
# Edit .env and add your key

# Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variable
vercel env add ANTHROPIC_API_KEY
```

## Features

- **6-question wizard** - Guided discovery flow
- **AI generation** - Claude creates 10-slide HTML deck
- **Auto-scoring** - Rates deck against investor framework
- **Download HTML** - Export and edit anywhere

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Anthropic Claude API
- Vercel hosting

## Structure

```
src/
├── app/
│   ├── page.tsx         # Landing page
│   ├── create/page.tsx  # Wizard flow
│   ├── preview/page.tsx # Deck preview + download
│   └── api/generate/    # Claude API route
└── components/
    └── Wizard.tsx       # 6-step form
```
