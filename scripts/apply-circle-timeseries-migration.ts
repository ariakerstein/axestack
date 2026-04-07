import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  console.log('\n📦 Applying Circle Timeseries Migration\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20250126000001_create_circle_timeseries_function.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file read successfully\n');
    console.log('⚠️  IMPORTANT: This migration needs to be applied in Supabase SQL Editor');
    console.log('   The Supabase JS client cannot execute CREATE FUNCTION statements directly.\n');
    console.log('📋 To apply this migration:\n');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the contents of:');
    console.log(`      ${migrationPath}\n`);
    console.log('   4. Click "Run" to execute\n');

    // Test if function exists
    console.log('🔍 Checking if function already exists...\n');
    const { data: testData, error: testError } = await supabase.rpc('get_circle_timeseries', {
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date().toISOString(),
      period_type: 'day'
    });

    if (testError) {
      if (testError.code === 'PGRST202') {
        console.log('❌ Function does not exist yet - migration needs to be applied\n');
      } else {
        console.log('⚠️  Function exists but returned an error:', testError.message, '\n');
      }
    } else {
      console.log('✅ Function exists and is working!');
      console.log(`   Returned ${testData?.length || 0} data points\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

applyMigration().catch(console.error);

