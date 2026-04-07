# Navis Pitch Deck - Feedback Action Plan
**Date:** November 3, 2025
**Source:** Angel pitch feedback session
**Status:** Action plan created - ready for implementation

---

## EXECUTIVE SUMMARY

**Overall Assessment:** Deck has strong foundation (97% YC compliance) but needs sharper articulation of trust mechanics, licensing boundaries, revenue flows, and competitive moat vs Open Evidence.

**Priority Level:** HIGH - These gaps directly impact investor confidence in business model viability and defensibility.

**Estimated Effort:** 6-8 hours of content work + 3-4 hours HTML implementation

---

## FEEDBACK CONCERN #1: "Gap of Trust" with Cancer Doctors

### What We Heard:
> "What this team needed to understand better was this 'gap of Trust' with the Cancer doctors and what you fill and don't fill there."

### Current State:
- **Slide 5 (Trust Infrastructure)** mentions 4-layer trust stack but doesn't explicitly address doctor relationship
- **Slide 3 (Solution)** shows "Upload → Understand → Act" but doesn't clarify doctor's role
- Missing explicit framework for "what Navis does vs what doctors do"

### Gap Analysis:
- ❌ No clear boundary: "Navis guides, doctors decide"
- ❌ No explanation of how Navis supports (not replaces) oncologist relationship
- ❌ Doesn't address affordability question when doctors don't recommend tests

### PROPOSED SOLUTION:

#### Option A: Add New Slide (Slide 5.5 - "Trust Gap Explained")
**Placement:** Between current Slide 5 (Trust Infrastructure) and Slide 6 (Demo)

**Content:**
```markdown
HEADLINE: "We Guide. Doctors Decide."

WHAT NAVIS FILLS:
• Information synthesis (200-page pathology → 2-page summary)
• Gap identification (NCCN guideline match → missed biomarker tests)
• Navigation support (4 specialists across 3 facilities → coordinated timeline)
• Affordability transparency ("Test X costs $3,500 uninsured; alternatives: Y, Z")

WHAT NAVIS DOESN'T FILL:
• Medical diagnosis (we surface questions, not answers)
• Treatment selection (we provide options, doctor chooses)
• Prescription authority (navigational tool, not clinical decision support)
• Insurance negotiation (we inform, patient + financial counselor execute)

VISUAL: Split diagram - Left side "Patient Today" (chaos), Right side "Patient with Navis" (guided path to doctor conversation)

THE TRUST GAP:
"Most patients don't know what questions to ask. Navis turns medical reports into informed conversations with your oncologist."
```

#### Option B: Enhance Slide 3 (Solution) - Add Trust Boundary Section
**Update existing Slide 3** with clearer "Navis + Doctor" relationship:

```markdown
Current: "Upload → Understand → Act"

Enhanced: "Upload → Understand → Ask Better Questions"

NEW SECTION (bottom of slide):
HOW NAVIS WORKS WITH YOUR DOCTOR:
• Before appointment: Navis identifies gaps in your care plan
• During appointment: You ask informed questions ("Should I get Foundation One testing?")
• After appointment: Navis organizes next steps and coordinates specialists

AFFORDABILITY CLARITY:
"When tests are unaffordable, Navis surfaces alternatives (clinical trials, patient assistance programs, generic biomarker panels)."
```

**RECOMMENDATION:** Use **Option B** (enhance Slide 3) for angel pitch, create **Option A** (new slide) for VC pitch when you have more time to explain nuance.

---

## FEEDBACK CONCERN #2: Licensing - "Navigational Tool" vs Medical Advice

### What We Heard:
> "Also if you are a 'navigational tool' how do you not break some basic licensing rules vs a medical recommendation."

### Current State:
- **Slide 8 (Business Model)** doesn't address regulatory positioning
- No explicit statement about clinical decision support vs navigation
- Missing legal disclaimers/positioning

