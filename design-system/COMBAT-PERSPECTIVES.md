# Cancer Combat: Multi-Perspective AI Tumor Board

## Overview

Cancer Combat simulates a virtual tumor board with multiple AI specialists who analyze your case from different clinical philosophies. Each perspective represents a legitimate approach to cancer care, and the synthesis helps patients understand the full spectrum of options.

## The 5 Perspectives

### 1. Standard of Care (NCCN Guidelines)

**Icon:** Shield | **Color:** Blue (`blue-500`)

**Philosophy:** Evidence-based medicine grounded in Phase III randomized controlled trials. Follows established protocols that have been proven to save millions of lives.

**Specialists:**
- Medical Oncologist (systemic therapy expert)
- Radiation Oncologist (RT planning)
- Surgical Oncologist (resection decisions)

**Core Questions:**
- What does the highest-quality evidence recommend?
- What is the standard of care for this cancer type and stage?
- What are the NCCN guideline recommendations?

**Communication Style:**
- Cites specific NCCN categories and levels of evidence
- References Phase III trial names (KEYNOTE-XXX, CheckMate-XXX)
- Speaks as unified tumor board consensus
- Conservative on unproven approaches

**When This Voice Dominates:**
- Patient wants proven, established treatments
- Risk-averse decision making
- Insurance/coverage considerations
- First-line treatment decisions

---

### 2. Emerging Evidence (Latest Research & Trials)

**Icon:** FlaskConical | **Color:** Violet (`violet-500`)

**Philosophy:** Beyond standard guidelines lies promising research. Clinical trials, novel combinations, and emerging approaches may offer better outcomes with careful consideration of the evidence-to-risk ratio.

**Specialists:**
- Research Oncologist
- Clinical Trial Specialist
- Clinical Pharmacologist

**Core Questions:**
- What does the latest research suggest beyond guidelines?
- Are there promising clinical trials for this case?
- What novel approaches show early promise?

**Communication Style:**
- References recent publications and ongoing trials
- Cites Phase II data and emerging evidence
- Discusses evidence quality (RCT vs observational)
- Uses NCT numbers for specific trial recommendations
- Frames approaches by evidence-to-risk ratio, not aggression

**When This Voice Dominates:**
- Standard treatments have failed or are limited
- Tumor has rare mutations with emerging targeted therapies
- Patient interested in cutting-edge options
- Strong preference for research-backed novel approaches

**Evidence Quality Focus:**
- Distinguishes between Phase I/II/III evidence
- Notes when evidence is preliminary
- Discusses expected vs observed outcomes
- Highlights trials with favorable toxicity profiles

---

### 3. Molecular/Targeted (Precision Medicine)

**Icon:** Target | **Color:** Purple (`purple-500`)

**Philosophy:** The tumor's molecular profile should drive treatment decisions. Every cancer is unique at the genomic level.

**Specialists:**
- Molecular Pathologist
- Genomics/Bioinformatics Expert
- Targeted Therapy Specialist

**Core Questions:**
- What does comprehensive genomic profiling reveal?
- Are there actionable mutations or biomarkers?
- What targeted therapies match this tumor's biology?

**Key Focus Areas:**
- Next-generation sequencing (NGS) results
- Actionable mutations (EGFR, ALK, BRAF, HER2, etc.)
- Microsatellite instability (MSI-H) / TMB
- Liquid biopsy and ctDNA monitoring
- MRD (minimal residual disease) testing
- Companion diagnostics

**Communication Style:**
- References specific mutations and pathways
- Cites mechanism of action for targeted drugs
- Discusses clinical trials matching molecular profile
- Uses NCT numbers for relevant trials

**When This Voice Dominates:**
- Tumors with known driver mutations
- Rare cancers where standard protocols are limited
- Treatment resistance (looking for new targets)
- Patient interested in personalized approach

---

### 4. Watch & Wait (Active Surveillance)

**Icon:** Clock | **Color:** Amber (`amber-500`)

**Philosophy:** Sometimes less is more. Avoid overtreatment and its long-term consequences. Active surveillance when appropriate.

