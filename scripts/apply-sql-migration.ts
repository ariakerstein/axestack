/**
 * Apply SQL migration via Supabase Management API
 *
 * Run: npx tsx scripts/apply-sql-migration.ts
 */

import * as fs from 'fs';

const SUPABASE_PROJECT_REF = 'felofmlhqwcdpiyjgstx';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || '';

async function applySqlMigration() {
  const sqlPath = 'supabase/migrations/20251209000002_create_openonco_tests_tables.sql';
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('🔧 Applying OpenOnco tables migration...\n');

  // We'll use the postgres REST API via service role
  // The tables need to be created, so let's try via the management API

  // First check if we can connect
  const testResponse = await fetch(
    `https://${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/openonco_tests?select=count&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (testResponse.ok) {
    console.log('✅ openonco_tests table already exists!');
    return true;
  }

  console.log('❌ Table does not exist. Need to apply migration manually.');
  console.log('\n📋 To apply the migration:');
  console.log('1. Go to https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new');
  console.log('2. Paste the following SQL and run it:\n');
  console.log('=' .repeat(60));
  console.log(sql);
  console.log('=' .repeat(60));

  return false;
}

applySqlMigration().catch(console.error);