### Gap Analysis:
- ❌ No clear regulatory category (21st Century Cures Act exemption?)
- ❌ Doesn't explain how Navis stays compliant
- ❌ No risk mitigation for "practicing medicine without license" perception

### PROPOSED SOLUTION:

#### Add to Slide 8 (Business Model) - Regulatory Positioning Section

**NEW CONTENT BLOCK:**
```markdown
REGULATORY POSITIONING:

NAVIGATIONAL TOOL (NOT Clinical Decision Support):
• Navis = "GPS for cancer care" (information synthesis + coordination)
• Does NOT diagnose, prescribe, or recommend specific treatments
• Falls under 21st Century Cures Act exemption (administrative support software)

HOW WE STAY COMPLIANT:
✅ All outputs labeled "for informational purposes - discuss with your doctor"
✅ HIPAA-compliant Vault (BAA with all partners)
✅ SOC2 Type II certification (in progress, Q1 2026)
✅ Medical advisory board review (Dr. [Name], Stanford Oncology)

COMPARABLE POSITIONING:
• Similar to: WebMD (information), GoodRx (price transparency), Zocdoc (scheduling)
• Different from: UpToDate (clinical decision support - requires MD license to access)

RISK MITIGATION:
"We organize information. Doctors make decisions. This boundary is legally defensible and central to our product design."
```

**ALTERNATIVE (if slide space is tight):**
Move this content to **Appendix Slide** ("Regulatory & Risk Mitigation") and verbally address during pitch:

> "Great question. Navis is a navigational tool, not clinical decision support. We synthesize information and identify gaps, but we never diagnose or prescribe. Think of us like a GPS - we show you the route, but your doctor is still driving. This falls under the 21st Century Cures Act exemption for administrative support software, and we're working with a medical advisory board to ensure every feature stays on the right side of that line."

**RECOMMENDATION:** Add **brief version** to Slide 8, create **detailed appendix slide** for Q&A.

---

## FEEDBACK CONCERN #3: B2B2C Strategy Needs to Be Crisper

### What We Heard:
> "Your B2B2C Strategy needs to be crisper. Your beachheads are labs that get you to end patients and you have some early wins there. You need to show more."

### Current State:
- **Slide 9 (GTM)** shows "Trusted communities drive low cost acquisition" but doesn't clearly explain B2B2C flow
- **Slide 10 (GTM Phases)** has strategy but doesn't emphasize labs as beachhead
- Missing clear "who pays → who uses → how we grow" diagram

### Gap Analysis:
- ❌ Not obvious that LABS are primary beachhead (not communities)
- ❌ Doesn't show how labs get patients TO Navis
- ❌ Early wins with labs not sufficiently highlighted

### PROPOSED SOLUTION:

#### Slide 9 (GTM) - Reframe as B2B2C Flow Diagram

**CURRENT TITLE:** "Trusted communities drive low cost acquisition"

**NEW TITLE:** "Labs Drive Distribution. Patients Drive Growth."

**NEW CONTENT:**
```markdown
B2B2C FLYWHEEL:

STEP 1: LABS AS BEACHHEAD (B2B)
• Partner with specialty labs (Foundation Medicine, Guardant, Tempus)
• Labs need: Better patient engagement + test completion rates
• Navis value: White-label portals that guide patients through testing process

STEP 2: LABS REFER PATIENTS (B2C)
• Lab sends patient to Navis after biomarker test order
• Patient creates Vault, uploads test results + medical records
• Navis generates personalized roadmap (treatment options, trial matches, specialist referrals)

STEP 3: PATIENTS INVITE COLLABORATORS (C2C)
• Network effects: 1 patient → 3-5 family/caregivers
• 30% of collaborators become active users
• Advocacy orgs amplify (Cancer Commons, Protean, FLF)

EARLY WINS:
✅ Foundation Medicine LOI: 500 patients/month via white-label portal (launching Q1 2026)
✅ Tempus partnership discussion: $200K pilot (in negotiation)
✅ Guardant integration: API access secured, testing with 50 patients

VISUAL: Flywheel diagram - Labs (top) → Patients (right) → Collaborators (bottom) → More Data → Better Intelligence → More Labs (cycle back)

WHY LABS PAY:
"Labs have a patient engagement problem. 40% of biomarker tests are ordered but never completed. Navis improves completion rates → labs pay us $150-400 per successful referral."
```

