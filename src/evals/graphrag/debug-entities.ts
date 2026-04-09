/**
 * Debug script to check entity accessibility
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function check() {
  console.log('🔍 Checking database access...\n')

  // Check total entities
  const { count: entityCount, error: entityError } = await supabase
    .from('patient_entities')
    .select('*', { count: 'exact', head: true })
  console.log('Total entities in DB:', entityCount, entityError ? `(Error: ${entityError.message})` : '')

  // Check total combat analyses
  const { count: analysisCount, error: analysisError } = await supabase
    .from('combat_analyses')
    .select('*', { count: 'exact', head: true })
  console.log('Total combat_analyses:', analysisCount, analysisError ? `(Error: ${analysisError.message})` : '')

  // Get a sample combat analysis
  const { data: sample, error: sampleError } = await supabase
    .from('combat_analyses')
    .select('id, user_id, session_id, records_summary')
    .limit(3)
  console.log('\nSample analyses:', sample?.length, sampleError ? `(Error: ${sampleError.message})` : '')
  if (sample) {
    for (const s of sample) {
      console.log(`  - ID: ${s.id?.slice(0, 8)}... user: ${s.user_id?.slice(0, 8) || 'null'} session: ${s.session_id?.slice(0, 8) || 'null'}`)
    }
  }

  // Try to get entities for that session
  if (sample && sample[0]) {
    const s = sample[0]
    console.log(`\n🔎 Looking for entities for session: ${s.session_id}`)

    const { data: entities, error } = await supabase
      .from('patient_entities')
      .select('id, entity_type, entity_value')
      .eq('session_id', s.session_id)
      .limit(10)

    console.log('Entities found:', entities?.length || 0, error ? `(Error: ${error.message})` : '')
    if (entities && entities.length > 0) {
      for (const e of entities) {
        console.log(`  - ${e.entity_type}: ${e.entity_value.slice(0, 40)}`)
      }
    }

    // Also try by user_id
    if (s.user_id) {
      console.log(`\n🔎 Looking for entities for user: ${s.user_id}`)
      const { data: userEntities, error: userError } = await supabase
        .from('patient_entities')
        .select('id, entity_type, entity_value')
        .eq('user_id', s.user_id)
        .limit(10)

      console.log('Entities found:', userEntities?.length || 0, userError ? `(Error: ${userError.message})` : '')
      if (userEntities && userEntities.length > 0) {
        for (const e of userEntities) {
          console.log(`  - ${e.entity_type}: ${e.entity_value.slice(0, 40)}`)
        }
      }
    }
  }

  // Check entities with any session_id
  console.log('\n📊 Checking entities with session_ids...')
  const { data: anyEntities, error: anyError } = await supabase
    .from('patient_entities')
    .select('id, session_id, user_id, entity_type')
    .not('session_id', 'is', null)
    .limit(10)
  console.log('Entities with session_id:', anyEntities?.length || 0, anyError ? `(Error: ${anyError.message})` : '')

  // Check if session IDs match between tables
  if (anyEntities && anyEntities.length > 0 && sample) {
    const entitySessions = new Set(anyEntities.map(e => e.session_id))
    const analysisSessions = new Set(sample.map(a => a.session_id))

    const overlap = [...entitySessions].filter(s => analysisSessions.has(s))
    console.log('\nSession ID overlap:', overlap.length > 0 ? overlap : 'NONE - this is the problem!')
  }

  // Get distinct session IDs from entities
  const { data: entitySessionSample } = await supabase
    .from('patient_entities')
    .select('session_id')
    .not('session_id', 'is', null)
    .limit(5)
  console.log('\nSample entity session_ids:', entitySessionSample?.map(e => e.session_id?.slice(0, 12)))

  // Get distinct session IDs from analyses
  const { data: analysisSessionSample } = await supabase
    .from('combat_analyses')
    .select('session_id')
    .limit(5)
  console.log('Sample analysis session_ids:', analysisSessionSample?.map(a => a.session_id?.slice(0, 12)))
}

check().catch(console.error)
