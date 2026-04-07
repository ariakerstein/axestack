/**
 * Compare resources returned by /opportunities vs /circle-app
 *
 * /opportunities: Uses get_resources_by_cancer_type RPC
 * /circle-app: Uses direct-navis text search with cancerType filter
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xobmvxatidcnbuwqptbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYm12eGF0aWRjbmJ1d3FwdGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1NzUyMDcsImV4cCI6MjA0NjE1MTIwN30.R37Po2MkOrmo16b2lGAG7tKCANPAJfG9OYSzTD_zzpI'
);

interface ResourceComparison {
  cancerType: string;
  opportunitiesCount: number;
  opportunitiesTier1: number;
  opportunitiesTier3: number;
  opportunitiesTitles: string[];
  circleAppCount: number;
  circleAppTier1: number;
  circleAppTier3: number;
  circleAppTitles: string[];
  guidelineCancerType: string | null;
}

async function getGuidelineCancerType(canonicalCode: string): Promise<string | null> {
  const { data } = await supabase
    .from('cancer_taxonomy')
    .select('guideline_cancer_type')
    .eq('navis_canonical_code', canonicalCode)
    .single();
  return data?.guideline_cancer_type || null;
}

async function getOpportunitiesResources(searchTerm: string) {
  const { data, error } = await supabase.rpc('get_resources_by_cancer_type', {
    search_term: searchTerm,
    max_results: 20
  });

  if (error) {
    console.error(`RPC error for ${searchTerm}:`, error.message);
    return [];
  }
  return data || [];
}

async function getCircleAppChunks(cancerType: string | null) {
  // This simulates what direct-navis does
  if (!cancerType) {
    // No cancer type filter - just keyword search (which is what's happening!)
    return { chunks: [], note: 'No cancer type sent - would search ALL content' };
  }

  const { data, error } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, content_tier, url')
    .ilike('cancer_type', `${cancerType}%`)
    .eq('status', 'active')
    .limit(20);

  if (error) {
    console.error(`Circle search error:`, error.message);
    return { chunks: [], note: error.message };
  }

  // Dedupe by title
  const seen = new Set<string>();
  const unique = (data || []).filter(chunk => {
    if (seen.has(chunk.guideline_title)) return false;
    seen.add(chunk.guideline_title);
    return true;
  });

  return { chunks: unique, note: null };
}

async function compareResources(canonicalCodes: string[]) {
  console.log('='.repeat(80));
  console.log('RESOURCE COMPARISON: /opportunities vs /circle-app');
  console.log('='.repeat(80));

  const results: ResourceComparison[] = [];

  for (const code of canonicalCodes) {
    console.log(`\n--- ${code} ---`);

    // Get guideline_cancer_type mapping
    const guidelineCancerType = await getGuidelineCancerType(code);
    console.log(`  guideline_cancer_type: ${guidelineCancerType || 'NULL (!!)'}`);

    // Get /opportunities resources (uses search term from code)
    const searchTerm = code.split('_')[0]; // e.g., 'breast' from 'breast_cancer'
    const oppResources = await getOpportunitiesResources(searchTerm);
    console.log(`  /opportunities (search: "${searchTerm}"): ${oppResources.length} resources`);

    // Get /circle-app resources (uses guideline_cancer_type)
    const circleResult = await getCircleAppChunks(guidelineCancerType);
    console.log(`  /circle-app (filter: "${guidelineCancerType}"): ${circleResult.chunks.length} resources`);
    if (circleResult.note) {
      console.log(`    ⚠️ ${circleResult.note}`);
    }

    // Count tiers
    const oppTier1 = oppResources.filter((r: any) => r.tier === 'tier_1').length;
    const oppTier3 = oppResources.filter((r: any) => r.tier === 'tier_3').length;
    const circleTier1 = circleResult.chunks.filter(c => c.content_tier === 'tier_1').length;
    const circleTier3 = circleResult.chunks.filter(c => c.content_tier === 'tier_3').length;

    results.push({
      cancerType: code,
      opportunitiesCount: oppResources.length,
      opportunitiesTier1: oppTier1,
      opportunitiesTier3: oppTier3,
      opportunitiesTitles: oppResources.slice(0, 5).map((r: any) => r.title),
      circleAppCount: circleResult.chunks.length,
      circleAppTier1: circleTier1,
      circleAppTier3: circleTier3,
      circleAppTitles: circleResult.chunks.slice(0, 5).map(c => c.guideline_title),
      guidelineCancerType
    });
  }

  // Print comparison table
  console.log('\n\n' + '='.repeat(80));
  console.log('COMPARISON TABLE');
  console.log('='.repeat(80));
  console.log('\nCancer Type            | Opp Total | Opp T1 | Opp T3 | Circle | Cir T1 | Cir T3 | guideline_cancer_type');
  console.log('-'.repeat(120));

  for (const r of results) {
    const name = r.cancerType.padEnd(22);
    const gap = r.guidelineCancerType ? '' : ' ⚠️ NULL';
    console.log(`${name} | ${String(r.opportunitiesCount).padStart(9)} | ${String(r.opportunitiesTier1).padStart(6)} | ${String(r.opportunitiesTier3).padStart(6)} | ${String(r.circleAppCount).padStart(6)} | ${String(r.circleAppTier1).padStart(6)} | ${String(r.circleAppTier3).padStart(6)} | ${r.guidelineCancerType || 'NULL'}${gap}`);
  }

  // Print sample titles for each
  console.log('\n\n' + '='.repeat(80));
  console.log('SAMPLE RESOURCES BY CANCER TYPE');
  console.log('='.repeat(80));

  for (const r of results) {
    console.log(`\n[${r.cancerType}]`);
    console.log('  /opportunities:');
    if (r.opportunitiesTitles.length === 0) {
      console.log('    (none)');
    } else {
      r.opportunitiesTitles.forEach(t => console.log(`    - ${t}`));
    }
    console.log('  /circle-app:');
    if (r.circleAppTitles.length === 0) {
      console.log(`    (none - guideline_cancer_type: ${r.guidelineCancerType || 'NULL'})`);
    } else {
      r.circleAppTitles.forEach(t => console.log(`    - ${t}`));
    }
  }

  // Diagnosis
  console.log('\n\n' + '='.repeat(80));
  console.log('DIAGNOSIS');
  console.log('='.repeat(80));

  const nullMappings = results.filter(r => !r.guidelineCancerType);
  if (nullMappings.length > 0) {
    console.log('\n⚠️ CRITICAL ISSUE: These cancer types have NULL guideline_cancer_type mapping:');
    nullMappings.forEach(r => console.log(`   - ${r.cancerType}`));
    console.log('\n   This means /circle-app sends cancerType: null to direct-navis,');
    console.log('   which searches ALL content without cancer type filtering!');
    console.log('   Result: Generic responses, no tier-specific citations.');
  }

  const gaps = results.filter(r => r.opportunitiesCount > r.circleAppCount * 2);
  if (gaps.length > 0) {
    console.log('\n⚠️ SIGNIFICANT GAPS (opportunities > 2x circle):');
    gaps.forEach(r => console.log(`   - ${r.cancerType}: ${r.opportunitiesCount} vs ${r.circleAppCount}`));
  }
}

// Test with several cancer types
const testCancerTypes = [
  'breast_cancer',
  'hodgkin_lymphoma',
  'lung_nsclc',
  'prostate_cancer',
  'colorectal_cancer',
  'melanoma',
  'nhl_dlbcl',
  'pancreatic_cancer'
];

compareResources(testCancerTypes);
