/**
 * Generate and ingest RAG chunks for OpenOnco diagnostic tests
 *
 * This creates searchable chunks in guideline_chunks so the AI can
 * answer questions about diagnostic tests alongside NCCN guidelines.
 *
 * Run: SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=... npx tsx scripts/ingest-openonco-rag-chunks.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Category descriptions for context
const CATEGORY_INFO: Record<string, { name: string; description: string }> = {
  MRD: {
    name: 'Molecular Residual Disease (MRD)',
    description: 'MRD testing detects remaining cancer cells after treatment using ctDNA (circulating tumor DNA). It helps guide surveillance schedules and adjuvant therapy decisions by identifying molecular recurrence before clinical symptoms appear.',
  },
  ECD: {
    name: 'Early Cancer Detection (ECD)',
    description: 'Early cancer detection tests screen for cancer before symptoms appear, often using blood-based biomarkers. These include multi-cancer early detection (MCED) tests and cancer-specific screening tests.',
  },
  TRM: {
    name: 'Treatment Response Monitoring (TRM)',
    description: 'Treatment response monitoring tracks how well cancer treatment is working using blood-based biomarkers like ctDNA. It can detect treatment resistance earlier than imaging.',
  },
  CGP: {
    name: 'Comprehensive Genomic Profiling (CGP)',
    description: 'CGP tests identify actionable genetic mutations, fusions, and biomarkers to guide targeted therapy and immunotherapy selection. They analyze hundreds of cancer-related genes.',
  },
};

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function generateChunkText(test: any): string {
  const categoryInfo = CATEGORY_INFO[test.category] || { name: test.category, description: '' };

  const lines = [
    `${test.name} - ${categoryInfo.name} Test`,
    ``,
    `Vendor: ${test.vendor}`,
    `Category: ${categoryInfo.name}`,
    ``,
    categoryInfo.description,
    ``,
  ];

  // Cancer types
  if (test.cancer_types?.length > 0) {
    lines.push(`Validated Cancer Types: ${test.cancer_types.join(', ')}`);
    lines.push('');
  }

  // Method and approach
  if (test.method || test.approach) {
    lines.push('Testing Approach:');
    if (test.method) lines.push(`- Method: ${test.method}`);
    if (test.approach) lines.push(`- Approach: ${test.approach}`);
    if (test.sample_category) lines.push(`- Sample Type: ${test.sample_category}`);
    lines.push('');
  }

  // Performance metrics
  const hasPerformance = test.sensitivity || test.specificity || test.lod95 || test.ppv || test.npv;
  if (hasPerformance) {
    lines.push('Performance Metrics:');
    if (test.sensitivity) {
      lines.push(`- Sensitivity: ${test.sensitivity}%${test.sensitivity_notes ? ` (${test.sensitivity_notes.substring(0, 150)})` : ''}`);
    }
    if (test.specificity) {
      lines.push(`- Specificity: ${test.specificity}%${test.specificity_notes ? ` (${test.specificity_notes.substring(0, 100)})` : ''}`);
    }
    if (test.lod95) lines.push(`- Limit of Detection (LOD95): ${test.lod95}`);
    if (test.ppv) lines.push(`- Positive Predictive Value (PPV): ${test.ppv}%`);
    if (test.npv) lines.push(`- Negative Predictive Value (NPV): ${test.npv}%`);
    lines.push('');
  }

  // Stage-specific sensitivity (important for MRD)
  if (test.stage_ii_sensitivity || test.stage_iii_sensitivity) {
    lines.push('Stage-Specific Performance:');
    if (test.stage_ii_sensitivity) lines.push(`- Stage II Sensitivity: ${test.stage_ii_sensitivity}%`);
    if (test.stage_iii_sensitivity) lines.push(`- Stage III Sensitivity: ${test.stage_iii_sensitivity}%`);
    lines.push('');
  }

  // Lead time advantage
  if (test.lead_time_vs_imaging_days) {
    const months = (test.lead_time_vs_imaging_days / 30).toFixed(1);
    lines.push(`Lead Time vs Imaging: ${test.lead_time_vs_imaging_days} days (~${months} months)`);
    if (test.lead_time_notes) lines.push(`  ${test.lead_time_notes.substring(0, 150)}`);
    lines.push('');
  }

  // Operational details
  const hasOperational = test.requires_tumor_tissue !== null || test.initial_tat_days || test.blood_volume_ml;
  if (hasOperational) {
    lines.push('Operational Details:');
    if (test.requires_tumor_tissue === true) {
      lines.push('- Requires prior tumor tissue sample (tumor-informed)');
    } else if (test.requires_tumor_tissue === false) {
      lines.push('- Does not require tumor tissue (tumor-naive/agnostic)');
    }
    if (test.initial_tat_days) lines.push(`- Initial Turnaround Time: ${test.initial_tat_days} days`);
    if (test.followup_tat_days) lines.push(`- Follow-up Turnaround Time: ${test.followup_tat_days} days`);
    if (test.blood_volume_ml) lines.push(`- Blood Volume Required: ${test.blood_volume_ml} mL`);
    if (test.variants_tracked) lines.push(`- Variants Tracked: ${test.variants_tracked}`);
    lines.push('');
  }

  // Regulatory status
  lines.push('Regulatory & Access:');
  lines.push(`- FDA Status: ${test.fda_status || 'Not FDA-cleared (CLIA LDT)'}`);
  if (test.reimbursement) lines.push(`- Reimbursement: ${test.reimbursement}`);
  if (test.clinical_availability) lines.push(`- Availability: ${test.clinical_availability}`);
  lines.push('');

  // Clinical evidence
  if (test.clinical_trials || test.total_participants || test.num_publications) {
    lines.push('Clinical Evidence:');
    if (test.clinical_trials) lines.push(`- Key Trials: ${test.clinical_trials.substring(0, 200)}`);
    if (test.total_participants) lines.push(`- Total Study Participants: ${test.total_participants.toLocaleString()}`);
    if (test.num_publications) lines.push(`- Peer-Reviewed Publications: ${test.num_publications}`);
    lines.push('');
  }

  // Indications notes
  if (test.indications_notes) {
    lines.push(`Clinical Indications: ${test.indications_notes.substring(0, 300)}`);
    lines.push('');
  }

  lines.push(`Source: OpenOnco (${test.openonco_url})`);

  return lines.join('\n').trim();
}

async function ingestChunks() {
  console.log('🚀 Generating RAG chunks for OpenOnco diagnostic tests\n');
  console.log('='.repeat(60) + '\n');

  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set');
    process.exit(1);
  }

  // Fetch all tests from database
  const { data: tests, error } = await supabase
    .from('openonco_tests')
    .select('*')
    .order('category', { ascending: true });

  if (error) {
    console.error('❌ Error fetching tests:', error.message);
    process.exit(1);
  }

  console.log(`📊 Found ${tests?.length || 0} tests to process\n`);

  // Delete existing OpenOnco chunks to avoid duplicates
  console.log('🗑️  Removing existing OpenOnco RAG chunks...');
  const { error: deleteError } = await supabase
    .from('guideline_chunks')
    .delete()
    .eq('guideline_source', 'OpenOnco');

  if (deleteError) {
    console.log('⚠️  Could not delete existing chunks:', deleteError.message);
  } else {
    console.log('✅ Cleared existing OpenOnco chunks\n');
  }

  let successCount = 0;
  let errorCount = 0;

  for (const test of tests || []) {
    try {
      const chunkText = generateChunkText(test);
      const categoryInfo = CATEGORY_INFO[test.category] || { name: test.category };

      // Generate embedding
      const embedding = await generateEmbedding(chunkText);

      // Determine primary cancer type for the chunk
      let primaryCancerType = 'General';
      if (test.cancer_types?.length > 0) {
        const firstCancer = test.cancer_types[0];
        if (firstCancer.toLowerCase().includes('multi') || firstCancer.toLowerCase().includes('all')) {
          primaryCancerType = 'General';
        } else {
          primaryCancerType = firstCancer;
        }
      }

      // Insert chunk
      // Note: content_type is enum, using 'guideline' with diagnostic_test in tags
      // IMPORTANT: OpenOnco is NOT tier_1 (NCCN Guidelines) - it's tier_2 (research/validated content)
      // tier_1 is reserved for official NCCN, ASCO, FDA guidelines only
      const { error: insertError } = await supabase
        .from('guideline_chunks')
        .insert({
          guideline_title: `${test.name} - ${categoryInfo.name} Diagnostic Test`,
          guideline_source: 'OpenOnco',
          cancer_type: primaryCancerType,
          content_tier: 'tier_2', // Validated content, but NOT official guidelines (tier_1)
          content_type: 'guideline', // Using guideline since it's the existing enum value
          chunk_text: chunkText,
          url: test.openonco_url,
          chunk_embedding_vec: embedding,
          tags: ['diagnostic_test', test.category, test.vendor, ...(test.cancer_types?.slice(0, 5) || [])],
        });

      if (insertError) {
        console.log(`  ❌ ${test.name}: ${insertError.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ ${test.name} (${test.category})`);
        successCount++;
      }

      // Rate limit for OpenAI API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err: any) {
      console.log(`  ❌ ${test.name}: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RAG Ingestion Summary\n');
  console.log(`  ✅ Successfully ingested: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📚 Total chunks in RAG: ${successCount}`);

  // Verify
  const { count } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('guideline_source', 'OpenOnco');

  console.log(`\n🔍 Verification: ${count} OpenOnco chunks in database`);
  console.log('\n✅ RAG ingestion complete!');
  console.log('\nTest with a query like: "What MRD tests are available for breast cancer?"');
}

ingestChunks().catch(console.error);
