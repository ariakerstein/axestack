#!/usr/bin/env tsx
/**
 * NCCN Content Audit: Coverage & Recency Check
 * TypeScript version (no psql required)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runQuery(name: string, sql: string): Promise<any[]> {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    // If RPC doesn't exist, try direct query
    const { data: directData, error: directError } = await supabase
      .from('guideline_chunks')
      .select('*')
      .limit(0); // Just to test connection

    if (directError) {
      console.error(`❌ Error running ${name}:`, error.message);
      return [];
    }

    // Fall back to executing via raw SQL if available
    console.log(`⚠️  Could not execute: ${name}`);
    return [];
  }

  return data || [];
}

async function main() {
  console.log('====================================================');
  console.log('NCCN CONTENT AUDIT: Coverage & Recency Check');
  console.log('====================================================\n');

  // Query 1: NCCN Guidelines by Cancer Type
  console.log('1. NCCN Guidelines by Cancer Type');
  console.log('-----------------------------------');

  const { data: byCancerType, error: e1 } = await supabase
    .from('guideline_chunks')
    .select('cancer_type, guideline_title, updated_at, content_tier')
    .eq('content_tier', 'tier_1');

  if (e1) {
    console.error('Error:', e1.message);
  } else if (byCancerType) {
    const grouped = byCancerType.reduce((acc: any, row: any) => {
      const ct = row.cancer_type || 'Unknown';
      if (!acc[ct]) {
        acc[ct] = {
          guidelines: new Set(),
          count: 0,
          oldest: row.updated_at,
          newest: row.updated_at
        };
      }
      acc[ct].guidelines.add(row.guideline_title);
      acc[ct].count++;
      if (row.updated_at < acc[ct].oldest) acc[ct].oldest = row.updated_at;
      if (row.updated_at > acc[ct].newest) acc[ct].newest = row.updated_at;
      return acc;
    }, {});

    const sorted = Object.entries(grouped)
      .sort(([,a]: any, [,b]: any) => b.count - a.count)
      .slice(0, 20);

    sorted.forEach(([cancerType, stats]: any) => {
      console.log(`  ${cancerType.padEnd(25)} | ${stats.guidelines.size} guidelines | ${stats.count} chunks`);
      console.log(`    └─ ${stats.oldest.split('T')[0]} to ${stats.newest.split('T')[0]}`);
    });
  }

  console.log('\n2. Top NCCN Guidelines by Chunk Count');
  console.log('--------------------------------------');

  const { data: topGuidelines } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, cancer_type, updated_at, content_tier')
    .eq('content_tier', 'tier_1')
    .or('guideline_title.ilike.%NCCN%,storage_path.like.guidelines/%');

  if (topGuidelines) {
    const grouped = topGuidelines.reduce((acc: any, row: any) => {
      const key = `${row.guideline_title}|${row.cancer_type}`;
      if (!acc[key]) {
        acc[key] = {
          title: row.guideline_title,
          cancer_type: row.cancer_type,
          count: 0,
          last_updated: row.updated_at
        };
      }
      acc[key].count++;
      if (row.updated_at > acc[key].last_updated) {
        acc[key].last_updated = row.updated_at;
      }
      return acc;
    }, {});

    const sorted = Object.values(grouped)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 15);

    sorted.forEach((g: any) => {
      const titleShort = g.title.substring(0, 50);
      console.log(`  ${titleShort.padEnd(52)} | ${String(g.count).padStart(4)} chunks | ${g.last_updated.split('T')[0]}`);
      if (g.cancer_type) {
        console.log(`    └─ Cancer: ${g.cancer_type}`);
      }
    });
  }

  console.log('\n====================================================');
  console.log('CRITICAL CANCER TYPES - COVERAGE CHECK');
  console.log('====================================================\n');

  const commonCancers = [
    'breast', 'lung', 'NSCLC', 'SCLC',
    'prostate', 'colorectal', 'melanoma',
    'lymphoma', 'NHL', 'Hodgkin',
    'leukemia', 'AML', 'CLL',
    'pancreatic', 'ovarian', 'bladder'
  ];

  console.log('3. Common Cancer Types - NCCN Coverage Status');
  console.log('----------------------------------------------');

  for (const cancer of commonCancers) {
    const { data: chunks } = await supabase
      .from('guideline_chunks')
      .select('guideline_title', { count: 'exact' })
      .eq('content_tier', 'tier_1')
      .ilike('cancer_type', `%${cancer}%`);

    const count = chunks?.length || 0;
    const guidelines = new Set(chunks?.map((c: any) => c.guideline_title) || []).size;

    let status = '❌ Missing';
    if (count > 100) status = '✅ Good Coverage';
    else if (count > 0) status = '⚠️  Limited Coverage';

    console.log(`  ${cancer.padEnd(20)} | ${String(guidelines).padStart(2)} guidelines | ${String(count).padStart(4)} chunks | ${status}`);
  }

  console.log('\n====================================================');
  console.log('RECENCY WARNINGS');
  console.log('====================================================\n');

  console.log('4. Potentially Outdated NCCN Content');
  console.log('------------------------------------');

  const { data: allNCCN } = await supabase
    .from('guideline_chunks')
    .select('cancer_type, guideline_title, updated_at')
    .eq('content_tier', 'tier_1')
    .ilike('guideline_title', '%NCCN%');

  if (allNCCN) {
    const grouped = allNCCN.reduce((acc: any, row: any) => {
      const key = `${row.cancer_type}|${row.guideline_title}`;
      if (!acc[key]) {
        acc[key] = {
          cancer_type: row.cancer_type,
          title: row.guideline_title,
          count: 0,
          last_ingested: row.updated_at
        };
      }
      acc[key].count++;
      if (row.updated_at > acc[key].last_ingested) {
        acc[key].last_ingested = row.updated_at;
      }
      return acc;
    }, {});

    const outdated = Object.values(grouped)
      .map((g: any) => {
        const ingestedDate = new Date(g.last_ingested);
        const daysSince = Math.floor((Date.now() - ingestedDate.getTime()) / (1000 * 60 * 60 * 24));
        return { ...g, daysSince };
      })
      .filter((g: any) => g.daysSince > 180)
      .sort((a: any, b: any) => b.daysSince - a.daysSince);

    if (outdated.length === 0) {
      console.log('  🟢 All NCCN content is recent (<6 months old)');
    } else {
      outdated.forEach((g: any) => {
        const freshness = g.daysSince > 365 ? '🔴 >1 year' : '🟡 >6 months';
        console.log(`  ${freshness} | ${g.cancer_type} | ${g.title.substring(0, 40)}`);
        console.log(`    └─ Last ingested: ${g.last_ingested.split('T')[0]} (${g.daysSince} days ago)`);
      });
    }
  }

  console.log('\n====================================================');
  console.log('SUMMARY STATISTICS');
  console.log('====================================================\n');

  const { count: totalChunks } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('content_tier', 'tier_1')
    .ilike('guideline_title', '%NCCN%');

  const { data: allNCCNForStats } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, cancer_type, updated_at')
    .eq('content_tier', 'tier_1')
    .ilike('guideline_title', '%NCCN%');

  const uniqueGuidelines = new Set(allNCCNForStats?.map((c: any) => c.guideline_title) || []).size;
  const uniqueCancerTypes = new Set(allNCCNForStats?.map((c: any) => c.cancer_type) || []).size;

  const dates = allNCCNForStats?.map((c: any) => c.updated_at).sort() || [];
  const oldest = dates[0]?.split('T')[0] || 'N/A';
  const newest = dates[dates.length - 1]?.split('T')[0] || 'N/A';

  console.log('5. Overall NCCN Content Summary');
  console.log('--------------------------------');
  console.log(`  Total NCCN chunks:        ${totalChunks || 0}`);
  console.log(`  Unique NCCN guidelines:   ${uniqueGuidelines}`);
  console.log(`  Cancer types covered:     ${uniqueCancerTypes}`);
  console.log(`  Oldest NCCN content:      ${oldest}`);
  console.log(`  Newest NCCN content:      ${newest}`);

  console.log('\n====================================================');
  console.log('AUDIT COMPLETE');
  console.log('====================================================\n');
}

main().catch(console.error);
