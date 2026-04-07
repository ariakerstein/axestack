# Content Crawlers

Scripts for ingesting external cancer education content into the Navis RAG pipeline.

## Available Crawlers

### Let's Win Pancreatic Cancer (`crawl-letswinpc.ts`)

Fetches content from [letswinpc.org](https://letswinpc.org) - a pancreatic cancer resource site.

```bash
# Preview what would be ingested (no changes)
npx tsx scripts/crawl-letswinpc.ts --dry-run

# Ingest all content
npx tsx scripts/crawl-letswinpc.ts

# Ingest only patient stories (category 15)
npx tsx scripts/crawl-letswinpc.ts --category=15 --limit=20

# Resume from post 50
npx tsx scripts/crawl-letswinpc.ts --skip=50
```

**Environment Variables:**
- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` - Service role key for direct DB access
- `OPENAI_API_KEY` - For generating embeddings

---

## Content Tier Mapping

| Let's Win Category | Navis Tier | Content Type | Tags |
|-------------------|-----------|--------------|------|
| Research (19) | tier_2 | research_paper | research |
| Clinical Trials (194) | tier_2 | clinical_trial | clinical-trials, research |
| Personalized Medicine (199) | tier_2 | research_paper | personalized-medicine |
| Chemotherapy (200) | tier_2 | article | chemotherapy, treatment |
| Survivor Stories (15) | tier_3 | community_post | survivor-story, patient-story |
| Treatment Stories (179) | tier_3 | community_post | treatment-story, patient-story |
| Advocacy (205) | tier_3 | community_post | advocacy, patient-story |
| Caregivers (4086) | tier_3 | community_post | caregiver, caregiver-story |
| Disease Management (16) | tier_3 | article | disease-management |
| News (571, 577) | tier_3 | article | news, announcement |

---

## How Content Surfaces in Navis

### 1. RAG Responses (Ask Navis)

All content goes into `guideline_chunks` table and is retrieved via:
- **Text search** - Full-text search on `chunk_text`
- **Semantic search** - Vector similarity on `chunk_embedding_vec`
- **Cancer type filtering** - Filtered by `cancer_type` column

**Example:** User asks "What are treatment options for pancreatic cancer?"
→ RAG retrieves tier_2 research + tier_3 articles from Let's Win PC
→ Citations link back to letswinpc.org

### 2. Learn Tab (Vault)

Uses `get_resources_by_cancer_type` RPC to fetch educational resources.

```sql
-- How resources are fetched
SELECT DISTINCT ON (url)
  guideline_title as title,
  content_tier as tier,
  url as source_url
FROM guideline_chunks
WHERE cancer_type ILIKE '%pancreatic%'
  AND content_tier IN ('tier_1', 'tier_2', 'tier_3')
ORDER BY url, content_tier
```

**Displays as:**
- Tier 1 → "NCCN Guideline"
- Tier 2 → "Journal Article"
- Tier 3 → "Webinar" / "Community Resource"

### 3. Patient Stories (Personalization)

Use `src/utils/patientStories.ts` to query stories:

```typescript
import { getPatientStories, getRandomStory } from '@/utils/patientStories';

// Get pancreatic cancer survivor stories
const stories = await getPatientStories({
  cancerType: 'Pancreatic',
  limit: 5,
  includeSurvivor: true,
});

// Get random story for onboarding
const inspirationalStory = await getRandomStory('Pancreatic');
```

**Surfaces in:**
- Home page "Community" card
- Onboarding inspiration
- Caregiver support section
- "Others like you" personalization

### 4. Future: Standalone Patient Stories Page

Could create `/stories` or `/community/stories`:
- Filter by cancer type
- Filter by story type (survivor, caregiver, treatment)
- Source attribution (Let's Win PC, etc.)

---

## Adding New Content Sources

To add a new source (e.g., another cancer site):

1. **Explore their API/structure**
   ```bash
   curl https://example.org/wp-json/wp/v2/posts?per_page=5 | jq
   curl https://example.org/wp-json/wp/v2/categories | jq
   ```

2. **Create a new crawler script**
   - Copy `crawl-letswinpc.ts` as template
   - Update `WP_API_BASE`, `SOURCE_NAME`, `CANCER_TYPE`
   - Map their categories to our tiers

3. **Add to category mapping**
   ```typescript
   const CATEGORY_MAPPING = {
     // Their category ID → our tier/type/tags
     123: { tier: 'tier_2', contentType: 'article', tags: ['research'] },
   };
   ```

4. **Run with dry-run first**
   ```bash
   npx tsx scripts/crawl-newsite.ts --dry-run --limit=10
   ```

---

## Database Schema

Content is stored in `guideline_chunks`:

```sql
CREATE TABLE guideline_chunks (
  id uuid PRIMARY KEY,
  chunk_text text,                     -- Content (800 words avg)
  guideline_title text,                -- Article title
  guideline_source text,               -- "Let's Win Pancreatic Cancer"
  cancer_type text,                    -- "Pancreatic"
  content_tier text,                   -- "tier_2" or "tier_3"
  content_type text,                   -- "article", "community_post", etc.
  url text,                            -- Source URL
  tags text[],                         -- ["survivor-story", "patient-story"]
  publication_date date,
  chunk_embedding_vec vector(1536),    -- OpenAI embedding
  status text DEFAULT 'active'
);
```

---

## Monitoring

Check ingestion status:

```sql
-- Count by source
SELECT guideline_source, count(*)
FROM guideline_chunks
GROUP BY guideline_source;

-- Count by content type
SELECT content_type, content_tier, count(*)
FROM guideline_chunks
WHERE guideline_source = 'Let''s Win Pancreatic Cancer'
GROUP BY content_type, content_tier;

-- Patient stories
SELECT count(*)
FROM guideline_chunks
WHERE 'patient-story' = ANY(tags);
```
