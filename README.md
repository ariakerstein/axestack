# ariaxe-stack

Personal Claude Code skills for interview prep, career development, and productivity.

Inspired by [gstack](https://github.com/anthropics/gstack).

## Installation

```bash
# Clone to your Claude skills directory
git clone https://github.com/ariaxe/ariaxe-stack.git ~/.claude/skills/ariaxe-stack

# Or symlink specific skills
ln -s ~/.claude/skills/ariaxe-stack/interview-prep ~/.claude/skills/interview-prep
```

Then add to your `~/.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Skill(interview-prep)"
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
