import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnoseCircleTimeseries() {
  console.log('\n🔍 DIAGNOSING CIRCLE TIMESERIES DATA\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Check response_evaluations with source='circle'
  console.log('1️⃣ Checking response_evaluations with source="circle"...\n');
  const { data: circleResponses, error: responsesError } = await supabase
    .from('response_evaluations')
    .select('id, source, created_at, metadata, user_id')
    .eq('source', 'circle')
    .order('created_at', { ascending: false })
    .limit(10);

  if (responsesError) {
    console.error('❌ Error:', responsesError);
  } else {
    console.log(`✅ Found ${circleResponses?.length || 0} Circle responses (showing first 10)`);
    if (circleResponses && circleResponses.length > 0) {
      console.log('\nSample response:');
      console.log(JSON.stringify(circleResponses[0], null, 2));
      console.log('\nMetadata keys:', Object.keys(circleResponses[0].metadata || {}));
    }
  }

  // 2. Check all source values
  console.log('\n\n2️⃣ Checking all source values in response_evaluations...\n');
  const { data: sourceCounts } = await supabase
    .from('response_evaluations')
    .select('source')
    .limit(1000);

  if (sourceCounts) {
    const counts: Record<string, number> = {};
    sourceCounts.forEach(r => {
      counts[r.source || 'null'] = (counts[r.source || 'null'] || 0) + 1;
    });
    console.log('Source distribution:');
    Object.entries(counts).forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`);
    });
  }

  // 3. Check for circle_app source
  console.log('\n\n3️⃣ Checking for "circle_app" source...\n');
  const { data: circleAppResponses } = await supabase
    .from('response_evaluations')
    .select('id, source, created_at')
    .eq('source', 'circle_app')
    .limit(5);

  console.log(`Found ${circleAppResponses?.length || 0} responses with source="circle_app"`);

  // 4. Check analytics_events for Circle events
  console.log('\n\n4️⃣ Checking analytics_events for Circle events...\n');
  const circleEventTypes = ['circle_signup_modal_shown', 'circle_signup_click', 'circle_signup_dismissed', 'circle_link_click'];
  const { data: circleEvents, error: eventsError } = await supabase
    .from('analytics_events')
    .select('event_type, event_timestamp, metadata')
    .in('event_type', circleEventTypes)
    .order('event_timestamp', { ascending: false })
    .limit(10);

  if (eventsError) {
    console.error('❌ Error:', eventsError);
  } else {
    console.log(`✅ Found ${circleEvents?.length || 0} Circle events (showing first 10)`);
    if (circleEvents && circleEvents.length > 0) {
      console.log('\nSample event:');
      console.log(JSON.stringify(circleEvents[0], null, 2));
    }
  }

  // 5. Test the function directly
  console.log('\n\n5️⃣ Testing get_circle_timeseries function...\n');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: timeseriesData, error: functionError } = await supabase.rpc('get_circle_timeseries', {
    start_date: thirtyDaysAgo.toISOString(),
    end_date: new Date().toISOString(),
    period_type: 'day'
  });

  if (functionError) {
    console.error('❌ Function error:', functionError);
  } else {
    console.log(`✅ Function returned ${timeseriesData?.length || 0} data points`);
    if (timeseriesData && timeseriesData.length > 0) {
      console.log('\nFirst data point:');
      console.log(JSON.stringify(timeseriesData[0], null, 2));
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

diagnoseCircleTimeseries().catch(console.error);

