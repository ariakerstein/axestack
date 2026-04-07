import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuestionsSchema() {
  console.log('🔍 Checking patient_questions2 schema...\n');

  // Check distinct cancer_code values
  const { data: codes, error: codesError } = await supabase
    .from('patient_questions2')
    .select('cancer_code, cancer_type')
    .not('cancer_code', 'is', null)
    .limit(20);

  if (codesError) {
    console.error('❌ Error fetching cancer codes:', codesError);
  } else {
    console.log('📊 Sample cancer_code and cancer_type values:');
    codes?.forEach(row => {
      console.log(`  - cancer_code: "${row.cancer_code}" | cancer_type: "${row.cancer_type}"`);
    });
  }

  // Check if cancer_code column exists at all
  const { data: sample, error: sampleError } = await supabase
    .from('patient_questions2')
    .select('*')
    .limit(1);

  if (sampleError) {
    console.error('\n❌ Error fetching sample:', sampleError);
  } else {
    console.log('\n📋 Available columns:', Object.keys(sample?.[0] || {}));
  }

  // Count questions by cancer_type (text-based)
  const { data: counts, error: countsError } = await supabase
    .from('patient_questions2')
    .select('cancer_type')
    .not('cancer_type', 'is', null);

  if (!countsError && counts) {
    const typeCounts = counts.reduce((acc, row) => {
      acc[row.cancer_type] = (acc[row.cancer_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📈 Questions per cancer_type:');
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count} questions`);
      });
  }
}

checkQuestionsSchema().then(() => process.exit(0));
