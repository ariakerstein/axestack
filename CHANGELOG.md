# Changelog

## Week of April 6, 2026

### Onboarding & Selective Friction
- Selective friction onboarding — wizard gates tool access
- CareCircle prompt after first record upload
- Fix duplicate email prompts for wizard-completed users
- Caregiver fast-path — skip role selection step
- Persist profile for guests, show name in navbar
- Soften wizard copy: "Tell us about you"
- Add color and clarity to onboarding wizard

### Chat & Records
- Inline file attachments to chat + selective friction prompts
- Drag-drop file attachments with better UX
- Smart Profile Sync — auto-detect cancer type from records
- Bulk upload UX for heavy files
- Social proof in records upload area

### Combat (AI Tumor Board)
- Multi-step expert consultation flow with Cancer Commons
- Verification loop before analysis
- Expert consultation email API
- Tony and Emma expert images
- Structured synthesis, email capture, style-aware output
- Evidence meter messaging improvements
- Remove $29 PDF paywall — full analysis free
- Reorganize action buttons, simplify CTAs
- Fix API 500 errors

### Admin Dashboard
- RAG content admin at `/admin/rag`
- Fix 1000 entity limit, add attachment indicator
- Include patient_activity questions

### Ask Navis
- Specialist care awareness and chained follow-ups
- Fix follow-up questions on shared links

### Email & Sharing
- Viral sharing + comprehensive cancer selector
- Markdown rendering + continue asking + referral tracking

### Homepage
- Streamline to 3 primary tool cards
- Tony Magliocco bio and photo
- Protean pathology review, favicons, metadata
- Team images updates

### Auth & Security
- Password as primary auth method
- Email validation to reduce bounce rate
- Rate limiting and webhook verification
- Security vulnerability fixes

### Copy
- "Built by survivors" (plural)
- "About →" simplified

---

## Week of March 30, 2026

### OpenCancer.ai Launch (March 29)
- Initialize patientstack — AI patient navigation system
- Financial coverage, trust signals, patient tools suite
- Animated atom as dot on 'i' in logo
- Reduce homepage density, add coverage search

### Combat & Auth (April 1)
- Premium tiers, combat persistence, smart symptom fallback
- Combat page design refresh — match brand palette
- Unify wizard + auth — create account on signup
- Clean auth model — sign out clears everything
- Word doc + text file support for record uploads

### Email & UX (April 2)
- Direct email sending for reports via Resend
- Nav, padding, email sharing improvements

### Admin Dashboard (April 3)
- Patient Knowledge Graph with bidirectional Navis integration
- Palantir-style Entity Graph with interactive cross-tab
- Clinical Intelligence — centers, trials, confidence, SOC classification
- Patient Activity Graph with Conversion Funnel
- Winback List for re-engagement
- Pharma Insight Bar
- Navis eval logging and expert review dashboard
- Patient drill-down with timeout fix
- CareCircle invites, knowledge graph updates
- API usage tracking, email system, records sync

### Analytics & Metrics (April 3)
- Use recordUploaders for accurate user counts
- Save full question text in analytics
- Remove 30-day filter — show all time data
- Remove 50 record limit — unlimited uploads
- Vitest test suite for auth and records

### Mobile & Copy (April 3)
- Touch targets to 44px minimum
- "Start Here" guidance for overwhelmed users
- Hero emphasizes confusion/overwhelm

### Design System (April 4)
- Unified B&W + orange/green color system
- Module accent colors + copy updates
- Design audit fixes (H1, Save button, gradients, touch targets)
- AuthModal and Wizard CTA colors to terracotta

### Combat Expansion (April 4)
- 5-voice AI tumor board model
- Follow-up chat for clarifications
- Rename perspectives for clarity

### Design & Security (April 5)
- Import Navis design system
- Optimistic foundation — violet/teal ambient warmth
- Homepage audit — CTA discipline, forbidden language
- Personalized tool recommendations
- Dynamic social proof from real session data
- Notes field for record annotations
- Prevent cross-user records data leakage
- Advisors page with real photos

---

## Week of March 23, 2026

### Prompt Deck Launch (March 25-27)
- Pitch deck generator skill
- Next.js web frontend for deck generator
- Split-view editor with AI chat
- Deck audit page with scoring framework
- Per-slide scoring with color-coded indicators (R/Y/G)
- AI Assist panel + deck type/stage selector
- Visual design system with color schemes
- Pitch/Figma-style visual layout picker
- PDF upload with 20MB support via Vercel Blob
- Gamified scoring with history and celebrations
- Version control with investor feedback
- Confetti and motivation messages
- Light/dark theme toggle + ADA compliance
- Supabase persistence for decks and feedback
- Supabase Auth (email)
- Vibrant gradient theme
- About page with personal bio and beliefs

### Fundraise Skill (March 25)
- Pitch deck review skill
- Investor feedback tracking
- Supported formats: PDF, HTML, URL, images

### LinkedIn Prep (March 24)
- LinkedIn-prep skill for warm intros
- Browser-based LinkedIn export flow

### Interview Prep (March 23)
- Auto-interview skill for interview simulation
- Voice mode for auto-interview
- Claude support for scoring (with GPT-4 fallback)

---

## Summary

| Week | Focus | Commits |
|------|-------|---------|
| Apr 6 | Selective friction, Combat expert flow, Admin RAG | ~65 |
| Mar 30 - Apr 5 | OpenCancer launch, Admin dashboard, Design system | ~95 |
| Mar 23-28 | Prompt Deck, Fundraise, LinkedIn, Interview skills | ~90 |

**Total: ~250 commits in 2 weeks**
