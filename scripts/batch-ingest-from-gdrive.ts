/**
 * Batch Google Drive Ingestion Pipeline
 *
 * Automatically downloads PDFs from a Google Drive folder and ingests them
 * into the guideline_chunks table with embeddings.
 *
 * Features:
 * - Downloads all PDFs from a Google Drive folder
 * - Extracts text using pdf-parse
 * - Chunks content intelligently
 * - Generates embeddings via OpenAI
 * - Uploads to Supabase Storage (guideline-pdfs bucket)
 * - Stores chunks in guideline_chunks table
 *
 * Setup:
 * 1. Enable Google Drive API in Google Cloud Console
 * 2. Create OAuth 2.0 credentials (Desktop app)
 * 3. Download credentials.json to project root
 * 4. Run: npm install googleapis pdf-parse
 * 5. First run will open browser for OAuth consent
 *
 * Usage:
 *   npx tsx scripts/batch-ingest-from-gdrive.ts \
 *     --folder-id 173PTDN8OuR7Ns8t6NsYn7AfbHwBaUMyL \
 *     --cancer-type pancreatic \
 *     --content-tier tier_1 \
 *     --dry-run
 *
 * Remove --dry-run to actually ingest
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { google } from 'googleapis';
import * as fs from 'fs/promises';
import * as path from 'path';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import { Readable } from 'stream';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface IngestionConfig {
  folderId: string;
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
// GOOGLE DRIVE AUTHENTICATION
// =====================================================

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

async function authorize() {
  let credentials;
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    credentials = JSON.parse(content);
  } catch (error) {
    console.error('❌ Error loading credentials.json');
    console.error('   Follow setup instructions to create OAuth credentials');
    process.exit(1);
  }

  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token
  try {
    const token = await fs.readFile(TOKEN_PATH, 'utf-8');
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  } catch (error) {
    // Need to get new token
    return getNewToken(oAuth2Client);
  }
}

async function getNewToken(oAuth2Client: any) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n🔐 Authorize this app by visiting this url:', authUrl);
  console.log('\n📋 Enter the code from that page here: ');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Code: ', async (code: string) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        console.log('✅ Token stored to', TOKEN_PATH);
        resolve(oAuth2Client);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// =====================================================
// GOOGLE DRIVE FILE OPERATIONS
// =====================================================

async function listPDFsInFolder(auth: any, folderId: string, maxFiles?: number) {
  const drive = google.drive({ version: 'v3', auth });

  console.log(`\n📂 Listing PDFs in folder: ${folderId}`);

  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
    fields: 'files(id, name, size, modifiedTime)',
    pageSize: maxFiles || 1000,
  });

  const files = response.data.files || [];
  console.log(`   Found ${files.length} PDF files`);

  return files;
}

async function downloadFile(auth: any, fileId: string, filename: string): Promise<Buffer> {
  const drive = google.drive({ version: 'v3', auth });

  console.log(`   ⬇️  Downloading: ${filename}`);

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

// =====================================================
// PDF PROCESSING & CHUNKING
// =====================================================

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
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
  buffer: Buffer,
  filename: string,
  cancerType: string
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `NCCN_${cancerType}/${timestamp}_${sanitizedFilename}`;

  const { error } = await supabase.storage
    .from('guideline-pdfs')
    .upload(storagePath, buffer, {
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
      url: storagePath, // Relative path - will be converted to full URL in Edge Function
      storage_path: storagePath,
      metadata: {
        total_chunks: chunks.length,
        ingested_at: new Date().toISOString(),
        ingestion_version: '2.0',
        source: 'google_drive_batch',
      }
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
  auth: any,
  file: any,
  config: IngestionConfig
): Promise<ProcessedFile> {
  console.log(`\n📄 Processing: ${file.name}`);
  console.log(`   Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

  try {
    // 1. Download PDF
    const buffer = await downloadFile(auth, file.id, file.name);

    // 2. Extract text
    console.log(`   📝 Extracting text...`);
    const text = await extractTextFromPDF(buffer);
    console.log(`   ✅ Extracted ${text.length} characters`);

    // 3. Chunk text
    console.log(`   ✂️  Chunking text...`);
    const chunks = intelligentChunk(text, config.chunkSize, config.overlapSize);
    console.log(`   ✅ Created ${chunks.length} chunks`);

    if (config.dryRun) {
      console.log(`   🏃 DRY RUN - Skipping upload and database insert`);
      return {
        filename: file.name,
        chunksCreated: chunks.length,
        storagePath: 'dry-run',
        success: true,
      };
    }

    // 4. Upload PDF to storage
    console.log(`   ☁️  Uploading to Supabase Storage...`);
    const storagePath = await uploadToStorage(buffer, file.name, config.cancerType);
    console.log(`   ✅ Uploaded to: ${storagePath}`);

    // 5. Insert chunks into database
    console.log(`   💾 Inserting chunks into database...`);
    const inserted = await insertChunks(
      chunks,
      file.name,
      config.cancerType,
      config.contentTier,
      storagePath,
      config.batchSize
    );

    return {
      filename: file.name,
      chunksCreated: inserted,
      storagePath,
      success: true,
    };

  } catch (error: any) {
    console.error(`   ❌ Error processing ${file.name}:`, error.message);
    return {
      filename: file.name,
      chunksCreated: 0,
      storagePath: '',
      success: false,
      error: error.message,
    };
  }
}

async function batchIngest(config: IngestionConfig): Promise<void> {
  console.log(`\n🚀 BATCH INGESTION FROM GOOGLE DRIVE`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📁 Folder ID: ${config.folderId}`);
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

  // 1. Authenticate with Google Drive
  console.log(`🔐 Authenticating with Google Drive...`);
  const auth = await authorize();
  console.log(`✅ Authenticated`);

  // 2. List PDF files
  const files = await listPDFsInFolder(auth, config.folderId, config.maxFiles);

  if (files.length === 0) {
    console.log(`\n⚠️  No PDF files found in folder`);
    return;
  }

  // 3. Process each file
  const results: ProcessedFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`\n[${i + 1}/${files.length}]`);

    const result = await processFile(auth, file, config);
    results.push(result);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 4. Summary
  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 BATCH INGESTION SUMMARY`);
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
  }

  console.log(`\n✨ Batch ingestion complete!`);
}

// =====================================================
// CLI INTERFACE
// =====================================================

async function main() {
  const args = process.argv.slice(2);

  const config: IngestionConfig = {
    folderId: args[args.indexOf('--folder-id') + 1],
    cancerType: args[args.indexOf('--cancer-type') + 1] || 'general',
    contentTier: (args[args.indexOf('--content-tier') + 1] as any) || 'tier_1',
    chunkSize: parseInt(args[args.indexOf('--chunk-size') + 1]) || 800,
    overlapSize: parseInt(args[args.indexOf('--overlap') + 1]) || 100,
    batchSize: parseInt(args[args.indexOf('--batch-size') + 1]) || 10,
    dryRun: args.includes('--dry-run'),
    maxFiles: args.includes('--max-files') ? parseInt(args[args.indexOf('--max-files') + 1]) : undefined,
  };

  if (!config.folderId) {
    console.error('❌ Error: --folder-id is required');
    console.error('\nUsage:');
    console.error('  npx tsx scripts/batch-ingest-from-gdrive.ts \\');
    console.error('    --folder-id 173PTDN8OuR7Ns8t6NsYn7AfbHwBaUMyL \\');
    console.error('    --cancer-type pancreatic \\');
    console.error('    --content-tier tier_1 \\');
    console.error('    --dry-run');
    process.exit(1);
  }

  await batchIngest(config);
}

if (require.main === module) {
  main().catch(console.error);
}

export { batchIngest, processFile };
