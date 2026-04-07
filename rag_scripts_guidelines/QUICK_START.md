# Quick Start: Test & Deploy Semantic Search

**Goal**: Test improvements, deploy, and validate results

---

## 🚀 3-Step Process

### Step 1: Run Baseline Tests (5 minutes)
```bash
cd rag_scripts_guidelines
./run_tests.sh
# Choose: 1 (baseline)
```

Wait ~3 minutes for 8 questions to complete.

**Output**: `test_results_baseline_YYYYMMDD_HHMMSS.json`

---

### Step 2: Deploy Changes (2 minutes)

**A. Deploy SQL Function** (Manual - 1 minute)
1. Go to: https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new
2. Copy/paste: `create_semantic_search_function.sql`
3. Click "Run"

**B. Deploy Edge Function** (1 minute)
```bash
npx supabase functions deploy direct-navis --project-ref felofmlhqwcdpiyjgstx --no-verify-jwt
```

---

### Step 3: Test & Compare (5 minutes)

**A. Run Post-Change Tests**
```bash
./run_tests.sh
# Choose: 2 (post_change)
```

**B. Compare Results**
```bash
python3 compare_results.py
```

**Expected**: 60% faster, same quality ✅

---

## 📊 What You Should See

### Before (Text Search + Claude 4.5)
```
Average Latency: 23.45s
Success Rate: 87.5%
Search Method: optimized_text_search
```

### After (Semantic Search + Claude 3.5)
```
Average Latency: 9.12s (-61.1%) 🚀
Success Rate: 100.0%
Search Method: semantic_vector_similarity
```

---

## ✅ Success Checklist

- [ ] Baseline tests completed (8/8 questions)
- [ ] SQL function deployed successfully
- [ ] Edge function deployed successfully
- [ ] Post-change tests completed (8/8 questions)
- [ ] Latency reduced by 40-60%
- [ ] Success rate same or better
- [ ] Search method changed to `semantic_vector_similarity`
- [ ] No errors in function logs

---

## 🔧 Troubleshooting

**"Module not found: requests"**
```bash
pip3 install requests python-dotenv
```

**Tests timeout**
- Check function logs: https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/functions/direct-navis/logs

**Semantic search fails**
- Verify SQL function created: `SELECT * FROM information_schema.routines WHERE routine_name = 'match_chunks';`

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | Full testing documentation |
| [DEPLOYMENT_SUMMARY.md](../docs/DEPLOYMENT_SUMMARY.md) | Deployment guide |
| [automated_test_runner.py](automated_test_runner.py) | Test automation script |
| [compare_results.py](compare_results.py) | Results comparison |
| [run_tests.sh](run_tests.sh) | Quick test runner |

---

## 🆘 Need Help?

1. Read [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed docs
2. Check [DEPLOYMENT_SUMMARY.md](../docs/DEPLOYMENT_SUMMARY.md) for deployment steps
3. Review function logs for errors
4. Run comparison SQL queries (see compare_results.py output)

---

**Total time**: ~12 minutes to test, deploy, and validate! ⚡
