import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugDailyMismatch() {
  console.log('\n🔍 DEBUGGING DAILY MISMATCH\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check Nov 25, 2025 specifically
  const nov25Start = new Date('2025-11-25T00:00:00Z');
  const nov25End = new Date('2025-11-25T23:59:59Z');

  console.log('Checking Nov 25, 2025:\n');
  console.log(`Start: ${nov25Start.toISOString()}`);
  console.log(`End: ${nov25End.toISOString()}\n`);

  // Direct query
  const { data: directData, count: directCount } = await supabase
    .from('response_evaluations')
    .select('id, created_at, source', { count: 'exact' })
    .eq('source', 'circle')
    .gte('created_at', nov25Start.toISOString())
    .lt('created_at', nov25End.toISOString())
    .order('created_at', { ascending: true });

  console.log(`Direct query count: ${directCount || 0}`);
  if (directData && directData.length > 0) {
    console.log('\nDirect query results:');
    directData.forEach((r: any) => {
      console.log(`  ${r.created_at} - ${r.id.substring(0, 8)}`);
    });
  }

  // Check what DATE_TRUNC returns
  console.log('\n\nTesting DATE_TRUNC behavior:');
  const { data: truncTest } = await supabase
    .from('response_evaluations')
    .select('created_at')
    .eq('source', 'circle')
    .gte('created_at', nov25Start.toISOString())
    .lt('created_at', nov25End.toISOString())
    .limit(5);

  if (truncTest) {
    console.log('Sample created_at values:');
    truncTest.forEach((r: any) => {
      const date = new Date(r.created_at);
      console.log(`  ${r.created_at} -> DATE_TRUNC('day') would be: ${date.toISOString().split('T')[0]}`);
    });
  }

  // Check if there are responses on Nov 24 or Nov 26 that might be getting grouped
  console.log('\n\nChecking adjacent days:');
  
  const nov24Start = new Date('2025-11-24T00:00:00Z');
  const nov24End = new Date('2025-11-24T23:59:59Z');
  const { count: nov24Count } = await supabase
    .from('response_evaluations')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'circle')
    .gte('created_at', nov24Start.toISOString())
    .lt('created_at', nov24End.toISOString());

  const nov26Start = new Date('2025-11-26T00:00:00Z');
  const nov26End = new Date('2025-11-26T23:59:59Z');
  const { count: nov26Count } = await supabase
    .from('response_evaluations')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'circle')
    .gte('created_at', nov26Start.toISOString())
    .lt('created_at', nov26End.toISOString());

  console.log(`Nov 24: ${nov24Count || 0} queries`);
  console.log(`Nov 25: ${directCount || 0} queries`);
  console.log(`Nov 26: ${nov26Count || 0} queries`);

  // Test the function for Nov 25 specifically
  console.log('\n\nFunction output for Nov 25:');
  const { data: functionData } = await supabase.rpc('get_circle_timeseries', {
    start_date: nov25Start.toISOString(),
    end_date: nov26Start.toISOString(), // End at start of next day
    period_type: 'day'
  });

  if (functionData && functionData.length > 0) {
    functionData.forEach((d: any) => {
      console.log(`  ${d.period_label}: ${d.total_queries} queries`);
    });
  }

  // Check timezone issues
  console.log('\n\nTimezone check:');
  console.log('  Server timezone might affect DATE_TRUNC');
  console.log('  If server is in UTC, DATE_TRUNC("day", timestamp) groups by UTC day');
  console.log('  If timestamps are in different timezone, they might group differently\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

debugDailyMismatch().catch(console.error);