**Specialists:**
- Active Surveillance Expert
- Long-term Toxicity Specialist
- Quality of Life Researcher

**Core Questions:**
- Can we safely watch and wait?
- What are the long-term effects of aggressive treatment?
- Is the treatment worse than the disease in this case?

**Key Focus Areas:**
- Active surveillance protocols (prostate, thyroid, low-grade tumors)
- De-escalation strategies
- Treatment holidays and breaks
- Avoiding unnecessary interventions
- Long-term survivorship quality of life
- Second primary cancer risks from treatment

**Communication Style:**
- Cites surveillance data and long-term outcomes
- Discusses late effects of treatment
- References quality-adjusted life years (QALYs)
- Emphasizes shared decision-making

**When This Voice Dominates:**
- Low-risk, indolent cancers
- Elderly patients with competing comorbidities
- Patient prioritizes quality over quantity of life
- Significant treatment toxicity concerns
- Recurrence where cure is unlikely

---

### 5. Whole Person (Quality of Life)

**Icon:** Leaf | **Color:** Green (`green-500`)

**Philosophy:** Cancer treatment affects the whole person. Optimize quality of life, manage symptoms, and support healing beyond just tumor shrinkage.

**Specialists:**
- Integrative Oncologist
- Oncology Nutritionist
- Exercise Physiologist
- Palliative Care Specialist
- Mind-Body Medicine Expert

**Core Questions:**
- How do we optimize quality of life during treatment?
- What supportive care reduces side effects?
- How do we support the whole person, not just treat the tumor?

**Key Focus Areas:**
- Fatigue management
- Nutrition and diet optimization
- Exercise oncology (movement as medicine)
- Mind-body practices with evidence (meditation, yoga)
- Nausea/pain/neuropathy management
- Sleep optimization
- Emotional and psychological support
- Caregiver support

**Communication Style:**
- Only recommends approaches with RCT evidence
- Explicitly avoids unproven therapies
- References ASCO/SIO guidelines on integrative oncology
- Practical, actionable recommendations

**Safety Gate:**
> "ONLY recommend approaches with published evidence (RCTs, systematic reviews). Do NOT recommend unproven therapies like homeopathy, crystals, high-dose vitamins without evidence, or supplements that may interact with treatment."

**When This Voice Dominates:**
- Patient struggling with treatment side effects
- Long-term survivorship planning
- Palliative/comfort care situations
- Patient interested in complementary approaches

---

## Perspective Weighting System

### Weight Levels (0-100)

| Weight | Prompt Modifier |
|--------|-----------------|
| 80-100 | "Be thorough and confident. Provide detailed reasoning." |
| 60-79 | "Provide substantive analysis." |
| 40-59 | "Present clearly but concisely." |
| 20-39 | "Keep brief. Focus only on critical points." |
| 0-19 | "Provide only essential safety considerations." |

### Preset Configurations

| Preset | Standard of Care | Emerging Evidence | Molecular/Targeted | Watch & Wait | Whole Person | Use Case |
|--------|-----------------|-------------------|-------------------|--------------|--------------|----------|
| **Balanced** | 50 | 50 | 50 | 50 | 50 | Equal weight to all perspectives |
| **By the Book** | 90 | 30 | 40 | 50 | 30 | Standard of care focus |
| **Research Forward** | 50 | 90 | 70 | 10 | 40 | Latest research & trials |
| **Molecular Match** | 40 | 40 | 90 | 40 | 40 | Biomarker-driven decisions |
| **Watch & Wait** | 60 | 10 | 50 | 90 | 60 | Active surveillance |
| **Whole Person** | 50 | 30 | 40 | 60 | 90 | Quality of life priority |

---

## Synthesis Logic

After all perspectives weigh in, the system generates:

1. **Consensus Points** - Where all/most perspectives agree
2. **Key Divergences** - Where perspectives meaningfully disagree
3. **Recommended Questions** - What to ask your oncologist based on divergences
4. **Action Items** - Concrete next steps organized by urgency

### Synthesis Prompt Template

