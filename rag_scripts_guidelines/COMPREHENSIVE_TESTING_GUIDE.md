# Comprehensive Testing Guide

**Date**: October 29, 2025
**Purpose**: Test RAG pipeline across categories, cancer types, and difficulty levels

---

## Quick Answer to Your Questions

### 1. Are we using cosine similarity NOW?
**❌ NO** - Code is ready but **NOT DEPLOYED**

- ✅ Code changes exist in `direct-navis/index.ts`
- ❌ SQL function `match_chunks()` not created
- ❌ Edge function not deployed

**Current system**: Text search + Claude 4.5 (slow, fragile)

**To activate**:
```bash
# Deploy SQL function
psql $DATABASE_URL -f rag_scripts_guidelines/create_semantic_search_function.sql

# Deploy edge function
npx supabase functions deploy direct-navis
```

---

### 2. Which Claude model?
**Currently**: Claude 4.5 Sonnet (slow - 20s)
**After deploy**: Claude 3.5 Sonnet (fast - 7s) ✅

---

### 3. Comprehensive Testing ✅ Created!

**New test suite**: [comprehensive_test_suite.py](./comprehensive_test_suite.py)

---

## Test Matrix

### Dimensions Tested

**1. Cancer Types** (5)
- Brain (glioblastoma, GBM)
- Breast (HR+, triple negative)
- Lung (immunotherapy, targeted)
- Prostate (BAT, hormone therapy)
- General (no specific type)

**2. Categories** (9)
- Treatment options
- Side effects
- Diagnosis/staging
- Prognosis
- Lifestyle/supportive care
- Screening/genetic testing
- Subtype classification
- Research/clinical trials
- Edge cases

**3. Difficulty Levels** (4)
- **Basic**: Straightforward questions
- **Intermediate**: More complex
- **Advanced**: Specific treatments, acronyms
- **Edge cases**: Mismatch scenarios

---

## Test Questions (26 Total)

### Brain Cancer (4 questions)
```
✓ What are the treatment options for glioblastoma?
✓ What are the side effects of radiation therapy for brain tumors?
✓ What is the prognosis for stage 4 glioblastoma?
✓ Are there any experimental treatments for GBM?  [Tests synonym: GBM=glioblastoma]
```

### Breast Cancer (4 questions)
```
✓ How is breast cancer staged?
✓ What is the difference between hormone receptor positive and triple negative?
✓ Should I get genetic testing for breast cancer?
✓ What are the benefits of exercise during breast cancer treatment?
```

### Lung Cancer (2 questions)
```
✓ What are the latest immunotherapy options for lung cancer?
✓ How does targeted therapy work for lung cancer?
```

### Prostate Cancer (2 questions)
```
✓ What is bipolar androgen therapy?  [Tests webinar retrieval]
✓ What are the side effects of hormone therapy for prostate cancer?
```

### General (3 questions)
```
✓ What lifestyle changes can help during cancer treatment?
✓ How can I manage cancer-related fatigue?
✓ What should I know about clinical trials?
```

### Edge Cases (2 questions)
```
⚠️ Profile=brain, Ask about breast cancer  [Tests mismatch handling]
⚠️ Profile=brain, Ask about pancreatic cancer  [Tests robustness]
```

---

## Running the Tests

### Option 1: Interactive Mode
```bash
cd rag_scripts_guidelines
chmod +x comprehensive_test_suite.py
python3 comprehensive_test_suite.py
# Choose: 1 (baseline) or 2 (post-change)
```

### Option 2: Command Line
```bash
# Baseline
echo "1" | python3 comprehensive_test_suite.py

# Post-change
echo "2" | python3 comprehensive_test_suite.py
```

---

## Output

### During Execution
```
##############################################################################
# COMPREHENSIVE TEST SUITE - BASELINE
# Started: 2025-10-29 20:00:00
##############################################################################

======================================================================
TESTING: BRAIN_CANCER
======================================================================

[1] What are the treatment options for glioblastoma?...
    Category: treatment
    Difficulty: basic
    ✓ Success in 21.45s
    Answer length: 1234 chars
    Keywords matched: 4/4

[2] What are the side effects of radiation therapy for brain tumors?...
    Category: side_effects
    Difficulty: basic
    ✓ Success in 19.23s
    Answer length: 987 chars
    Keywords matched: 3/4
...
```

### Summary Output
```
======================================================================
TEST SUMMARY
======================================================================
Total tests: 26
Successful: 24
Failed: 2

Latency Statistics:
  Average: 20.45s
  Min: 18.23s
  Max: 25.91s

Response Quality:
  Avg answer length: 1156 chars
  Avg keyword match: 78.5%

Breakdown by Category:
  brain_cancer: 4/4 (100%)
  breast_cancer: 4/4 (100%)
  lung_cancer: 2/2 (100%)
  prostate_cancer: 2/2 (100%)
  general: 3/3 (100%)
  edge_cases: 0/2 (0%)  ⚠️

Breakdown by Difficulty:
  basic: 12/12 (100%)
  intermediate: 6/6 (100%)
  advanced: 4/4 (100%)
  edge_case: 0/2 (0%)  ⚠️
```

