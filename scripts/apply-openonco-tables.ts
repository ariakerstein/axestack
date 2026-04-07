/**
 * Apply OpenOnco tables migration using pg directly
 *
 * Run: DATABASE_URL=... npx tsx scripts/apply-openonco-tables.ts
 * Or: npx tsx scripts/apply-openonco-tables.ts (uses default connection string)
 */

import { Client } from 'pg';
import * as fs from 'fs';

const SUPABASE_PROJECT_REF = 'felofmlhqwcdpiyjgstx';

// Database connection - use DATABASE_URL or construct from project
const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://cli_login_postgres:WSOOkqmuMEjUARiIjiQImnvqXlBrdOPw@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`;

async function applyMigration() {
  console.log('🔧 Applying OpenOnco tables migration...\n');

  // Read the SQL file
  const sqlPath = 'supabase/migrations/20251209000002_create_openonco_tests_tables.sql';

  if (!fs.existsSync(sqlPath)) {
    console.error('❌ Migration file not found:', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');


  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    console.log('Executing migration...');
    await client.query(sql);
    console.log('✅ Migration applied successfully!\n');

    // Verify tables were created
    const checkResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('openonco_tests', 'openonco_test_cancer_mappings', 'openonco_cancer_type_mappings')
    `);

    console.log('Created tables:');
    for (const row of checkResult.rows) {
      console.log(`  ✅ ${row.table_name}`);
    }

    // Check taxonomy codes
    const taxResult = await client.query(`
      SELECT navis_canonical_code, navis_display_name FROM cancer_taxonomy
      WHERE navis_canonical_code IN ('multi_solid', 'advanced_solid', 'head_neck_hpv_positive')
    `);

    console.log('\nTaxonomy codes added:');
    for (const row of taxResult.rows) {
      console.log(`  ✅ ${row.navis_canonical_code}: ${row.navis_display_name}`);
    }

  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('⚠️  Some objects already exist (this is OK)');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }

  console.log('\n✅ Migration complete!');
  console.log('\n📝 Next step: Run npx tsx scripts/import-openonco-tests.ts');
}

applyMigration().catch(console.error);
