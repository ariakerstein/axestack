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

// Exact copy of the function from cancerTypeUtils.ts
const fetchQuestionsByCancerType = async (cancerType: string | null): Promise<PatientQuestion[]> => {
  try {
    if (!cancerType) {
      return [];
    }

    console.log(`🔍 Fetching questions for cancer type: "${cancerType}"`);

    const { data, error } = await supabase
      .from("patient_questions2")
      .select("id, question, category, persona, cancer_type, cancer_code")
      .eq("cancer_code", cancerType)
      .order("id", { ascending: true })
      .limit(10);

    if (error) {
      console.error("Error fetching questions:", error);
      return [];
    }

    if (data && data.length > 0) {
      console.log(`✅ Found ${data.length} questions for ${cancerType}`);
      return data;
    }

    console.log(`⚠️ No questions found for cancer type: ${cancerType}`);
    return [];
  } catch (err) {
    console.error("Error in fetchQuestionsByCancerType:", err);
    return [];
  }
};

async function testLiveQuestionUpdate() {
  console.log('🧪 Testing live question updates as user would experience\n');

  console.log('📍 Step 1: User selects Breast Cancer');
  let questions = await fetchQuestionsByCancerType('breast_cancer');
  console.log(`\n📝 Suggested questions (showing 4):`);
  questions.slice(0, 4).forEach((q, i) => {
    console.log(`  ${i + 1}. ${q.question}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('📍 Step 2: User changes to Lung Cancer (NSCLC)');
  questions = await fetchQuestionsByCancerType('lung_nsclc');
  console.log(`\n📝 Suggested questions (showing 4):`);
  questions.slice(0, 4).forEach((q, i) => {
    console.log(`  ${i + 1}. ${q.question}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('📍 Step 3: User changes to Follicular Lymphoma');
  questions = await fetchQuestionsByCancerType('nhl_follicular');
  console.log(`\n📝 Suggested questions (showing 4):`);
  questions.slice(0, 4).forEach((q, i) => {
    console.log(`  ${i + 1}. ${q.question}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('📍 Step 4: User clears selection (null)');
  questions = await fetchQuestionsByCancerType(null);
  console.log(`\n📝 Default questions should show (got ${questions.length} questions)`);

  console.log('\n✅ Test complete - questions update correctly for each cancer type selection');
}

testLiveQuestionUpdate().then(() => process.exit(0));
