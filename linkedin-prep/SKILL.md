# LinkedIn Prep Skill

Find warm intros to target companies by analyzing your LinkedIn connections export.

---

## Commands

| Command | Purpose |
|---------|---------|
| `/linkedin-prep [company]` | Find connections at or connected to a company |
| `/linkedin-prep import [csv_path]` | Import your LinkedIn connections export |
| `/linkedin-prep search [query]` | Search your network by company, title, or name |
| `/linkedin-prep intros [company]` | Get intro suggestions with message templates |
| `/linkedin-prep stats` | Show network statistics |

---

## Setup

### Step 1: Export Your LinkedIn Connections

1. Go to LinkedIn → Settings → Data Privacy
2. Click "Get a copy of your data"
3. Select "Connections" (or download full archive)
4. Wait for email, download the ZIP
5. Extract and find `Connections.csv`

### Step 2: Import Into Skill

```bash
/linkedin-prep import ~/Downloads/Connections.csv
```

This creates a local database of your connections (stored in `~/.linkedin-prep/`).

---

## Usage Examples

### Find Warm Intros to a Company

```
/linkedin-prep intros Stripe

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 WARM INTROS TO STRIPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DIRECT CONNECTIONS (1st degree):
  1. Jane Smith - Product Manager @ Stripe
     Connected: 2023-05-14
     → Direct outreach possible

  2. Mike Chen - Engineering Manager @ Stripe
     Connected: 2021-08-22
     → Direct outreach possible

POTENTIAL INTROS (via 1st degree):
  3. Sarah Lee - PM @ Stripe (via John Doe, ex-Stripe)
     John's current: Principal PM @ Airbnb
     → Ask John for intro

SUGGESTED MESSAGE:
"Hey [Name], hope you're doing well! I'm exploring
PM opportunities and noticed you're at Stripe. Would
love to learn about your experience there - any chance
you have 15 min for a quick chat?"
```

### Search Your Network

```
/linkedin-prep search "product manager"

Found 47 Product Managers in your network:
- Jane Smith @ Stripe
- Mike Lee @ Google
- Sarah Chen @ Meta
...
```

### Network Stats

```
/linkedin-prep stats

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 YOUR LINKEDIN NETWORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Connections: 1,247
With Email: 342 (27%)

TOP COMPANIES:
  Google          - 45 connections
  Meta            - 38 connections
  Amazon          - 31 connections
  Microsoft       - 28 connections
  Stripe          - 12 connections

TOP TITLES:
  Product Manager     - 89
  Software Engineer   - 156
  Director            - 45
  VP                  - 23
  Founder/CEO         - 34

NETWORK GROWTH:
  2024: +234 connections
  2023: +189 connections
  2022: +156 connections
```

---

## Data Storage

Your connections are stored locally at `~/.linkedin-prep/connections.json`

**Privacy:**
- Data never leaves your machine
- No API calls to LinkedIn
- 100% ToS compliant

---

## Warm Intro Strategy

### Tier 1: Direct Connections at Target
Best path. Direct message them.

### Tier 2: Ex-Employees in Your Network
Ask them for intros to current employees.

### Tier 3: Connections at Adjacent Companies
People who might know someone at target.

### Tier 4: Shared Background
Same school, previous company overlap, etc.

---

## Message Templates

### Reconnecting with Direct Connection
```
Hey [Name]! It's been a while since we connected.
I'm currently exploring [PM/GM] opportunities and
noticed you're at [Company]. Would love to hear
about your experience there - any chance you have
15 min this week for a quick call?
```

### Asking for an Intro
```
Hey [Name], hope you're doing well! I'm exploring
opportunities at [Company] and saw that you worked
there / know [Person]. Would you be comfortable
making an intro? Happy to send you a blurb you can
forward. Thanks!
```

### Cold-ish Outreach (2nd Degree)
```
Hi [Name], I came across your profile and noticed
we're both connected to [Mutual]. I'm exploring
[role] opportunities at [Company] and would love
to learn more about the team. Would you be open
to a brief chat?
```

---

## Installation

```bash
# Symlink to skills folder
ln -s ~/path/to/axstack/linkedin-prep ~/.claude/skills/linkedin-prep

# Add to settings
# "Skill(linkedin-prep)" in ~/.claude/settings.local.json
```

---

*Part of [axstack](https://github.com/ariakerstein/axstack)*
