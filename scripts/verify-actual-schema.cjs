require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔍 Verifying actual database schema for document_conversation_messages...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
  // Try the old schema (message_type, content, sequence_number)
  console.log('Testing OLD schema (message_type, content, sequence_number)...');
  const { data: oldSchemaTest, error: oldError } = await supabase
    .from('document_conversation_messages')
    .select('message_type, content, sequence_number')
    .limit(0);

  if (oldError) {
    console.log('❌ OLD schema failed:', oldError.message);
  } else {
    console.log('✅ OLD schema works!');
  }

  // Try the new schema (question, answer, message_sequence)
  console.log('\nTesting NEW schema (question, answer, message_sequence)...');
  const { data: newSchemaTest, error: newError } = await supabase
    .from('document_conversation_messages')
    .select('question, answer, message_sequence')
    .limit(0);

  if (newError) {
    console.log('❌ NEW schema failed:', newError.message);
  } else {
    console.log('✅ NEW schema works!');
  }

  // Try to get all columns with *
  console.log('\nGetting all columns with SELECT *...');
  const { data: allData, error: allError } = await supabase
    .from('document_conversation_messages')
    .select('*')
    .limit(1);

  if (allError) {
    console.log('❌ SELECT * failed:', allError.message);
  } else if (allData && allData.length > 0) {
    console.log('✅ Found columns:', Object.keys(allData[0]).join(', '));
  } else {
    console.log('⚠️  Table is empty, cannot determine columns');
  }
}

verifySchema();
