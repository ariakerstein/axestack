import { NextRequest, NextResponse } from 'next/server'

// Theme definitions synced from /deck skill
const THEMES = {
  'dark-modern': {
    name: 'Dark Modern',
    css: `
      --deck-bg: #0f172a;
      --deck-bg-alt: #ffffff;
      --deck-surface: #1e293b;
      --deck-surface-alt: #f1f5f9;
      --deck-text: #f8fafc;
      --deck-text-alt: #0f172a;
      --deck-muted: #94a3b8;
      --deck-muted-alt: #64748b;
      --deck-accent: #38bdf8;
      --deck-accent-secondary: #10b981;
      --deck-accent-warning: #f59e0b;
      --deck-accent-danger: #ef4444;
      --deck-border: #334155;
      --deck-border-alt: #e2e8f0;
    `,
    description: 'Dark slides with vibrant accents, alternating rhythm'
  },
  'light-clean': {
    name: 'Light Clean',
    css: `
      --deck-bg: #ffffff;
      --deck-bg-alt: #ffffff;
      --deck-surface: #f8fafc;
      --deck-surface-alt: #f1f5f9;
      --deck-text: #0f172a;
      --deck-text-alt: #0f172a;
      --deck-muted: #64748b;
      --deck-muted-alt: #94a3b8;
      --deck-accent: #0d9488;
      --deck-accent-secondary: #0ea5e9;
      --deck-accent-warning: #d97706;
      --deck-accent-danger: #dc2626;
      --deck-border: #e2e8f0;
      --deck-border-alt: #cbd5e1;
    `,
    description: 'All-white, formal, institutional'
  },
  'warm-editorial': {
    name: 'Warm Editorial',
    css: `
      --deck-bg: #fffbf5;
      --deck-bg-alt: #1e293b;
      --deck-surface: #ffffff;
      --deck-surface-alt: #334155;
      --deck-text: #1c1917;
      --deck-text-alt: #f8fafc;
      --deck-muted: #78716c;
      --deck-muted-alt: #a8a29e;
      --deck-accent: #ea580c;
      --deck-accent-secondary: #0d9488;
      --deck-accent-warning: #ca8a04;
      --deck-accent-danger: #dc2626;
      --deck-border: #e7e5e4;
      --deck-border-alt: #44403c;
    `,
    description: 'Warm tones, storytelling feel'
  },
  'bold-dark': {
    name: 'Bold Dark',
    css: `
      --deck-bg: #000000;
      --deck-bg-alt: #000000;
      --deck-surface: rgba(255,255,255,0.05);
      --deck-surface-alt: rgba(255,255,255,0.08);
      --deck-text: #ffffff;
      --deck-text-alt: #ffffff;
      --deck-muted: #a1a1aa;
      --deck-muted-alt: #71717a;
      --deck-accent: #22c55e;
      --deck-accent-secondary: #3b82f6;
      --deck-accent-warning: #eab308;
      --deck-accent-danger: #ef4444;
      --deck-border: rgba(255,255,255,0.1);
      --deck-border-alt: rgba(255,255,255,0.15);
    `,
    description: 'High contrast black, punchy'
  }
}

