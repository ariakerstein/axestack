/**
 * Add embedding column to guideline_chunks table
 * This is required before we can generate and store embeddings
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function addEmbeddingColumn() {
  console.log('Adding embedding column to guideline_chunks table...\n')

  // First, check if column already exists
  const { data: columns, error: checkError } = await supabase
    .rpc('get_table_columns', { table_name: 'guideline_chunks' })

  if (!checkError && columns) {
    const hasEmbedding = columns.some((col: any) => col.column_name === 'embedding')
    if (hasEmbedding) {
      console.log('✓ Embedding column already exists!')
      return
    }
  }

  // SQL to add the embedding column with proper vector type
  const sql = `
    -- Add embedding column for vector embeddings (1536 dimensions for OpenAI text-embedding-3-small)
    ALTER TABLE guideline_chunks
    ADD COLUMN IF NOT EXISTS embedding vector(1536);

    -- Create an index for faster similarity searches
    CREATE INDEX IF NOT EXISTS guideline_chunks_embedding_idx
    ON guideline_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

    -- Add a comment to document the column
    COMMENT ON COLUMN guideline_chunks.embedding IS
    'Vector embedding generated using OpenAI text-embedding-3-small model (1536 dimensions)';
  `

  console.log('Executing SQL to add embedding column...')

  try {
    // Note: Supabase client doesn't support raw SQL execution directly
    // We need to run this via the Supabase dashboard or use the RPC endpoint
    console.log('\n⚠️  Please run the following SQL in your Supabase dashboard:')
    console.log('─'.repeat(60))
    console.log(sql)
    console.log('─'.repeat(60))
    console.log('\nSteps:')
    console.log('1. Go to https://supabase.com/dashboard')
    console.log('2. Select your project')
    console.log('3. Go to SQL Editor')
    console.log('4. Paste and run the SQL above')
    console.log('\nOr run via CLI:')
    console.log('npx supabase db execute --sql "' + sql.replace(/\n/g, ' ').replace(/\s+/g, ' ') + '"')

  } catch (error) {
    console.error('Error:', error)
  }
}

addEmbeddingColumn()
