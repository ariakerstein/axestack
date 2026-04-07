import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://felofmlhqwcdpiyjgstx.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function check() {
  // Check analytics_events columns
  const { data: sample } = await supabase.from('analytics_events').select('*').limit(1);
  console.log('=== analytics_events columns ===');
  if (sample?.[0]) console.log(Object.keys(sample[0]).join(', '));

  // Check for UTM data in metadata
  const { data: withMeta } = await supabase
    .from('analytics_events')
    .select('metadata, referrer, page_path')
    .eq('event_type', 'page_view')
    .limit(5);

  console.log('\n=== Sample metadata fields ===');
  withMeta?.forEach((e, i) => {
    console.log('Event', i+1, ':', JSON.stringify(e.metadata));
  });

  // Check if metadata contains search params (which might have UTM)
  const { data: withSearch } = await supabase
    .from('analytics_events')
    .select('metadata')
    .eq('event_type', 'page_view')
    .limit(20);

  let utmCount = 0;
  withSearch?.forEach(e => {
    const meta = e.metadata as Record<string, any>;
    if (meta?.search && meta.search.includes('utm_')) utmCount++;
  });
  console.log('\n=== Events with utm in metadata.search ===');
  console.log('Count:', utmCount, 'out of', withSearch?.length);

  // Check user_profiles for signup source
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, signup_source, created_at')
    .not('signup_source', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('\n=== Recent signup sources ===');
  profiles?.forEach(p => console.log(p.signup_source, '-', p.created_at?.split('T')[0]));

  // Check for Facebook-specific tracking
  console.log('\n=== Facebook pixel validation ===');
  console.log('Meta Pixel ID in code: 1598038624549144');
  console.log('Initialized on: /, /auth pages');
  console.log('Events tracked: PageView, Lead (on signup page), CompleteRegistration (after signup)');

  // Check for fbclid in referrers (Facebook click ID)
  const { data: fbEvents } = await supabase
    .from('analytics_events')
    .select('referrer, metadata')
    .eq('event_type', 'page_view')
    .or('referrer.ilike.%fbclid%,referrer.ilike.%facebook%')
    .limit(10);

  console.log('\n=== Facebook referrers found ===');
  console.log('Count:', fbEvents?.length || 0);
  fbEvents?.forEach(e => console.log(' -', e.referrer));
}

check();