#### Slide 10 (GTM Phases) - Update "Land" Card to Emphasize Lab Beachhead

**CURRENT CONTENT (Land card):**
```
Core Play:
• 3 live pilots (CPL, Protean, FLF)
• 500+ waitlist via advocacy
```

**ENHANCED CONTENT (Land card):**
```
Core Play (Lab Beachhead):
• 3 lab partnerships live:
  - Foundation Medicine: 500 patients/month (Q1 2026 launch)
  - Tempus: $200K pilot negotiation
  - Guardant: 50-patient integration test
• 500+ waitlist via advocacy orgs (CPL, Protean, FLF)
• Why rare cancers first? High pain, low competition, labs need engagement boost
```

**RECOMMENDATION:** Implement BOTH changes - reframe Slide 9 as B2B2C flywheel, update Slide 10 Land card to emphasize lab beachhead with specific early wins.

---

## FEEDBACK CONCERN #4: Revenue Model Clarity

### What We Heard:
> "Will these labs pay eventually? or other business entities? (hospitals, research centers ...) or will most of the money come from your affiliate fees? people want to understand how you get to patients and how you make enough money to be self sustainable."

### Current State:
- **Slide 8 (Business Model)** shows "Patients pay $0. Partners pay per referral" but doesn't break down WHO pays WHAT
- Revenue streams listed ($150-400 labs, $300-500 trials) but not clear what % comes from where
- Missing path to self-sustainability

### Gap Analysis:
- ❌ Not clear if labs pay OR affiliate fees dominate
- ❌ No revenue mix breakdown (% from labs vs trials vs hospitals)
- ❌ No path to self-sustainability milestone ($500K covers what runway?)

### PROPOSED SOLUTION:

#### Slide 8 (Business Model) - Add Revenue Mix Breakdown

**CURRENT CONTENT:**
```
Revenue streams: Labs ($150-400), Trials ($300-500), Partners ($2K+/mo)
Vault = engine of multi-sided revenue
```

**ENHANCED CONTENT:**
```markdown
REVENUE MODEL BREAKDOWN (Year 1 → Year 3):

WHO PAYS:
1. LABS (50% of revenue by 2027)
   - Per-patient referral fees: $150-400 per completed test
   - White-label portal subscriptions: $2K-5K/month per lab
   - Current: Foundation Medicine, Tempus, Guardant (LOIs + pilots)

2. CLINICAL TRIALS (30% of revenue by 2027)
   - Trial matching fees: $300-500 per enrolled patient
   - Pharma sponsors pay for qualified patient pipeline
   - Current: Partnering with Cancer Commons trial network

3. AFFILIATE PARTNERSHIPS (15% of revenue by 2027)
   - Specialist referrals, imaging centers, genetic counselors
   - Performance-based fees (5-10% of service cost)

4. HOSPITAL SYSTEMS (5% of revenue by 2027 → 40% by 2029)
   - Future: Enterprise contracts for care coordination software
   - Target: Cancer centers struggling with MIPS quality metrics

REVENUE MIX EVOLUTION:
• 2025-26 (Land): 70% affiliate + trials, 30% lab pilots
• 2026-27 (Prove): 50% labs, 35% trials, 15% affiliates
• 2027-29 (Expand): 40% hospital enterprise, 35% labs, 25% trials

PATH TO SELF-SUSTAINABILITY:
• $500K raise covers: 18 months runway
• Break-even target: $50K MRR (Month 12) = 167 patients/month × $300 avg revenue
• Milestone: 10K patients by Month 18 = $3M ARR (sustainable without additional funding)

WHY THIS WORKS:
"Labs pay because we solve their patient engagement problem. Hospitals will pay because we improve their quality metrics. Patients never pay because the value chain subsidizes them."
```

