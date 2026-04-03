import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  return createClient(SUPABASE_URL, key)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const nodeType = searchParams.get('nodeType')
  const nodeId = searchParams.get('nodeId')
  const hops = parseInt(searchParams.get('hops') || '1')

  // Auth check
  const authHeader = request.headers.get('x-admin-key')
  const adminKey = process.env.ADMIN_KEY || 'opencancer-admin-2024'
  if (authHeader !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()

    // If specific node requested, traverse from there
    if (nodeType && nodeId) {
      const { data: traversal, error: travError } = await supabase
        .rpc('traverse_patient_graph', {
          start_type: nodeType,
          start_id: nodeId,
          max_hops: Math.min(hops, 3) // Cap at 3 hops
        })

      if (travError) {
        console.error('Traversal error:', travError)
        // Fallback: direct edge query
        const { data: edges } = await supabase
          .from('patient_graph_edges_derived')
          .select('*')
          .or(`source_id.eq.${nodeId},target_id.eq.${nodeId}`)
          .limit(100)

        return NextResponse.json({
          startNode: { type: nodeType, id: nodeId },
          connected: edges || [],
          traversalAvailable: false
        })
      }

      return NextResponse.json({
        startNode: { type: nodeType, id: nodeId },
        traversal: traversal || [],
        hops
      })
    }

    // Otherwise, return graph overview
    // Get stats
    const { data: stats } = await supabase
      .from('patient_graph_stats')
      .select('*')
      .single()

    // Get top entities by type
    const { data: topDiagnoses } = await supabase
      .from('patient_entities')
      .select('entity_value, user_id')
      .in('entity_type', ['cancer_type', 'diagnosis'])
      .not('user_id', 'is', null)

    // Count diagnoses
    const diagnosisCounts: Record<string, number> = {}
    topDiagnoses?.forEach(d => {
      const key = d.entity_value.toLowerCase()
      diagnosisCounts[key] = (diagnosisCounts[key] || 0) + 1
    })
    const sortedDiagnoses = Object.entries(diagnosisCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    // Get top biomarkers
    const { data: topBiomarkers } = await supabase
      .from('patient_entities')
      .select('entity_value, user_id')
      .eq('entity_type', 'biomarker')
      .not('user_id', 'is', null)

    const biomarkerCounts: Record<string, number> = {}
    topBiomarkers?.forEach(b => {
      const key = b.entity_value.toLowerCase()
      biomarkerCounts[key] = (biomarkerCounts[key] || 0) + 1
    })
    const sortedBiomarkers = Object.entries(biomarkerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    // Get top treatments
    const { data: topTreatments } = await supabase
      .from('patient_entities')
      .select('entity_value, user_id')
      .eq('entity_type', 'treatment')
      .not('user_id', 'is', null)

    const treatmentCounts: Record<string, number> = {}
    topTreatments?.forEach(t => {
      const key = t.entity_value.toLowerCase()
      treatmentCounts[key] = (treatmentCounts[key] || 0) + 1
    })
    const sortedTreatments = Object.entries(treatmentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    // Get entity co-occurrence (what appears together)
    const { data: cooccurrence } = await supabase
      .from('entity_cooccurrence')
      .select('*')
      .limit(20)

    // Get similar patients
    const { data: similarPatients } = await supabase
      .from('patient_similarity')
      .select('*')
      .order('similarity_score', { ascending: false })
      .limit(10)

    // Build cross-tab: Diagnosis → Biomarkers → Treatments
    // Reuse already-fetched data (topDiagnoses, topBiomarkers, topTreatments all have user_id)
    const allEntitiesForCrossTab = [
      ...(topDiagnoses || []).map(d => ({ ...d, entity_type: 'diagnosis' })),
      ...(topBiomarkers || []).map(b => ({ ...b, entity_type: 'biomarker' })),
      ...(topTreatments || []).map(t => ({ ...t, entity_type: 'treatment' }))
    ]

    // Group by user to build cross-tab
    const userEntities: Record<string, { diagnoses: string[], biomarkers: string[], treatments: string[] }> = {}
    allEntitiesForCrossTab.forEach(e => {
      if (!e.user_id) return
      if (!userEntities[e.user_id]) {
        userEntities[e.user_id] = { diagnoses: [], biomarkers: [], treatments: [] }
      }
      const value = e.entity_value.toLowerCase()
      if (e.entity_type === 'diagnosis') {
        if (!userEntities[e.user_id].diagnoses.includes(value)) {
          userEntities[e.user_id].diagnoses.push(value)
        }
      } else if (e.entity_type === 'biomarker') {
        if (!userEntities[e.user_id].biomarkers.includes(value)) {
          userEntities[e.user_id].biomarkers.push(value)
        }
      } else if (e.entity_type === 'treatment') {
        if (!userEntities[e.user_id].treatments.includes(value)) {
          userEntities[e.user_id].treatments.push(value)
        }
      }
    })

    // Build cross-tab by diagnosis
    const crossTab: Record<string, { biomarkers: Record<string, number>, treatments: Record<string, number>, patientCount: number }> = {}
    Object.values(userEntities).forEach(user => {
      user.diagnoses.forEach(diag => {
        if (!crossTab[diag]) {
          crossTab[diag] = { biomarkers: {}, treatments: {}, patientCount: 0 }
        }
        crossTab[diag].patientCount++
        user.biomarkers.forEach(b => {
          crossTab[diag].biomarkers[b] = (crossTab[diag].biomarkers[b] || 0) + 1
        })
        user.treatments.forEach(t => {
          crossTab[diag].treatments[t] = (crossTab[diag].treatments[t] || 0) + 1
        })
      })
    })

    // Format cross-tab for API response
    const crossTabData = Object.entries(crossTab)
      .sort((a, b) => b[1].patientCount - a[1].patientCount)
      .slice(0, 10)
      .map(([diagnosis, data]) => ({
        diagnosis,
        patientCount: data.patientCount,
        topBiomarkers: Object.entries(data.biomarkers)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count })),
        topTreatments: Object.entries(data.treatments)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))
      }))

    // Get recent edges (relationships formed)
    const { data: recentEdges } = await supabase
      .from('patient_graph_edges_derived')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    // Build nodes for visualization
    const nodes: Array<{ id: string; type: string; label: string; size: number }> = []
    const edges: Array<{ source: string; target: string; relationship: string }> = []

    // Add diagnosis nodes
    sortedDiagnoses.forEach(d => {
      nodes.push({
        id: `diagnosis:${d.name}`,
        type: 'diagnosis',
        label: d.name,
        size: d.count
      })
    })

    // Add biomarker nodes
    sortedBiomarkers.forEach(b => {
      nodes.push({
        id: `biomarker:${b.name}`,
        type: 'biomarker',
        label: b.name,
        size: b.count
      })
    })

    // Add treatment nodes
    sortedTreatments.forEach(t => {
      nodes.push({
        id: `treatment:${t.name}`,
        type: 'treatment',
        label: t.name,
        size: t.count
      })
    })

    // Add co-occurrence edges
    cooccurrence?.forEach(co => {
      edges.push({
        source: co.entity_a,
        target: co.entity_b,
        relationship: `co_occurs (${co.patient_count} patients)`
      })
    })

    return NextResponse.json({
      stats: stats || {
        patient_count: 0,
        diagnosis_count: sortedDiagnoses.length,
        biomarker_count: sortedBiomarkers.length,
        treatment_count: sortedTreatments.length,
        record_count: 0,
        question_count: 0,
        total_edges: edges.length,
        similar_patient_pairs: similarPatients?.length || 0
      },
      topEntities: {
        diagnoses: sortedDiagnoses,
        biomarkers: sortedBiomarkers,
        treatments: sortedTreatments
      },
      cooccurrence: cooccurrence || [],
      crossTab: crossTabData,
      similarPatients: (similarPatients || []).map(sp => ({
        patientA: sp.patient_a?.substring(0, 8) + '...',
        patientB: sp.patient_b?.substring(0, 8) + '...',
        sharedEntities: sp.shared_entities,
        sharedValues: sp.shared_values?.slice(0, 5),
        similarity: Math.round((sp.similarity_score || 0) * 100) / 100
      })),
      visualization: {
        nodes,
        edges
      },
      recentEdges: (recentEdges || []).slice(0, 15).map(e => ({
        from: `${e.source_type}:${e.source_id?.substring(0, 8)}`,
        relationship: e.relationship,
        to: `${e.target_type}:${e.target_id?.substring(0, 20)}`,
        when: e.created_at
      }))
    })
  } catch (err) {
    console.error('Entity graph error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
