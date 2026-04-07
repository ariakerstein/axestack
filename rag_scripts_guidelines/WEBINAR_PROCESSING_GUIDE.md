# Webinar PDF Processing Guide

**Date**: October 29, 2025
**Status**: Ready to Process ✅
**Total PDFs**: 150 webinar transcripts

---

## Quick Start

### ✅ Test Complete
We've successfully processed 1 test PDF:
- **PDF**: "A Guy with Two Cancers Explores Treatments and Life" (Burt Rosen) [#112]
- **Result**: 21 chunks inserted successfully
- **Time**: ~30 seconds

### 🚀 Run Full Batch

```bash
cd rag_scripts_guidelines
python3 process_webinar_pdfs.py
```

**Estimated time**: 75 minutes (30s per PDF × 150 PDFs)
**Estimated chunks**: ~3,750 total chunks (25 avg per PDF)

---

## What Gets Processed?

### PDF Location
```
rag_scripts_guidelines/pdf_webinars/
```

### Webinar Format
Filenames follow pattern: `"Title" (Speaker) [#123].pdf`

Examples:
- `"A Guy with Two Cancers Explores Treatments and Life" (Burt Rosen) [#112].pdf`
- `"Functional Precision Testing" (Tony Letai, MD, PhD) [#11].pdf`
- `"Exercise to Boost Your Immune System" (Dr. Tom Incledon) [#49].pdf`

### Metadata Extracted
- **Title**: Webinar title
- **Speaker**: Presenter name
- **Webinar Number**: LEAF webinar ID
- **Source**: "LEAF Webinars"
- **Content Type**: "webinar"
- **Content Tier**: "tier_3" (community content)

---

## Processing Details

### Text Extraction
- Uses PyPDF2 to extract text
- Preserves page structure
- Averages 9,000-15,000 words per webinar

### Chunking
- **Chunk size**: 3,000 characters
- **Overlap**: 300 characters (10%)
- **Boundary detection**: Tries to end at sentence boundaries
- **Average**: 20-30 chunks per webinar

### Embeddings
- **Model**: OpenAI text-embedding-3-small
- **Dimensions**: 1536
- **Cost**: ~$0.002 per webinar (~$0.30 total for 150 PDFs)

### Database Schema
```sql
guideline_chunks:
  - guideline_title: VARCHAR (webinar title)
  - guideline_source: VARCHAR ('LEAF Webinars')
  - cancer_type: VARCHAR ('General')
  - chunk_text: TEXT (3000 chars)
  - chunk_index: INTEGER (0, 1, 2, ...)
  - chunk_embedding_vec: VECTOR(1536)
  - content_tier: VARCHAR ('tier_3')
  - content_type: VARCHAR ('webinar')
  - section_heading: VARCHAR (speaker name)
  - url: VARCHAR (LEAF webinar URL)
  - status: VARCHAR ('active')
```

---

## Scripts Available

### 1. test_one_webinar_auto.py ✅ (Tested)
**Purpose**: Test with one PDF before full batch
**Usage**:
```bash
python3 test_one_webinar_auto.py
```

**Output**:
- Processes first PDF in folder
- Shows extracted metadata
- Creates and inserts chunks
- Provides SQL to verify

---

### 2. process_webinar_pdfs.py
**Purpose**: Batch process all 150 PDFs
**Usage**:
```bash
python3 process_webinar_pdfs.py
```

**Features**:
- Processes PDFs in sorted order
- Batch pause every 5 PDFs (2s rest)
- Progress indicators
- Error handling per PDF
- Resume capability (if interrupted)
- Saves JSON results

**Interactive prompts**:
1. Confirm total count and estimated time
2. Option to resume from specific PDF number

**Output file**:
```
webinar_processing_results_YYYYMMDD_HHMMSS.json
```

---

## Batch Processing Flow

```
1. Load all PDF files (sorted alphabetically)
   ↓
2. For each PDF:
   ├─ Extract metadata from filename
   ├─ Extract text with PyPDF2
   ├─ Create chunks (3000 char, 300 overlap)
   ├─ Generate embeddings
   ├─ Insert to database
   └─ Log results
   ↓
3. Pause 2s every 5 PDFs (to avoid rate limits)
   ↓
4. Save results to JSON
   ↓
5. Print summary statistics
```

---

## Expected Results

### Per PDF
- **Pages**: 15-80 (varies by webinar)
- **Words**: 5,000-20,000
- **Chunks**: 15-35
- **Time**: 20-40 seconds
- **Embeddings cost**: ~$0.002

### Total (150 PDFs)
- **Total chunks**: ~3,750
- **Total time**: ~75 minutes
- **Total cost**: ~$0.30 (OpenAI embeddings)
- **Database size**: ~20 MB (text + embeddings)

---

## Verification After Processing

### 1. Check Total Chunks
```sql
SELECT COUNT(*) as total_webinar_chunks
FROM guideline_chunks
WHERE content_type = 'webinar';
```

**Expected**: ~3,750 chunks

---

### 2. Check by Webinar
```sql
SELECT
  guideline_title,
  COUNT(*) as chunks,
  MIN(chunk_index) as first_chunk,
  MAX(chunk_index) as last_chunk
FROM guideline_chunks
WHERE content_type = 'webinar'
GROUP BY guideline_title
ORDER BY COUNT(*) DESC
LIMIT 20;
```

---

### 3. Sample Webinar Content
```sql
SELECT
  guideline_title,
  section_heading as speaker,
  chunk_index,
  LEFT(chunk_text, 200) as preview,
  url
FROM guideline_chunks
WHERE content_type = 'webinar'
  AND guideline_title ILIKE '%exercise%'
ORDER BY chunk_index
LIMIT 5;
```

---

### 4. Test Semantic Search
```sql
-- First, generate an embedding for test question
-- Then run:
SELECT
  guideline_title,
  section_heading as speaker,
  1 - (chunk_embedding_vec <=> :query_embedding) as similarity,
  LEFT(chunk_text, 200) as preview
FROM guideline_chunks
WHERE content_type = 'webinar'
ORDER BY chunk_embedding_vec <=> :query_embedding
LIMIT 5;
```

---

## Troubleshooting

### "Missing environment variables"
Check `.env` file has:
```
SUPABASE_URL=https://felofmlhqwcdpiyjgstx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-proj-...
```

### "Could not find column 'metadata'"
✅ Fixed - removed metadata field from chunk_data

### Rate limiting errors
- Script pauses 2s every 5 PDFs
- If still hitting limits, increase `PAUSE_DURATION` in script

### Processing interrupted
Resume from specific PDF:
```bash
python3 process_webinar_pdfs.py
# When prompted, enter PDF number to resume from
```

### Embedding generation fails
- Check OpenAI API key is valid
- Check account has credits
- Script will skip failed chunks and continue

---

## Content Coverage

These 150 webinars cover:

### Topics
- Treatment options and decision-making
- Diagnostic testing and personalized medicine
- Exercise and lifestyle interventions
- Immunotherapy and novel therapies
- Patient navigation and advocacy
- Integrative and complementary approaches
- Clinical trials and drug development
- Specific cancer types (brain, prostate, breast, lung, pancreatic, etc.)

### Speakers
- Oncologists and researchers
- Patient advocates and navigators
- Biotech company representatives
- Exercise physiologists
- Integrative medicine practitioners
- Patients sharing their journeys

### Value for RAG System
- **Real patient experiences**: First-hand accounts
- **Practical guidance**: Actionable information
- **Latest developments**: Recent treatments and tests
- **Multiple perspectives**: Clinical + patient viewpoints
- **Q&A content**: Common questions answered

---

## Next Steps After Processing

### 1. Verify Data Quality
Run verification SQL queries above

### 2. Test Retrieval
```bash
cd rag_scripts_guidelines
./run_tests.sh
# Test semantic search finds webinar content
```

### 3. Deploy Semantic Search (if not done)
```bash
# See DEPLOYMENT_SUMMARY.md
npx supabase functions deploy direct-navis
```

### 4. Test in UI
- Go to http://localhost:8081/response-quality
- Ask: "What are the benefits of exercise during cancer treatment?"
- Should retrieve webinar chunks (tier_3, content_type=webinar)

### 5. Monitor Quality
- Check if webinar content appears in responses
- Verify citations show speaker names
- Ensure content tier mixing (tier_1, tier_2, tier_3)

---

## Files

| File | Purpose |
|------|---------|
| `test_one_webinar_auto.py` | Test single PDF (✅ working) |
| `process_webinar_pdfs.py` | Batch process all PDFs |
| `pdf_webinars/` | Folder with 150 PDFs |
| `webinar_processing_results_*.json` | Processing logs |
| `WEBINAR_PROCESSING_GUIDE.md` | This guide |

---

## Ready to Process!

You've successfully tested 1 PDF. When ready to process all 150:

```bash
cd rag_scripts_guidelines
python3 process_webinar_pdfs.py
```

Then grab a coffee - it'll take about 75 minutes! ☕

The script will show progress and save results to JSON for review.