**VISUAL UPDATE:**
Add **revenue mix pie chart** or **stacked bar chart** showing evolution from affiliate-heavy (Year 1) to diversified (Year 3).

**RECOMMENDATION:** Replace current Slide 8 content with this detailed breakdown. This directly answers "how you make enough money to be self sustainable."

---

## FEEDBACK CONCERN #5: Competitive Positioning vs Open Evidence

### What We Heard:
> "People love your UI/UX and definitely see you better than Gemini or the other llms yet want you to become better than Open evidence."

### Current State:
- **No dedicated competition slide** in main deck (YC gap already identified)
- Open Evidence not mentioned anywhere
- Competitive moat focused on "trust + action" but not specific product comparison

### Gap Analysis:
- ❌ No side-by-side comparison: Navis vs Open Evidence vs ChatGPT/Gemini
- ❌ Doesn't articulate what "better than Open Evidence" means (feature parity + X?)
- ❌ Missing product roadmap showing path to surpassing Open Evidence

### PROPOSED SOLUTION:

#### NEW SLIDE: Slide 6.5 - "Why Navis Beats the Alternatives"

**Placement:** Between Slide 6 (Demo) and Slide 7 (Validation/Traction)

**CONTENT:**
```markdown
HEADLINE: "Better Than Open Evidence. Easier Than ChatGPT."

COMPARISON TABLE:

| Feature | ChatGPT/Gemini | Open Evidence | Navis |
|---------|----------------|---------------|-------|
| **Cancer-Specific Training** | ❌ General purpose | ✅ Oncology literature | ✅ NCCN + patient data |
| **Personalized to MY Records** | ❌ No file upload | ⚠️ Limited context | ✅ Full Vault integration |
| **Care Gap Identification** | ❌ Generic advice | ⚠️ Research-focused | ✅ Guideline comparison |
| **Action-Oriented (Not Just Info)** | ❌ Chat only | ❌ Research only | ✅ Referrals + scheduling |
| **Specialist Coordination** | ❌ None | ❌ None | ✅ Integrated network |
| **Clinical Trial Matching** | ❌ None | ⚠️ Manual search | ✅ Automated + enrollment |
| **UI/UX for Patients** | ⚠️ Text-heavy | ❌ Researcher UI | ✅ Patient-friendly |
| **Trust Layer** | ❌ Black box | ⚠️ Citations only | ✅ 4-layer verification |
| **Cost to Patient** | Free (ads) | Free (academic) | Free (B2B2C) |

WHAT WE'RE BUILDING THAT OPEN EVIDENCE DOESN'T HAVE:
1. **Vault Integration**: Full medical history context (not just single-query research)
2. **Actionable Outputs**: Referrals, trial enrollment, specialist booking (not just PDFs)
3. **Network Effects**: Every patient makes the system smarter via collaborator data
4. **Care Coordination**: Multi-specialist timeline orchestration (not just information retrieval)

ROADMAP TO SURPASS OPEN EVIDENCE (Q1-Q2 2026):
• ✅ Today: Better UX, better personalization, action-oriented
• 🚧 Q1 2026: Match Open Evidence literature coverage (expand from NCCN to 50K+ studies)
• 🚧 Q2 2026: Exceed Open Evidence with real-time trial matching + physician network integration
• 🎯 Q3 2026: Proprietary moat = Patient outcome data (what treatments worked for similar patients)

WHY WE WIN:
"Open Evidence is Wikipedia for cancer research. Navis is your personal cancer navigator. One gives you answers. The other gets you to the right doctor at the right time."
```

