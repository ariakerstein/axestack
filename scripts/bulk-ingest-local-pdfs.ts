/**
 * Bulk Local PDF Ingestion Pipeline
 *
 * Simple script to ingest PDFs from a local folder - no OAuth needed!
 *
 * Features:
 * - Reads PDFs from local directory
 * - Extracts text using pdf-parse
 * - Chunks content intelligently
 * - Generates embeddings via OpenAI
 * - Uploads to Supabase Storage
 * - Stores chunks in guideline_chunks table
 *
 * Usage:
 *   1. Download PDFs from Google Drive to a local folder
 *   2. Run script:
 *      npx tsx scripts/bulk-ingest-local-pdfs.ts \
 *        --folder ./downloaded-pdfs \
 *        --cancer-type pancreatic \
 *        --content-tier tier_1
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import OpenAI from 'openai';
import pdf from 'pdf-parse';

config();

// Use VITE_ prefixed vars if non-prefixed ones don't exist (for local dev)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL or VITE_SUPABASE_URL in .env');
  process.exit(1);
}

if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
  process.exit(1);
}

if (!OPENAI_KEY) {
  console.error('❌ Missing OPENAI_API_KEY in .env');
  console.error('   Get your key from: https://platform.openai.com/api-keys');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const openai = new OpenAI({
  apiKey: OPENAI_KEY
});

interface IngestionConfig {
  folderPath: string;
  cancerType: string;
  contentTier: 'tier_1' | 'tier_2' | 'tier_3';
  chunkSize: number;
  overlapSize: number;
  batchSize: number;
  dryRun: boolean;
  maxFiles?: number;
}

interface ProcessedFile {
  filename: string;
  chunksCreated: number;
  storagePath: string;
  success: boolean;
  error?: string;
}

// =====================================================
// PDF PROCESSING & CHUNKING
// =====================================================

async function extractTextFromPDF(filePath: string): Promise<string> {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdf(dataBuffer);
  return data.text;
}

function intelligentChunk(
  text: string,
  chunkSize: number = 800,
  overlapSize: number = 100
): string[] {
  // Split by paragraphs first for better semantic boundaries
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;

  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    const paraSize = words.length;

    if (currentSize + paraSize > chunkSize && currentChunk.length > 0) {
      // Finalize current chunk
      chunks.push(currentChunk.join(' '));

      // Start new chunk with overlap
      const overlapWords = currentChunk.slice(-overlapSize);
      currentChunk = [...overlapWords, ...words];
      currentSize = currentChunk.length;
    } else {
      currentChunk.push(...words);
      currentSize += paraSize;
    }
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks.filter(c => c.trim().length > 50);
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.substring(0, 8000), // Truncate to token limit
  });
  return response.data[0].embedding;
}

// =====================================================
// SUPABASE STORAGE & DATABASE
// =====================================================

async function uploadToStorage(
  filePath: string,
  filename: string,
  cancerType: string
): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `NCCN_${cancerType}/${timestamp}_${sanitizedFilename}`;

  const { error } = await supabase.storage
    .from('guideline-pdfs')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return storagePath;
}

async function insertChunks(
  chunks: string[],
  filename: string,
  cancerType: string,
  contentTier: string,
  storagePath: string,
  batchSize: number = 10
): Promise<number> {
  let inserted = 0;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    // Generate embeddings
    const embeddings = await Promise.all(
      batch.map(chunk => generateEmbedding(chunk))
    );

    // Prepare records
    const records = batch.map((chunk, idx) => ({
      chunk_text: chunk,
      guideline_source: 'NCCN',
      guideline_title: filename.replace('.pdf', ''),
      cancer_type: cancerType,
      chunk_index: i + idx,
      chunk_embedding_vec: embeddings[idx],
      content_tier: contentTier,
      url: storagePath,
      storage_path: storagePath
    }));

    const { error } = await supabase
      .from('guideline_chunks')
      .insert(records);

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }

    inserted += batch.length;
    console.log(`      ✅ Inserted chunks ${i + 1}-${i + batch.length} of ${chunks.length}`);
  }

  return inserted;
}

// =====================================================
// MAIN PROCESSING PIPELINE
// =====================================================

async function processFile(
  filePath: string,
  config: IngestionConfig
): Promise<ProcessedFile> {
  const filename = path.basename(filePath);
  console.log(`\n📄 Processing: ${filename}`);

  try {
    // Get file size
    const stats = await fs.stat(filePath);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // 1. Extract text
    console.log(`   📝 Extracting text...`);
    const text = await extractTextFromPDF(filePath);
    console.log(`   ✅ Extracted ${text.length} characters`);

    // 2. Chunk text
    console.log(`   ✂️  Chunking text...`);
    const chunks = intelligentChunk(text, config.chunkSize, config.overlapSize);
    console.log(`   ✅ Created ${chunks.length} chunks`);

    if (config.dryRun) {
      console.log(`   🏃 DRY RUN - Skipping upload and database insert`);
      return {
        filename,
        chunksCreated: chunks.length,
        storagePath: 'dry-run',
        success: true,
      };
    }

    // 3. Upload PDF to storage
    console.log(`   ☁️  Uploading to Supabase Storage...`);
    const storagePath = await uploadToStorage(filePath, filename, config.cancerType);
    console.log(`   ✅ Uploaded to: ${storagePath}`);

    // 4. Insert chunks into database
    console.log(`   💾 Inserting chunks into database...`);
    const inserted = await insertChunks(
      chunks,
      filename,
      config.cancerType,
      config.contentTier,
      storagePath,
      config.batchSize
    );

    return {
      filename,
      chunksCreated: inserted,
      storagePath,
      success: true,
    };

  } catch (error: any) {
    console.error(`   ❌ Error processing ${filename}:`, error.message);
    return {
      filename,
      chunksCreated: 0,
      storagePath: '',
      success: false,
      error: error.message,
    };
  }
}

async function bulkIngest(config: IngestionConfig): Promise<void> {
  console.log(`\n🚀 BULK LOCAL PDF INGESTION`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📁 Folder: ${config.folderPath}`);
  console.log(`🏥 Cancer Type: ${config.cancerType}`);
  console.log(`📊 Content Tier: ${config.contentTier}`);
  console.log(`⚙️  Chunk Size: ${config.chunkSize} words`);
  console.log(`⚙️  Overlap: ${config.overlapSize} words`);
  console.log(`⚙️  Batch Size: ${config.batchSize} chunks`);
  console.log(`🏃 Dry Run: ${config.dryRun ? 'YES' : 'NO'}`);
  if (config.maxFiles) {
    console.log(`📄 Max Files: ${config.maxFiles}`);
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // 1. List PDF files
  const allFiles = await fs.readdir(config.folderPath);
  const pdfFiles = allFiles
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .slice(0, config.maxFiles);

  console.log(`📂 Found ${pdfFiles.length} PDF files to process\n`);

  if (pdfFiles.length === 0) {
    console.log(`\n⚠️  No PDF files found in ${config.folderPath}`);
    return;
  }

  // 2. Process each file
  const results: ProcessedFile[] = [];

  for (let i = 0; i < pdfFiles.length; i++) {
    const filename = pdfFiles[i];
    const filePath = path.join(config.folderPath, filename);

    console.log(`\n[${i + 1}/${pdfFiles.length}]`);

    const result = await processFile(filePath, config);
    results.push(result);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 3. Summary
  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 BULK INGESTION SUMMARY`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalChunks = successful.reduce((sum, r) => sum + r.chunksCreated, 0);

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📝 Total Chunks: ${totalChunks}\n`);

  if (failed.length > 0) {
    console.log(`Failed Files:`);
    failed.forEach(f => {
      console.log(`   • ${f.filename}: ${f.error}`);
    });
    console.log();
  }

  console.log(`✨ Bulk ingestion complete!`);
}

// =====================================================
// CLI INTERFACE
// =====================================================

async function main() {
  const args = process.argv.slice(2);

  const config: IngestionConfig = {
    folderPath: args[args.indexOf('--folder') + 1],
    cancerType: args[args.indexOf('--cancer-type') + 1] || 'general',
    contentTier: (args[args.indexOf('--content-tier') + 1] as any) || 'tier_1',
    chunkSize: parseInt(args[args.indexOf('--chunk-size') + 1]) || 800,
    overlapSize: parseInt(args[args.indexOf('--overlap') + 1]) || 100,
    batchSize: parseInt(args[args.indexOf('--batch-size') + 1]) || 10,
    dryRun: args.includes('--dry-run'),
    maxFiles: args.includes('--max-files') ? parseInt(args[args.indexOf('--max-files') + 1]) : undefined,
  };

  if (!config.folderPath) {
    console.error('❌ Error: --folder is required');
    console.error('\nUsage:');
    console.error('  npx tsx scripts/bulk-ingest-local-pdfs.ts \\');
    console.error('    --folder ./downloaded-pdfs \\');
    console.error('    --cancer-type pancreatic \\');
    console.error('    --content-tier tier_1 \\');
    console.error('    --dry-run');
    process.exit(1);
  }

  await bulkIngest(config);
}

// Run if called directly (ES module compatible)
main().catch(console.error);

export { bulkIngest, processFile };
