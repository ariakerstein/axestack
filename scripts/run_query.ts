import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function runQuery() {
  const { data, error } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, section_heading, url, content_type')
    .ilike('guideline_title', '%Finding%')
    .ilike('guideline_title', '%Clinical%Trial%')
    .eq('content_type', 'webinar')
    .limit(5)

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log(JSON.stringify(data, null, 2))
}

runQuery()
