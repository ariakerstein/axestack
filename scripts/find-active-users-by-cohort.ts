#!/usr/bin/env tsx
/**
 * Find active users and verify they're showing up in their correct cohorts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findActiveUsers() {
  console.log('\n🔍 FINDING ACTIVE USERS BY COHORT\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. Find your user
    console.log('1. Finding your user account...\n');
    const { data: yourUser, error: yourError } = await supabase
      .from('user_profiles')
      .select('id, email, created_at')
      .ilike('email', '%ariakerstein%')
      .limit(1)
      .single();

    if (yourError || !yourUser) {
      console.log('⚠️  Could not find your user account');
    } else {
      const signupDate = new Date(yourUser.created_at);
      const cohortWeek = new Date(signupDate);
      cohortWeek.setDate(signupDate.getDate() - signupDate.getDay() + 1); // Monday of that week
      
      console.log(`✅ Found your account:`);
      console.log(`   Email: ${yourUser.email}`);
      console.log(`   Signup: ${signupDate.toLocaleDateString()}`);
      console.log(`   Cohort Week: ${cohortWeek.toLocaleDateString()}\n`);

      // Check your activity
      const { data: yourEvents, error: eventsError } = await supabase
        .from('analytics_events')
        .select('event_timestamp, event_type')
        .eq('user_id', yourUser.id)
        .order('event_timestamp', { ascending: false })
        .limit(10);

      if (!eventsError && yourEvents) {
        console.log(`   Recent events: ${yourEvents.length} (showing last 10)`);
        yourEvents.forEach((e, i) => {
          const daysAgo = Math.floor((Date.now() - new Date(e.event_timestamp).getTime()) / (1000 * 60 * 60 * 24));
          console.log(`   ${i + 1}. ${new Date(e.event_timestamp).toLocaleDateString()} (${daysAgo} days ago) - ${e.event_type}`);
        });
        console.log('');
      }
    }

    // 2. Find most active users
    console.log('2. Finding most active users (who should show high retention)...\n');
    const { data: activeUsers, error: activeError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT 
            up.email,
            up.created_at as signup_date,
            DATE_TRUNC('week', up.created_at)::text as cohort_week,
            COUNT(*) as total_events,
            COUNT(DISTINCT DATE(ae.event_timestamp)) as active_days,
            MIN(ae.event_timestamp) as first_event,
            MAX(ae.event_timestamp) as last_event,
            EXTRACT(EPOCH FROM (MAX(ae.event_timestamp) - up.created_at)) / 86400 as days_since_signup,
            -- Check Period 1 activity
            COUNT(CASE 
              WHEN ae.event_timestamp >= up.created_at + INTERVAL '7 days'
               AND ae.event_timestamp < up.created_at + INTERVAL '14 days'
              THEN 1
            END) as events_period_1,
            -- Check Period 2 activity
            COUNT(CASE 
              WHEN ae.event_timestamp >= up.created_at + INTERVAL '14 days'
               AND ae.event_timestamp < up.created_at + INTERVAL '21 days'
              THEN 1
            END) as events_period_2
          FROM user_profiles up
          JOIN analytics_events ae ON 
            ae.user_id = up.id
            AND ae.event_timestamp > up.created_at
            AND ae.user_id IS NOT NULL
          GROUP BY up.id, up.email, up.created_at
          ORDER BY total_events DESC
          LIMIT 10;
        `
      });

    if (activeError) {
      // Fallback: use direct query
      console.log('⚠️  RPC not available, using direct query...\n');
      
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (usersError) throw usersError;

      const userActivity: any[] = [];
      for (const user of users || []) {
        const { data: events, error: eventsErr } = await supabase
          .from('analytics_events')
          .select('event_timestamp')
          .eq('user_id', user.id)
          .not('user_id', 'is', null)
          .order('event_timestamp', { ascending: false });

        if (!eventsErr && events && events.length > 0) {
          const signupDate = new Date(user.created_at);
          const eventsPeriod1 = events.filter(e => {
            const eventDate = new Date(e.event_timestamp);
            const daysDiff = (eventDate.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff >= 7 && daysDiff < 14;
          }).length;

          const eventsPeriod2 = events.filter(e => {
            const eventDate = new Date(e.event_timestamp);
            const daysDiff = (eventDate.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff >= 14 && daysDiff < 21;
          }).length;

          userActivity.push({
            email: user.email,
            signup_date: user.created_at,
            cohort_week: new Date(signupDate.setDate(signupDate.getDate() - signupDate.getDay() + 1)).toISOString().split('T')[0],
            total_events: events.length,
            events_period_1: eventsPeriod1,
            events_period_2: eventsPeriod2,
            last_event: events[0].event_timestamp
          });
        }
      }

      userActivity.sort((a, b) => b.total_events - a.total_events);

      console.log('Top 10 most active users:');
      console.log('-'.repeat(100));
      userActivity.slice(0, 10).forEach((u, i) => {
        console.log(`${i + 1}. ${u.email || 'No email'}`);
        console.log(`   Signup: ${new Date(u.signup_date).toLocaleDateString()}`);
        console.log(`   Cohort: ${u.cohort_week}`);
        console.log(`   Total events: ${u.total_events}`);
        console.log(`   Period 1 events: ${u.events_period_1} ${u.events_period_1 > 0 ? '✅' : '❌'}`);
        console.log(`   Period 2 events: ${u.events_period_2} ${u.events_period_2 > 0 ? '✅' : '❌'}`);
        console.log(`   Last event: ${new Date(u.last_event).toLocaleDateString()}`);
        console.log('');
      });
    } else {
      console.log('Top 10 most active users:');
      console.log('-'.repeat(100));
      (activeUsers || []).forEach((u: any, i: number) => {
        console.log(`${i + 1}. ${u.email || 'No email'}`);
        console.log(`   Signup: ${new Date(u.signup_date).toLocaleDateString()}`);
        console.log(`   Cohort: ${u.cohort_week}`);
        console.log(`   Total events: ${u.total_events}`);
        console.log(`   Period 1 events: ${u.events_period_1} ${u.events_period_1 > 0 ? '✅' : '❌'}`);
        console.log(`   Period 2 events: ${u.events_period_2} ${u.events_period_2 > 0 ? '✅' : '❌'}`);
        console.log(`   Days since signup: ${Math.round(u.days_since_signup)}`);
        console.log('');
      });
    }

    // 3. Check what the function returns for these users' cohorts
    console.log('3. Checking cohort function output for these users...\n');
    const { data: cohortData, error: cohortError } = await supabase
      .rpc('get_cohort_analysis_data', { period_type: 'week' });

    if (cohortError) {
      console.log('❌ Error calling cohort function:', cohortError.message);
    } else if (cohortData) {
      console.log(`✅ Function returned ${cohortData.length} cohorts\n`);
      console.log('Cohorts with non-zero retention:');
      const cohortsWithRetention = cohortData.filter((c: any) => 
        c.period_1 > 0 || c.period_2 > 0 || c.period_3 > 0 || c.period_4 > 0
      );
      
      cohortsWithRetention.forEach((c: any) => {
        const p1Pct = c.cohort_size > 0 ? ((c.period_1 / c.cohort_size) * 100).toFixed(1) : '0.0';
        const p2Pct = c.cohort_size > 0 ? ((c.period_2 / c.cohort_size) * 100).toFixed(1) : '0.0';
        console.log(`  ${c.cohort_period}: Size=${c.cohort_size}, P1=${c.period_1} (${p1Pct}%), P2=${c.period_2} (${p2Pct}%)`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ ANALYSIS COMPLETE\n');
    console.log('If users have Period 1/2 events but their cohort shows 0%,');
    console.log('there may be a calculation issue. Otherwise, the function is working correctly.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findActiveUsers().catch(console.error);




