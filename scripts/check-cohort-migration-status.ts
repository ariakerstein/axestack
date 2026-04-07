#!/usr/bin/env tsx
/**
 * Check if the cohort analysis migration has been applied
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMigrationStatus() {
  console.log('\n🔍 CHECKING COHORT ANALYSIS MIGRATION STATUS\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. Check if function exists
    console.log('1. Checking if function exists...');
    const { data: functionData, error: functionError } = await supabase
      .rpc('get_cohort_analysis_data', { period_type: 'week' });

    if (functionError) {
      console.log('❌ Function does not exist or has errors:', functionError.message);
      console.log('\n📋 ACTION REQUIRED: Apply the migration in Supabase SQL Editor\n');
      return;
    }

    console.log('✅ Function exists\n');

    // 2. Test the function
    console.log('2. Testing function with actual data...');
    if (!functionData || functionData.length === 0) {
      console.log('⚠️  Function returned no data');
      console.log('   This could mean no users have signed up yet\n');
      return;
    }

    console.log(`✅ Function returned ${functionData.length} cohorts\n`);

    // 3. Check if we're getting non-zero retention
    console.log('3. Checking retention values...');
    const cohortsWithRetention = functionData.filter((c: any) => 
      c.period_1 > 0 || c.period_2 > 0 || c.period_3 > 0 || c.period_4 > 0
    );

    if (cohortsWithRetention.length === 0) {
      console.log('⚠️  WARNING: All cohorts show 0% retention');
      console.log('   This could mean:');
      console.log('   - Migration not applied (still using old calculation)');
      console.log('   - Users really have 0% retention (unlikely given your data)');
      console.log('   - Time windows are misaligned\n');
      
      // Show sample data
      console.log('Sample cohort data:');
      const sample = functionData.slice(0, 3);
      sample.forEach((c: any) => {
        console.log(`  ${c.cohort_period}: Size=${c.cohort_size}, P1=${c.period_1}, P2=${c.period_2}`);
      });
      console.log('');
    } else {
      console.log(`✅ Found ${cohortsWithRetention.length} cohorts with non-zero retention\n`);
      
      // Show sample
      console.log('Sample cohorts with retention:');
      cohortsWithRetention.slice(0, 3).forEach((c: any) => {
        const p1Pct = c.cohort_size > 0 ? ((c.period_1 / c.cohort_size) * 100).toFixed(1) : '0.0';
        const p2Pct = c.cohort_size > 0 ? ((c.period_2 / c.cohort_size) * 100).toFixed(1) : '0.0';
        console.log(`  ${c.cohort_period}: Size=${c.cohort_size}, P1=${c.period_1} (${p1Pct}%), P2=${c.period_2} (${p2Pct}%)`);
      });
      console.log('');
    }

    // 4. Manual verification query
    console.log('4. Manual verification (checking actual user activity)...');
    const { data: manualCheck, error: manualError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        created_at,
        analytics_events!inner(
          event_timestamp
        )
      `)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5);

    if (!manualError && manualCheck) {
      console.log(`✅ Found ${manualCheck.length} users with events in last 90 days`);
      console.log('   (This confirms data exists for calculation)\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 SUMMARY\n');
    
    if (cohortsWithRetention.length === 0) {
      console.log('❌ MIGRATION LIKELY NOT APPLIED');
      console.log('   All cohorts show 0% retention, which is suspicious.');
      console.log('   Based on your data, you should see ~6-7% Period 1 retention.\n');
      console.log('📋 NEXT STEPS:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new');
      console.log('   2. Copy contents of: supabase/migrations/20250116000001_fix_cohort_periods_from_user_signup.sql');
      console.log('   3. Paste and run in SQL Editor');
      console.log('   4. Refresh the admin dashboard\n');
    } else {
      console.log('✅ MIGRATION APPEARS TO BE APPLIED');
      console.log('   Function is returning non-zero retention values.\n');
    }

  } catch (error) {
    console.error('❌ Error checking migration status:', error);
  }
}

checkMigrationStatus().catch(console.error);




