/**
 * Backfill Meta Traffic Data
 *
 * This script:
 * 1. Checks auth.users.raw_user_meta_data for UTM params that weren't copied to profiles
 * 2. Scans analytics_events for fbclid/facebook referrers
 * 3. Reports what can be backfilled
 * 4. Optionally applies the backfill
 *
 * Run with: npx ts-node scripts/backfill-meta-traffic.ts [--apply]
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://felofmlhqwcdpiyjgstx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const applyChanges = process.argv.includes('--apply');

interface BackfillCandidate {
  userId: string;
  email?: string;
  source: 'auth_metadata' | 'analytics_events' | 'referrer';
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  signup_source?: string;
  created_at?: string;
}

async function main() {
  console.log('='.repeat(60));
  console.log('META TRAFFIC BACKFILL ANALYSIS');
  console.log('='.repeat(60));
  console.log(`Mode: ${applyChanges ? '🔧 APPLY CHANGES' : '👀 DRY RUN (add --apply to make changes)'}\n`);

  const candidates: BackfillCandidate[] = [];

  // 1. Check auth.users for UTM data in raw_user_meta_data
  console.log('1. Checking auth.users.raw_user_meta_data for UTM params...');

  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('   Error fetching auth users:', authError.message);
  } else {
    let usersWithUtm = 0;

    for (const user of authUsers.users) {
      const meta = user.user_metadata || {};
      const hasUtm = meta.utm_source || meta.utm_medium || meta.utm_campaign || meta.fbclid;

      if (hasUtm) {
        usersWithUtm++;
        candidates.push({
          userId: user.id,
          email: user.email,
          source: 'auth_metadata',
          utm_source: meta.utm_source,
          utm_medium: meta.utm_medium,
          utm_campaign: meta.utm_campaign,
          utm_content: meta.utm_content,
          utm_term: meta.utm_term,
          fbclid: meta.fbclid,
          signup_source: meta.signup_source,
          created_at: user.created_at,
        });
      }
    }

    console.log(`   Found ${usersWithUtm} users with UTM data in auth metadata`);
  }

  // 2. Check user_profiles for missing UTM data
  console.log('\n2. Checking user_profiles with missing UTM data...');

  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, utm_source, utm_medium, utm_campaign, signup_source, created_at')
    .is('utm_source', null);

  if (profilesError) {
    console.error('   Error:', profilesError.message);
  } else {
    console.log(`   Found ${profiles?.length || 0} profiles with NULL utm_source`);
  }

  // 3. Check analytics_events for Meta traffic indicators
  console.log('\n3. Checking analytics_events for Meta traffic...');

  // Check metadata for fbclid
  const { data: eventsWithFbclid, error: fbclidError } = await supabase
    .from('analytics_events')
    .select('user_id, metadata, referrer, event_timestamp')
    .eq('event_type', 'session_start')
    .not('user_id', 'is', null)
    .order('event_timestamp', { ascending: false })
    .limit(1000);

  if (fbclidError) {
    console.error('   Error:', fbclidError.message);
  } else {
    let metaEvents = 0;
    const seenUsers = new Set<string>();

    eventsWithFbclid?.forEach(event => {
      const meta = event.metadata as Record<string, any> || {};
      const referrer = event.referrer || '';

      const isMeta =
        meta.fbclid ||
        meta.utm_source?.toLowerCase().includes('facebook') ||
        meta.utm_source?.toLowerCase().includes('instagram') ||
        meta.utm_source?.toLowerCase().includes('meta') ||
        referrer.includes('facebook.com') ||
        referrer.includes('fbclid');

      if (isMeta && event.user_id && !seenUsers.has(event.user_id)) {
        seenUsers.add(event.user_id);
        metaEvents++;

        // Check if this user is already in candidates
        const existing = candidates.find(c => c.userId === event.user_id);
        if (!existing) {
          candidates.push({
            userId: event.user_id,
            source: 'analytics_events',
            utm_source: meta.utm_source,
            utm_medium: meta.utm_medium,
            utm_campaign: meta.utm_campaign,
            utm_content: meta.utm_content,
            fbclid: meta.fbclid,
            created_at: event.event_timestamp,
          });
        }
      }
    });

    console.log(`   Found ${metaEvents} unique users with Meta traffic in analytics_events`);
  }

  // 4. Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  // Dedupe candidates
  const uniqueCandidates = new Map<string, BackfillCandidate>();
  candidates.forEach(c => {
    if (!uniqueCandidates.has(c.userId)) {
      uniqueCandidates.set(c.userId, c);
    }
  });

  console.log(`Total unique users with Meta traffic data: ${uniqueCandidates.size}`);

  // Check which need backfill (have UTM data in auth but not in profile)
  const needsBackfill: BackfillCandidate[] = [];

  for (const [userId, candidate] of uniqueCandidates) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('utm_source, signup_source')
      .eq('id', userId)
      .single();

    if (profile && !profile.utm_source && (candidate.utm_source || candidate.fbclid)) {
      needsBackfill.push(candidate);
    }
  }

  console.log(`Users needing backfill: ${needsBackfill.length}`);

  if (needsBackfill.length > 0) {
    console.log('\nUsers to backfill:');
    needsBackfill.slice(0, 10).forEach(c => {
      console.log(`  - ${c.email || c.userId.slice(0, 8)}: utm_source=${c.utm_source || 'N/A'}, campaign=${c.utm_campaign || 'N/A'}`);
    });
    if (needsBackfill.length > 10) {
      console.log(`  ... and ${needsBackfill.length - 10} more`);
    }
  }

  // 5. Apply backfill if requested
  if (applyChanges && needsBackfill.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('APPLYING BACKFILL');
    console.log('='.repeat(60));

    let success = 0;
    let failed = 0;

    for (const candidate of needsBackfill) {
      const updateData: Record<string, string> = {};

      if (candidate.utm_source) updateData.utm_source = candidate.utm_source;
      if (candidate.utm_medium) updateData.utm_medium = candidate.utm_medium;
      if (candidate.utm_campaign) updateData.utm_campaign = candidate.utm_campaign;
      if (candidate.utm_content) updateData.utm_content = candidate.utm_content;
      if (candidate.utm_term) updateData.utm_term = candidate.utm_term;

      // Determine signup_source if not set
      if (!candidate.signup_source && candidate.utm_source) {
        const source = candidate.utm_source.toLowerCase();
        if (source.includes('facebook')) {
          updateData.signup_source = 'social_facebook';
        } else if (source.includes('instagram')) {
          updateData.signup_source = 'social_instagram';
        } else if (source.includes('meta')) {
          updateData.signup_source = 'social_meta';
        }
      } else if (candidate.signup_source) {
        updateData.signup_source = candidate.signup_source;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', candidate.userId);

        if (error) {
          console.error(`   Failed to update ${candidate.userId}: ${error.message}`);
          failed++;
        } else {
          success++;
        }
      }
    }

    console.log(`\nBackfill complete: ${success} updated, ${failed} failed`);
  } else if (!applyChanges && needsBackfill.length > 0) {
    console.log('\n⚠️  Run with --apply to backfill these users');
  }

  // 6. Show current Meta traffic stats
  console.log('\n' + '='.repeat(60));
  console.log('CURRENT META TRAFFIC IN DATABASE');
  console.log('='.repeat(60));

  const { data: metaProfiles } = await supabase
    .from('user_profiles')
    .select('id, utm_source, utm_campaign, signup_source, created_at')
    .or('utm_source.ilike.%facebook%,utm_source.ilike.%instagram%,utm_source.ilike.%meta%,signup_source.ilike.%facebook%');

  console.log(`Profiles with Meta attribution: ${metaProfiles?.length || 0}`);

  if (metaProfiles && metaProfiles.length > 0) {
    // Group by campaign
    const campaigns = new Map<string, number>();
    metaProfiles.forEach(p => {
      const campaign = p.utm_campaign || '(no campaign)';
      campaigns.set(campaign, (campaigns.get(campaign) || 0) + 1);
    });

    console.log('\nBy campaign:');
    Array.from(campaigns.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([campaign, count]) => {
        console.log(`  ${campaign}: ${count}`);
      });
  }
}

main().catch(console.error);
