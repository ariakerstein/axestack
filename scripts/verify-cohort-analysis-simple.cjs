/**
 * Simple Cohort Analysis Verification (Using Anon Key)
 *
 * This version uses the anon key from .env and only checks what's accessible
 * without admin privileges. For full verification, use verify-cohort-analysis.cjs
 * with the service role key.
 *
 * Usage:
 *   npm run verify:cohorts:simple
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
  console.error('These should already be in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const printSection = (title) => {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
};

async function checkBasicAccess() {
  printSection('1. BASIC ACCESS CHECK (No Auth Required)');

  try {
    // Try to call cohort function (may work with public access)
    const { data, error } = await supabase
      .rpc('get_cohort_analysis_data', { period_type: 'week' });

    if (error) {
      if (error.message.includes('permission denied') || error.message.includes('not found')) {
        console.log('\n⚠️  Cannot access cohort function with anon key');
        console.log('   This is expected - cohort functions require admin access');
        console.log('\n💡 To run full verification:');
        console.log('   1. Get your service_role key from Supabase Dashboard');
        console.log('   2. Add to .env: SUPABASE_SERVICE_ROLE_KEY=your-key');
        console.log('   3. Run: npm run verify:cohorts');
        return false;
      }
      console.error('❌ Unexpected error:', error.message);
      return false;
    }

    if (!data || data.length === 0) {
      console.log('\n⚠️  Function returned no data');
      console.log('   This could mean:');
      console.log('   - No users have signed up yet');
      console.log('   - Not enough time has passed (need 1+ complete weeks)');
      return false;
    }

    console.log('\n✅ SUCCESS! Cohort function is accessible!');
    console.log(`   Found ${data.length} cohorts`);
    console.log('\n   Most recent cohort:');
    const latest = data.sort((a, b) =>
      new Date(b.cohort_period) - new Date(a.cohort_period)
    )[0];

    console.log(`   Date: ${latest.cohort_period}`);
    console.log(`   Size: ${latest.cohort_size} users`);
    console.log(`   Week 1 Retention: ${latest.period_0 > 0 ?
      Math.round(latest.period_1 / latest.period_0 * 100) : 0}%`);

    return true;

  } catch (error) {
    console.error('❌ Error checking access:', error.message);
    return false;
  }
}

async function checkDatabaseConnection() {
  printSection('2. DATABASE CONNECTION CHECK');

  try {
    // Try a simple query that should work with anon key
    const { data, error } = await supabase
      .from('analytics_events')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('permission denied')) {
        console.log('\n⚠️  Analytics events table requires authentication');
        console.log('   This is expected with RLS enabled');
        return false;
      }
      console.error('❌ Error:', error.message);
      return false;
    }

    console.log('\n✅ Database connection working');
    return true;

  } catch (error) {
    console.error('❌ Connection error:', error.message);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     SIMPLE COHORT VERIFICATION (Anon Key)                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  console.log('\n📌 NOTE: This is a LIMITED verification using the anon key.');
  console.log('   For full verification, use the service role key.');

  const dbConnected = await checkDatabaseConnection();
  const cohortAccess = await checkBasicAccess();

  printSection('SUMMARY');

  console.log('\n' + (cohortAccess ? '✅' : '⚠️ ') + ' Cohort Analysis Status:');

  if (cohortAccess) {
    console.log('   ✅ Functions are working');
    console.log('   ✅ Data is accessible');
    console.log('   ✅ Ready to view in admin dashboard');
    console.log('\n   Next step: View at /admin → Analytics → Cohort Analysis');
  } else {
    console.log('   ⚠️  Cannot verify without service role key');
    console.log('\n   To get your service role key:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx');
    console.log('   2. Click: Settings → API');
    console.log('   3. Copy: service_role key (under "Project API keys")');
    console.log('   4. Add to .env: SUPABASE_SERVICE_ROLE_KEY=your-key-here');
    console.log('   5. Run: npm run verify:cohorts');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  process.exit(cohortAccess ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}
