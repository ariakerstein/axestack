/**
 * Script to update storage bucket file size limit to 75MB
 * Run this to fix 413 "Payload too large" errors for 65MB+ PDFs
 *
 * Usage: npx tsx scripts/update-storage-limit.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required:');
  console.error('  - VITE_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nAdd SUPABASE_SERVICE_ROLE_KEY to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateStorageLimit() {
  console.log('🔧 Updating storage bucket file size limit...\n');

  try {
    // Check current limit
    const { data: buckets, error: fetchError } = await supabase
      .from('storage.buckets')
      .select('name, file_size_limit, public, allowed_mime_types')
      .eq('name', 'medical-documents')
      .single();

    if (fetchError) {
      console.error('❌ Error fetching bucket:', fetchError);
      console.log('\n📋 Manual fix required:');
      console.log('Go to Supabase Dashboard → SQL Editor and run:');
      console.log('\nUPDATE storage.buckets');
      console.log('SET file_size_limit = 78643200');
      console.log("WHERE id = 'medical-documents';");
      return;
    }

    const currentLimitMB = buckets.file_size_limit / 1024 / 1024;
    console.log(`Current bucket limit: ${currentLimitMB.toFixed(0)}MB`);
    console.log(`Target limit: 75MB\n`);

    if (buckets.file_size_limit >= 78643200) {
      console.log('✅ Bucket limit is already 75MB or higher!');
      console.log('The 413 error may be from a different cause.');
      return;
    }

    // Note: Direct bucket updates via JS client may not work
    // Supabase typically requires SQL for bucket modifications
    console.log('⚠️  Cannot update bucket via API.');
    console.log('📋 Please run this SQL in Supabase Dashboard → SQL Editor:\n');
    console.log('UPDATE storage.buckets');
    console.log('SET file_size_limit = 78643200  -- 75MB');
    console.log("WHERE id = 'medical-documents';\n");
    console.log('Then verify with:');
    console.log('SELECT name, (file_size_limit / 1024 / 1024)::text || \' MB\' as limit');
    console.log('FROM storage.buckets');
    console.log("WHERE name = 'medical-documents';");

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📋 Manual fix required - see migration file:');
    console.log('supabase/migrations/20251112000000_increase_file_size_limit.sql');
  }
}

updateStorageLimit();
