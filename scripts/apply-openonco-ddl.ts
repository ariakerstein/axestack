/**
 * Apply OpenOnco tables DDL directly using pg client
 * Bypasses migration tracking entirely
 *
 * Run: npx tsx scripts/apply-openonco-ddl.ts
 */

import { Client } from 'pg';
import * as fs from 'fs';
import { execSync } from 'child_process';

async function getConnectionString(): Promise<string> {
  try {
    const output = execSync('supabase db dump --linked --dry-run 2>&1', { encoding: 'utf-8' });
    const lines = output.split('\n');

    let host = '', port = '', user = '', password = '', database = '';

    for (const line of lines) {
      if (line.includes('PGHOST=')) host = line.match(/PGHOST="([^"]+)"/)?.[1] || '';
      if (line.includes('PGPORT=')) port = line.match(/PGPORT="([^"]+)"/)?.[1] || '';
      if (line.includes('PGUSER=')) user = line.match(/PGUSER="([^"]+)"/)?.[1] || '';
      if (line.includes('PGPASSWORD=')) password = line.match(/PGPASSWORD="([^"]+)"/)?.[1] || '';
      if (line.includes('PGDATABASE=')) database = line.match(/PGDATABASE="([^"]+)"/)?.[1] || '';
    }

    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  } catch (error) {
    throw new Error('Failed to get connection string from supabase CLI');
  }
}

async function applyMigration() {
  console.log('🔧 Applying OpenOnco tables DDL directly...\n');

  const sqlPath = 'supabase/migrations/20251209000002_create_openonco_tests_tables.sql';

  if (!fs.existsSync(sqlPath)) {
    console.error('❌ Migration file not found:', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('Getting database connection...');
  const connectionString = await getConnectionString();
  console.log('✅ Got connection credentials\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    console.log('Executing DDL (full migration)...');

    try {
      await client.query(sql);
      console.log('✅ DDL executed successfully');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Some objects already exist - this is OK');
      } else {
        console.error('❌ DDL Error:', error.message);
        throw error;
      }
    }

    // Verify tables were created
    const checkResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('openonco_tests', 'openonco_test_cancer_mappings', 'openonco_cancer_type_mappings')
    `);

    console.log('\n📊 Verification - Tables in database:');
    if (checkResult.rows.length === 0) {
      console.log('  ❌ No OpenOnco tables found');
    } else {
      for (const row of checkResult.rows) {
        console.log(`  ✅ ${row.table_name}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  console.log('\n✅ Migration complete!');
  console.log('\n📝 Next step: Run npx tsx scripts/import-openonco-tests.ts');
}

applyMigration().catch(console.error);
