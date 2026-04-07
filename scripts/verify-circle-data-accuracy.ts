import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyDataAccuracy() {
  console.log('\n🔍 VERIFYING CIRCLE TIMESERIES DATA ACCURACY\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Get direct count from response_evaluations
  console.log('1️⃣ Direct query: response_evaluations with source="circle"\n');
  const { data: directResponses, count: directCount } = await supabase
    .from('response_evaluations')
    .select('id, created_at, source, raw_metrics, user_id', { count: 'exact' })
    .eq('source', 'circle')
    .gte('created_at', thirtyDaysAgo.toISOString());

  console.log(`   Total Circle responses (last 30 days): ${directCount || 0}`);

  // 2. Get function output
  console.log('\n2️⃣ Function output: get_circle_timeseries\n');
  const { data: functionData, error } = await supabase.rpc('get_circle_timeseries', {
    start_date: thirtyDaysAgo.toISOString(),
    end_date: new Date().toISOString(),
    period_type: 'day'
  });

  if (error) {
    console.error('❌ Function error:', error);
    return;
  }

  const functionTotalQueries = functionData?.reduce((sum: number, d: any) => sum + (d.total_queries || 0), 0) || 0;
  console.log(`   Total queries from function: ${functionTotalQueries}`);

  // 3. Compare
  console.log('\n3️⃣ Comparison:\n');
  console.log(`   Direct query count: ${directCount || 0}`);
  console.log(`   Function total:    ${functionTotalQueries}`);
  console.log(`   Difference:        ${(directCount || 0) - functionTotalQueries}`);
  
  if (Math.abs((directCount || 0) - functionTotalQueries) > 0) {
    console.log('   ⚠️  MISMATCH DETECTED!\n');
  } else {
    console.log('   ✅ Counts match!\n');
  }

  // 4. Check session counting
  console.log('4️⃣ Session counting verification:\n');
  
  // Get sample responses to see how sessions are being calculated
  const sampleResponses = directResponses?.slice(0, 10) || [];
  console.log('   Sample responses (first 10):');
  sampleResponses.forEach((r: any, i: number) => {
    const circleMemberId = r.raw_metrics?.circleMetadata?.circleMemberId;
    const hasMemberId = !!circleMemberId;
    console.log(`   ${i + 1}. ${new Date(r.created_at).toISOString().split('T')[0]} - MemberID: ${hasMemberId ? circleMemberId : 'N/A (will use time window)'}`);
  });

  // Count unique circleMemberIds
  const uniqueMemberIds = new Set<string>();
  const timeWindowSessions = new Set<string>();
  
  directResponses?.forEach((r: any) => {
    const memberId = r.raw_metrics?.circleMetadata?.circleMemberId;
    if (memberId) {
      uniqueMemberIds.add(memberId);
    } else {
      // Simulate time window logic
      const date = new Date(r.created_at);
      const window = `${date.toISOString().split('T')[0]} ${String(Math.floor(date.getMinutes() / 30) * 30).padStart(2, '0')}`;
      timeWindowSessions.add(window);
    }
  });

  console.log(`\n   Unique circleMemberIds: ${uniqueMemberIds.size}`);
  console.log(`   Time window sessions: ${timeWindowSessions.size}`);
  console.log(`   Estimated total sessions: ${uniqueMemberIds.size + timeWindowSessions.size}`);

  const functionTotalSessions = functionData?.reduce((sum: number, d: any) => sum + (d.unique_sessions || 0), 0) || 0;
  console.log(`   Function total sessions: ${functionTotalSessions}`);
  console.log(`   ⚠️  Note: Function counts sessions per period, not total unique sessions\n`);

  // 5. Check engagement events
  console.log('5️⃣ Engagement events verification:\n');
  
  const circleEventTypes = ['circle_signup_modal_shown', 'circle_signup_click', 'circle_signup_dismissed', 'circle_link_click'];
  const { data: directEvents, count: eventsCount } = await supabase
    .from('analytics_events')
    .select('event_type, event_timestamp', { count: 'exact' })
    .in('event_type', circleEventTypes)
    .gte('event_timestamp', thirtyDaysAgo.toISOString());

  const eventsByType: Record<string, number> = {};
  directEvents?.forEach((e: any) => {
    eventsByType[e.event_type] = (eventsByType[e.event_type] || 0) + 1;
  });

  console.log('   Direct query counts:');
  Object.entries(eventsByType).forEach(([type, count]) => {
    console.log(`     ${type}: ${count}`);
  });

  const functionModalShown = functionData?.reduce((sum: number, d: any) => sum + (d.modal_shown || 0), 0) || 0;
  const functionSignupClicks = functionData?.reduce((sum: number, d: any) => sum + (d.signup_clicks || 0), 0) || 0;
  const functionDismissals = functionData?.reduce((sum: number, d: any) => sum + (d.dismissals || 0), 0) || 0;
  const functionLinkClicks = functionData?.reduce((sum: number, d: any) => sum + (d.link_clicks || 0), 0) || 0;

  console.log('\n   Function totals:');
  console.log(`     Modal Shown: ${functionModalShown} (direct: ${eventsByType['circle_signup_modal_shown'] || 0})`);
  console.log(`     Signup Clicks: ${functionSignupClicks} (direct: ${eventsByType['circle_signup_click'] || 0})`);
  console.log(`     Dismissals: ${functionDismissals} (direct: ${eventsByType['circle_signup_dismissed'] || 0})`);
  console.log(`     Link Clicks: ${functionLinkClicks} (direct: ${eventsByType['circle_link_click'] || 0})`);

  // 6. Check a specific day
  console.log('\n6️⃣ Detailed check for a specific day:\n');
  if (functionData && functionData.length > 0) {
    const sampleDay = functionData[functionData.length - 1]; // Most recent day
    const dayStart = new Date(sampleDay.period_start);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    console.log(`   Checking: ${sampleDay.period_label}`);
    
    const { count: dayQueryCount } = await supabase
      .from('response_evaluations')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'circle')
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString());

    console.log(`   Function says: ${sampleDay.total_queries} queries`);
    console.log(`   Direct query:   ${dayQueryCount || 0} queries`);
    
    if (sampleDay.total_queries !== (dayQueryCount || 0)) {
      console.log('   ⚠️  MISMATCH on this day!');
    } else {
      console.log('   ✅ Matches!');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Summary:\n');
  console.log('   The function aggregates data by time periods.');
  console.log('   Session counting uses circleMemberId when available,');
  console.log('   otherwise estimates using 30-minute time windows.\n');
}

verifyDataAccuracy().catch(console.error);

