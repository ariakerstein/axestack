/**
 * Circle Identity & Auto-Signup Flow Tests
 *
 * Run with: npx tsx scripts/test-circle-flow.ts
 *
 * Tests:
 * 1. circle_sessions table functions work
 * 2. Account creation flow logic
 * 3. Circle identity storage/retrieval
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://felofmlhqwcdpiyjgstx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
const TEST_CIRCLE_MEMBER_ID = 'test_circle_member_' + Date.now();
const TEST_DEVICE_ID = 'test_device_' + Date.now();
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_COMMUNITY_ID = '68918';

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');

  // Delete test circle_sessions
  await supabase
    .from('circle_sessions')
    .delete()
    .or(`circle_member_id.eq.${TEST_CIRCLE_MEMBER_ID},local_device_id.eq.${TEST_DEVICE_ID}`);

  // Delete test auth user if created
  const { data: users } = await supabase.auth.admin.listUsers();
  const testUser = users?.users?.find(u => u.email === TEST_EMAIL);
  if (testUser) {
    await supabase.auth.admin.deleteUser(testUser.id);
    console.log('  Deleted test user:', TEST_EMAIL);
  }

  console.log('  ✅ Cleanup complete');
}

async function testUpsertCircleSession() {
  console.log('\n📊 Test 1: upsert_circle_session function');

  // Test creating a new session with Circle member ID
  const { data: sessionId, error } = await supabase.rpc('upsert_circle_session', {
    p_circle_member_id: TEST_CIRCLE_MEMBER_ID,
    p_local_device_id: TEST_DEVICE_ID,
    p_email: null,
    p_circle_community_id: TEST_COMMUNITY_ID,
    p_circle_name: 'Test User'
  });

  if (error) {
    console.error('  ❌ Failed to create session:', error.message);
    return false;
  }

  console.log('  ✅ Created session:', sessionId);

  // Verify the session was created
  const { data: session } = await supabase
    .from('circle_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) {
    console.error('  ❌ Session not found after creation');
    return false;
  }

  if (session.circle_member_id !== TEST_CIRCLE_MEMBER_ID) {
    console.error('  ❌ circle_member_id mismatch');
    return false;
  }

  if (session.session_count !== 1) {
    console.error('  ❌ session_count should be 1, got:', session.session_count);
    return false;
  }

  console.log('  ✅ Session created correctly with session_count=1');

  // Test upserting same session (should increment session_count)
  const { data: sessionId2 } = await supabase.rpc('upsert_circle_session', {
    p_circle_member_id: TEST_CIRCLE_MEMBER_ID,
    p_local_device_id: TEST_DEVICE_ID,
    p_email: TEST_EMAIL, // Add email this time
    p_circle_community_id: TEST_COMMUNITY_ID,
    p_circle_name: 'Test User'
  });

  if (sessionId2 !== sessionId) {
    console.error('  ❌ Upsert created new session instead of updating existing');
    return false;
  }

  const { data: session2 } = await supabase
    .from('circle_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (session2.session_count !== 2) {
    console.error('  ❌ session_count should be 2 after upsert, got:', session2.session_count);
    return false;
  }

  if (session2.email !== TEST_EMAIL) {
    console.error('  ❌ email should be updated to:', TEST_EMAIL);
    return false;
  }

  console.log('  ✅ Upsert incremented session_count to 2 and updated email');

  return sessionId;
}

async function testIncrementQuestionCount(sessionId: string) {
  console.log('\n📊 Test 2: increment_circle_question_count function');

  // Get initial count
  const { data: before } = await supabase
    .from('circle_sessions')
    .select('question_count')
    .eq('id', sessionId)
    .single();

  const initialCount = before?.question_count || 0;
  console.log('  Initial question_count:', initialCount);

  // Increment
  const { error } = await supabase.rpc('increment_circle_question_count', {
    p_session_id: sessionId
  });

  if (error) {
    console.error('  ❌ Failed to increment:', error.message);
    return false;
  }

  // Verify
  const { data: after } = await supabase
    .from('circle_sessions')
    .select('question_count')
    .eq('id', sessionId)
    .single();

  if (after?.question_count !== initialCount + 1) {
    console.error('  ❌ question_count should be', initialCount + 1, 'got:', after?.question_count);
    return false;
  }

  console.log('  ✅ question_count incremented to:', after.question_count);

  // Increment again
  await supabase.rpc('increment_circle_question_count', { p_session_id: sessionId });
  await supabase.rpc('increment_circle_question_count', { p_session_id: sessionId });

  const { data: final } = await supabase
    .from('circle_sessions')
    .select('question_count')
    .eq('id', sessionId)
    .single();

  console.log('  ✅ After 3 increments, question_count:', final?.question_count);

  return true;
}

async function testConvertToNavis(sessionId: string) {
  console.log('\n📊 Test 3: convert_circle_session_to_navis function');

  // Create a test user
  const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: 'test_password_123',
    email_confirm: true,
    user_metadata: {
      full_name: 'Test User',
      from_circle: true,
      circle_member_id: TEST_CIRCLE_MEMBER_ID
    }
  });

  if (signUpError || !signUpData.user) {
    console.error('  ❌ Failed to create test user:', signUpError?.message);
    return false;
  }

  console.log('  Created test user:', signUpData.user.id);

  // Convert the session
  const { error: convertError } = await supabase.rpc('convert_circle_session_to_navis', {
    p_session_id: sessionId,
    p_navis_user_id: signUpData.user.id,
    p_trigger: 'save_progress'
  });

  if (convertError) {
    console.error('  ❌ Failed to convert session:', convertError.message);
    return false;
  }

  // Verify
  const { data: session } = await supabase
    .from('circle_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session.navis_user_id) {
    console.error('  ❌ navis_user_id not set');
    return false;
  }

  if (session.navis_user_id !== signUpData.user.id) {
    console.error('  ❌ navis_user_id mismatch');
    return false;
  }

  if (!session.converted_to_navis_at) {
    console.error('  ❌ converted_to_navis_at not set');
    return false;
  }

  if (session.conversion_trigger !== 'save_progress') {
    console.error('  ❌ conversion_trigger should be save_progress, got:', session.conversion_trigger);
    return false;
  }

  console.log('  ✅ Session converted successfully');
  console.log('    navis_user_id:', session.navis_user_id);
  console.log('    converted_to_navis_at:', session.converted_to_navis_at);
  console.log('    conversion_trigger:', session.conversion_trigger);

  return true;
}

async function testAnonymousDeviceFlow() {
  console.log('\n📊 Test 4: Anonymous device-only flow');

  const ANON_DEVICE_ID = 'anon_device_' + Date.now();

  // Create session with only device ID (no circle_member_id)
  const { data: sessionId, error } = await supabase.rpc('upsert_circle_session', {
    p_circle_member_id: null,
    p_local_device_id: ANON_DEVICE_ID,
    p_email: null,
    p_circle_community_id: TEST_COMMUNITY_ID,
    p_circle_name: null
  });

  if (error) {
    console.error('  ❌ Failed to create anonymous session:', error.message);
    return false;
  }

  console.log('  ✅ Created anonymous session:', sessionId);

  // Verify
  const { data: session } = await supabase
    .from('circle_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (session.circle_member_id !== null) {
    console.error('  ❌ circle_member_id should be null for anonymous');
    return false;
  }

  if (session.local_device_id !== ANON_DEVICE_ID) {
    console.error('  ❌ local_device_id mismatch');
    return false;
  }

  console.log('  ✅ Anonymous session created correctly');

  // Cleanup
  await supabase.from('circle_sessions').delete().eq('id', sessionId);

  return true;
}

async function testRetentionMetrics() {
  console.log('\n📊 Test 5: Retention analytics query');

  // Query circle_sessions for retention metrics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: sessions, error } = await supabase
    .from('circle_sessions')
    .select('*')
    .gte('first_seen_at', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('  ❌ Failed to query sessions:', error.message);
    return false;
  }

  const stats = {
    totalSessions: sessions?.length || 0,
    identifiedUsers: sessions?.filter(s => s.circle_member_id && !s.circle_member_id.startsWith('device_')).length || 0,
    anonymousUsers: sessions?.filter(s => !s.circle_member_id || s.circle_member_id.startsWith('device_')).length || 0,
    returningUsers: sessions?.filter(s => s.session_count > 1).length || 0,
    convertedUsers: sessions?.filter(s => s.navis_user_id).length || 0,
    totalQuestions: sessions?.reduce((sum, s) => sum + (s.question_count || 0), 0) || 0
  };

  console.log('  ✅ Retention metrics (last 30 days):');
  console.log('    Total sessions:', stats.totalSessions);
  console.log('    Identified users:', stats.identifiedUsers);
  console.log('    Anonymous users:', stats.anonymousUsers);
  console.log('    Returning users:', stats.returningUsers);
  console.log('    Converted to Navis:', stats.convertedUsers);
  console.log('    Total questions asked:', stats.totalQuestions);

  return true;
}

async function main() {
  console.log('🧪 Circle Identity & Auto-Signup Flow Tests\n');
  console.log('='.repeat(50));

  let sessionId: string | false;
  let allPassed = true;

  try {
    // Run tests
    sessionId = await testUpsertCircleSession();
    if (!sessionId) allPassed = false;

    if (sessionId) {
      const test2 = await testIncrementQuestionCount(sessionId);
      if (!test2) allPassed = false;

      const test3 = await testConvertToNavis(sessionId);
      if (!test3) allPassed = false;
    }

    const test4 = await testAnonymousDeviceFlow();
    if (!test4) allPassed = false;

    const test5 = await testRetentionMetrics();
    if (!test5) allPassed = false;

  } finally {
    await cleanup();
  }

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

main().catch(console.error);
