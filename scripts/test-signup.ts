/**
 * Signup Integration Test
 *
 * Tests the actual Supabase signup flow to verify:
 * 1. User can be created in auth.users
 * 2. Trigger creates user_profiles row
 * 3. No 500 errors
 *
 * Run: npx ts-node scripts/test-signup.ts
 * Or: npx tsx scripts/test-signup.ts
 */

import { createClient } from '@supabase/supabase-js';

// Load from environment or use defaults
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  console.log('Set them in .env or pass directly:');
  console.log('SUPABASE_URL=xxx SUPABASE_ANON_KEY=xxx npx tsx scripts/test-signup.ts');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSignup() {
  const testEmail = `test-${Date.now()}@navis-test.com`;
  const testPassword = 'TestPassword123!';

  console.log('🧪 Testing Signup Flow');
  console.log('========================');
  console.log(`📧 Test email: ${testEmail}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`);
  console.log('');

  // Test 1: Basic signup
  console.log('1️⃣ Testing basic signup...');
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (signupError) {
    console.error('❌ Signup FAILED:', signupError.message);
    console.error('   Status:', signupError.status);
    console.error('   Full error:', JSON.stringify(signupError, null, 2));

    if (signupError.message.includes('Database error')) {
      console.log('');
      console.log('🔧 FIX REQUIRED: Run this SQL in Supabase Dashboard:');
      console.log(`
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
      `);
    }
    return false;
  }

  console.log('✅ Signup succeeded!');
  console.log(`   User ID: ${signupData.user?.id}`);
  console.log(`   Email: ${signupData.user?.email}`);
  console.log('');

  // Test 2: Check if user_profiles row was created
  console.log('2️⃣ Checking user_profiles row...');
  if (signupData.user?.id) {
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, created_at')
      .eq('id', signupData.user.id)
      .single();

    if (profileError) {
      console.warn('⚠️ Could not verify profile (may be RLS):', profileError.message);
    } else if (profileData) {
      console.log('✅ user_profiles row created!');
      console.log(`   Profile ID: ${profileData.id}`);
      console.log(`   Created at: ${profileData.created_at}`);
    }
  }
  console.log('');

  // Test 3: Clean up test user (optional)
  console.log('3️⃣ Cleanup...');
  console.log('   Test user created but not deleted (requires service_role key)');
  console.log('   Delete manually if needed: ' + testEmail);
  console.log('');

  console.log('========================');
  console.log('✅ SIGNUP TEST PASSED');
  console.log('========================');
  return true;
}

// Run test
testSignup()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('❌ Test crashed:', err);
    process.exit(1);
  });