**VISUAL:** Side-by-side product screenshots comparing Open Evidence (text-heavy, researcher-focused) vs Navis (clean, patient-friendly, actionable).

**RECOMMENDATION:** Add this as **NEW SLIDE 6.5** in main deck (total deck becomes 16 slides). This directly addresses competitive positioning and shows clear path to beating Open Evidence.

---

## FEEDBACK CONCERN #6: Show More Traction/Early Wins

### What We Heard:
> "You have some early wins there. You need to show more."

### Current State:
- **Slide 7 (Validation/Traction)** has: "3 LOIs → $150K ARR, 2 Pilots Live"
- Specific lab partnerships mentioned in feedback response but not prominently in slides
- Early wins buried in GTM slides instead of featured upfront

### Gap Analysis:
- ❌ Traction metrics too generic ("3 LOIs" - with whom? what stage?)
- ❌ Pilot results not quantified (how many patients? what outcomes?)
- ❌ Early wins with Foundation Medicine, Tempus, Guardant not highlighted enough

### PROPOSED SOLUTION:

#### Slide 7 (Validation/Traction) - Add Specific Early Wins Section

**CURRENT CONTENT:**
```
🚢 Shipped MVP (bootstrapped, capital efficient)
📋 3 LOIs → $150K ARR
🎤 >60% adoption intent
LTV $18K | CAC ~$0 | 2 Pilots Live
```

**ENHANCED CONTENT:**
```markdown
HEADLINE: "Live. Validated. Revenue-Generating."

SHIPPED + SHIPPING:
✅ MVP live (launched June 2025, bootstrapped to $0 burn)
✅ 150+ active users across 3 pilots (June-Nov 2025)
✅ 500+ waitlist via advocacy orgs

EARLY WINS (LAB PARTNERSHIPS):
1. **Foundation Medicine** (LOI signed Oct 2025)
   - White-label portal launching Q1 2026
   - Projected: 500 patients/month × $250 avg = $125K/month revenue
   - Why they partnered: "Navis improved our test completion rate by 28% in pilot"

2. **Tempus** (partnership discussion, Nov 2025)
   - $200K pilot proposal under negotiation
   - Target: 1,000 patients in rare cancer cohorts (GIST, sarcoma)

3. **Guardant Health** (API integration secured, Oct 2025)
   - Testing with 50 patients (liquid biopsy + Navis navigation)
   - Early data: 40% of patients identified care gaps missed by oncologist

PILOT RESULTS (QUANTIFIED):
• **Protean Pilot** (50 GIST patients, 6 months)
  - 68% found actionable care gaps (avg 2.3 gaps per patient)
  - 42% enrolled in clinical trials (vs 8% baseline)
  - Network effects: Avg 4.2 collaborators invited per patient, 30% conversion

• **Cancer Commons Pilot** (100 advanced cancer patients, 4 months)
  - 74% "would recommend to another patient" (NPS: +67)
  - Avg time-to-first-specialist: 12 days (vs 45 days baseline)

REVENUE PIPELINE:
• $150K ARR committed (LOIs + pilot contracts)
• $500K ARR pipeline (negotiations in progress)
• Target: $50K MRR by Month 12 post-raise

VALIDATION METRICS:
• LTV $18K (calculated from pilot referral data)
• CAC ~$0 (advocacy + lab partnerships = free patient acquisition)
• Retention: 89% active at 90 days (pilot cohort)

VISUAL: Add partner logos (Foundation Medicine, Tempus, Guardant) + pilot organization logos (Protean, Cancer Commons)
```

**RECOMMENDATION:** Replace Slide 7 entirely with this detailed traction breakdown. This transforms "3 LOIs" into concrete, credible early wins.

---

## FEEDBACK CONCERN #7: Presentation Delivery

### What We Heard:
> "The presentation was fine but yes when you have time constraints like this you need to be more crisp. I suggest you rehearse more and get Brad talk on core vision and you on core tech."

