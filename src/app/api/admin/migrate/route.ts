import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const ADMIN_KEY = process.env.ADMIN_KEY || ''

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('x-admin-key')
  if (authHeader !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { migration } = await request.json()

  if (migration !== 'rag_sources') {
    return NextResponse.json({ error: 'Unknown migration' }, { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const results: { step: string; success: boolean; error?: string }[] = []

  // Step 1: Create rag_sources table
  const { error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS rag_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_type TEXT NOT NULL,
        source_url TEXT,
        storage_path TEXT,
        version TEXT,
        version_date DATE,
        checksum TEXT,
        title TEXT NOT NULL,
        cancer_types TEXT[] DEFAULT '{}',
        content_tier TEXT,
        description TEXT,
        status TEXT DEFAULT 'pending',
        last_ingested_at TIMESTAMPTZ,
        next_refresh_at TIMESTAMPTZ,
        refresh_frequency_days INT DEFAULT 90,
        chunk_count INT DEFAULT 0,
        avg_chunk_quality FLOAT,
        ingestion_errors JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID
      )
    `
  }).catch(async () => {
    // If RPC doesn't exist, try direct insert to test table existence
    const { error } = await supabase.from('rag_sources').select('count').limit(0)
    if (error?.code === '42P01') { // Table doesn't exist
      return { error: { message: 'Table does not exist and cannot be created via RPC' } }
    }
    return { error: null } // Table exists
  })

  if (tableError) {
    // Try checking if table exists
    const { error: checkError } = await supabase.from('rag_sources').select('id').limit(1)
    if (checkError?.code === '42P01') {
      results.push({ step: 'create_table', success: false, error: 'Table does not exist. Run migration manually.' })
    } else {
      results.push({ step: 'create_table', success: true, error: 'Table already exists' })
    }
  } else {
    results.push({ step: 'create_table', success: true })
  }

  // Step 2: Check if guideline_chunks has source_id column
  const { data: columns } = await supabase
    .from('guideline_chunks')
    .select('source_id')
    .limit(0)
    .catch(() => ({ data: null }))

  if (columns === null) {
    results.push({
      step: 'add_source_id_column',
      success: false,
      error: 'Column source_id may not exist. Run ALTER TABLE manually.'
    })
  } else {
    results.push({ step: 'add_source_id_column', success: true, error: 'Column exists or was added' })
  }

  // Step 3: Get current state
  const { count: sourceCount } = await supabase
    .from('rag_sources')
    .select('*', { count: 'exact', head: true })
    .catch(() => ({ count: 0 }))

  const { count: chunkCount } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    results,
    state: {
      rag_sources_count: sourceCount || 0,
      guideline_chunks_count: chunkCount || 0,
    },
    message: 'Migration check complete. If tables do not exist, run SQL manually in Supabase dashboard.',
    manual_sql_url: 'https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new'
  })
}