const SYSTEM_PROMPT = `You are an elite pitch deck designer. Generate a VISUALLY STUNNING 10-slide HTML pitch deck.

## KAWASAKI 10/20/30 RULES (HARD LIMITS)
- Exactly 10 slides
- 30pt+ fonts (text-3xl minimum body, text-5xl+ headlines)
- One idea per slide

Output ONLY valid HTML starting with <!DOCTYPE html>. No markdown, no explanation.

## CONTENT DENSITY LIMITS (NON-NEGOTIABLE)
If content doesn't fit these limits, simplify — never cram.

| Slide Type | Max Items | Max Words Per Item |
|------------|-----------|-------------------|
| Cover | 1 title + 1 subtitle | 10 words title, 8 subtitle |
| Problem/Statement | 1 headline + 3 cards OR 1 image | 8 words headline, 20 words/card |
| Solution/Flow | 3-5 steps + 1 callout | 5 words/step, 30 words callout |
| Team | 3-6 people | Name + title + 2 lines max |
| Metrics | 3-5 metric cards | 3 words per label |
| Features | 3 cards with 3 bullets each | 8 words/bullet |
| Traction/Quotes | 2-4 metrics + 2-3 quotes | 20 words/quote |
| Competition/Table | Max 6 rows, 4 columns | 15 words/cell |
| Ask/Two-Column | 4 key-values + 3 actions | 20 words/action |

## SLIDE STRUCTURE (10 SLIDES)
1. **Cover** - Logo, company name, one-line positioning, date
2. **Problem** - Pain with DATA (stat, cost, time lost). Statement slide with cards.
3. **Why Now** - Market timing + wedge. Flow or statement slide.
4. **Solution** - How you fix it. Flow slide with 3-4 steps.
5. **How It Works** - Product demo or process. Feature cards slide.
6. **Business Model** - ONE revenue model + pricing. Metrics or two-column.
7. **Traction** - Metrics WITH timeframes. Quotes/metrics slide.
8. **Competition** - Honest comparison. Table or checklist slide.
9. **Team** - Why YOU win. Team grid slide.
10. **Ask** - $ amount + use + milestone. Two-column slide.

## SLIDE TYPE TEMPLATES

### Cover Slide (Slide 1)
<section class="slide slide-cover">
  <div class="text-center max-w-4xl">
    <div class="text-6xl mb-4">🎯</div>
    <h1 class="text-6xl font-bold text-[var(--deck-text)] mb-4">{Company Name}</h1>
    <p class="text-3xl text-[var(--deck-accent)] mb-6">{One-line positioning}</p>
    <p class="text-xl text-[var(--deck-muted)]">{Date}</p>
  </div>
</section>

### Statement Slide (Problem, Why Now)
<section class="slide slide-dark">
  <div class="slide-header">
    <span class="text-sm text-[var(--deck-muted)] uppercase tracking-widest">{Section}</span>
  </div>
  <div class="max-w-5xl w-full">
    <h2 class="text-5xl font-bold text-[var(--deck-text)] mb-10 text-center">{Headline}</h2>
    <div class="grid grid-cols-3 gap-6">
      <div class="bg-[var(--deck-surface)] rounded-2xl p-6 border border-[var(--deck-border)]">
        <p class="text-lg font-bold text-[var(--deck-accent)] mb-2">{Card Title}</p>
        <p class="text-[var(--deck-muted)]">{Card content - max 20 words}</p>
      </div>
      <!-- 2 more cards -->
    </div>
    <p class="text-center text-2xl text-[var(--deck-text)] font-bold mt-8">
      <span class="text-[var(--deck-accent-danger)]">{Stat}</span> {context}
    </p>
  </div>
</section>

### Flow Slide (Solution, How It Works)
<section class="slide slide-light">
  <div class="slide-header">...</div>
  <div class="max-w-5xl w-full text-center">
    <h2 class="text-5xl font-bold text-[var(--deck-text-alt)] mb-4">{Headline}</h2>
    <p class="text-2xl text-[var(--deck-muted-alt)] mb-10">{Subhead}</p>
    <div class="flex justify-center items-center gap-4 mb-10">
      <div class="bg-[var(--deck-surface-alt)] border border-[var(--deck-border-alt)] rounded-xl px-6 py-4">
        <p class="text-lg font-semibold text-[var(--deck-text-alt)]">{Step 1}</p>
      </div>
      <span class="text-2xl text-[var(--deck-muted-alt)]">→</span>
      <!-- More steps with arrows -->
      <div class="bg-[var(--deck-accent)]/10 border-2 border-[var(--deck-accent)] rounded-xl px-6 py-4">
        <p class="text-lg font-semibold text-[var(--deck-accent)]">{Final Step}</p>
      </div>
    </div>
  </div>
</section>

### Team Grid Slide
<section class="slide slide-dark">
  <div class="slide-header">...</div>
  <div class="max-w-5xl w-full">
    <h2 class="text-4xl font-bold text-[var(--deck-text)] mb-8 text-center">{Headline}</h2>
    <div class="grid grid-cols-3 gap-6 mb-8">
      <div class="text-center">
        <div class="w-24 h-24 mx-auto mb-3 rounded-full bg-[var(--deck-surface)] border-4 border-[var(--deck-accent)] flex items-center justify-center text-3xl">👤</div>
        <p class="font-bold text-[var(--deck-text)]">{Name}</p>
        <p class="text-sm text-[var(--deck-muted)]">{Title}</p>
        <p class="text-sm text-[var(--deck-accent)]">{Credential}</p>
      </div>
      <!-- More team members -->
    </div>
  </div>
</section>

### Metrics Slide (Traction)
<section class="slide slide-light">
  <div class="slide-header">...</div>
  <div class="max-w-5xl w-full">
    <h2 class="text-5xl font-bold text-[var(--deck-text-alt)] mb-8 text-center">{Headline}</h2>
    <div class="flex justify-center gap-6 mb-8">
      <div class="bg-[var(--deck-accent)]/10 border-2 border-[var(--deck-accent)] rounded-2xl p-6 text-center min-w-[160px]">
        <p class="text-5xl font-bold text-[var(--deck-accent)]">{Number}</p>
        <p class="text-lg font-semibold text-[var(--deck-text-alt)]">{Label}</p>
        <p class="text-sm text-[var(--deck-muted-alt)]">{Timeframe}</p>
      </div>
      <!-- More metric cards -->
    </div>
  </div>
</section>

### Two-Column Slide (Ask)
<section class="slide slide-dark">
  <div class="slide-header">...</div>
  <div class="max-w-5xl w-full">
    <div class="grid grid-cols-2 gap-10">
      <div>
        <h2 class="text-3xl font-bold text-[var(--deck-text)] mb-6">{Left Title}</h2>
        <div class="bg-[var(--deck-surface)] rounded-2xl p-6 border border-[var(--deck-border)]">
          <div class="space-y-4">
            <div class="flex justify-between">
              <span class="text-[var(--deck-muted)]">{Label}:</span>
              <span class="text-2xl font-bold text-[var(--deck-text)]">{Value}</span>
            </div>
            <!-- More key-value pairs -->
          </div>
        </div>
      </div>
      <div>
        <h2 class="text-3xl font-bold text-[var(--deck-text)] mb-6">{Right Title}</h2>
        <div class="space-y-4">
          <div class="bg-[var(--deck-accent-secondary)]/20 border border-[var(--deck-accent-secondary)]/50 rounded-xl p-5">
            <p class="text-[var(--deck-accent-secondary)] font-semibold text-lg mb-1">{Action 1}</p>
            <p class="text-[var(--deck-muted)]">{Description}</p>
          </div>
          <!-- More action items -->
        </div>
      </div>
    </div>
  </div>
</section>

## HTML STRUCTURE
Use this exact structure:

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Company} - Pitch Deck</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { font-family: 'Inter', sans-serif; }
    :root {
      {THEME_CSS}
    }
    html, body { margin: 0; padding: 0; }
    .slide {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      position: relative;
    }
    .slide-dark { background: var(--deck-bg); color: var(--deck-text); }
    .slide-light { background: var(--deck-bg-alt); color: var(--deck-text-alt); }
    .slide-cover { background: linear-gradient(135deg, var(--deck-bg) 0%, var(--deck-surface) 100%); color: var(--deck-text); }
    .slide-header {
      position: absolute;
      top: 2rem;
      left: 2rem;
    }
    .slide-number {
      position: absolute;
      bottom: 2rem;
      right: 2rem;
      font-size: 0.875rem;
      color: var(--deck-muted);
    }
  </style>
</head>
<body>
  <!-- 10 slides here -->
</body>
</html>

## VISUAL RHYTHM
- Alternate slide-dark and slide-light for visual rhythm
- Cover slide uses slide-cover (gradient)
- Ask/closing slide uses slide-dark

## ANTI-PATTERNS (NEVER DO)
- Same layout on consecutive slides
- More than one idea per slide
- Generic filler ("In today's world...")
- Walls of text — if it needs a paragraph, it's too much
- Identical card structures (3 cards, 3 cards, 3 cards)
- Inventing statistics or quotes
- Claiming "no competitors"
- Metrics without timeframes
- Fonts smaller than text-xl for body
- Missing slide numbers

## ALWAYS DO
- Include slide-header on every slide (except cover)
- Include slide-number on every slide
- Alternate dark/light backgrounds
- Lead with the most important number/insight
- Use whitespace generously
- Make one element per slide visually dominant
- Vary visual patterns across slides`

