require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔍 Checking document_conversation_messages schema...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    // Try to query the table to see what columns are returned
    const { data, error } = await supabase
      .from('document_conversation_messages')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying table:', JSON.stringify(error, null, 2));
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Table exists and has data');
      console.log('📋 Columns in table:', Object.keys(data[0]).join(', '));
      console.log('\n📄 Sample record:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️  Table exists but is empty');
      console.log('   Trying to insert test data to see which columns are required...\n');

      // Try inserting with the current schema
      const testMessage = {
        conversation_id: '00000000-0000-0000-0000-000000000000', // Will fail FK but shows column error
        question: 'Test question',
        answer: 'Test answer',
        message_sequence: Date.now(),
        metadata: { test: true }
      };

      const { error: insertError } = await supabase
        .from('document_conversation_messages')
        .insert([testMessage]);

      if (insertError) {
        console.log('❌ Insert failed (expected):');
        console.log('Error code:', insertError.code);
        console.log('Error message:', insertError.message);
        console.log('Error details:', insertError.details);

        if (insertError.code === '42703') {
          console.log('\n💡 Column does not exist - migration needed');
        } else if (insertError.code === '23503') {
          console.log('\n✅ Columns exist! (FK constraint failed as expected)');
        }
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkSchema();