### Results File
```json
{
  "test_type": "baseline",
  "timestamp": "2025-10-29T20:00:00",
  "total_tests": 26,
  "results": [
    {
      "test_number": 1,
      "question": "What are the treatment options for glioblastoma?",
      "category_name": "brain_cancer",
      "category": "treatment",
      "difficulty": "basic",
      "cancer_type": "brain",
      "success": true,
      "elapsed_time": 21.45,
      "answer_length": 1234,
      "keywords_found": ["chemotherapy", "radiation", "surgery", "temozolomide"],
      "keyword_match_rate": 1.0,
      "response_id": "abc-123-xyz"
    }
  ]
}
```

---

## What Gets Tested

### 1. Retrieval Quality
- **Keyword matching**: Are expected terms in the answer?
- **Relevance**: Does answer address the question?
- **Comprehensiveness**: Multiple keywords = thorough answer

### 2. Cancer Type Handling
- **Exact match**: brain → Brain Gliomas
- **Fuzzy match**: After semantic search deployment
- **Mismatch**: Profile=brain, ask about breast

### 3. Content Type Coverage
- **Guidelines**: NCCN, ASCO (tier_1)
- **Research**: Studies, articles (tier_2)
- **Webinars**: LEAF webinars (tier_3) ← NOW AVAILABLE!

### 4. Edge Cases
- **Synonyms**: GBM vs glioblastoma
- **Abbreviations**: HR+ vs hormone receptor positive
- **Type mismatch**: Ask about wrong cancer type

### 5. Performance
- **Latency**: Total response time
- **Consistency**: Variation across questions

---

## Comparing Baseline vs Post-Change

### Run Baseline FIRST (Current System)
```bash
python3 comprehensive_test_suite.py
# Choose: 1 (baseline)
```

**Expected baseline**:
- Avg latency: 20-25s
- Success rate: 85-90% (edge cases fail)
- Keyword match: 70-80%

### Deploy Changes
```bash
# 1. Deploy SQL function
psql $DATABASE_URL -f create_semantic_search_function.sql

# 2. Deploy edge function
npx supabase functions deploy direct-navis
```

### Run Post-Change
```bash
python3 comprehensive_test_suite.py
# Choose: 2 (post_change)
```

**Expected post-change**:
- Avg latency: 8-12s (60% faster!)
- Success rate: 95-100% (edge cases work!)
- Keyword match: 75-85% (same or better)

### Compare Results
```bash
python3 compare_comprehensive_results.py
```

Shows side-by-side:
- Latency improvements per category
- Success rate changes
- Keyword matching improvements
- Which questions got faster/better

---

## Example Insights

### What You'll Learn

**1. Category Performance**
```
Treatment questions: 100% success, 18s avg
Side effects: 100% success, 20s avg
Prognosis: 75% success, 22s avg  ⚠️ Needs improvement
```

**2. Cancer Type Coverage**
```
Brain: 100% (well covered by webinars + guidelines)
Breast: 100% (good coverage)
Lung: 100% (webinars help!)
Prostate: 100% (excellent webinar coverage)
Pancreatic: 50% (less content)  ⚠️
```

**3. Content Tier Usage**
```
tier_1 (NCCN): 60% of responses
tier_2 (research): 25% of responses
tier_3 (webinars): 15% of responses  ← NEW!
```

**4. Edge Case Handling**
```
Before semantic search:
  Cancer type mismatch: FAIL (0/2)
  Synonym matching: FAIL (0/2)

After semantic search:
  Cancer type mismatch: PASS (2/2)  ✅
  Synonym matching: PASS (2/2)  ✅
```

---

## Troubleshooting

### "Missing environment variables"
Check `.env` has:
```
SUPABASE_URL=https://felofmlhqwcdpiyjgstx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Tests timeout
- Increase timeout in script (line 195): `timeout=120`
- Check edge function is deployed
- Check function logs for errors

### Low keyword match rate
- Some questions are broad
- Answers may paraphrase instead of using exact keywords
- Look at actual answers to verify quality

### Edge cases still failing
- Verify semantic search is deployed
- Check `match_chunks` SQL function exists
- Review function logs for errors

---

## Next Steps After Testing

### If Results Look Good ✅
1. Document new baseline metrics
2. Monitor for 24 hours
3. Adjust similarity threshold if needed (currently 0.65)

### If Results Show Issues ⚠️
1. Review failed test answers
2. Check which content is being retrieved
3. Adjust chunk limits or thresholds
4. Consider adding more content for weak areas

---

## Files

| File | Purpose |
|------|---------|
| [comprehensive_test_suite.py](./comprehensive_test_suite.py) | Main test script |
| `comprehensive_test_results_baseline_*.json` | Baseline results |
| `comprehensive_test_results_post_change_*.json` | Post-change results |
| `compare_comprehensive_results.py` | Comparison script (to create) |

---

**Ready to run comprehensive tests!** 🧪

This will give you deep insights into:
- Which cancer types are well covered
- Which question categories perform best
- Where semantic search helps most
- Edge case handling improvements
