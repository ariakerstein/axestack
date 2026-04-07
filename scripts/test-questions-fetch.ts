import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface PatientQuestion {
  id?: number;
  question: string;
  category?: string;
  persona?: string;
  cancer_type?: string;
  cancer_code?: string;
}

const fetchQuestionsByCancerType = async (cancerType: string | null): Promise<PatientQuestion[]> => {
  try {
    if (!cancerType) {
      return [];
    }

    console.log(`🔍 Fetching questions for cancer type: "${cancerType}"`);

    // Query by cancer_code column
    console.log(`🎯 Querying with canonical code: ${cancerType}`);

    const { data, error } = await supabase
      .from("patient_questions2")
      .select("id, question, category, persona, cancer_type, cancer_code")
      .eq("cancer_code", cancerType)
      .order("id", { ascending: true })
      .limit(10);

    if (!error && data && data.length > 0) {
      console.log(`✅ Found ${data.length} questions using canonical code`);
      return data;
    } else {
      console.log(`⚠️ No questions found for code ${cancerType}`);
      if (error) console.error('Error:', error);
    }

    return data || [];
  } catch (err) {
    console.error("Error in fetchQuestionsByCancerType:", err);
    return [];
  }
};

async function testQuestionsFetch() {
  console.log('🧪 Testing question fetching with canonical codes\n');

  const testCodes = [
    'lung_nsclc',
    'breast_cancer',
    'nhl_follicular',
    'colorectal_cancer',
    'melanoma'
  ];

  for (const code of testCodes) {
    console.log(`\n${'='.repeat(60)}`);
    const questions = await fetchQuestionsByCancerType(code);
    console.log(`\n📝 Sample questions for ${code}:`);
    questions.slice(0, 3).forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.question}`);
    });
  }
}

testQuestionsFetch().then(() => process.exit(0));