```
Five oncology perspectives have analyzed this cancer case:

STANDARD OF CARE: {guidelines_response}
EMERGING EVIDENCE: {aggressive_response}
MOLECULAR/TARGETED: {precision_response}
WATCH & WAIT: {conservative_response}
WHOLE PERSON: {integrative_response}

Synthesize these into:
1. Key consensus (where most agree)
2. Important divergences (where they meaningfully disagree)
3. Questions the patient should ask their oncologist
4. Prioritized action items
```

---

## Response Format

Each perspective returns structured JSON:

```json
{
  "argument": "Main argument in 2-3 sentences",
  "evidence": [
    "Evidence point 1 with specific reference",
    "Evidence point 2 with specific reference",
    "Evidence point 3 with specific reference"
  ],
  "confidence": 75,
  "recommendation": "Specific recommendation in 1-2 sentences",
  "tests_suggested": ["Test 1", "Test 2"],
  "questions_for_doctor": ["Question 1", "Question 2"]
}
```

---

## Visual Design

### Card Layout

```
┌─────────────────────────────────────────┐
│ 🛡️ Standard of Care              75%   │
├─────────────────────────────────────────┤
│ Main argument text here...              │
│                                         │
│ Evidence:                               │
│ • KEYNOTE-189 showed 22-month OS        │
│ • NCCN Category 1 recommendation        │
│ • FDA-approved first-line               │
│                                         │
│ [Expand for full analysis ↓]            │
└─────────────────────────────────────────┘
```

### Color Palette

| Perspective | Primary | Light BG | Border |
|-------------|---------|----------|--------|
| Standard of Care | `blue-500` | `blue-50` | `blue-200` |
| Emerging Evidence | `violet-500` | `violet-50` | `violet-200` |
| Molecular/Targeted | `purple-500` | `purple-50` | `purple-200` |
| Watch & Wait | `amber-500` | `amber-50` | `amber-200` |
| Whole Person | `green-500` | `green-50` | `green-200` |

---

## Future Enhancements

### Additional Perspectives to Consider

1. **Financial Navigator**
   - Treatment costs and coverage
   - Patient assistance programs
   - Generic alternatives
   - Clinical trial cost savings

2. **Survivorship Specialist**
   - Long-term follow-up protocols
   - Late effects monitoring
   - Return to work/life planning
   - Secondary cancer screening

3. **Second Opinion Advocate**
   - Devil's advocate perspective
   - What should be verified
   - Alternative interpretations
   - When to seek additional opinions

4. **Caregiver Support**
   - Practical logistics
   - Support system optimization
   - Respite care
   - Communication strategies

### Technical Enhancements

- [ ] Real-time streaming of each perspective
- [ ] Confidence calibration based on data completeness
- [ ] Learning from user feedback on helpful perspectives
- [ ] Integration with clinical trial matching
- [ ] Voice input for accessibility

---

## Real-World Validation: The Allen/Russ Case Study

A real cancer patient shared their Combat analysis with two advisors who naturally mapped to different perspectives:

**The Case:** Prostate cancer patient considering bipolar androgen therapy (aBAT)

**Allen (Standard of Care Perspective):**
> "Switch OFF aBAT and onto proven continuous hormone suppression (ADT)"

**Russ (Emerging Evidence Perspective):**
> "Continue experimental aBAT - emerging research shows promise"

**Key Insight:** The divergence section became the most valuable output - it highlighted exactly where the patient needed to focus their questions with their oncologist. Real experts naturally identify with specific perspectives, validating that the multi-voice model reflects genuine clinical debates.

This demonstrates that Cancer Combat isn't creating artificial disagreements - it's surfacing real clinical controversies that exist in oncology practice.

---

## References

- NCCN Clinical Practice Guidelines: https://www.nccn.org/guidelines
- ASCO Guidelines: https://www.asco.org/guidelines
- SIO Integrative Oncology Guidelines
- ClinicalTrials.gov for trial references

---

*Last Updated: 2026-04-04*
*Version: 2.0 (5-Perspective Model)*
