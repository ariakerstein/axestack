# Changelog

## April 6, 2026 (Today)

### Onboarding & Selective Friction
- Add selective friction onboarding — wizard gates tool access
- Add CareCircle prompt after first record upload
- Fix duplicate email prompts for wizard-completed users ("You're almost there!")
- Caregiver fast-path — skip role selection step
- Fix wizard flow — persist profile for guests, show name in navbar
- Soften wizard copy: "Tell us about you" vs "Who are you?"
- Add color and clarity to onboarding wizard

### Chat & Records
- Add inline file attachments to chat + selective friction prompts
- Improve chat file attachments — drag-drop, better UX, full doc context
- Smart Profile Sync — auto-detect cancer type from records
- Improve bulk upload UX for heavy files
- Fix records persistence + tone down CancerCombat button
- Add social proof to records upload area

### Combat (AI Tumor Board)
- Add multi-step expert consultation flow with Cancer Commons
- Add verification loop before analysis
- Add expert consultation email API
- Add Tony and Emma expert images
- Improve Combat UX — structured synthesis, email capture, style-aware output
- Make evidence meter messaging more illustrative
- Remove $29 PDF paywall — full analysis now free
- Fix Combat page handles any expert ID in URL params
- Fix combat UI consistency and engaging case evidence indicator
- Reorganize Combat action buttons for better flow
- Simplify bottom CTAs to 2 actions
- Wire expert review CTA to modal
- Wrap Combat page in Suspense for useSearchParams
- Fix API 500 errors

### Admin Dashboard
- Add RAG content admin at `/admin/rag`
- Fix 1000 entity limit — add attachment indicator to evals
- Include patient_activity questions in admin dashboard

### Ask Navis
- Add specialist care awareness and chained follow-ups
- Fix follow-up questions on shared Ask Navis links
- Add specialist care fields to EvalMetricsParams interface

### Email & Sharing
- Add viral sharing + comprehensive cancer selector
- Markdown rendering + continue asking + referral tracking

### Homepage
- Streamline homepage tools to 3 primary cards (Option B)
- Add Tony Magliocco bio and photo for trust building
- Update team images and homepage UX improvements
- Add Protean pathology review, fix favicons, update metadata
- Remove duplicate tools sections, add Protean branding
- Clean up homepage layout
- Restore 'Built by a survivor' + zero records prompt
- Use local team images instead of external URLs

### Auth & Security
- Make password primary auth method, magic link secondary
- Add email validation to reduce Supabase bounce rate
- Add rate limiting and webhook signature verification
- Fix critical vulnerabilities
- Fix vite vulnerability (npm audit)

### API & Infrastructure
- Fix profile saves using API route + track email captures
- Fix profile saving — use API route with service key
- Fix analytics tracking — use API route with service key
- Use Resend directly for expert consultation emails
- Add better error handling for expert consultation API

### Copy
- Update copy: "Built by survivors" (plural)
- Simplify link text: "About →"

### Mobile
- Fix mobile layout for homepage CTA and wizard cards

---

## April 5, 2026

### Design System
- Import Navis design system from insight-guide-query
- Optimistic foundation — violet/teal ambient warmth
- Homepage audit — CTA discipline, forbidden language, canonical components
- Sync all preview pages with markdown docs
- Sync VoiceTone.tsx preview + strengthen sync rule
- Nuance "loved one" rule — context-dependent, not blanket ban
- Add missing utils.ts for design-system build

### Onboarding
- Dynamic social proof from real session data
- UX improvements across wizard, combat, and records

### Homepage
- Personalized tool recommendations with hybrid layout
- Update tagline and restore partnership badges
- Dynamic social proof and privacy claim
- Clean up footer links and add advisors page
- Update advisors page with real photos

### Records
- Add notes field to record annotations
- Ensure records persist even when cloud save fails
- Delete from Supabase when clearing records
- Increase timeouts and validation for large files

### Auth & Security
- Prevent cross-user records data leakage + add record annotation
- Prevent records data leakage between users
- Don't block login on record migration

### Fixes
- Auth issues, design consistency, and advisors list

---

## April 4, 2026

### Design System
- Unified B&W + orange/green color system
- Module accent colors + copy updates
- Subtle accent colors on homepage cards + pages
- FINDING-001: Add H1 heading to profile page
- FINDING-004: Fix Save button to terracotta
- FINDING-005: Remove pink gradient, use terracotta
- FINDING-006: Fix touch targets and page background
- Fix AuthModal CTA colors to terracotta
- Fix Wizard CTA and badge colors per design system
- Improve profile CTA text and toggle accessibility

### Combat
- Expand to 5-voice AI tumor board model
- Add follow-up chat for clarifications and revisions
- Rename perspectives for clarity (UI, tuner, docs)

---

## April 3, 2026

### Admin Dashboard
- Patient Knowledge Graph with bidirectional Navis integration
- Add Palantir-style Entity Graph to admin dashboard
- Enhanced Entity Graph with interactive cross-tab
- Add Clinical Intelligence Cross-Tab to Entity Graph
- Clinical intelligence — centers, trials, confidence
- Clinical intelligence enhancements
- Entity relationships, SOC classification, batch extraction
- Add pharma insight bar to Entity Graph
- Add patient activity graph to admin dashboard
- Add Conversion Funnel view to Activity Graph
- Add Winback List to admin Activity Graph
- Patient drill-down + timeout fix
- Add Navis eval logging and expert review dashboard
- Link Knowledge Graph and Evals to admin tabs
- Click uploader stat to see emails
- Light theme for cross-tab, add uploader emails drilldown
- Show usersWithRecords instead of sessionsWithRecords

### Analytics Fixes
- Use recordUploaders for usersWithRecords
- Use patient_activity for authoritative action counts
- Save full question text in analytics for admin visibility
- Correct column names for patient_graph_connections view
- Handle undefined values in activity graph behavioral patterns
- Null check in activity graph API
- Remove 30-day filter from activity graph — show all time data

### Auth & Records
- Password login, localStorage migration, and upload progress fix
- CareCircle invites, knowledge graph updates, and reliability fixes
- Add API usage tracking, email system, and records sync improvements
- Show all user records regardless of source (navis + opencancer)
- Remove 50 record limit — patients can upload unlimited
- Pass userId to persona and synthesis functions
- Fast-path for guest users
- Accept svix-signature header for Resend webhooks

### Mobile
- Increase touch targets to 44px minimum
- FINDING-001-004: Fix mobile touch targets

### Testing
- Add Vitest test suite for auth and records

### Copy
- "Start Here" guidance for overwhelmed users
- Update hero to emphasize confusion/overwhelm
- Simplify CTA to "Start Here"

---

## April 2, 2026

- Add direct email sending for reports via Resend
- UX improvements — nav, padding, email sharing, homepage tools

---

## April 1, 2026

### Auth
- Unify wizard + auth — create account on signup
- Clean auth model — sign out clears everything

### Combat
- Design refresh — Combat page + text updates
- Match brand design palette

### Records
- Word doc + text file support for record uploads
- Add error handling for profile count query

### Features
- Premium tiers, combat persistence, smart symptom fallback

---

## March 30, 2026

- Add financial coverage, trust signals, and patient tools suite
- Add animated atom as dot on 'i' in logo
- Reduce homepage density, add coverage search
- Sharpen tool copy based on feedback

---

## March 29, 2026

- Initialize patientstack — AI patient navigation system
- Update tagline

---

**Total: ~160 commits over 9 days**
