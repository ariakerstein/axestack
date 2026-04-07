/**
 * Apply pitch_decks table migration
 *
 * Run: npx tsx scripts/apply-pitch-decks-migration.ts
 */

import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function applyMigration() {
  const sqlPath = 'supabase/migrations/20251222000001_create_pitch_decks_table.sql';
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('🔧 Checking pitch_decks table...\n');

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  No SUPABASE_SERVICE_ROLE_KEY found in environment.');
    console.log('\n📋 To apply the migration manually:');
    console.log('1. Go to https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new');
    console.log('2. Paste the following SQL and run it:\n');
    console.log('='.repeat(60));
    console.log(sql);
    console.log('='.repeat(60));
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Check if table exists
  const { data, error } = await supabase
    .from('pitch_decks')
    .select('id')
    .limit(1);

  if (!error) {
    console.log('✅ pitch_decks table already exists!');
    return;
  }

  if (error.code === '42P01') {
    console.log('❌ Table does not exist. Need to apply migration manually.');
    console.log('\n📋 To apply the migration:');
    console.log('1. Go to https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new');
    console.log('2. Paste the following SQL and run it:\n');
    console.log('='.repeat(60));
    console.log(sql);
    console.log('='.repeat(60));
  } else {
    console.log('Error checking table:', error);
  }
}

applyMigration().catch(console.error);