export async function POST(request: NextRequest) {
  try {
    const { answers, theme = 'dark-modern' } = await request.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Get theme CSS
    const selectedTheme = THEMES[theme as keyof typeof THEMES] || THEMES['dark-modern']
    const systemPromptWithTheme = SYSTEM_PROMPT.replace('{THEME_CSS}', selectedTheme.css)

    const userPrompt = `Generate a pitch deck based on these answers:

Company Name: ${answers.companyName}
1. What they do: ${answers.oneLiner}
2. Who's desperate: ${answers.desperatePerson}
3. Current solution: ${answers.currentSolution}
4. Unfair advantage: ${answers.unfairAdvantage}
5. Business model: ${answers.businessModel}
6. Raising: ${answers.raiseAmount} to achieve: ${answers.raiseMilestone}

Theme: ${selectedTheme.name} (${selectedTheme.description})

Generate the complete HTML deck now. Remember:
- Include section label (PROBLEM, SOLUTION, etc.) in slide-header top left
- Include slide numbers on every slide
- Alternate dark/light slides for visual rhythm
- Use the exact CSS variables provided
- Follow content density limits strictly`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 12000,
        system: systemPromptWithTheme,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    })

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.text()
      return NextResponse.json(
        { error: `Anthropic API error: ${anthropicResponse.status} - ${errorData}` },
        { status: 500 }
      )
    }

    const message = await anthropicResponse.json()

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const html = content.text

    // Enhanced scoring based on content presence
    const score = calculateScore(html, answers)

    return NextResponse.json({
      html,
      score: score.total,
      scoreBreakdown: score.breakdown,
      gaps: score.gaps,
      theme,
    })
  } catch (error) {
    console.error('Generation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to generate deck: ${message}` },
      { status: 500 }
    )
  }
}

