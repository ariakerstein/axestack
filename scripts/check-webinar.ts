import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS
const supabase = createClient(
  'https://felofmlhqwcdpiyjgstx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDY3NDM4MCwiZXhwIjoyMDU2MjUwMzgwfQ.OC0ma2mN2Np_-AEL4siwLaUV0eGZ1tDXgbghMfB61pQ'
);

async function check() {
  // Check RLS policies via raw SQL
  const { data: rlsResult, error: rlsError } = await supabase.rpc('exec_sql', {
    sql: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
          FROM pg_policies WHERE tablename = 'guideline_chunks'`
  });

  console.log('=== RLS POLICIES ON guideline_chunks ===');
  if (rlsError) {
    console.log('Could not query policies directly, checking via alternate method...');

    // Try to understand the policy by testing
    // First with service role (no RLS)
    const { count: svcCount } = await supabase
      .from('guideline_chunks')
      .select('*', { count: 'exact', head: true });
    console.log('Total with service role:', svcCount);

    // Count by status
    const { data: statusCounts } = await supabase.rpc('count_by_status');
    console.log('Status counts:', statusCounts);
  } else {
    console.log(JSON.stringify(rlsResult, null, 2));
  }

  // Get total count
  const { count } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true });
  console.log('\nTotal chunks:', count);

  // Check for webinar content type
  const { count: webinarCount } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('content_type', 'webinar');
  console.log('Webinar chunks:', webinarCount);

  // Check for tier_3
  const { count: tier3Count } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('content_tier', 'tier_3');
  console.log('Tier 3 chunks:', tier3Count);

  // Search for bipolar in chunk_text using ilike
  const { data: bipolarData, count: bipolarCount } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, guideline_source, content_tier, content_type', { count: 'exact' })
    .ilike('chunk_text', '%bipolar%')
    .limit(5);
  console.log('\nChunks containing "bipolar":', bipolarCount);
  console.log(JSON.stringify(bipolarData, null, 2));

  // Check status values
  const { data: statusData } = await supabase
    .from('guideline_chunks')
    .select('status, content_tier')
    .eq('content_type', 'webinar')
    .limit(10);
  console.log('\nSample webinar rows (status, tier):');
  statusData?.forEach(r => console.log('  status=' + r.status + ', tier=' + r.content_tier));

  // Get all unique combos
  const { data: allRows } = await supabase
    .from('guideline_chunks')
    .select('guideline_source, content_tier, content_type, status');

  // Count combinations
  const combos: Record<string, number> = {};
  allRows?.forEach(r => {
    const key = r.content_tier + '/' + r.content_type + '/' + r.status + '/' + (r.guideline_source || 'null');
    combos[key] = (combos[key] || 0) + 1;
  });

  console.log('\nAll tier/type/status/source combinations:');
  Object.entries(combos)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log('  ' + k + ': ' + v));
}

check().catch(console.error);
