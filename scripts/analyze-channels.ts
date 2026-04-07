import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://felofmlhqwcdpiyjgstx.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyze() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all page views with referrers
  const { data: events } = await supabase
    .from('analytics_events')
    .select('referrer, user_id, session_id')
    .eq('event_type', 'page_view')
    .gte('event_timestamp', thirtyDaysAgo.toISOString());

  console.log('=== REFERRER BREAKDOWN (30 days, excluding localhost) ===');
  const referrerCounts: Record<string, number> = {};
  events?.forEach(e => {
    let ref = e.referrer || 'direct';
    // Extract domain from referrer
    try {
      if (ref && ref !== 'direct') {
        const url = new URL(ref);
        ref = url.hostname;
      }
    } catch {}
    // Skip localhost
    if (ref.includes('localhost') || ref.includes('127.0.0.1')) return;
    referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
  });

  // Sort by count
  const sorted = Object.entries(referrerCounts).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([ref, count]) => console.log(' ', ref, ':', count));

  // Categorize into channels
  console.log('\n=== CHANNEL CATEGORIZATION ===');
  const channels: Record<string, number> = {
    direct: 0,
    circle: 0,
    facebook: 0,
    organic: 0,
    other: 0
  };

  events?.forEach(e => {
    const ref = (e.referrer || '').toLowerCase();
    if (ref.includes('localhost') || ref.includes('127.0.0.1')) return;

    if (!e.referrer || e.referrer === '') {
      channels.direct++;
    } else if (ref.includes('circle.so') || ref.includes('community')) {
      channels.circle++;
    } else if (ref.includes('facebook') || ref.includes('fb.com') || ref.includes('fbclid')) {
      channels.facebook++;
    } else if (ref.includes('google') || ref.includes('bing') || ref.includes('duckduckgo')) {
      channels.organic++;
    } else {
      channels.other++;
    }
  });

  Object.entries(channels).forEach(([ch, count]) => {
    if (count > 0) console.log(' ', ch, ':', count);
  });

  // Check signup_source categories in user_profiles
  console.log('\n=== ALL SIGNUP SOURCES (all time, excluding localhost) ===');
  const { data: allProfiles } = await supabase
    .from('user_profiles')
    .select('signup_source')
    .not('signup_source', 'is', null);

  const allSources: Record<string, number> = {};
  allProfiles?.forEach(p => {
    if (p.signup_source.includes('localhost')) return;
    allSources[p.signup_source] = (allSources[p.signup_source] || 0) + 1;
  });
  const sortedSources = Object.entries(allSources).sort((a, b) => b[1] - a[1]);
  sortedSources.forEach(([src, count]) => console.log(' ', src, ':', count));
}

analyze();
