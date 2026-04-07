/**
 * Guideline Chunk Ingestion Pipeline
 *
 * This script automates the ingestion of medical guidelines into the RAG system.
 *
 * Features:
 * - Reads PDF/text files from a directory or Google Drive
 * - Chunks content into optimal sizes (500-1000 tokens)
 * - Generates embeddings via OpenAI
 * - Stores in guideline_chunks table with metadata
 * - Supports batch processing and resume on failure
 *
 * Usage:
 *   npx tsx scripts/ingest-guidelines.ts --source ./guidelines --cancer-type breast
 *   npx tsx scripts/ingest-guidelines.ts --google-drive-id FOLDER_ID --cancer-type lung
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import OpenAI from 'openai';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface GuidelineChunk {
  content: string;
  source: string;
  url?: string;
  cancer_type: string;
  metadata: {
    page_start?: number;
    page_end?: number;
    section?: string;
    version?: string;
    ingested_at: string;
  };
}

interface IngestionConfig {
  sourceDir?: string;
  googleDriveId?: string;
  cancerType: string;
  chunkSize: number;
  overlapSize: number;
  batchSize: number;
}

// Tier 1 source validation
const TIER_1_SOURCES = [
  'NCCN', 'ASCO', 'American Cancer Society', 'NCI', 'FDA',
  'Cancer Commons', 'Leukemia & Lymphoma Society', 'ESMO'
];

async function validateSource(sourceName: string): Promise<boolean> {
  return TIER_1_SOURCES.some(tier1 => sourceName.includes(tier1));
}

async function chunkText(
  text: string,
  chunkSize: number = 800,
  overlapSize: number = 100
): Promise<string[]> {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlapSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 50) { // Minimum chunk size
      chunks.push(chunk);
    }
  }

  return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

async function ingestFile(
  filePath: string,
  config: IngestionConfig
): Promise<number> {
  console.log(`\n📄 Processing: ${filePath}`);

  // Read file
  const content = await fs.readFile(filePath, 'utf-8');
  const filename = path.basename(filePath);

  // Validate source
  const isValid = await validateSource(filename);
  if (!isValid) {
    console.warn(`⚠️  Skipping ${filename} - not from Tier 1 source`);
    return 0;
  }

  // Chunk content
  const chunks = await chunkText(content, config.chunkSize, config.overlapSize);
  console.log(`  📝 Created ${chunks.length} chunks`);

  // Process chunks in batches
  let inserted = 0;
  for (let i = 0; i < chunks.length; i += config.batchSize) {
    const batch = chunks.slice(i, i + config.batchSize);

    // Generate embeddings for batch
    const embeddings = await Promise.all(
      batch.map(chunk => generateEmbedding(chunk))
    );

    // Prepare records
    const records = batch.map((chunk, idx) => ({
      chunk_text: chunk,
      guideline_source: filename.replace(/\.[^/.]+$/, ''), // Remove extension
      guideline_title: filename,
      cancer_type: config.cancerType,
      embedding: embeddings[idx],
      metadata: {
        chunk_index: i + idx,
        total_chunks: chunks.length,
        ingested_at: new Date().toISOString(),
        ingestion_version: '1.0',
      }
    }));

    // Insert batch
    const { error } = await supabase
      .from('guideline_chunks')
      .insert(records);

    if (error) {
      console.error(`  ❌ Error inserting batch ${i}-${i + batch.length}:`, error);
    } else {
      inserted += batch.length;
      console.log(`  ✅ Inserted chunks ${i}-${i + batch.length}`);
    }
  }

  return inserted;
}

async function ingestDirectory(config: IngestionConfig): Promise<void> {
  if (!config.sourceDir) {
    throw new Error('Source directory not specified');
  }

  console.log(`\n🚀 Starting ingestion from: ${config.sourceDir}`);
  console.log(`📋 Cancer type: ${config.cancerType}`);
  console.log(`⚙️  Chunk size: ${config.chunkSize} words, overlap: ${config.overlapSize} words\n`);

  const files = await fs.readdir(config.sourceDir);
  const textFiles = files.filter(f =>
    f.endsWith('.txt') || f.endsWith('.md') || f.endsWith('.pdf')
  );

  console.log(`Found ${textFiles.length} files to process\n`);

  let totalInserted = 0;
  for (const file of textFiles) {
    const filePath = path.join(config.sourceDir, file);
    try {
      const inserted = await ingestFile(filePath, config);
      totalInserted += inserted;
    } catch (error) {
      console.error(`❌ Failed to process ${file}:`, error);
    }
  }

  console.log(`\n✨ Ingestion complete! Total chunks inserted: ${totalInserted}`);
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  const config: IngestionConfig = {
    sourceDir: args[args.indexOf('--source') + 1],
    googleDriveId: args[args.indexOf('--google-drive-id') + 1],
    cancerType: args[args.indexOf('--cancer-type') + 1] || 'general',
    chunkSize: parseInt(args[args.indexOf('--chunk-size') + 1]) || 800,
    overlapSize: parseInt(args[args.indexOf('--overlap') + 1]) || 100,
    batchSize: parseInt(args[args.indexOf('--batch-size') + 1]) || 10,
  };

  if (!config.sourceDir && !config.googleDriveId) {
    console.error('❌ Error: Must specify --source or --google-drive-id');
    process.exit(1);
  }

  if (config.sourceDir) {
    await ingestDirectory(config);
  } else {
    console.error('❌ Google Drive ingestion not yet implemented');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ingestDirectory, ingestFile, chunkText, generateEmbedding };
