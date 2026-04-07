require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔍 Checking response_evaluations table...\n');
console.log('Using URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('Using Key:', supabaseKey ? '✓ Set' : '✗ Missing');
console.log('');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEvaluations() {
  try {
    // Check total count
    const { count, error: countError } = await supabase
      .from('response_evaluations')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting evaluations:', JSON.stringify(countError, null, 2));
      console.log('\n💡 This might be an RLS (Row Level Security) issue.');
      console.log('   Trying to fetch without count...\n');
    }

    if (!countError) {
      console.log(`📊 Total evaluations in table: ${count || 0}`);
      console.log('');
    }

    // Get recent evaluations - try with just select all first
    const { data, error } = await supabase
      .from('response_evaluations')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Error fetching evaluations:', JSON.stringify(error, null, 2));
      console.log('\n🔍 Checking RLS policies...');
      console.log('   The table exists but queries are failing.');
      console.log('   This is likely an RLS policy issue preventing anonymous access.');
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Successfully fetched evaluations!');
      console.log(`📊 Found ${data.length} evaluations\n`);
      console.log('📋 First evaluation columns:', Object.keys(data[0]).join(', '));
      console.log('\n📋 Recent evaluations:');
      data.forEach((eval, idx) => {
        console.log(`\n${idx + 1}. ID: ${eval.id ? eval.id.substring(0, 8) + '...' : 'N/A'}`);
        console.log(`   Date: ${eval.created_at || eval.evaluated_at || 'N/A'}`);
        console.log(`   Question: ${eval.question ? eval.question.substring(0, 60) + '...' : 'N/A'}`);
        console.log(`   Confidence: ${eval.overall_confidence || 'N/A'} (${eval.confidence_level || 'N/A'})`);
      });
    } else {
      console.log('⚠️  No evaluations found in the table');
      console.log('');
      console.log('💡 This means:');
      console.log('   - No AI questions have been asked yet, OR');
      console.log('   - The direct-navis function is not saving evaluations, OR');
      console.log('   - There\'s an RLS policy blocking access');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkEvaluations();
