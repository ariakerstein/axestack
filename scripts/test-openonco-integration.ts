/**
 * OpenOnco Integration Test Suite
 *
 * Tests database tables, RPC functions, and RAG chunks for the OpenOnco diagnostic tests integration.
 *
 * Run: SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/test-openonco-integration.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${name}`);
  console.log(`     ${message}`);
}

async function runTests() {
  console.log('🧪 OpenOnco Integration Test Suite\n');
  console.log('='.repeat(60));

  // Test 1: Verify openonco_tests table has data
  console.log('\n📋 Test 1: openonco_tests table populated');
  try {
    const { count, error } = await supabase
      .from('openonco_tests')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    const passed = (count || 0) >= 50;
    logTest('Table has sufficient data', passed, `${count} tests in database (expected 50+)`);
  } catch (err: any) {
    logTest('Table has sufficient data', false, err.message);
  }

  // Test 2: Verify all categories present
  console.log('\n📋 Test 2: All test categories present');
  try {
    const { data: categories, error } = await supabase
      .from('openonco_tests')
      .select('category');

    if (error) throw error;
    const uniqueCats = [...new Set(categories?.map(c => c.category))];
    const expectedCats = ['MRD', 'ECD', 'TRM', 'CGP'];
    const allPresent = expectedCats.every(c => uniqueCats.includes(c));
    logTest('All categories present', allPresent, `Found: ${uniqueCats.join(', ')}`);
  } catch (err: any) {
    logTest('All categories present', false, err.message);
  }

  // Test 3: Verify cancer type mappings exist
  console.log('\n📋 Test 3: Cancer type mappings populated');
  try {
    const { count, error } = await supabase
      .from('openonco_test_cancer_mappings')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    const passed = (count || 0) >= 100;
    logTest('Mappings table populated', passed, `${count} mappings (expected 100+)`);
  } catch (err: any) {
    logTest('Mappings table populated', false, err.message);
  }

  // Test 4: Test RPC function for breast cancer
  console.log('\n📋 Test 4: RPC get_openonco_tests_for_cancer(breast_cancer)');
  try {
    const { data, error } = await supabase.rpc('get_openonco_tests_for_cancer', {
      p_cancer_code: 'breast_cancer'
    });

    if (error) throw error;
    const passed = (data?.length || 0) >= 5;
    const samples = data?.slice(0, 3).map((t: any) => t.test_name).join(', ') || 'none';
    logTest('Breast cancer tests returned', passed, `${data?.length} tests. Sample: ${samples}`);
  } catch (err: any) {
    logTest('Breast cancer tests returned', false, err.message);
  }

  // Test 5: Test RPC function for colorectal cancer
  console.log('\n📋 Test 5: RPC get_openonco_tests_for_cancer(colorectal)');
  try {
    const { data, error } = await supabase.rpc('get_openonco_tests_for_cancer', {
      p_cancer_code: 'colorectal'
    });

    if (error) throw error;
    const passed = (data?.length || 0) >= 5;
    const samples = data?.slice(0, 3).map((t: any) => t.test_name).join(', ') || 'none';
    logTest('Colorectal tests returned', passed, `${data?.length} tests. Sample: ${samples}`);
  } catch (err: any) {
    logTest('Colorectal tests returned', false, err.message);
  }

  // Test 6: Test RPC function for lung cancer
  console.log('\n📋 Test 6: RPC get_openonco_tests_for_cancer(lung_nsclc)');
  try {
    const { data, error } = await supabase.rpc('get_openonco_tests_for_cancer', {
      p_cancer_code: 'lung_nsclc'
    });

    if (error) throw error;
    const passed = (data?.length || 0) >= 3;
    const samples = data?.slice(0, 3).map((t: any) => t.test_name).join(', ') || 'none';
    logTest('Lung cancer tests returned', passed, `${data?.length} tests. Sample: ${samples}`);
  } catch (err: any) {
    logTest('Lung cancer tests returned', false, err.message);
  }

  // Test 7: Verify RAG chunks exist
  console.log('\n📋 Test 7: OpenOnco RAG chunks in guideline_chunks');
  try {
    const { count, error } = await supabase
      .from('guideline_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('guideline_source', 'OpenOnco');

    if (error) throw error;
    const passed = (count || 0) >= 50;
    logTest('RAG chunks populated', passed, `${count} chunks (expected 50+)`);
  } catch (err: any) {
    logTest('RAG chunks populated', false, err.message);
  }

  // Test 8: RAG chunks have embeddings
  console.log('\n📋 Test 8: RAG chunks have valid embeddings');
  try {
    const { data, error } = await supabase
      .from('guideline_chunks')
      .select('id, chunk_embedding_vec')
      .eq('guideline_source', 'OpenOnco')
      .limit(5);

    if (error) throw error;
    const withEmbeddings = data?.filter(c => c.chunk_embedding_vec && c.chunk_embedding_vec.length > 0) || [];
    const passed = withEmbeddings.length === data?.length;
    logTest('Chunks have embeddings', passed, `${withEmbeddings.length}/${data?.length} chunks have embeddings`);
  } catch (err: any) {
    logTest('Chunks have embeddings', false, err.message);
  }

  // Test 9: Test search function
  console.log('\n📋 Test 9: search_openonco_tests function');
  try {
    const { data, error } = await supabase.rpc('search_openonco_tests', {
      p_search_text: 'Signatera'
    });

    if (error) throw error;
    const found = data?.find((t: any) => t.name?.includes('Signatera'));
    logTest('Search function works', !!found, found ? `Found: ${found.name}` : 'Signatera not found');
  } catch (err: any) {
    logTest('Search function works', false, err.message);
  }

  // Test 10: Verify test data has required fields
  console.log('\n📋 Test 10: Tests have required fields');
  try {
    const { data, error } = await supabase
      .from('openonco_tests')
      .select('name, vendor, category, openonco_url')
      .limit(10);

    if (error) throw error;
    const validTests = data?.filter(t => t.name && t.vendor && t.category && t.openonco_url) || [];
    const passed = validTests.length === data?.length;
    logTest('Required fields present', passed, `${validTests.length}/${data?.length} tests have all required fields`);
  } catch (err: any) {
    logTest('Required fields present', false, err.message);
  }

  // Test 11: MRD tests have performance metrics
  console.log('\n📋 Test 11: MRD tests have performance metrics');
  try {
    const { data, error } = await supabase
      .from('openonco_tests')
      .select('name, sensitivity, specificity')
      .eq('category', 'MRD')
      .limit(10);

    if (error) throw error;
    const withMetrics = data?.filter(t => t.sensitivity || t.specificity) || [];
    const passed = withMetrics.length >= 3;
    logTest('MRD tests have metrics', passed, `${withMetrics.length}/${data?.length} MRD tests have sensitivity/specificity`);
  } catch (err: any) {
    logTest('MRD tests have metrics', false, err.message);
  }

  // Test 12: Test category filter in RPC
  console.log('\n📋 Test 12: RPC category filter works');
  try {
    const { data, error } = await supabase.rpc('get_openonco_tests_for_cancer', {
      p_cancer_code: 'breast_cancer',
      p_category: 'MRD'
    });

    if (error) throw error;
    const allMRD = data?.every((t: any) => t.category === 'MRD');
    logTest('Category filter works', !!allMRD && data?.length > 0, `${data?.length} MRD tests for breast cancer`);
  } catch (err: any) {
    logTest('Category filter works', false, err.message);
  }

  // Test 13: Verify OpenOnco URLs are valid format
  console.log('\n📋 Test 13: OpenOnco URLs are valid');
  try {
    const { data, error } = await supabase
      .from('openonco_tests')
      .select('name, openonco_url')
      .limit(10);

    if (error) throw error;
    const validUrls = data?.filter(t => t.openonco_url?.startsWith('https://openonco.org/')) || [];
    const passed = validUrls.length === data?.length;
    logTest('URLs are valid format', passed, `${validUrls.length}/${data?.length} have valid OpenOnco URLs`);
  } catch (err: any) {
    logTest('URLs are valid format', false, err.message);
  }

  // Test 14: RAG chunks have proper metadata
  console.log('\n📋 Test 14: RAG chunks have proper metadata');
  try {
    const { data, error } = await supabase
      .from('guideline_chunks')
      .select('guideline_title, guideline_source, cancer_type, content_tier, tags')
      .eq('guideline_source', 'OpenOnco')
      .limit(5);

    if (error) throw error;
    const valid = data?.filter(c =>
      c.guideline_title &&
      c.guideline_source === 'OpenOnco' &&
      c.content_tier === 'tier_1' &&
      c.tags?.includes('diagnostic_test')
    ) || [];
    const passed = valid.length === data?.length;
    logTest('RAG metadata correct', passed, `${valid.length}/${data?.length} chunks have proper metadata`);
  } catch (err: any) {
    logTest('RAG metadata correct', false, err.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary\n');

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log(`  ✅ Passed: ${passedCount}`);
  console.log(`  ❌ Failed: ${failedCount}`);
  console.log(`  📈 Score: ${Math.round((passedCount / results.length) * 100)}%`);

  if (failedCount === 0) {
    console.log('\n🎉 All tests passed! OpenOnco integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Details:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }

  // Exit with error code if tests failed
  process.exit(failedCount > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
