/**
 * Cohort Analysis Verification Script (JavaScript)
 * Runs verification checks using Supabase client
 *
 * Usage:
 *   node scripts/verify-cohort-analysis.js
 *
 * Or with environment variables:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/verify-cohort-analysis.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions
const printSection = (title) => {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
};

const printSubsection = (title) => {
  console.log('\n' + title);
  console.log('-'.repeat(60));
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toISOString().split('T')[0];
};

const formatPercent = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return `${Math.round(value * 10) / 10}%`;
};

// Verification checks
async function checkDataPrerequisites() {
  printSection('1. DATA PREREQUISITES CHECK');

  printSubsection('User Profiles:');
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('id, created_at');

  if (usersError) {
    console.error('❌ Error fetching users:', usersError.message);
    return false;
  }

  const usersWithCreatedAt = users.filter(u => u.created_at).length;
  const earliestUser = users.reduce((min, u) =>
    u.created_at < min ? u.created_at : min,
    users[0]?.created_at || ''
  );
  const latestUser = users.reduce((max, u) =>
    u.created_at > max ? u.created_at : max,
    users[0]?.created_at || ''
  );

  console.log(`  Total users: ${users.length}`);
  console.log(`  Users with created_at: ${usersWithCreatedAt}`);
  console.log(`  Missing created_at: ${users.length - usersWithCreatedAt}`);
  console.log(`  Earliest user: ${formatDate(earliestUser)}`);
  console.log(`  Latest user: ${formatDate(latestUser)}`);

  if (users.length - usersWithCreatedAt > 0) {
    console.log('  ⚠️  WARNING: Some users missing created_at timestamps');
  } else {
    console.log('  ✅ All users have created_at timestamps');
  }

  printSubsection('Analytics Events:');
  const { data: events, error: eventsError } = await supabase
    .from('analytics_events')
    .select('id, user_id, event_timestamp');

  if (eventsError) {
    console.error('❌ Error fetching events:', eventsError.message);
    return false;
  }

  const eventsWithTimestamp = events.filter(e => e.event_timestamp).length;
  const uniqueUsers = new Set(events.filter(e => e.user_id).map(e => e.user_id)).size;
  const earliestEvent = events.reduce((min, e) =>
    e.event_timestamp < min ? e.event_timestamp : min,
    events[0]?.event_timestamp || ''
  );
  const latestEvent = events.reduce((max, e) =>
    e.event_timestamp > max ? e.event_timestamp : max,
    events[0]?.event_timestamp || ''
  );

  console.log(`  Total events: ${events.length}`);
  console.log(`  Events with timestamp: ${eventsWithTimestamp}`);
  console.log(`  Missing timestamps: ${events.length - eventsWithTimestamp}`);
  console.log(`  Unique users with events: ${uniqueUsers}`);
  console.log(`  Earliest event: ${formatDate(earliestEvent)}`);
  console.log(`  Latest event: ${formatDate(latestEvent)}`);

  if (events.length - eventsWithTimestamp > 0) {
    console.log('  ⚠️  WARNING: Some events missing event_timestamp');
  } else {
    console.log('  ✅ All events have event_timestamp');
  }

  return true;
}

async function testCohortFunctions() {
  printSection('2. TEST COHORT FUNCTIONS');

  printSubsection('Testing get_cohort_analysis_data():');

  const { data, error } = await supabase
    .rpc('get_cohort_analysis_data', { period_type: 'week' });

  if (error) {
    console.error('❌ Error calling cohort function:', error.message);
    console.error('   Details:', error);
    return null;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  WARNING: No cohort data returned');
    console.log('   This could mean:');
    console.log('   - No users have signed up yet');
    console.log('   - Function needs to be created/refreshed');
    console.log('   - Time window doesn\'t include any complete weeks');
    return null;
  }

  console.log(`✅ Function returned ${data.length} cohorts`);
  console.log('\nMost recent 5 cohorts:');
  console.log('-'.repeat(120));
  console.log('Cohort Period       | Size | P0  | P1  | P2  | P3  | P4  | W1%   | W2%   | W3%   | W4%');
  console.log('-'.repeat(120));

  const recentCohorts = data
    .sort((a, b) => new Date(b.cohort_period) - new Date(a.cohort_period))
    .slice(0, 5);

  recentCohorts.forEach(cohort => {
    const w1 = cohort.period_0 > 0 ? (cohort.period_1 / cohort.period_0 * 100) : 0;
    const w2 = cohort.period_0 > 0 ? (cohort.period_2 / cohort.period_0 * 100) : 0;
    const w3 = cohort.period_0 > 0 ? (cohort.period_3 / cohort.period_0 * 100) : 0;
    const w4 = cohort.period_0 > 0 ? (cohort.period_4 / cohort.period_0 * 100) : 0;

    console.log(
      `${formatDate(cohort.cohort_period).padEnd(18)} | ` +
      `${String(cohort.cohort_size).padEnd(4)} | ` +
      `${String(cohort.period_0).padEnd(3)} | ` +
      `${String(cohort.period_1).padEnd(3)} | ` +
      `${String(cohort.period_2).padEnd(3)} | ` +
      `${String(cohort.period_3).padEnd(3)} | ` +
      `${String(cohort.period_4).padEnd(3)} | ` +
      `${formatPercent(w1).padEnd(5)} | ` +
      `${formatPercent(w2).padEnd(5)} | ` +
      `${formatPercent(w3).padEnd(5)} | ` +
      `${formatPercent(w4).padEnd(5)}`
    );
  });

  return data;
}

async function checkDataIntegrity(cohortData) {
  printSection('3. DATA INTEGRITY CHECKS');

  if (!cohortData || cohortData.length === 0) {
    console.log('⚠️  Skipping - no cohort data available');
    return false;
  }

  printSubsection('Checking for impossible retention (> 100%):');

  const integrityIssues = cohortData.filter(cohort =>
    cohort.period_1 > cohort.period_0 ||
    cohort.period_2 > cohort.period_0 ||
    cohort.period_3 > cohort.period_0 ||
    cohort.period_4 > cohort.period_0
  );

  if (integrityIssues.length > 0) {
    console.log(`❌ FAIL: Found ${integrityIssues.length} cohorts with retention > 100%`);
    integrityIssues.forEach(cohort => {
      console.log(`  - ${formatDate(cohort.cohort_period)}: ` +
        `P0=${cohort.period_0}, P1=${cohort.period_1}, ` +
        `P2=${cohort.period_2}, P3=${cohort.period_3}, P4=${cohort.period_4}`);
    });
    return false;
  } else {
    console.log('✅ PASS: All cohorts have valid retention rates (≤ 100%)');
  }

  printSubsection('Checking for decreasing retention pattern:');

  let nonDecreasingCount = 0;
  cohortData.forEach(cohort => {
    const isDecreasing =
      cohort.period_1 <= cohort.period_0 &&
      cohort.period_2 <= cohort.period_1 &&
      cohort.period_3 <= cohort.period_2 &&
      cohort.period_4 <= cohort.period_3;

    if (!isDecreasing && cohort.period_0 > 5) { // Only flag if cohort has >5 users
      nonDecreasingCount++;
      console.log(`  ⚠️  ${formatDate(cohort.cohort_period)}: Non-decreasing pattern ` +
        `(${cohort.period_0} → ${cohort.period_1} → ${cohort.period_2} → ` +
        `${cohort.period_3} → ${cohort.period_4})`);
    }
  });

  if (nonDecreasingCount === 0) {
    console.log('✅ PASS: All significant cohorts show decreasing retention pattern');
  } else {
    console.log(`⚠️  WARNING: ${nonDecreasingCount} cohorts have non-decreasing patterns`);
    console.log('   (This may be OK for small cohorts or recent periods)');
  }

  return integrityIssues.length === 0;
}

async function calculateSummaryStats(cohortData) {
  printSection('4. SUMMARY STATISTICS');

  if (!cohortData || cohortData.length === 0) {
    console.log('⚠️  No cohort data available for summary');
    return;
  }

  const totalCohorts = cohortData.length;
  const totalUsers = cohortData.reduce((sum, c) => sum + c.cohort_size, 0);

  const cohortsWithData = cohortData.filter(c => c.period_0 > 0);
  const avgW1 = cohortsWithData.length > 0
    ? cohortsWithData.reduce((sum, c) => sum + (c.period_1 / c.period_0), 0) / cohortsWithData.length * 100
    : 0;
  const avgW2 = cohortsWithData.length > 0
    ? cohortsWithData.reduce((sum, c) => sum + (c.period_2 / c.period_0), 0) / cohortsWithData.length * 100
    : 0;
  const avgW3 = cohortsWithData.length > 0
    ? cohortsWithData.reduce((sum, c) => sum + (c.period_3 / c.period_0), 0) / cohortsWithData.length * 100
    : 0;
  const avgW4 = cohortsWithData.length > 0
    ? cohortsWithData.reduce((sum, c) => sum + (c.period_4 / c.period_0), 0) / cohortsWithData.length * 100
    : 0;

  console.log(`\n  Total cohorts tracked: ${totalCohorts}`);
  console.log(`  Total users in cohorts: ${totalUsers}`);
  console.log(`  Average Week 1 retention: ${formatPercent(avgW1)}`);
  console.log(`  Average Week 2 retention: ${formatPercent(avgW2)}`);
  console.log(`  Average Week 3 retention: ${formatPercent(avgW3)}`);
  console.log(`  Average Week 4 retention: ${formatPercent(avgW4)}`);

  // Retention benchmarks
  console.log('\n  Retention Health Assessment:');
  if (avgW1 >= 40) {
    console.log('  ✅ Week 1 retention: EXCELLENT (≥40%)');
  } else if (avgW1 >= 25) {
    console.log('  ✅ Week 1 retention: GOOD (25-40%)');
  } else if (avgW1 >= 15) {
    console.log('  ⚠️  Week 1 retention: FAIR (15-25%)');
  } else {
    console.log('  ❌ Week 1 retention: NEEDS IMPROVEMENT (<15%)');
  }

  if (avgW4 >= 20) {
    console.log('  ✅ Week 4 retention: EXCELLENT (≥20%)');
  } else if (avgW4 >= 10) {
    console.log('  ✅ Week 4 retention: GOOD (10-20%)');
  } else if (avgW4 >= 5) {
    console.log('  ⚠️  Week 4 retention: FAIR (5-10%)');
  } else {
    console.log('  ❌ Week 4 retention: NEEDS IMPROVEMENT (<5%)');
  }
}

async function generateRecommendations(hasIntegrityIssues, cohortData) {
  printSection('5. RECOMMENDATIONS');

  if (hasIntegrityIssues) {
    console.log('\n❌ CRITICAL ISSUES FOUND:');
    console.log('  1. Run the fix migrations in scripts/admin-fixes/');
    console.log('  2. Check timezone consistency in database');
    console.log('  3. Verify event_timestamp is populated correctly');
    console.log('  4. Review cohort calculation logic');
  } else if (!cohortData || cohortData.length === 0) {
    console.log('\n⚠️  NO COHORT DATA:');
    console.log('  1. Ensure users have created_at timestamps');
    console.log('  2. Ensure analytics_events have event_timestamp');
    console.log('  3. Wait for at least one complete week after first signup');
    console.log('  4. Check that get_cohort_analysis_data() function exists');
  } else {
    console.log('\n✅ COHORT ANALYSIS IS WORKING CORRECTLY!');
    console.log('\nNext steps:');
    console.log('  1. ✅ View cohorts in admin dashboard at /admin');
    console.log('  2. ✅ Monitor retention trends over time');
    console.log('  3. ✅ Set up alerts for retention drops');
    console.log('  4. ✅ Export cohort data for deeper analysis');
  }

  console.log('\n📊 Admin Dashboard:');
  console.log('  URL: ' + supabaseUrl.replace(/\/+$/, '') + '/admin');
  console.log('  Tab: Analytics → Cohort Analysis');
}

// Main execution
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         COHORT ANALYSIS VERIFICATION SCRIPT                ║');
  console.log('║         Date: ' + new Date().toISOString().split('T')[0] + '                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Step 1: Check prerequisites
    const hasPrerequisites = await checkDataPrerequisites();
    if (!hasPrerequisites) {
      console.log('\n❌ Prerequisites check failed. Fix data issues before proceeding.');
      process.exit(1);
    }

    // Step 2: Test cohort functions
    const cohortData = await testCohortFunctions();

    // Step 3: Check data integrity
    const integrityPassed = await checkDataIntegrity(cohortData);

    // Step 4: Calculate summary stats
    await calculateSummaryStats(cohortData);

    // Step 5: Generate recommendations
    await generateRecommendations(!integrityPassed, cohortData);

    printSection('VERIFICATION COMPLETE');
    console.log('');

    process.exit(integrityPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Fatal error during verification:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
