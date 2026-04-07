// Test the url-preview edge function
// Run with: npx tsx scripts/test-url-preview.ts

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0.6tBcyoVGBe78fdgir8KjKxYQqXzLWpnDqJ7xgMPxwEY';

async function testUrlPreview(testUrl: string) {
  console.log(`\n🔍 Testing URL: ${testUrl}\n`);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/url-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ url: testUrl }),
    });

    console.log(`HTTP Status: ${response.status}`);

    const data = await response.json();

    if (data.success && data.metadata) {
      const m = data.metadata;
      console.log('\n✅ SUCCESS! Extracted metadata:\n');
      console.log(`  Title:        ${m.title?.substring(0, 60)}...`);
      console.log(`  Source:       ${m.source}`);
      console.log(`  Authors:      ${m.authors?.slice(0, 3).join(', ')}${m.authors?.length > 3 ? '...' : ''}`);
      console.log(`  Date:         ${m.publicationDate}`);
      console.log(`  Cancer Type:  ${m.cancerType || 'Not detected'}`);
      console.log(`  Content Tier: ${m.contentTier}`);
      console.log(`  Content Type: ${m.contentType}`);
      console.log(`  Tags:         ${m.tags?.slice(0, 4).join(', ')}${m.tags?.length > 4 ? '...' : ''}`);
      console.log(`  Word Count:   ${m.wordCount?.toLocaleString()}`);
      console.log(`  DOI:          ${m.doi || 'N/A'}`);
      console.log(`  PMID:         ${m.pmid || 'N/A'}`);
      console.log(`  Confidence:   ${m.confidence?.overall}`);
      console.log(`\n  Abstract: ${m.abstract?.substring(0, 150)}...`);
    } else if (data.error) {
      console.log(`\n❌ ERROR: ${data.error}`);
    } else {
      console.log('\n❓ Unexpected response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }
}

// Test with the PMC article
const testUrl = process.argv[2] || 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6219292/';
testUrlPreview(testUrl);