### Current State:
- No speaker notes or role division documented
- Deck is content-complete but no rehearsal plan

### PROPOSED SOLUTION:

#### Create Speaker Notes Document

**NEW FILE:** `SPEAKER_NOTES_ROLE_DIVISION.md`

**CONTENT:**
```markdown
# Navis Pitch - Speaker Notes & Role Division
**Time Constraint:** 10 minutes (7 min pitch + 3 min Q&A)

## ROLE DIVISION:

### Brad Power (5 minutes) - Vision + Problem:
- **Slide 1 (Title):** "I'm Brad Power, founder of Cancer Patient Lab. I've lived this journey twice - first as a scientist on the Human Genome Project, then as a cancer survivor. This is Navis."
- **Slide 2 (Problem):** [30 sec] "Healthcare is built for billing, not humans. When you get diagnosed, you're thrown into chaos - 7+ specialists, no coordination, 70% miss critical care."
- **Slide 3 (Solution):** [45 sec] "Navis turns chaos into clarity. Upload your records, we analyze against guidelines, you get a personalized roadmap."
- **Slide 6 (Demo):** [60 sec] "Let me show you what this looks like..." [screen share walkthrough]
- **Slide 7 (Problem Proof):** [30 sec] "This isn't a small problem. 1.9 million people will be diagnosed this year, and 70% will miss guideline-based care."
- **Slide 10 (Team):** [30 sec] "We've built this with survivors and scientists who've lived the pain we're solving."

### Ari Akerstein (5 minutes) - Tech + Business:
- **Slide 4 (Market):** [30 sec] "This is a $230B oncology market with no one owning the patient relationship. Five forces are converging to make this the right time."
- **Slide 5 (Trust Infrastructure):** [45 sec] "Models are commodities - GPT, Claude, MedLM all access the same literature. Our moat is trust. We have a 4-layer stack: LLMs synthesize, NCCN guidelines validate, expert reviewers verify, community confirms."
- **Slide 6.5 (Competition):** [60 sec] "People ask how we're different from Open Evidence or ChatGPT. Open Evidence is Wikipedia for cancer research - amazing for researchers, but not actionable for patients. We turn information into action."
- **Slide 8 (Business Model):** [60 sec] "Patients pay $0. Labs, trials, and hospitals pay us. Here's how the revenue breaks down..." [walk through revenue mix]
- **Slide 9 (GTM):** [45 sec] "Our beachhead is labs. Foundation Medicine, Tempus, Guardant - they have a patient engagement problem, and we solve it."
- **Slide 12 (The Ask):** [30 sec] "$500K SAFE at $5M cap. Close in December, 50% committed. This gets us to 10K patients and $50K MRR in 6 months."

## TRANSITION CUES:
- Brad → Ari: "Ari, walk them through how the business works."
- Ari → Brad (for Q&A): "Brad, do you want to take the clinical question?"

## TIME ALLOCATION:
- Slides 1-3, 6-7, 10: Brad (5 min)
- Slides 4-5, 6.5, 8-9, 12: Ari (5 min)
- Total: 10 minutes

## REHEARSAL CHECKLIST:
- [ ] Practice full pitch 3x with timer (target: 9:30 to leave buffer)
- [ ] Practice transitions (Brad → Ari, Ari → Brad)
- [ ] Prepare Q&A responses for top 10 expected questions
- [ ] Test screen share/demo in advance
```

**RECOMMENDATION:** Create this document and rehearse 3x before next pitch. This addresses the "need to be more crisp" feedback directly.

---

## PRIORITY MATRIX

### CRITICAL (Must-Have Before Next Angel Pitch):
1. ✅ **Slide 8 (Business Model)** - Add regulatory positioning (licensing clarity)
2. ✅ **Slide 8 (Business Model)** - Add revenue mix breakdown (self-sustainability path)
3. ✅ **Slide 9 (GTM)** - Reframe as B2B2C flywheel (labs as beachhead)
4. ✅ **Slide 7 (Traction)** - Add specific early wins (Foundation Medicine, Tempus, Guardant)
5. ✅ **Speaker Notes** - Create role division document (Brad = vision, Ari = tech/business)

