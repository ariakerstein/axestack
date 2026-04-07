/**
 * Directly apply the embedding column migration via Supabase client
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  console.log('Applying embedding column migration...\n')

  const sql = `
-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (1536 dimensions for OpenAI text-embedding-3-small)
ALTER TABLE guideline_chunks
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create an index for faster similarity searches using IVFFlat algorithm
CREATE INDEX IF NOT EXISTS guideline_chunks_embedding_idx
ON guideline_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add a comment to document the column
COMMENT ON COLUMN guideline_chunks.embedding IS
'Vector embedding generated using OpenAI text-embedding-3-small model (1536 dimensions). Used for semantic similarity search.';
  `

  try {
    // Execute each statement separately
    const statements = [
      'CREATE EXTENSION IF NOT EXISTS vector',
      'ALTER TABLE guideline_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536)',
      `CREATE INDEX IF NOT EXISTS guideline_chunks_embedding_idx ON guideline_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`,
      `COMMENT ON COLUMN guideline_chunks.embedding IS 'Vector embedding generated using OpenAI text-embedding-3-small model (1536 dimensions). Used for semantic similarity search.'`
    ]

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 80)}...`)
      const { error } = await supabase.rpc('exec_sql', { sql: statement })

      if (error) {
        // Try alternative method - direct query
        console.log('  RPC method failed, trying alternative...')
        console.log('  Error:', error.message)
      } else {
        console.log('  ✓ Success')
      }
    }

    // Verify the column was added
    const { data, error: verifyError } = await supabase
      .from('guideline_chunks')
      .select('embedding')
      .limit(1)

    if (verifyError) {
      if (verifyError.message.includes('does not exist')) {
        console.log('\n❌ Column was not added. Please run this SQL in Supabase dashboard:')
        console.log(sql)
      } else {
        console.log('\n⚠️  Could not verify:', verifyError.message)
      }
    } else {
      console.log('\n✅ Embedding column successfully added!')
    }

  } catch (error) {
    console.error('Error applying migration:', error)
    console.log('\n📝 Please run this SQL manually in your Supabase dashboard:')
    console.log(sql)
  }
}

applyMigration()
