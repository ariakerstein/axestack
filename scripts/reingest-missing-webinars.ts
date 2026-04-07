#!/usr/bin/env npx tsx
/**
 * Re-ingest Missing Webinar PDFs
 * - Downloads from Supabase storage
 * - Creates chunks with correct URLs
 * - Checks for duplicates before inserting
 * Date: December 8, 2025
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as pdfParse from 'pdf-parse';

// Environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL) throw new Error('SUPABASE_URL not set');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Configuration
const CHUNK_SIZE = 3000;
const CHUNK_OVERLAP = 300;
const STORAGE_BUCKET = 'guideline-pdfs';
const STORAGE_FOLDER = 'webinars';

// Missing webinars list
const MISSING_WEBINARS = [
  "Adaptive-Therapy-Brad-Power-10.pdf",
  "An-MD-PhD-Navigates-Breast-Cancer-Catalina-Lopez-Correa-MD-PhD-155.pdf",
  "Cancer-Vaccines-Lisa-Butterfield-50.pdf",
  "Getting-a-Better-Diagnostic-DPYD-into-the-Standard-of-Care-Karen-Merritt-137.pdf",
  "Getting-Access-to-Your-Cancer-Treatment-Chris-Beardmore-73.pdf",
  "Guiding-Personalized-Treatment-for-Advanced-Prostate-Cancer-Round-Two-Andrew-Armstrong-70.pdf",
  "Hacking-Cancer-0.1-and-the-Endgame-Strategy-for-Cancer-Mark-Taylor-and-Gabriele-Gavazzi-156.pdf",
  "Hacking-the-Proteome-for-Cancer-Treatment-Karin-Rodland-12.pdf",
  "Healing-the-Cancer-Journey-Tools-for-Emotional-Wellness-Savio-P.-Clemente-87.pdf",
  "Helping-Patients-Navigate-Cancer-Manta-Cares-93.pdf",
  "How-Advocacy-Leads-to-Better-Patient-Outcomes-and-Experiences-Steven-Merlin-126.pdf",
  "How-AI-Is-Shifting-the-Dynamics-of-Your-Next-Doctor-Visit-Ezra-Cohen-MD-121.pdf",
  "How-a-Particular-Protein-Tumor-Necrosis-Factor-Might-Control-the-Immune-Response-in-Prostate-Cancer-Ida-Deichaite-PhD-118.pdf",
  "How-Daily-Lifestyle-Interventions-Improve-Your-Cancer-Outcomes-Amanda-Grilli-158.pdf",
  "How-Disparities-and-Workforce-Diversity-Impact-Cancer-Patients-and-Caregivers-Eugene-Manley-PhD-111.pdf",
  "How-Do-You-Choose-Your-Diagnostics-A-Guide-Richard-Anders-and-Brad-Power-100.pdf",
  "How-Hormone-Receptors-Affect-Prostate-Cancer-Ed-Friedman-59.pdf",
  "How-I-Am-Running-Experiments-on-Myself-to-Control-My-Prostate-Cancer-Using-Bipolar-Androgen-Therapy-Russ-Hollyer-58.pdf",
  "How-I-Help-Patients-Access-New-Diagnostics-Joanne-Weidhaas-MD-PhD-MS-138.pdf",
  "How-I-Use-Hemp-to-Manage-My-Cancer-Pain-Jeff-Dwyer-152.pdf",
  "How-MSI-and-Other-Tests-Can-Guide-Immunotherapies-for-Cancer-Treatment-Heather-Tomlinson-43.pdf",
  "How-Proteomics-and-RNA-Sequencing-Are-Guiding-My-Treatment-Mike-Yancey-51.pdf",
  "How-to-Survive-the-Health-System-and-Get-Good-Care-Philip-Leming-MD-and-Jillian-Hunt-AOCNP-150.pdf",
  "Identifying-Personalized-Treatment-Recommendations-for-Gastro-Intestinal-Cancers-Laura-Towart-and-Nahuel-Villegas-PhD-131.pdf",
  "Identifying-the-Most-Effective-Treatment-on-the-Tumor-Rather-than-Trying-It-Out-on-the-Patient-Dr.-Chris-Apfel-84.pdf",
  "Illuminating-the-Path-of-Cancer-Care-with-a-Chatbot-Vanessa-Liu-CareBud-82.pdf",
  "Immunotherapy-in-Prostate-Cancer-CAR-T-and-the-Tumor-Microenvironment-Andrew-Rech-63.pdf",
  "Integrative-Cancer-Care-Donald-Abrams-MD-102.pdf",
  "Introducing-an-App-for-Navigating-Cancer-Care-Berries-67.pdf",
  "Latest-Insights-from-Applying-Evolutionary-Theory-to-the-Treatment-Strategies-of-Cancer-Patients-Bob-Gatenby-MD-154.pdf",
  "Launch-Meeting-Introductions-and-Purpose-Brian-McCloskey-Rick-Stanton-Brad-Power-1.pdf",
  "Liquid-Biopsies-Peter-Kuhn-and-Stephanie-Shishido-231.pdf",
  "Liquid-Biopsies-Peter-Kuhn-and-Stephanie-Shishido-23.pdf",
  "Making-Decisions-in-the-Complexity-of-Healthcare-Michael-Liebman-PhD-144.pdf",
  "Modeling-Disease-Michael-Liebman-24.pdf",
  "Molecular-Integrative-Oncology-In-Addition-to-Not-instead-of-Conventional-Oncology-Treatment-William-LaValley-MD-134.pdf",
  "More-than-60-of-the-Cancer-Journey-Happens-at-Home-Why-No-Comprehensive-Support-Katie-Quintas-115.pdf",
  "Multi-omic-Analysis-Guides-the-Decisions-of-Brian-McCloskey-Rana-McKay-MD-and-BostonGene-98.pdf",
  "My-Journey-to-Becoming-the-CEO-of-My-Health-Jeff-Holtmeier-162.pdf",
  "Navigating-Brain-Cancer-Al-Musella-80.pdf",
  "Navigating-Cancer-Survivorship-Caroline-Knudsen-and-Chasse-Bailey-Dorton-MD-140.pdf",
  "Navigating-Cancer-with-the-Mind-as-Your-Ally-Sheryl-Anjanette-124.pdf",
  "Navigating-Pancreatic-Cancer-John-Strickler-MD-91.pdf",
  "Navigating-Radiation-Treatments-Chandra-Kota-PhD-97.pdf",
  "Navigating-Relational-Health-Through-the-Challenges-of-Cancer-Jason-Binder-127.pdf",
  "New-Metabolic-Approaches-to-Cancer-Treatment-Ahmed-Elsakka-MD-120.pdf",
  "Novel-Testing-to-Guide-Personalized-Cancer-Treatment-RGCC-61.pdf",
  "Novel-Therapies-and-New-Directions-in-Pancreas-Cancer-2024-Eileen-OReilly-MD-106.pdf",
  "Nutrition-and-Gut-Health-after-Cancer-Robert-Thomas-MD-163.pdf",
  "Opening-up-Access-to-Cancer-Data-for-Patients-Frank-Nothaft-76.pdf",
  "Palliative-and-Psychosocial-Services-for-Cancer-Patients-James-Tulsky-85.pdf",
  "Palliative-Care-for-Advanced-Cancer-Tom-Smith-32.pdf",
  "Patient-Navigators-Your-Guide-through-the-Clinical-Trial-Journey-Madeleine-Carrier-PharmD-and-Dennis-Akkaya-104.pdf",
  "Patients-Are-Having-Toxicity-and-Effectiveness-Concerns-with-Pluvicto-Brian-McCloskey-55.pdf",
  "Starving-Cancer-beyond-the-Metro-Map-Jane-McLelland-113.pdf",
  "Starving-Tumors-with-a-Therapeutic-Diet-John-Chant-36.pdf",
  "Target-Your-Molecular-Vulnerabilities-with-Personalized-Cancer-Treatment-Padman-Vamadevan-MD-and-Travis-Christofferson-MS-159.pdf",
  "Terrain-and-the-Whole-Person-in-Cancer-Care-Nasha-Winters-ND-FABNO-95.pdf",
  "Testing-and-Treatment-Options-for-Ian-Lewington-Ian-Lewington-78.pdf",
  "Testing-and-Treatment-Options-Review-for-Robert-Ellis-Robert-Ellis-39.pdf",
  "Testing-and-Treatment-Roadmap-NCCN-Guidelines-Rick-Stanton-6.pdf",
  "The-Current-and-Future-Landscape-of-Metastatic-Castrate-Resistant-Prostate-Cancer-Oliver-Sartor-62.pdf",
  "The-Gut-Microbiome-and-Cancer-Michael-Liss-MD-PhD-128.pdf",
  "The-Latest-Tests-for-Personalized-CancerCare-Tony-Magliocco-89.pdf",
  "The-Personalization-Conundrum-Brad-Power-16.pdf",
  "The-Potential-of-Personalized-Cancer-Vaccines-Starting-with-Brain-Cancer-Saskia-Biskup-MD-PhD-141.pdf",
  "Translating-Patient-Data-into-Clinical-Use-Eli-Van-Allen-81.pdf",
  "Treating-My-Osteoporosis-and-My-Prostate-Cancer-Jeff-Dwyer-65.pdf",
  "Twice-kicker-of-Cancer-s-Butt-Shares-Knowledge-that-Oncologists-Won-t-Tell-You-Richard-Bagdonas-161.pdf",
  "Update-on-Immunotherapies-CARs-and-BiTEs-for-Solid-Tumors-Saul-Priceman-PhD-117.pdf",
  "Update-on-Immunotherapies-for-Metastatic-Castrate-Resistant-Prostate-Cancer-Sumit-Subudhi-66.pdf",
  "Update-on-Prostate-Cancer-Treatments-Especially-Radiopharmaceuticals-Oliver-Sartor-MD-122.pdf",
  "Updates-on-Patients-Tests-and-Treatments-Brian-McCloskey-Rick-Stanton-and-Brad-Power-2.pdf",
];

interface Metadata {
  title: string;
  speaker: string | null;
  webinarNumber: string | null;
  guidelineSource: string;
}

function extractMetadataFromFilename(filename: string): Metadata {
  let name = filename.replace('.pdf', '');

  // Extract webinar number (last number in filename)
  const numMatch = name.match(/-(\d+)$/);
  const webinarNumber = numMatch ? numMatch[1] : null;

  // Remove number from end
  if (webinarNumber) {
    name = name.substring(0, name.lastIndexOf('-'));
  }

  // Try to extract speaker (usually at the end, before the number)
  // Look for patterns like "Name-Name-MD-PhD" or "Name-Name"
  const parts = name.split('-');
  let title = name.replace(/-/g, ' ');
  let speaker: string | null = null;

  // Find where the speaker starts by looking for capitalized name patterns at the end
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    // Check if this looks like a credential or part of a name
    if (/^(MD|PhD|RN|DO|MS|MBA|FABNO|AOCNP|PharmD|DSc|DVM|MPH)$/i.test(part)) {
      continue;
    }
    // Check if this looks like a name (starts with capital, followed by lowercase)
    if (/^[A-Z][a-z]+$/.test(part)) {
      continue;
    }
    // This might be the end of the title
    const titleParts = parts.slice(0, i + 1);
    const speakerParts = parts.slice(i + 1);
    if (speakerParts.length >= 2) {
      title = titleParts.join(' ');
      speaker = speakerParts.join(' ');
      break;
    }
  }

  return {
    title: `"${title}"`,
    speaker,
    webinarNumber,
    guidelineSource: 'CancerPatientLab Webinars'
  };
}

async function downloadPdf(filename: string): Promise<Buffer> {
  const url = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${STORAGE_FOLDER}/${filename}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${filename}: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function createChunks(text: string): Array<{ chunkIndex: number; chunkText: string }> {
  const chunks: Array<{ chunkIndex: number; chunkText: string }> = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE;
    let chunkText = text.substring(start, end);

    if (end < text.length) {
      const lastPeriod = chunkText.lastIndexOf('.');
      const lastNewline = chunkText.lastIndexOf('\n');
      const boundary = Math.max(lastPeriod, lastNewline);

      if (boundary > CHUNK_SIZE * 0.8) {
        end = start + boundary + 1;
        chunkText = text.substring(start, end);
      }
    }

    chunks.push({
      chunkIndex,
      chunkText: chunkText.trim()
    });

    chunkIndex++;
    start = end - CHUNK_OVERLAP;
  }

  return chunks;
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('  Error generating embedding:', error);
    return null;
  }
}

async function checkDuplicate(url: string): Promise<boolean> {
  const { data } = await supabase
    .from('guideline_chunks')
    .select('id')
    .eq('url', url)
    .limit(1);
  return (data?.length || 0) > 0;
}

async function processSingleWebinar(filename: string): Promise<{
  filename: string;
  success: boolean;
  skipped?: boolean;
  chunksInserted?: number;
  error?: string;
}> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Processing: ${filename.substring(0, 60)}...`);
  console.log('='.repeat(70));

  const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${STORAGE_FOLDER}/${filename}`;

  // Check for duplicates
  if (await checkDuplicate(storageUrl)) {
    console.log('  SKIPPED: Already exists in database');
    return { filename, success: true, skipped: true };
  }

  // Extract metadata
  const metadata = extractMetadataFromFilename(filename);
  console.log(`  Title: ${metadata.title.substring(0, 50)}...`);
  console.log(`  Speaker: ${metadata.speaker}`);
  console.log(`  Webinar #: ${metadata.webinarNumber}`);

  // Download PDF
  console.log('  Downloading from storage...');
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await downloadPdf(filename);
  } catch (error: any) {
    console.log(`  ERROR downloading: ${error.message}`);
    return { filename, success: false, error: error.message };
  }

  // Extract text
  console.log('  Extracting text...');
  let pdfData;
  try {
    pdfData = await pdfParse.default(pdfBuffer);
  } catch (error: any) {
    console.log(`  ERROR parsing PDF: ${error.message}`);
    return { filename, success: false, error: error.message };
  }

  const text = pdfData.text;
  const wordCount = text.split(/\s+/).length;
  const pageCount = pdfData.numpages;
  console.log(`  Extracted ${wordCount.toLocaleString()} words from ${pageCount} pages`);

  // Create chunks
  const chunks = createChunks(text);
  console.log(`  Created ${chunks.length} chunks`);

  // Insert chunks
  console.log('  Inserting chunks...');
  let insertedCount = 0;
  let failedCount = 0;

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.chunkText);
    if (!embedding) {
      failedCount++;
      continue;
    }

    const chunkData = {
      guideline_title: metadata.title,
      guideline_source: metadata.guidelineSource,
      cancer_type: 'General',
      chunk_text: chunk.chunkText,
      chunk_index: chunk.chunkIndex,
      chunk_embedding_vec: embedding,
      content_tier: 'tier_3',
      content_type: 'webinar',
      section_heading: metadata.speaker,
      url: storageUrl,
      status: 'active',
      author: metadata.speaker
    };

    try {
      await supabase.from('guideline_chunks').insert(chunkData);
      insertedCount++;
      if (insertedCount % 5 === 0) {
        console.log(`    Progress: ${insertedCount}/${chunks.length} chunks`);
      }
    } catch (error: any) {
      console.log(`  Error inserting chunk ${chunk.chunkIndex}: ${error.message}`);
      failedCount++;
    }
  }

  console.log(`  Completed: ${insertedCount} chunks inserted, ${failedCount} failed`);
  return { filename, success: true, chunksInserted: insertedCount };
}

async function main() {
  console.log('\n' + '#'.repeat(70));
  console.log('# RE-INGESTING MISSING WEBINARS');
  console.log(`# Total to process: ${MISSING_WEBINARS.length}`);
  console.log(`# Started: ${new Date().toISOString()}`);
  console.log('#'.repeat(70) + '\n');

  const results: Array<{ filename: string; success: boolean; skipped?: boolean; chunksInserted?: number; error?: string }> = [];

  for (let i = 0; i < MISSING_WEBINARS.length; i++) {
    const filename = MISSING_WEBINARS[i];
    const result = await processSingleWebinar(filename);
    results.push(result);

    console.log(`\n  Progress: ${i + 1}/${MISSING_WEBINARS.length} (${((i + 1) / MISSING_WEBINARS.length * 100).toFixed(1)}%)`);

    // Small pause between PDFs
    if (i < MISSING_WEBINARS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  const successful = results.filter(r => r.success && !r.skipped);
  const skipped = results.filter(r => r.skipped);
  const failed = results.filter(r => !r.success);
  const totalChunks = successful.reduce((sum, r) => sum + (r.chunksInserted || 0), 0);

  console.log('\n' + '='.repeat(70));
  console.log('PROCESSING COMPLETE!');
  console.log('='.repeat(70));
  console.log(`Total webinars: ${results.length}`);
  console.log(`Successfully ingested: ${successful.length}`);
  console.log(`Skipped (duplicates): ${skipped.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Total chunks inserted: ${totalChunks.toLocaleString()}`);
  console.log('='.repeat(70) + '\n');

  if (failed.length > 0) {
    console.log('Failed webinars:');
    for (const r of failed) {
      console.log(`  - ${r.filename}: ${r.error}`);
    }
  }
}

main().catch(console.error);
