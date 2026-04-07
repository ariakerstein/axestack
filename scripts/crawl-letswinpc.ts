/**
 * Let's Win Pancreatic Cancer Content Crawler
 *
 * Fetches content from letswinpc.org WordPress API and ingests into Navis RAG pipeline.
 *
 * Usage:
 *   npx tsx scripts/crawl-letswinpc.ts [--dry-run] [--limit=N] [--category=ID]
 *
 * Options:
 *   --dry-run     Preview what would be ingested without actually doing it
 *   --limit=N     Only process N posts (default: all)
 *   --category=ID Only process posts from specific category
 *   --skip=N      Skip first N posts (for resuming)
 *
 * Environment:
 *   SUPABASE_URL           - Supabase project URL
 *   SUPABASE_SERVICE_KEY   - Service role key (for direct DB insert)
 *   OPENAI_API_KEY         - For generating embeddings
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const WP_API_BASE = 'https://letswinpc.org/wp-json/wp/v2';
const SOURCE_NAME = 'Let\'s Win Pancreatic Cancer';
const CANCER_TYPE = 'Pancreatic';

// Category ID → Content mapping
// Based on https://letswinpc.org/wp-json/wp/v2/categories
const CATEGORY_MAPPING: Record<number, {
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  contentType: string;
  tags: string[];
}> = {
  // === TIER 2: Research & Clinical Content ===
  19:   { tier: 'tier_2', contentType: 'research_paper', tags: ['research'] },
  194:  { tier: 'tier_2', contentType: 'clinical_trial', tags: ['clinical-trials', 'research'] },
  199:  { tier: 'tier_2', contentType: 'research_paper', tags: ['personalized-medicine', 'research'] },
  200:  { tier: 'tier_2', contentType: 'article', tags: ['chemotherapy', 'treatment'] },

  // === TIER 3: Patient Stories & Community ===
  15:   { tier: 'tier_3', contentType: 'community_post', tags: ['survivor-story', 'patient-story'] },
  179:  { tier: 'tier_3', contentType: 'community_post', tags: ['treatment-story', 'patient-story'] },
  205:  { tier: 'tier_3', contentType: 'community_post', tags: ['advocacy', 'patient-story'] },
  4086: { tier: 'tier_3', contentType: 'community_post', tags: ['caregiver', 'caregiver-story'] },

  // === TIER 3: Disease Management & Living With ===
  16:   { tier: 'tier_3', contentType: 'article', tags: ['disease-management'] },

  // === TIER 3: News & Updates ===
  571:  { tier: 'tier_3', contentType: 'article', tags: ['news'] },
  577:  { tier: 'tier_3', contentType: 'article', tags: ['announcement', 'news'] },
};

// Default mapping for uncategorized content
const DEFAULT_MAPPING = {
  tier: 'tier_3' as const,
  contentType: 'article',
  tags: ['general'],
};

// ============================================================================
// TYPES
// ============================================================================

interface WPPost {
  id: number;
  date: string;
  modified: string;
  slug: string;
  status: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  author: number;
  categories: number[];
  link: string;
}

interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent: number;
}

interface IngestionResult {
  success: boolean;
  postId: number;
  title: string;
  chunksCreated?: number;
  error?: string;
}

// ============================================================================
// HTML UTILITIES
// ============================================================================

function stripHtml(html: string): string {
  // Remove script and style tags with content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Replace common block elements with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, '\n');
  text = text.replace(/<(br|hr)[^>]*>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(/&rsquo;/gi, "'");
  text = text.replace(/&lsquo;/gi, "'");
  text = text.replace(/&rdquo;/gi, '"');
  text = text.replace(/&ldquo;/gi, '"');
  text = text.replace(/&mdash;/gi, '—');
  text = text.replace(/&ndash;/gi, '–');
  text = text.replace(/&#8217;/gi, "'");
  text = text.replace(/&#8220;/gi, '"');
  text = text.replace(/&#8221;/gi, '"');

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\n\s+/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"');
}

// ============================================================================
// WORDPRESS API
// ============================================================================

async function fetchAllPosts(options: {
  limit?: number;
  category?: number;
  skip?: number;
}): Promise<WPPost[]> {
  const allPosts: WPPost[] = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  console.log('Fetching posts from Let\'s Win PC...');

  while (hasMore) {
    const params = new URLSearchParams({
      per_page: perPage.toString(),
      page: page.toString(),
      status: 'publish',
      _fields: 'id,date,modified,slug,title,content,excerpt,author,categories,link',
    });

    if (options.category) {
      params.set('categories', options.category.toString());
    }

    const url = `${WP_API_BASE}/posts?${params}`;
    console.log(`  Fetching page ${page}...`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 400) {
          // No more pages
          hasMore = false;
          break;
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const posts: WPPost[] = await response.json();

      if (posts.length === 0) {
        hasMore = false;
      } else {
        allPosts.push(...posts);
        page++;

        // Check if we've hit the limit
        if (options.limit && allPosts.length >= (options.skip || 0) + options.limit) {
          hasMore = false;
        }

        // Rate limiting - be nice to their server
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      hasMore = false;
    }
  }

  // Apply skip and limit
  let result = allPosts;
  if (options.skip) {
    result = result.slice(options.skip);
  }
  if (options.limit) {
    result = result.slice(0, options.limit);
  }

  console.log(`  Found ${allPosts.length} total posts, processing ${result.length}`);
  return result;
}

async function fetchCategories(): Promise<Map<number, WPCategory>> {
  const categories = new Map<number, WPCategory>();
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${WP_API_BASE}/categories?per_page=100&page=${page}`;
    const response = await fetch(url);

    if (!response.ok) {
      break;
    }

    const cats: WPCategory[] = await response.json();

    if (cats.length === 0) {
      hasMore = false;
    } else {
      cats.forEach(cat => categories.set(cat.id, cat));
      page++;
    }
  }

  return categories;
}

// ============================================================================
// CONTENT MAPPING
// ============================================================================

function mapPostToContent(post: WPPost, categories: Map<number, WPCategory>): {
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  contentType: string;
  tags: string[];
  isPatientStory: boolean;
  isCaregiverContent: boolean;
} {
  // Find the best matching category
  let bestMapping = DEFAULT_MAPPING;
  const allTags: string[] = [];
  let isPatientStory = false;
  let isCaregiverContent = false;

  for (const catId of post.categories) {
    const mapping = CATEGORY_MAPPING[catId];
    if (mapping) {
      // Use the highest-tier (lowest number) mapping
      if (mapping.tier < bestMapping.tier) {
        bestMapping = mapping;
      }
      allTags.push(...mapping.tags);

      // Check for patient story
      if (mapping.tags.includes('patient-story') || mapping.tags.includes('survivor-story')) {
        isPatientStory = true;
      }

      // Check for caregiver content
      if (mapping.tags.includes('caregiver') || mapping.tags.includes('caregiver-story')) {
        isCaregiverContent = true;
      }
    }

    // Add category name as tag
    const cat = categories.get(catId);
    if (cat && !cat.name.match(/^[A-Z]{2,}$/)) { // Skip acronym-only categories
      allTags.push(cat.slug);
    }
  }

  // Deduplicate tags
  const uniqueTags = [...new Set(allTags)];

  return {
    tier: bestMapping.tier,
    contentType: bestMapping.contentType,
    tags: uniqueTags,
    isPatientStory,
    isCaregiverContent,
  };
}

// ============================================================================
// EMBEDDING & CHUNKING
// ============================================================================

function chunkText(text: string, chunkSize: number = 800, overlapSize: number = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlapSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 50) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// ============================================================================
// INGESTION
// ============================================================================

async function ingestPost(
  post: WPPost,
  mapping: ReturnType<typeof mapPostToContent>,
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string,
  dryRun: boolean
): Promise<IngestionResult> {
  const title = decodeHtmlEntities(post.title.rendered);
  const contentText = stripHtml(post.content.rendered);

  if (contentText.length < 100) {
    return {
      success: false,
      postId: post.id,
      title,
      error: 'Content too short (< 100 chars)',
    };
  }

  if (dryRun) {
    const chunks = chunkText(contentText);
    return {
      success: true,
      postId: post.id,
      title,
      chunksCreated: chunks.length,
    };
  }

  // Check if already ingested (by URL)
  const { data: existing } = await supabase
    .from('guideline_chunks')
    .select('id')
    .eq('url', post.link)
    .limit(1);

  if (existing && existing.length > 0) {
    return {
      success: false,
      postId: post.id,
      title,
      error: 'Already ingested',
    };
  }

  // Chunk the content
  const chunks = chunkText(contentText);

  // Generate embeddings and prepare for insert
  const chunksWithEmbeddings = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Emphasize cancer type in embedding
    const textForEmbedding = `${CANCER_TYPE} cancer: ${chunk}`;
    const embedding = await generateEmbedding(textForEmbedding, openaiApiKey);

    chunksWithEmbeddings.push({
      chunk_text: chunk,
      guideline_title: chunks.length > 1 ? `${title} (Part ${i + 1}/${chunks.length})` : title,
      guideline_source: SOURCE_NAME,
      cancer_type: CANCER_TYPE,
      content_tier: mapping.tier,
      content_type: mapping.contentType,
      author: null,
      version_date: null,
      publication_date: post.date.split('T')[0],
      url: post.link,
      thumbnail_url: null,
      tags: mapping.tags,
      chunk_embedding_vec: embedding,
      status: 'active',
    });

    // Rate limit OpenAI calls
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Insert into database
  const { error: insertError } = await supabase
    .from('guideline_chunks')
    .insert(chunksWithEmbeddings);

  if (insertError) {
    return {
      success: false,
      postId: post.id,
      title,
      error: `DB error: ${insertError.message}`,
    };
  }

  return {
    success: true,
    postId: post.id,
    title,
    chunksCreated: chunksWithEmbeddings.length,
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const categoryArg = args.find(a => a.startsWith('--category='));
  const category = categoryArg ? parseInt(categoryArg.split('=')[1]) : undefined;
  const skipArg = args.find(a => a.startsWith('--skip='));
  const skip = skipArg ? parseInt(skipArg.split('=')[1]) : undefined;

  console.log('='.repeat(60));
  console.log('Let\'s Win PC Content Crawler');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  if (limit) console.log(`Limit: ${limit} posts`);
  if (category) console.log(`Category filter: ${category}`);
  if (skip) console.log(`Skipping first: ${skip} posts`);
  console.log('');

  // Check environment
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  if (!dryRun && !openaiApiKey) {
    console.error('Missing OPENAI_API_KEY (required for live mode)');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch categories first
  console.log('Fetching categories...');
  const categories = await fetchCategories();
  console.log(`  Found ${categories.size} categories`);
  console.log('');

  // Fetch posts
  const posts = await fetchAllPosts({ limit, category, skip });
  console.log('');

  // Process posts
  const results: IngestionResult[] = [];
  const stats = {
    total: posts.length,
    success: 0,
    skipped: 0,
    failed: 0,
    chunksCreated: 0,
    patientStories: 0,
    caregiverContent: 0,
    byTier: { tier_1: 0, tier_2: 0, tier_3: 0 },
  };

  console.log('Processing posts...');
  console.log('-'.repeat(60));

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const mapping = mapPostToContent(post, categories);
    const title = decodeHtmlEntities(post.title.rendered);

    console.log(`[${i + 1}/${posts.length}] ${title.substring(0, 50)}...`);
    console.log(`  Tier: ${mapping.tier} | Type: ${mapping.contentType}`);
    console.log(`  Tags: ${mapping.tags.join(', ')}`);

    if (mapping.isPatientStory) {
      console.log(`  ★ Patient Story`);
      stats.patientStories++;
    }
    if (mapping.isCaregiverContent) {
      console.log(`  ★ Caregiver Content`);
      stats.caregiverContent++;
    }

    const result = await ingestPost(
      post,
      mapping,
      supabase,
      openaiApiKey || '',
      dryRun
    );

    results.push(result);

    if (result.success) {
      stats.success++;
      stats.chunksCreated += result.chunksCreated || 0;
      stats.byTier[mapping.tier]++;
      console.log(`  ✓ ${dryRun ? 'Would create' : 'Created'} ${result.chunksCreated} chunks`);
    } else if (result.error === 'Already ingested') {
      stats.skipped++;
      console.log(`  ○ Skipped (already exists)`);
    } else {
      stats.failed++;
      console.log(`  ✗ Failed: ${result.error}`);
    }

    console.log('');

    // Rate limiting between posts
    if (!dryRun && i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total posts processed: ${stats.total}`);
  console.log(`  Successful: ${stats.success}`);
  console.log(`  Skipped (already exists): ${stats.skipped}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log('');
  console.log(`Total chunks ${dryRun ? 'would be ' : ''}created: ${stats.chunksCreated}`);
  console.log('');
  console.log('By Tier:');
  console.log(`  Tier 2 (Research): ${stats.byTier.tier_2}`);
  console.log(`  Tier 3 (Community): ${stats.byTier.tier_3}`);
  console.log('');
  console.log('Special Content:');
  console.log(`  Patient Stories: ${stats.patientStories}`);
  console.log(`  Caregiver Content: ${stats.caregiverContent}`);
  console.log('');

  if (dryRun) {
    console.log('This was a DRY RUN. No changes were made.');
    console.log('Run without --dry-run to actually ingest content.');
  }
}

main().catch(console.error);
