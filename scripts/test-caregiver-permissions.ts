#!/usr/bin/env ts-node
/**
 * Test script to verify caregiver permissions and RLS policies
 *
 * This will check:
 * 1. If RLS is enabled on caregiver_managed_patients
 * 2. What data a user can see
 * 3. If the RLS policies are working correctly
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ";

async function testPermissions() {
  console.log('🔍 Testing Caregiver Permissions\n');

  // Create client WITHOUT auth (anonymous)
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('Test 1: Anonymous user trying to fetch ALL patients (should return empty or error)');
  const { data: anonData, error: anonError } = await anonClient
    .from('caregiver_managed_patients')
    .select('*');

  if (anonError) {
    console.log('✅ ERROR (expected):', anonError.message);
  } else {
    console.log(`❌ SECURITY ISSUE: Anonymous user can see ${anonData?.length || 0} patients!`);
    console.log('Patient IDs visible:', anonData?.map(p => p.id));
  }

  console.log('\n---\n');

  // Now test with a real user session
  // We'll need to provide credentials - this is just a framework
  console.log('Test 2: Testing with authenticated user');
  console.log('Note: This test requires valid user credentials');
  console.log('The issue is likely that the query in CaregiverDashboard.tsx');
  console.log('is not filtered, but RLS should still protect it.\n');

  // Check RLS status
  console.log('Test 3: Checking if RLS is enabled');
  const { data: rlsData, error: rlsError } = await anonClient.rpc('check_rls_enabled', {
    table_name: 'caregiver_managed_patients'
  });

  if (rlsError) {
    console.log('Note: Cannot check RLS status directly (function may not exist)');
  }
}

testPermissions().catch(console.error);
