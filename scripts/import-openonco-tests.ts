/**
 * Import OpenOnco diagnostic tests into the database
 *
 * This script:
 * 1. Populates the openonco_cancer_type_mappings reference table
 * 2. Imports all tests from OpenOnco JSON
 * 3. Creates cancer type mappings for each test
 * 4. Optionally generates RAG chunks for Approach 3
 *
 * Run with: SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/import-openonco-tests.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================================
// OpenOnco to Navis Cancer Type Mapping
// ============================================================================

const OPENONCO_TO_NAVIS_MAPPING: Record<string, {
  codes: string[];
  isPanCancer: boolean;
  stageFilter?: string;
  notes?: string;
}> = {
  // Direct cancer type matches
  'Breast': { codes: ['breast_cancer', 'breast_invasive', 'breast_metastatic'], isPanCancer: false },
  'Colorectal': { codes: ['colorectal_cancer', 'colon_cancer', 'rectal_cancer'], isPanCancer: false },
  'Colorectal cancer (CRC)': { codes: ['colorectal_cancer'], isPanCancer: false },
  'Colorectal cancer (colon and rectal)': { codes: ['colorectal_cancer', 'colon_cancer', 'rectal_cancer'], isPanCancer: false },
  'Colorectal cancer (primary validation)': { codes: ['colorectal_cancer'], isPanCancer: false },
  'Colorectal cancer; Advanced adenomas': { codes: ['colorectal_cancer'], isPanCancer: false, notes: 'Includes precancerous lesions' },
  'Colorectal cancer; Advanced adenomas; Sessile serrated lesions': { codes: ['colorectal_cancer'], isPanCancer: false },
  'Colorectal cancer; Advanced precancerous lesions (APL); High-grade dysplasia': { codes: ['colorectal_cancer'], isPanCancer: false },
  'Colon cancer (Stage III)': { codes: ['colorectal_cancer', 'colon_cancer'], isPanCancer: false, stageFilter: 'stage_iii' },

  'NSCLC': { codes: ['lung_nsclc'], isPanCancer: false },
  'Lung cancer (all types)': { codes: ['lung_nsclc', 'lung_sclc'], isPanCancer: false },
  'Lung cancer (in validation)': { codes: ['lung_nsclc', 'lung_sclc'], isPanCancer: false },
  'Lung cancer (screening enhancement - pre-LDCT risk stratification)': { codes: ['lung_nsclc', 'lung_sclc'], isPanCancer: false, stageFilter: 'early' },

  'Pancreatic': { codes: ['pancreatic_cancer'], isPanCancer: false },
  'Ovarian/Fallopian/Primary peritoneal': { codes: ['ovarian_cancer'], isPanCancer: false },
  'Melanoma': { codes: ['melanoma'], isPanCancer: false },
  'Bladder': { codes: ['bladder_cancer', 'urothelial_cancer'], isPanCancer: false },
  'Bladder cancer (in validation)': { codes: ['bladder_cancer'], isPanCancer: false },
  'Muscle-invasive bladder cancer (first indication)': { codes: ['bladder_cancer'], isPanCancer: false, stageFilter: 'advanced' },

  'Head & Neck': { codes: ['head_neck_squamous', 'head_neck_hpv_positive'], isPanCancer: false },
  'Head and neck': { codes: ['head_neck_squamous'], isPanCancer: false },
  'HPV+ oropharyngeal (head & neck) cancer': { codes: ['head_neck_hpv_positive'], isPanCancer: false },
  'HPV-driven gynecologic cancers (via NavDx+Gyn)': { codes: ['cervical_cancer', 'vaginal_cancer', 'vulvar_cancer'], isPanCancer: false },

  'Hepatocellular carcinoma (HCC)': { codes: ['liver_hcc'], isPanCancer: false },
  'Anal squamous cell carcinoma (ASCC)': { codes: ['anal_cancer'], isPanCancer: false },

  // Lymphoma/Hematologic
  'Classic Hodgkin lymphoma': { codes: ['hodgkin_lymphoma'], isPanCancer: false },
  'Diffuse large B-cell lymphoma (DLBCL)': { codes: ['nhl_dlbcl'], isPanCancer: false },
  'Large B-cell lymphoma (LBCL)': { codes: ['nhl_dlbcl'], isPanCancer: false },
  'Follicular lymphoma': { codes: ['nhl_follicular'], isPanCancer: false },
  'Multiple myeloma': { codes: ['multiple_myeloma'], isPanCancer: false },
  'Hematologic malignancies': { codes: ['aml', 'all', 'cml', 'cll', 'hodgkin_lymphoma', 'nhl_dlbcl', 'nhl_follicular', 'multiple_myeloma', 'mds'], isPanCancer: false },

  'Sarcomas': { codes: ['soft_tissue_sarcoma', 'bone_sarcoma', 'gist'], isPanCancer: false },

  // Pan-cancer / Multi-solid
  'Multi-solid': { codes: ['multi_solid'], isPanCancer: true },
  'Multi-solid (expanding)': { codes: ['multi_solid'], isPanCancer: true },
  'Multi-solid (planned expansion)': { codes: ['multi_solid'], isPanCancer: true },
  'Multi-solid (research)': { codes: ['multi_solid'], isPanCancer: true },
  'Multi-solid tumors': { codes: ['multi_solid'], isPanCancer: true },
  'All solid tumors': { codes: ['multi_solid'], isPanCancer: true },
  'Advanced solid tumors': { codes: ['advanced_solid'], isPanCancer: true, stageFilter: 'advanced' },
  'Advanced solid tumors (all solid tumors)': { codes: ['advanced_solid'], isPanCancer: true, stageFilter: 'advanced' },
  'Advanced solid tumors (NSCLC, bladder, breast, GI, others)': { codes: ['advanced_solid'], isPanCancer: true, stageFilter: 'advanced' },
  'Advanced solid tumors on ICI': { codes: ['advanced_solid'], isPanCancer: true, stageFilter: 'advanced', notes: 'For immunotherapy monitoring' },
  'Any solid tumor on ICI therapy': { codes: ['multi_solid'], isPanCancer: true, notes: 'Immunotherapy monitoring' },
  'Pan-solid ICI': { codes: ['multi_solid'], isPanCancer: true, notes: 'Immunotherapy monitoring' },

  // Multi-cancer screening (MCED)
  '50+ cancer types including colorectal, lung, pancreas, ovary, liver, head & neck, lymphoma, esophagus, stomach, bile duct, etc.': {
    codes: ['multi_solid'], isPanCancer: true, notes: 'MCED test covering 50+ cancer types'
  },
  '50+ cancer types (excludes breast and prostate); 6 deadliest cancers: pancreatic, lung, liver, esophageal, stomach, ovarian': {
    codes: ['multi_solid'], isPanCancer: true, notes: 'MCED excluding breast/prostate'
  },
  '60+ cancer types including all 20 most fatal cancers: lung, liver, pancreas, esophageal, bladder, stomach, head & neck SCC, uterine, low-grade glioma, high-grade glioma (brain cancer detection believed unique among blood-based MCED tests)': {
    codes: ['multi_solid'], isPanCancer: true, notes: 'MCED with brain cancer detection'
  },

  // Specific multi-tumor combinations
  'Multiple solid tumors (breast, colorectal, NSCLC, melanoma, renal, others)': {
    codes: ['breast_cancer', 'colorectal_cancer', 'lung_nsclc', 'melanoma', 'kidney_rcc', 'multi_solid'],
    isPanCancer: true
  },
  'Multiple solid tumors (breast, melanoma, colorectal, head & neck, lung, others)': {
    codes: ['breast_cancer', 'melanoma', 'colorectal_cancer', 'head_neck_squamous', 'lung_nsclc', 'multi_solid'],
    isPanCancer: true
  },
  'Pan-cancer: advanced solid tumors (NSCLC, breast, colorectal, gastric, bladder, and others)': {
    codes: ['lung_nsclc', 'breast_cancer', 'colorectal_cancer', 'gastric_cancer', 'bladder_cancer', 'advanced_solid'],
    isPanCancer: true, stageFilter: 'advanced'
  },
  'Pan-cancer: all advanced solid tumors (validated in lung, colorectal, pancreatic, GI cancers, and others)': {
    codes: ['advanced_solid'], isPanCancer: true, stageFilter: 'advanced'
  },
  'Pan-cancer: solid tumors (breast, colorectal, NSCLC, prostate, ovarian, pancreatic, and others)': {
    codes: ['breast_cancer', 'colorectal_cancer', 'lung_nsclc', 'prostate_cancer', 'ovarian_cancer', 'pancreatic_cancer', 'multi_solid'],
    isPanCancer: true
  },
  'Bladder; Colorectal; Esophageal; Gastric; Liver; Lung; Ovarian; Pancreas; Breast; Prostate (10 tumor types)': {
    codes: ['bladder_cancer', 'colorectal_cancer', 'esophageal_cancer', 'gastric_cancer', 'liver_hcc', 'lung_nsclc', 'ovarian_cancer', 'pancreatic_cancer', 'breast_cancer', 'prostate_cancer'],
    isPanCancer: false, notes: '10 specific tumor types'
  },

  // Stage-specific
  'Stage III colon cancer; multi-solid (RUO clinical trials)': {
    codes: ['colon_cancer', 'multi_solid'], isPanCancer: true, stageFilter: 'stage_iii'
  },
  'Advanced adenomas (pre-cancerous)': {
    codes: ['colorectal_cancer'], isPanCancer: false, notes: 'Pre-cancerous detection'
  },
};

// ============================================================================
// Import Functions
// ============================================================================

interface OpenOncoTest {
  id: string;
  sampleCategory?: string;
  name: string;
  vendor: string;
  approach?: string;
  method?: string;
  cancerTypes: string[];
  indicationsNotes?: string;
  sensitivity?: number | null;
  sensitivityNotes?: string;
  sensitivityCitations?: string;
  specificity?: number | null;
  specificityNotes?: string;
  stageIISensitivity?: number | null;
  stageIISensitivityNotes?: string;
  stageIIISensitivity?: number | null;
  stageIIISensitivityNotes?: string;
  lod?: string | null;
  lod95?: string | null;
  lodNotes?: string;
  ppv?: number | null;
  npv?: number | null;
  leadTimeVsImaging?: number | null;
  leadTimeVsImagingNotes?: string;
  requiresTumorTissue?: string;
  requiresMatchedNormal?: string;
  variantsTracked?: string;
  variantsTrackedNotes?: string;
  initialTat?: number | null;
  initialTatNotes?: string;
  followUpTat?: number | null;
  followUpTatNotes?: string;
  bloodVolume?: number | null;
  bloodVolumeNotes?: string;
  tat?: number | null;
  tatNotes?: string;
  fdaStatus?: string;
  cptCodes?: string;
  reimbursement?: string;
  reimbursementNote?: string;
  clinicalAvailability?: string;
  clinicalTrials?: string;
  clinicalTrialsCitations?: string;
  totalParticipants?: number | null;
  numPublications?: number | null;
  exampleTestReport?: string;
}

interface OpenOncoData {
  meta: {
    version: string;
    generatedAt: string;
    source: string;
  };
  categories: Record<string, {
    name: string;
    description: string;
    testCount: number;
    tests: OpenOncoTest[];
  }>;
}

async function populateCancerTypeMappings() {
  console.log('📋 Populating OpenOnco cancer type mappings...\n');

  const mappings = Object.entries(OPENONCO_TO_NAVIS_MAPPING).map(([term, data]) => ({
    openonco_term: term,
    navis_canonical_codes: data.codes,
    is_pan_cancer: data.isPanCancer,
    stage_filter: data.stageFilter || null,
    notes: data.notes || null,
  }));

  const { data, error } = await supabase
    .from('openonco_cancer_type_mappings')
    .upsert(mappings, { onConflict: 'openonco_term' });

  if (error) {
    console.error('Error inserting mappings:', error);
    return false;
  }

  console.log(`✅ Inserted ${mappings.length} cancer type mappings\n`);
  return true;
}

async function importTests(openoncoData: OpenOncoData) {
  console.log('📥 Importing diagnostic tests...\n');

  let totalTests = 0;
  let totalMappings = 0;

  for (const [categoryKey, categoryData] of Object.entries(openoncoData.categories)) {
    console.log(`\n### ${categoryData.name} (${categoryKey}) - ${categoryData.tests.length} tests ###\n`);

    for (const test of categoryData.tests) {
      // Insert the test
      const testRecord = {
        openonco_id: test.id,
        category: categoryKey,
        name: test.name,
        vendor: test.vendor,
        method: test.method || null,
        approach: test.approach || null,
        sample_category: test.sampleCategory || null,
        sensitivity: test.sensitivity || null,
        sensitivity_notes: test.sensitivityNotes || null,
        specificity: test.specificity || null,
        specificity_notes: test.specificityNotes || null,
        lod: test.lod || null,
        lod95: test.lod95 || null,
        lod_notes: test.lodNotes || null,
        ppv: test.ppv || null,
        npv: test.npv || null,
        stage_ii_sensitivity: test.stageIISensitivity || null,
        stage_ii_sensitivity_notes: test.stageIISensitivityNotes || null,
        stage_iii_sensitivity: test.stageIIISensitivity || null,
        stage_iii_sensitivity_notes: test.stageIIISensitivityNotes || null,
        lead_time_vs_imaging_days: test.leadTimeVsImaging || null,
        lead_time_notes: test.leadTimeVsImagingNotes || null,
        requires_tumor_tissue: test.requiresTumorTissue === 'Yes',
        requires_matched_normal: test.requiresMatchedNormal === 'Yes',
        variants_tracked: test.variantsTracked || null,
        variants_tracked_notes: test.variantsTrackedNotes || null,
        initial_tat_days: test.initialTat || null,
        initial_tat_notes: test.initialTatNotes || null,
        followup_tat_days: test.followUpTat || null,
        followup_tat_notes: test.followUpTatNotes || null,
        blood_volume_ml: test.bloodVolume || null,
        blood_volume_notes: test.bloodVolumeNotes || null,
        fda_status: test.fdaStatus || null,
        cpt_codes: test.cptCodes ? [test.cptCodes] : null,
        reimbursement: test.reimbursement || null,
        reimbursement_notes: test.reimbursementNote || null,
        clinical_availability: test.clinicalAvailability || null,
        clinical_trials: test.clinicalTrials || null,
        clinical_trials_citations: test.clinicalTrialsCitations || null,
        total_participants: test.totalParticipants || null,
        num_publications: test.numPublications || null,
        cancer_types: test.cancerTypes,
        indications_notes: test.indicationsNotes || null,
        example_report_url: test.exampleTestReport || null,
        source_version: openoncoData.meta.version,
      };

      const { data: insertedTest, error: testError } = await supabase
        .from('openonco_tests')
        .upsert(testRecord, { onConflict: 'openonco_id' })
        .select('id')
        .single();

      if (testError) {
        console.error(`  ❌ Error inserting ${test.name}:`, testError.message);
        continue;
      }

      console.log(`  ✅ ${test.name} (${test.vendor})`);
      totalTests++;

      // Create cancer type mappings
      const testId = insertedTest.id;
      const cancerMappings: any[] = [];

      const cancerTypes = test.cancerTypes || [];
      const seenCodes = new Set<string>();
      for (const cancerType of cancerTypes) {
        const mapping = OPENONCO_TO_NAVIS_MAPPING[cancerType];

        if (mapping) {
          for (const code of mapping.codes) {
            // Skip duplicate cancer codes for this test
            if (seenCodes.has(code)) continue;
            seenCodes.add(code);

            cancerMappings.push({
              test_id: testId,
              cancer_code: code,
              is_primary_indication: mapping.codes.indexOf(code) === 0,
              is_pan_cancer: mapping.isPanCancer,
              stage_specificity: mapping.stageFilter || 'all',
              notes: mapping.notes || null,
            });
          }
        } else {
          console.log(`     ⚠️  No mapping for cancer type: "${cancerType}"`);
        }
      }

      if (cancerMappings.length > 0) {
        // Delete existing mappings for this test first
        await supabase
          .from('openonco_test_cancer_mappings')
          .delete()
          .eq('test_id', testId);

        const { error: mappingError } = await supabase
          .from('openonco_test_cancer_mappings')
          .insert(cancerMappings);

        if (mappingError) {
          console.error(`     ❌ Error inserting mappings:`, mappingError.message);
        } else {
          totalMappings += cancerMappings.length;
        }
      }
    }
  }

  console.log(`\n✅ Import complete: ${totalTests} tests, ${totalMappings} cancer type mappings\n`);
  return { totalTests, totalMappings };
}

// ============================================================================
// RAG Chunk Generation (Approach 3 Preparation)
// ============================================================================

function generateRAGChunks(openoncoData: OpenOncoData): any[] {
  const chunks: any[] = [];

  const categoryDescriptions: Record<string, string> = {
    MRD: 'Molecular Residual Disease (MRD) testing detects remaining cancer cells after treatment to guide surveillance and adjuvant therapy decisions.',
    ECD: 'Early Cancer Detection (ECD) tests screen for cancer before symptoms appear, enabling earlier intervention.',
    TRM: 'Treatment Response Monitoring (TRM) tracks how well cancer treatment is working using blood-based biomarkers.',
    CGP: 'Comprehensive Genomic Profiling (CGP) identifies actionable genetic mutations to guide targeted therapy selection.',
  };

  for (const [categoryKey, categoryData] of Object.entries(openoncoData.categories)) {
    for (const test of categoryData.tests) {
      // Get mapped cancer types
      const mappedCancerTypes: string[] = [];
      const testCancerTypes = test.cancerTypes || [];
      for (const ct of testCancerTypes) {
        const mapping = OPENONCO_TO_NAVIS_MAPPING[ct];
        if (mapping) {
          mappedCancerTypes.push(...mapping.codes);
        }
      }
      const uniqueCancerTypes = [...new Set(mappedCancerTypes)];

      // Build rich text chunk
      const chunkText = `
${test.name} by ${test.vendor}

Category: ${categoryData.name} (${categoryKey})
${categoryDescriptions[categoryKey]}

Cancer Types: ${testCancerTypes.join(', ')}

Method: ${test.method || 'Not specified'}
Approach: ${test.approach || 'Not specified'}
Sample Type: ${test.sampleCategory || 'Blood/Plasma'}

Performance Metrics:
${test.sensitivity ? `- Sensitivity: ${test.sensitivity}%${test.sensitivityNotes ? ` (${test.sensitivityNotes.substring(0, 100)}...)` : ''}` : ''}
${test.specificity ? `- Specificity: ${test.specificity}%` : ''}
${test.lod95 ? `- Limit of Detection (LOD95): ${test.lod95}` : ''}
${test.ppv ? `- Positive Predictive Value: ${test.ppv}%` : ''}
${test.npv ? `- Negative Predictive Value: ${test.npv}%` : ''}
${test.leadTimeVsImaging ? `- Lead Time vs Imaging: ${test.leadTimeVsImaging} days (${(test.leadTimeVsImaging / 30).toFixed(1)} months)` : ''}

Regulatory & Access:
- FDA Status: ${test.fdaStatus || 'Not specified'}
- Reimbursement: ${test.reimbursement || 'Coverage varies'}
${test.cptCodes ? `- CPT Code: ${test.cptCodes}` : ''}

Operational Details:
${test.requiresTumorTissue === 'Yes' ? '- Requires tumor tissue sample' : '- Tumor tissue not required (tumor-naive)'}
${test.variantsTracked ? `- Variants tracked: ${test.variantsTracked}` : ''}
${test.initialTat ? `- Initial turnaround: ${test.initialTat} days` : ''}
${test.followUpTat ? `- Follow-up turnaround: ${test.followUpTat} days` : ''}
${test.bloodVolume ? `- Blood volume required: ${test.bloodVolume} mL` : ''}

Clinical Evidence:
${test.clinicalTrials ? `- Clinical trials: ${test.clinicalTrials}` : ''}
${test.totalParticipants ? `- Total participants: ${test.totalParticipants.toLocaleString()}` : ''}
${test.numPublications ? `- Publications: ${test.numPublications}` : ''}

${test.indicationsNotes ? `Indications: ${test.indicationsNotes}` : ''}
      `.trim();

      chunks.push({
        guideline_title: `${test.name} - ${categoryData.name} Diagnostic Test`,
        guideline_source: 'OpenOnco',
        cancer_type: uniqueCancerTypes.includes('multi_solid') ? 'General' : uniqueCancerTypes[0] || 'General',
        content_tier: 'tier_1',
        content_type: 'diagnostic_test',
        chunk_text: chunkText,
        url: `https://openonco.org/tests/${test.id}`,
        tags: [categoryKey, test.vendor, ...test.cancerTypes.slice(0, 5)],
        author: 'OpenOnco',
        publication_date: openoncoData.meta.generatedAt.split('T')[0],
      });
    }
  }

  return chunks;
}

async function ingestRAGChunks(chunks: any[]) {
  console.log('\n📚 Ingesting RAG chunks for Approach 3...\n');

  // This would call your content-ingest function or directly insert
  // For now, we'll save to a file for review/manual ingestion
  const outputPath = path.join(__dirname, 'openonco-rag-chunks.json');
  fs.writeFileSync(outputPath, JSON.stringify(chunks, null, 2));

  console.log(`✅ Generated ${chunks.length} RAG chunks`);
  console.log(`📄 Saved to: ${outputPath}`);
  console.log('\nTo ingest into RAG, run the content-ingest function with these chunks.');

  return chunks.length;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🚀 OpenOnco Diagnostic Tests Import\n');
  console.log('='.repeat(60) + '\n');

  // Check for service role key
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    process.exit(1);
  }

  // Load OpenOnco JSON
  const jsonPath = process.argv[2] || path.join(process.env.HOME || '', 'Downloads', 'OpenOnco_AllTests (1).json');

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ OpenOnco JSON not found at: ${jsonPath}`);
    console.log('\nUsage: npx tsx scripts/import-openonco-tests.ts [path-to-json]');
    process.exit(1);
  }

  console.log(`📂 Loading: ${jsonPath}\n`);
  const openoncoData: OpenOncoData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`Source: ${openoncoData.meta.source}`);
  console.log(`Version: ${openoncoData.meta.version}`);
  console.log(`Generated: ${openoncoData.meta.generatedAt}\n`);

  // Step 1: Populate cancer type mappings
  const mappingsOk = await populateCancerTypeMappings();
  if (!mappingsOk) {
    console.error('❌ Failed to populate cancer type mappings');
    process.exit(1);
  }

  // Step 2: Import tests
  const { totalTests, totalMappings } = await importTests(openoncoData);

  // Step 3: Generate RAG chunks (Approach 3 prep)
  const ragChunks = generateRAGChunks(openoncoData);
  await ingestRAGChunks(ragChunks);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY\n');
  console.log(`  Tests imported:        ${totalTests}`);
  console.log(`  Cancer type mappings:  ${totalMappings}`);
  console.log(`  RAG chunks generated:  ${ragChunks.length}`);
  console.log('\n✅ Import complete!');
}

main().catch(console.error);
