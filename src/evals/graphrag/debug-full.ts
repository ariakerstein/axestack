/**
 * Full debug - check both anon access and RLS status
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function check() {
  console.log('🔍 Full Database Debug\n')

  // 1. Check what tables we can access
  console.log('=== TABLE ACCESS CHECK ===')

  const tables = [
    'patient_entities',
    'entity_relationships',
    'combat_analyses',
    'opencancer_profiles',
    'medical_records',
    'patient_summaries'
  ]

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      console.log(`${table}: ${count} rows ${error ? `(Error: ${error.message})` : '✓'}`)
    } catch (e) {
      console.log(`${table}: ERROR - ${e}`)
    }
  }

  // 2. Check for a specific user that has analyses
  console.log('\n=== USER DATA CHECK ===')

  const { data: analyses } = await supabase
    .from('combat_analyses')
    .select('user_id')
    .not('user_id', 'is', null)
    .limit(1)

  if (analyses && analyses[0]) {
    const userId = analyses[0].user_id
    console.log(`Found user with analyses: ${userId}`)

    // Check profile
    const { data: profile, error: profileErr } = await supabase
      .from('opencancer_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    console.log(`Profile for user: ${profile ? 'Found' : 'Not found'}`, profileErr?.message || '')

    // Check medical records
    const { count: recordCount } = await supabase
      .from('medical_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    console.log(`Medical records for user: ${recordCount}`)
  }

  // 3. Check admin endpoints context (what combat actually sees)
  console.log('\n=== COMBAT CONTEXT CHECK ===')

  const { data: sampleAnalysis } = await supabase
    .from('combat_analyses')
    .select('*')
    .limit(1)
    .single()

  if (sampleAnalysis) {
    console.log('Sample analysis records_summary:', sampleAnalysis.records_summary)
    console.log('Sample analysis has perspectives:', sampleAnalysis.perspectives?.length)

    // The perspectives themselves contain the context that was used
    if (sampleAnalysis.perspectives && sampleAnalysis.perspectives[0]) {
      const firstPerspective = sampleAnalysis.perspectives[0]
      console.log('\nFirst perspective:')
      console.log('  - Name:', firstPerspective.name)
      console.log('  - Confidence:', firstPerspective.confidence)
      console.log('  - Argument preview:', firstPerspective.argument?.slice(0, 100) + '...')
    }
  }

  // 4. Conclusion
  console.log('\n=== CONCLUSION ===')
  console.log(`
The issue is likely that patient_entities are stored with the SERVICE role key
but we're querying with ANON key. RLS may be blocking access.

For the eval to work, we need either:
1. Service role key in environment
2. RLS policy that allows anon reads
3. A different approach - analyze the combat_analyses.perspectives directly
   since they contain the AI's analysis

RECOMMENDATION: Use Option 3 - evaluate based on what's IN the combat_analyses
responses rather than trying to re-query the source data.
`)
}

check().catch(console.error)
