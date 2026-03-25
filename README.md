# axstack

Claude Code skills for interview prep, fundraising, career development, and productivity.

Inspired by [gstack](https://github.com/anthropics/gstack).

## Installation

```bash
# Clone to your Claude skills directory
git clone https://github.com/ariakerstein/axstack.git ~/.claude/skills/axstack

# Or symlink specific skills
ln -s ~/.claude/skills/axstack/interview-prep ~/.claude/skills/interview-prep
ln -s ~/.claude/skills/axstack/auto-interview ~/.claude/skills/auto-interview
ln -s ~/.claude/skills/axstack/linkedin-prep ~/.claude/skills/linkedin-prep
ln -s ~/.claude/skills/axstack/fundraise ~/.claude/skills/fundraise
```

Then add to your `~/.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Skill(interview-prep)",
      "Skill(auto-interview)",
      "Skill(linkedin-prep)",
      "Skill(fundraise)"
    ]
  }
}
```

## Skills

### `/interview-prep`

Comprehensive interview preparation for GM, CPO, and Product leadership roles.

**Commands:**
- `/interview-prep scan` - Quick 2-minute pre-interview review
- `/interview-prep stories` - Review your story matrix
- `/interview-prep prep [company]` - Company-specific prep
- `/interview-prep practice [type]` - Practice specific question types

**Features:**
- nSARl framework (Nugget → Situation → Action → Result → Lessons)
- Story matrix with prompt mapping
- Company-specific frameworks (Google, Meta, Amazon, Healthcare)
- Behavioral question bank
- Pre-interview checklist

**Setup:**
1. Copy `interview-prep/SKILL.md` to your skills folder
2. Add your stories to the Story Bank section
3. Update TMAY with your intro

### `/auto-interview`

Interactive interview simulation that asks questions based on role and seniority.

**Commands:**
- `/auto-interview` - Start full interview simulation
- `/auto-interview quick` - 5-question rapid fire
- `/auto-interview [type]` - Focus on one type (behavioral, product, strategy)
- `/auto-interview voice` - **Voice mode** with recording, transcription, and AI scoring

**Flow:**
1. Select role type (Product Manager, General Manager)
2. Select seniority (IC, Manager, Director+)
3. Answer questions from the bank
4. Get feedback using nSARl framework
5. Summary of strengths and areas to improve

#### Voice Mode

Speak your answers out loud, get them transcribed and scored:

```bash
# Setup
brew install sox
cd auto-interview && npm install
export OPENAI_API_KEY=sk-...

# Run
node voice-interview.mjs          # Full session
node voice-interview.mjs --quick  # 5 questions
```

**Features:**
- Real-time recording with timer (target: 60-90 seconds)
- Whisper API transcription
- GPT-4 scoring against nSARl framework
- Rewrite suggestions using your content
- Session summary with all answers

**Question Types:**
- Behavioral (Leadership, Influence, Conflict, Customer Focus, Execution)
- Product Sense (Design, Strategy, Diagnosis)
- Strategy (Market, Business Model, Vision)
- Execution (Estimation, Metrics, Process)
- Leadership (Team Building, Organizational, Executive Presence)

**Question Mix by Level:**

| Level | Behavioral | Product | Strategy | Leadership |
|-------|------------|---------|----------|------------|
| IC | 40% | 30% | 10% | 0% |
| Manager | 30% | 25% | 15% | 15% |
| Director+ | 20% | 20% | 25% | 25% |

### `/linkedin-prep`

Find warm intros to target companies by analyzing your LinkedIn connections.

**Commands:**
- `/linkedin-prep import [csv]` - Import your LinkedIn connections export
- `/linkedin-prep intros [company]` - Find warm intros to a company
- `/linkedin-prep search [query]` - Search by name, company, or title
- `/linkedin-prep stats` - Network statistics

**Setup:**
1. Export your LinkedIn connections (Settings → Data Privacy → Get a copy of your data)
2. Download and extract `Connections.csv`
3. Import: `node linkedin-prep.mjs import ~/Downloads/Connections.csv`

**Features:**
- Find direct connections at target companies
- Identify ex-employees who can make intros
- Message templates for outreach
- Network stats (top companies, titles, growth)
- 100% ToS compliant (uses your own exported data)

### `/fundraise`

Pitch deck review for investor-readiness. Premise-first analysis with Kawasaki 10/20/30 as guardrails.

**Commands:**
- `/fundraise review` - Full deck audit (premise → content → structure)
- `/fundraise premise` - Just the believability check
- `/fundraise objections` - Generate investor Q&A prep
- `/fundraise sources` - Audit claim sources

**Scoring (30 pts):**

| Phase | Points | Focus |
|-------|--------|-------|
| Premise & Conviction | 15 | Clarity, urgency, believability, upside, non-consensus |
| Content & Proof | 10 | GTM, traction, business model, ask |
| Structure & Design | 5 | Kawasaki, visual hierarchy |

**Features:**
- Vitamin vs. painkiller framework
- Believability signals (strong vs weak)
- GTM red flags
- Conviction red flags
- Traction rules by stage (pre-seed/seed/A)
- Anti-patterns table
- Investor Q&A checklist
- Source quality tiers

**Philosophy:**
1. Premise before polish
2. Kawasaki as heuristic, not law
3. Investors bet on conviction
4. Painkiller > vitamin
5. GTM clarity is underrated
6. Avoid AI slop

## Frameworks

### nSARl (Interview Response Framework)

```
n - Nugget    → Hook at beginning (one sentence summary)
S - Situation → Context (2-3 sentences max)
A - Action    → What YOU did (most of your answer)
R - Result    → Quantified outcomes (always include numbers)
l - Lessons   → What you learned (wrap it up)
```

### Story Selection Matrix

Map 6-8 stories to cover all competencies with backups:

| Story | Competencies | Best For |
|-------|--------------|----------|
| Story A | Leadership, Influence | "Tell me about leading..." |
| Story B | Data, Prioritization | "How do you make decisions..." |
| Story C | Conflict, Growth | "Tell me about a failure..." |
| ... | ... | ... |

## Contributing

PRs welcome! Please keep skills generic (no personal info) so others can use them.

## License

MIT
