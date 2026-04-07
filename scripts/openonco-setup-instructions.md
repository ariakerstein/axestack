# OpenOnco Diagnostic Tests Integration Setup

## Current Status
- ✅ Taxonomy codes added (multi_solid, advanced_solid, head_neck_hpv_positive)
- ✅ Migration SQL file created
- ⏳ Tables need to be created in Supabase

## Step 1: Apply the Migration SQL

1. Open the Supabase Dashboard SQL Editor:
   **https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new**

2. Copy the SQL from: `supabase/migrations/20251209000002_create_openonco_tests_tables.sql`

3. Paste into the SQL Editor and click **Run**

## Step 2: Import the OpenOnco Tests

After the tables are created, run:

```bash
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDY3NDM4MCwiZXhwIjoyMDU2MjUwMzgwfQ.OC0ma2mN2Np_-AEL4siwLaUV0eGZ1tDXgbghMfB61pQ" npx tsx scripts/import-openonco-tests.ts
```

## What Gets Created

### Tables
1. **openonco_tests** - Main table storing all 56 diagnostic tests from OpenOnco
2. **openonco_test_cancer_mappings** - Junction table linking tests to Navis cancer taxonomy
3. **openonco_cancer_type_mappings** - Reference mappings from OpenOnco terms to Navis codes

### Functions
1. **get_openonco_tests_for_cancer(cancer_code, category?, stage?)** - Get tests for a specific cancer
2. **search_openonco_tests(search_text, category?)** - Search tests by name/vendor

### Taxonomy Additions
- `multi_solid` - Multiple Solid Tumors (Pan-Cancer)
- `advanced_solid` - Advanced/Metastatic Solid Tumors
- `head_neck_hpv_positive` - HPV+ Head and Neck Cancer

## Test Categories
- **MRD** - Molecular Residual Disease (20 tests)
- **ECD** - Early Cancer Detection (12 tests)
- **TRM** - Treatment Response Monitoring (8 tests)
- **CGP** - Comprehensive Genomic Profiling (16 tests)

## Verification

After import, verify with:

```bash
SUPABASE_SERVICE_ROLE_KEY="..." npx tsx -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://felofmlhqwcdpiyjgstx.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  const { count } = await supabase.from('openonco_tests').select('*', { count: 'exact', head: true });
  console.log('Tests imported:', count);

  const { data } = await supabase.from('openonco_tests').select('category').limit(100);
  const categories = {};
  data?.forEach(t => categories[t.category] = (categories[t.category] || 0) + 1);
  console.log('By category:', categories);
}
verify();
"
```
