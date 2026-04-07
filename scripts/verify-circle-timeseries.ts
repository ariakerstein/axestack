import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyCircleTimeseries() {
  console.log('\n✅ VERIFYING CIRCLE TIMESERIES FUNCTION\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test the function with different parameters
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  console.log('📊 Testing function with 30-day daily data...\n');
  
  const { data: dailyData, error: dailyError } = await supabase.rpc('get_circle_timeseries', {
    start_date: thirtyDaysAgo.toISOString(),
    end_date: new Date().toISOString(),
    period_type: 'day'
  });

  if (dailyError) {
    console.error('❌ Error:', dailyError);
    return;
  }

  console.log(`✅ Function works! Returned ${dailyData?.length || 0} data points\n`);

  if (dailyData && dailyData.length > 0) {
    console.log('📈 Sample data points (first 5):\n');
    dailyData.slice(0, 5).forEach((point: any, i: number) => {
      console.log(`${i + 1}. ${point.period_label}:`);
      console.log(`   Queries: ${point.total_queries}`);
      console.log(`   Sessions: ${point.unique_sessions}`);
      console.log(`   Q/Session: ${point.queries_per_session}`);
      console.log(`   Modal Shown: ${point.modal_shown}`);
      console.log(`   Signup Clicks: ${point.signup_clicks}`);
      console.log(`   Conversion Rate: ${point.conversion_rate}%`);
      console.log('');
    });

    // Calculate totals
    const totals = dailyData.reduce((acc: any, point: any) => ({
      queries: acc.queries + (point.total_queries || 0),
      sessions: acc.sessions + (point.unique_sessions || 0),
      modals: acc.modals + (point.modal_shown || 0),
      clicks: acc.clicks + (point.signup_clicks || 0),
    }), { queries: 0, sessions: 0, modals: 0, clicks: 0 });

    console.log('📊 Totals for last 30 days:');
    console.log(`   Total Queries: ${totals.queries}`);
    console.log(`   Total Sessions: ${totals.sessions}`);
    console.log(`   Total Modals Shown: ${totals.modals}`);
    console.log(`   Total Signup Clicks: ${totals.clicks}`);
    console.log(`   Overall Conversion Rate: ${totals.modals > 0 ? ((totals.clicks / totals.modals) * 100).toFixed(1) : 0}%`);
  } else {
    console.log('⚠️  Function works but returned no data');
    console.log('   This could mean:');
    console.log('   - No Circle responses in the last 30 days');
    console.log('   - Data exists but outside the time range');
    console.log('   - Check if source="circle" in response_evaluations\n');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✨ Next step: Refresh the admin dashboard at /admin');
  console.log('   The CircleTimeseriesAnalytics component should now show data!\n');
}

verifyCircleTimeseries().catch(console.error);

