import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://felofmlhqwcdpiyjgstx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Checking for URLs with wrong project ID (xobmvxatidcnbuwqptbe)...\n');

  // Check for URLs with wrong project ID
  const { data, error } = await supabase
    .from('guideline_chunks')
    .select('id, url, guideline_title')
    .like('url', '%xobmvxatidcnbuwqptbe%')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Found ' + (data ? data.length : 0) + ' sample chunks with bad URL:');
  if (data) {
    data.forEach(d => {
      console.log('- ID: ' + d.id + ', Title: ' + (d.guideline_title ? d.guideline_title.substring(0, 40) : 'N/A'));
      console.log('  URL: ' + d.url);
    });
  }

  // Count total
  const { count } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .like('url', '%xobmvxatidcnbuwqptbe%');

  console.log('\nTotal chunks with bad URL: ' + count);
}

main();
