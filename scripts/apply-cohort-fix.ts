#!/usr/bin/env tsx
/**
 * Apply Cohort Analysis Fix Migration
 * This fixes the critical bug where retention periods were calculated from cohort week start
 * instead of individual user signup dates.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('\n🔧 APPLYING COHORT ANALYSIS FIX\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20250116000001_fix_cohort_periods_from_user_signup.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file read successfully\n');
    console.log('⚠️  IMPORTANT: Supabase JS client cannot execute CREATE FUNCTION directly');
    console.log('   We need to use the Supabase REST API or apply manually.\n');

    // Try to execute via REST API
    console.log('🔄 Attempting to apply via REST API...\n');

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql_query: migrationSQL })
    });

    if (response.ok) {
      console.log('✅ Migration applied successfully via REST API!\n');
      
      // Test the function
      console.log('🧪 Testing the updated function...\n');
      const { data: testData, error: testError } = await supabase.rpc('get_cohort_analysis_data', { period_type: 'week' });

      if (testError) {
        console.log('⚠️  Function test returned error:', testError.message);
        console.log('   This might be expected if there\'s no data yet.\n');
      } else {
        console.log(`✅ Function is working! Returned ${testData?.length || 0} cohorts\n`);
        if (testData && testData.length > 0) {
          console.log('📊 Sample cohort data:');
          console.log(JSON.stringify(testData[0], null, 2));
          console.log('');
        }
      }
    } else {
      const errorText = await response.text();
      console.log('❌ REST API execution failed');
      console.log('   Error:', errorText);
      console.log('\n📋 MANUAL APPLICATION REQUIRED:\n');
      console.log('   1. Go to: https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new');
      console.log('   2. Copy and paste the contents of:');
      console.log(`      ${migrationPath}\n`);
      console.log('   3. Click "Run" to execute\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('SQL to apply:\n');
      console.log(migrationSQL);
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ COHORT ANALYSIS FIX APPLIED\n');
    console.log('Next steps:');
    console.log('   1. Go to https://navis.health/admin?tab=cohorts');
    console.log('   2. Click the refresh button');
    console.log('   3. Retention numbers should now be accurate!\n');

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.log('\n📋 MANUAL APPLICATION REQUIRED:\n');
    console.log('   1. Go to: https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new');
    console.log('   2. Copy and paste the contents of:');
    console.log('      supabase/migrations/20250116000001_fix_cohort_periods_from_user_signup.sql\n');
    console.log('   3. Click "Run" to execute\n');
  }
}

applyMigration().catch(console.error);