function calculateScore(html: string, answers: Record<string, string>) {
  const breakdown: Record<string, number> = {}
  const gaps: string[] = []

  // Clarity (3 pts) - one-liner is specific
  const hasSpecificOneLiner = answers.oneLiner && answers.oneLiner.length > 20
  breakdown.clarity = hasSpecificOneLiner ? 3 : 2
  if (!hasSpecificOneLiner) gaps.push('One-liner could be more specific')

  // Problem Urgency (3 pts) - current solution is painful
  const hasPainfulProblem = answers.currentSolution && answers.currentSolution.length > 50
  breakdown.problemUrgency = hasPainfulProblem ? 3 : 2
  if (!hasPainfulProblem) gaps.push('Describe the current pain more vividly')

  // Believability (3 pts) - unfair advantage is credible
  const hasCredentials = answers.unfairAdvantage &&
    (answers.unfairAdvantage.toLowerCase().includes('ex-') ||
     answers.unfairAdvantage.toLowerCase().includes('built') ||
     answers.unfairAdvantage.toLowerCase().includes('led') ||
     answers.unfairAdvantage.toLowerCase().includes('founded'))
  breakdown.believability = hasCredentials ? 3 : 2
  if (!hasCredentials) gaps.push('Add specific credentials (ex-Company, built X)')

  // GTM (3 pts) - business model is clear
  breakdown.gtm = answers.businessModel ? 3 : 1
  if (!answers.businessModel) gaps.push('Specify how you acquire customers')

  // Traction (3 pts) - hard to assess without data
  breakdown.traction = 2
  gaps.push('Add specific traction numbers with timeframes')

  // Business Model (2 pts)
  breakdown.businessModel = answers.businessModel ? 2 : 1

  // The Ask (2 pts)
  const hasSpecificAsk = answers.raiseAmount && answers.raiseMilestone
  breakdown.theAsk = hasSpecificAsk ? 2 : 1
  if (!hasSpecificAsk) gaps.push('Be more specific about raise amount and milestone')

  // Kawasaki (3 pts) - HTML has proper structure
  const slideCount = (html.match(/class="slide/g) || []).length
  const hasLargeFonts = html.includes('text-5xl') || html.includes('text-6xl')
  const hasSlideNumbers = html.includes('slide-number')
  breakdown.kawasaki = (slideCount === 10 && hasLargeFonts && hasSlideNumbers) ? 3 : 2

  // Visual (2 pts) - proper structure
  const hasHeaders = html.includes('slide-header')
  const alternatesThemes = html.includes('slide-dark') && html.includes('slide-light')
  breakdown.visual = (hasHeaders && alternatesThemes) ? 2 : 1

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)

  return { total, breakdown, gaps: gaps.slice(0, 3) }
}
