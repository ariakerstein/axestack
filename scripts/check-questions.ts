import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xobmvxatidcnbuwqptbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYm12eGF0aWRjbmJ1d3FwdGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1NzUyMDcsImV4cCI6MjA0NjE1MTIwN30.R37Po2MkOrmo16b2lGAG7tKCANPAJfG9OYSzTD_zzpI'
);

async function check() {
  // Check patient_questions2 for breast
  console.log('=== patient_questions2 for breast_cancer ===');
  const { data: q1, error: e1 } = await supabase
    .from('patient_questions2')
    .select('question, cancer_code')
    .eq('cancer_code', 'breast_cancer')
    .limit(5);

  if (e1) console.error('Error:', e1.message);
  else {
    console.log('Found:', q1?.length, 'questions');
    q1?.forEach(q => console.log('  -', q.question));
  }

  // Check what cancer_codes exist
  console.log('\n=== Distinct cancer_codes (sample) ===');
  const { data: codes, error: e2 } = await supabase
    .from('patient_questions2')
    .select('cancer_code')
    .limit(100);

  if (e2) console.error('Error:', e2.message);
  else {
    const unique = [...new Set(codes?.map(c => c.cancer_code))];
    console.log('Unique codes:', unique.slice(0, 15));
  }
}

check();
