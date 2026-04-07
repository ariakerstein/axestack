# Data Quality Scripts

This directory contains scripts to maintain and monitor data quality in the guideline_chunks database.

## Scripts Overview

### 1. `fix-all-data-quality.ts` - Comprehensive Fix Script
**Purpose**: Fixes all identified data quality issues in one run

**What it does**:
- ✅ Generates embeddings for all chunks (using OpenAI)
- ✅ Fixes URL formatting (converts file paths to accessible URLs)
- ✅ Removes duplicate chunks
- ✅ Backfills missing metadata (titles, sections)
- ✅ Runs final quality check

**When to run**: After major data ingestion, or when data quality score drops below 70

**Usage**:
```bash
npm run fix-data
```

**Estimated time**: 10-30 minutes (depending on how many chunks need embeddings)

**Cost**: ~$1-5 for embeddings (using text-embedding-3-small model)

---

### 2. `monitor-data-quality.ts` - Quality Monitoring
**Purpose**: Regular health check of data quality metrics

**What it does**:
- 📊 Collects comprehensive metrics
- 🎯 Calculates quality score (0-100)
- 🚨 Generates alerts if thresholds exceeded
- 💾 Saves metrics for historical tracking

**When to run**: Daily or weekly (can be automated with cron)

**Usage**:
```bash
npm run monitor-data
```

**Estimated time**: 30 seconds - 1 minute

---

### 3. `check_duplicates.ts` - Duplicate Detection
**Purpose**: Identifies duplicate chunks in the database

**Usage**:
```bash
npm run check-duplicates
```

---

### 4. `comprehensive_eval_test.ts` - Retrieval Testing
**Purpose**: Tests question-based retrieval across different content types

**Usage**:
```bash
npm run test-retrieval
```

---

## Quick Start

### First Time Setup
```bash
# Ensure dependencies are installed
npm install

# Set up environment variables (if not already done)
cp .env.example .env
# Add your OPENAI_API_KEY, VITE_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY

# Run comprehensive fix
npm run fix-data
```

### Regular Maintenance
```bash
# Weekly quality check
npm run monitor-data

# After new data ingestion
npm run fix-data

# Test retrieval after changes
npm run test-retrieval
```

---

## Quality Score Breakdown

The quality score (0-100) is calculated as follows:

| Component | Weight | Description |
|-----------|--------|-------------|
| Embeddings | 30% | Percentage of chunks with embeddings |
| Valid URLs | 25% | Percentage of chunks with accessible URLs |
| Titles | 20% | Percentage of chunks with titles |
| No Duplicates | 25% | Deduction for duplicate content |

**Score Interpretation**:
- 85-100: ✅ **EXCELLENT** - Production ready
- 70-84: ✅ **GOOD** - Minor improvements needed
- 50-69: ⚠️ **FAIR** - Significant improvements needed
- 0-49: ❌ **POOR** - Critical issues, not production ready

---

## Alert Thresholds

The monitoring script generates alerts when:

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| Embedding Coverage | < 95% | ⚠️ Warning |
| URL Coverage | < 90% | ⚠️ Warning |
| Title Coverage | < 95% | ⚠️ Warning |
| Duplicate Rate | > 2% | ⚠️ Warning |
| Overall Score | < 85 | 🚨 Critical |
| Null Chunk Text | > 0 | 🚨 Critical |

---

## Troubleshooting

### "Error: Cannot find module '@supabase/supabase-js'"
```bash
npm install
```

### "OpenAI API rate limit exceeded"
The script includes automatic retries and backoff. If you hit rate limits:
- Wait a few minutes and re-run
- Or reduce BATCH_SIZE in the script (currently 100)

### "Insufficient permissions"
Ensure you're using the `SUPABASE_SERVICE_ROLE_KEY`, not the publishable key.

### Script runs forever
Embedding generation can take 10-30 minutes for 16,000+ chunks. This is normal.
Watch the progress logs to ensure it's working.

---

## Configuration

Edit these constants in `fix-all-data-quality.ts` if needed:

```typescript
const BATCH_SIZE = 100           // Chunks per embedding batch
const EMBEDDING_MODEL = 'text-embedding-3-small'  // OpenAI model
const BASE_NCCN_URL = 'https://storage.googleapis.com/navis-health-content/'
```

---

## Automation

### Daily Monitoring (Cron)
Add to your crontab:
```bash
# Run quality check daily at 2 AM
0 2 * * * cd /path/to/project && npm run monitor-data >> logs/data-quality.log 2>&1
```

### GitHub Actions (CI/CD)
Create `.github/workflows/data-quality.yml`:
```yaml
name: Data Quality Check
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:  # Manual trigger

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run monitor-data
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_KEY }}
```

---

## Best Practices

1. **Before Deploying**: Run `npm run monitor-data` and ensure score > 85
2. **After Data Import**: Always run `npm run fix-data`
3. **Weekly**: Run quality monitoring to catch regressions
4. **Before Major Releases**: Run comprehensive eval tests

---

## Support

If you encounter issues:
1. Check the logs for specific error messages
2. Verify environment variables are set correctly
3. Ensure database has necessary permissions
4. Check OpenAI API key is valid and has credits

For questions, contact the development team.
