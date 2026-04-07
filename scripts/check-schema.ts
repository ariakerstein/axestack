import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://felofmlhqwcdpiyjgstx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDY3NDM4MCwiZXhwIjoyMDU2MjUwMzgwfQ.OC0ma2mN2Np_-AEL4siwLaUV0eGZ1tDXgbghMfB61pQ'
);

async function main() {
  // Check total count
  const { count } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true });

  console.log('Total guideline_chunks:', count);

  // Get a sample row to see structure
  const { data: sample } = await supabase
    .from('guideline_chunks')
    .select('*')
    .limit(1);

  if (sample && sample.length > 0) {
    console.log('\nSample row columns:', Object.keys(sample[0]));
    console.log('\nSample row:', JSON.stringify(sample[0], null, 2));
  }

  // Check tier_1 count
  const { count: tier1Count } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('tier', 1);

  console.log('\nTier 1 (NCCN) chunks:', tier1Count);
}

main().catch(console.error);
