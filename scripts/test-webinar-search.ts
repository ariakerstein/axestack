/**
 * Test if webinar content (tier_3) is being returned in search results
 */

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ';

async function testSearch(question: string, cancerType: string = 'Prostate') {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: "${question}"`);
  console.log(`Cancer Type: ${cancerType}`);
  console.log(`${'='.repeat(70)}`);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/direct-navis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      question,
      model: 'claude-3-5-haiku',
      cancerType,
      conversationHistory: [],
    }),
  });

  const data = await res.json();

  console.log(`\nSearch Method: ${data.searchMethod || 'N/A'}`);
  console.log(`Chunks Used: ${data.chunksUsed || 'N/A'}`);
  console.log(`Latency: ${data.totalLatencyMs || 'N/A'}ms`);

  // Check for webinar content in citations
  const citations = data.citations || [];
  const webinarCitations = citations.filter((c: string) =>
    c.toLowerCase().includes('webinar') ||
    c.toLowerCase().includes('cancerpatientlab') ||
    c.toLowerCase().includes('bipolar')
  );

  console.log(`\nTotal Citations: ${citations.length}`);
  console.log(`Webinar Citations: ${webinarCitations.length}`);

  if (webinarCitations.length > 0) {
    console.log('\n✅ WEBINAR CONTENT FOUND:');
    webinarCitations.forEach((c: string, i: number) => {
      console.log(`  ${i + 1}. ${c}`);
    });
  } else {
    console.log('\n⚠️ NO WEBINAR CONTENT in citations');
  }

  console.log(`\nAll Citations:`);
  citations.slice(0, 8).forEach((c: string, i: number) => {
    console.log(`  ${i + 1}. ${c}`);
  });

  // Check debug info for tier breakdown
  if (data.debug?.search?.tierBreakdown) {
    console.log(`\nTier Breakdown:`);
    console.log(JSON.stringify(data.debug.search.tierBreakdown, null, 2));
  }

  console.log(`\nAnswer Preview (first 400 chars):`);
  console.log(data.answer?.substring(0, 400) + '...');

  return data;
}

async function main() {
  // Test 1: Direct BAT question
  await testSearch('What is Bipolar Androgen Therapy and how does it work?', 'Prostate');

  // Test 2: General prostate question (should get mix of NCCN + webinars)
  await testSearch('What is a Gleason score?', 'Prostate');
}

main().catch(console.error);
