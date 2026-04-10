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

  // Step 1: Check if rag_sources table exists
  const { error: checkError } = await supabase.from('rag_sources').select('id').limit(1)
  if (checkError?.code === '42P01') {
    results.push({ step: 'create_table', success: false, error: 'Table does not exist. Run migration manually via Supabase dashboard.' })
  } else if (checkError) {
    results.push({ step: 'create_table', success: false, error: checkError.message })
  } else {
    results.push({ step: 'create_table', success: true, error: 'Table exists' })
  }

  // Step 2: Check if guideline_chunks has source_id column
  const { error: colError } = await supabase
    .from('guideline_chunks')
    .select('source_id')
    .limit(1)

  if (colError?.message?.includes('source_id')) {
    results.push({
      step: 'add_source_id_column',
      success: false,
      error: 'Column source_id may not exist. Run ALTER TABLE manually.'
    })
  } else {
    results.push({ step: 'add_source_id_column', success: true, error: 'Column exists' })
  }

  // Step 3: Get current state
  const { count: sourceCount } = await supabase
    .from('rag_sources')
    .select('*', { count: 'exact', head: true })

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