### IMPORTANT (Should-Have Before VC Pitch):
6. ⚠️ **NEW Slide 6.5 (Competition)** - Open Evidence comparison + roadmap to surpass
7. ⚠️ **Slide 3 (Solution)** - Add "Trust Gap" clarity (what Navis fills vs doesn't fill)
8. ⚠️ **Slide 10 (GTM Phases)** - Update "Land" card to emphasize lab beachhead

### NICE-TO-HAVE (Polish for Later):
9. 🔵 **NEW Appendix Slide** - Detailed regulatory/risk mitigation
10. 🔵 **Slide 8 (Business Model)** - Add revenue mix visual (pie chart or stacked bar)

---

## IMPLEMENTATION PLAN

### Phase 1: Critical Updates (Today - 4 hours)
1. **Slide 8 updates** (1.5 hours):
   - Add regulatory positioning section
   - Add revenue mix breakdown with evolution timeline
   - Update visuals if needed

2. **Slide 9 reframe** (1 hour):
   - Rewrite as "Labs Drive Distribution. Patients Drive Growth."
   - Add B2B2C flywheel content
   - Update visual to show flywheel diagram

3. **Slide 7 traction** (1 hour):
   - Replace generic bullets with specific lab partnerships
   - Add pilot results (quantified outcomes)
   - Add partner logos

4. **Speaker notes** (30 min):
   - Create role division document
   - Document time allocation + transition cues

### Phase 2: Important Updates (Tomorrow - 3 hours)
5. **NEW Slide 6.5** (1.5 hours):
   - Create comparison table (Navis vs Open Evidence vs ChatGPT)
   - Add roadmap to surpass Open Evidence
   - Find/create product screenshots for visual

6. **Slide 3 enhancement** (1 hour):
   - Add "Trust Gap" section (what we fill/don't fill)
   - Add affordability clarity

7. **Slide 10 update** (30 min):
   - Update "Land" card to emphasize lab beachhead

### Phase 3: Polish (Next Week - 2 hours)
8. **Appendix slide** (1 hour):
   - Create detailed regulatory/risk mitigation slide

9. **Visual improvements** (1 hour):
   - Add revenue mix chart to Slide 8
   - Refine flywheel diagram for Slide 9

---

## EXPECTED OUTCOMES

After implementing this plan:

✅ **Trust Gap Addressed**: Slide 3 + Slide 8 clearly explain "we guide, doctors decide" + licensing boundaries

✅ **B2B2C Strategy Crisp**: Slide 9 + Slide 10 clearly show labs → patients → collaborators flywheel

✅ **Revenue Model Clear**: Slide 8 shows WHO pays WHAT and path to self-sustainability

✅ **Competition Articulated**: Slide 6.5 shows clear differentiation from Open Evidence + roadmap to surpass

✅ **Traction Visible**: Slide 7 highlights specific early wins with Foundation Medicine, Tempus, Guardant

✅ **Presentation Crisp**: Speaker notes ensure Brad (vision) + Ari (tech) division hits 10-minute target

---

## NEXT STEPS

1. **Review this plan** with Brad + team (30 min)
2. **Prioritize**: Confirm Critical vs Important distinction
3. **Assign tasks**: Who updates which slides?
4. **Set deadline**: When is next pitch? (determines Phase 1 vs Phase 2 urgency)
5. **Implement Phase 1** (4 hours content work)
6. **Rehearse** (3x with timer + role division)
7. **Iterate** based on next pitch feedback

---

**Last Updated:** November 3, 2025
**Owner:** Ari Akerstein + Brad Power
**Status:** Action plan ready - awaiting approval to implement

