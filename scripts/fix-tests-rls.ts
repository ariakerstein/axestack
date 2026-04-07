import { createClient } from '@supabase/supabase-js'

// Service role key for RLS modifications
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDY3NDM4MCwiZXhwIjoyMDU2MjUwMzgwfQ.OC0ma2mN2Np_-AEL4siwLaUV0eGZ1tDXgbghMfB61pQ"

const supabase = createClient(
  "https://felofmlhqwcdpiyjgstx.supabase.co",
  SERVICE_KEY
)

async function main() {
  console.log('Checking current RLS status and fixing policies...\n')

  // First, let's check what we can access with service role
  const { count: dxCount, error: dxErr } = await supabase
    .from('dx_test_master')
    .select('*', { count: 'exact', head: true })

  console.log('With service role:')
  console.log('  dx_test_master:', dxCount, dxErr ? dxErr.message : '')

  const { count: openCount, error: openErr } = await supabase
    .from('openonco_tests')
    .select('*', { count: 'exact', head: true })

  console.log('  openonco_tests:', openCount, openErr ? openErr.message : '')

  const { count: provCount, error: provErr } = await supabase
    .from('serviceProviders')
    .select('*', { count: 'exact', head: true })

  console.log('  serviceProviders:', provCount, provErr ? provErr.message : '')

  // Now check with anon key
  console.log('\nWith anon key:')
  const anonSupabase = createClient(
    "https://felofmlhqwcdpiyjgstx.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
  )

  const { count: anonDxCount, error: anonDxErr } = await anonSupabase
    .from('dx_test_master')
    .select('*', { count: 'exact', head: true })

  console.log('  dx_test_master:', anonDxCount, anonDxErr ? anonDxErr.message : '')

  const { count: anonOpenCount, error: anonOpenErr } = await anonSupabase
    .from('openonco_tests')
    .select('*', { count: 'exact', head: true })

  console.log('  openonco_tests:', anonOpenCount, anonOpenErr ? anonOpenErr.message : '')

  const { count: anonProvCount, error: anonProvErr } = await anonSupabase
    .from('serviceProviders')
    .select('*', { count: 'exact', head: true })

  console.log('  serviceProviders:', anonProvCount, anonProvErr ? anonProvErr.message : '')

  // Check if counts match
  console.log('\n=== SUMMARY ===')
  if (dxCount === anonDxCount && openCount === anonOpenCount) {
    console.log('✅ RLS policies are working - anon can see all tests!')
  } else {
    console.log('❌ RLS blocking some data:')
    console.log('   dx_test_master: service=' + dxCount + ' vs anon=' + anonDxCount)
    console.log('   openonco_tests: service=' + openCount + ' vs anon=' + anonOpenCount)
    console.log('\n⚠️  Run this SQL in Supabase Dashboard to fix:\n')
    console.log('-- Fix RLS for dx_test_master')
    console.log('DROP POLICY IF EXISTS "public_read" ON dx_test_master;')
    console.log('CREATE POLICY "public_read" ON dx_test_master FOR SELECT USING (true);')
    console.log('')
    console.log('-- Fix RLS for openonco_tests')
    console.log('DROP POLICY IF EXISTS "public_read" ON openonco_tests;')
    console.log('CREATE POLICY "public_read" ON openonco_tests FOR SELECT USING (true);')
    console.log('')
    console.log('-- Fix RLS for serviceProviders')
    console.log('DROP POLICY IF EXISTS "public_read" ON "serviceProviders";')
    console.log('CREATE POLICY "public_read" ON "serviceProviders" FOR SELECT USING (true);')
  }
}

main()
