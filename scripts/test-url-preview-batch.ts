// Batch test the url-preview edge function with various medical content URLs
// Run with: npx tsx scripts/test-url-preview-batch.ts

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0.6tBcyoVGBe78fdgir8KjKxYQqXzLWpnDqJ7xgMPxwEY';

// Test URLs covering different sources and cancer types - verified cancer articles
const TEST_URLS = [
  // PubMed/PMC - Research Papers (verified cancer articles)
  {
    name: 'PMC - Prostate Cancer NCCN Study',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6219292/',
    expectedCancer: 'Prostate',
    expectedType: 'research_paper',
  },
  {
    name: 'PMC - Breast Cancer Therapy',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9127189/',
    expectedCancer: 'Breast',
    expectedType: 'research_paper',
  },
  {
    name: 'PMC - Lung Cancer Treatment',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8430043/',
    expectedCancer: 'Lung',
    expectedType: 'research_paper',
  },

  // NCI/Cancer.gov (always reliable)
  {
    name: 'NCI - Melanoma Treatment',
    url: 'https://www.cancer.gov/types/skin/patient/melanoma-treatment-pdq',
    expectedCancer: 'Melanoma',
    expectedType: 'article',
  },
  {
    name: 'NCI - Colorectal Cancer',
    url: 'https://www.cancer.gov/types/colorectal/patient/colon-treatment-pdq',
    expectedCancer: 'Colorectal',
    expectedType: 'article',
  },
  {
    name: 'NCI - Pancreatic Cancer',
    url: 'https://www.cancer.gov/types/pancreatic/patient/pancreatic-treatment-pdq',
    expectedCancer: 'Pancreatic',
    expectedType: 'article',
  },
  {
    name: 'NCI - Lymphoma Overview',
    url: 'https://www.cancer.gov/types/lymphoma',
    expectedCancer: 'Lymphoma',
    expectedType: 'article',
  },
  {
    name: 'NCI - Brain Tumors',
    url: 'https://www.cancer.gov/types/brain/patient/adult-brain-treatment-pdq',
    expectedCancer: 'Brain',
    expectedType: 'article',
  },
  {
    name: 'NCI - Ovarian Cancer',
    url: 'https://www.cancer.gov/types/ovarian/patient/ovarian-treatment-pdq',
    expectedCancer: 'Ovarian',
    expectedType: 'article',
  },
  {
    name: 'NCI - Kidney Cancer',
    url: 'https://www.cancer.gov/types/kidney/patient/kidney-treatment-pdq',
    expectedCancer: 'Kidney',
    expectedType: 'article',
  },
  {
    name: 'NCI - Bladder Cancer',
    url: 'https://www.cancer.gov/types/bladder/patient/bladder-treatment-pdq',
    expectedCancer: 'Bladder',
    expectedType: 'article',
  },
  {
    name: 'NCI - Leukemia (AML)',
    url: 'https://www.cancer.gov/types/leukemia/patient/adult-aml-treatment-pdq',
    expectedCancer: 'Leukemia',
    expectedType: 'article',
  },
];

interface TestResult {
  name: string;
  url: string;
  status: 'pass' | 'fail' | 'partial';
  httpStatus: number;
  title?: string;
  detectedCancer?: string | null;
  expectedCancer: string;
  detectedType?: string;
  expectedType: string;
  wordCount?: number;
  confidence?: string;
  error?: string;
  duration: number;
}

async function testUrl(test: typeof TEST_URLS[0]): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/url-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ url: test.url }),
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok || data.error) {
      return {
        name: test.name,
        url: test.url,
        status: 'fail',
        httpStatus: response.status,
        expectedCancer: test.expectedCancer,
        expectedType: test.expectedType,
        error: data.error || `HTTP ${response.status}`,
        duration,
      };
    }

    const m = data.metadata;
    const cancerMatch = m.cancerType?.toLowerCase() === test.expectedCancer.toLowerCase() ||
                        m.cancerType?.includes(test.expectedCancer) ||
                        test.expectedCancer.includes(m.cancerType || '');

    return {
      name: test.name,
      url: test.url,
      status: cancerMatch && m.wordCount > 100 ? 'pass' : 'partial',
      httpStatus: response.status,
      title: m.title?.substring(0, 50) + (m.title?.length > 50 ? '...' : ''),
      detectedCancer: m.cancerType,
      expectedCancer: test.expectedCancer,
      detectedType: m.contentType,
      expectedType: test.expectedType,
      wordCount: m.wordCount,
      confidence: m.confidence?.overall,
      duration,
    };
  } catch (error: any) {
    return {
      name: test.name,
      url: test.url,
      status: 'fail',
      httpStatus: 0,
      expectedCancer: test.expectedCancer,
      expectedType: test.expectedType,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

async function runTests() {
  console.log('🧪 URL Preview Batch Test');
  console.log('='.repeat(80));
  console.log(`Testing ${TEST_URLS.length} URLs...\n`);

  const results: TestResult[] = [];

  for (const test of TEST_URLS) {
    process.stdout.write(`Testing: ${test.name}... `);
    const result = await testUrl(test);
    results.push(result);

    if (result.status === 'pass') {
      console.log(`✅ PASS (${result.duration}ms)`);
    } else if (result.status === 'partial') {
      console.log(`⚠️  PARTIAL (${result.duration}ms)`);
    } else {
      console.log(`❌ FAIL (${result.duration}ms)`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESULTS SUMMARY\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const partial = results.filter(r => r.status === 'partial').length;
  const failed = results.filter(r => r.status === 'fail').length;

  console.log(`  ✅ Passed:  ${passed}/${results.length}`);
  console.log(`  ⚠️  Partial: ${partial}/${results.length}`);
  console.log(`  ❌ Failed:  ${failed}/${results.length}`);

  // Detailed results
  console.log('\n' + '-'.repeat(80));
  console.log('DETAILED RESULTS:\n');

  for (const r of results) {
    const icon = r.status === 'pass' ? '✅' : r.status === 'partial' ? '⚠️' : '❌';
    console.log(`${icon} ${r.name}`);
    console.log(`   URL: ${r.url.substring(0, 60)}...`);

    if (r.error) {
      console.log(`   Error: ${r.error}`);
    } else {
      console.log(`   Title: ${r.title}`);
      console.log(`   Cancer: ${r.detectedCancer || 'None'} (expected: ${r.expectedCancer})`);
      console.log(`   Type: ${r.detectedType} | Words: ${r.wordCount?.toLocaleString()} | Confidence: ${r.confidence}`);
    }
    console.log();
  }
}

runTests();
