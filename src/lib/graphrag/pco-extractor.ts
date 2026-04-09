/**
 * PCO Extractor for OpenCancer.ai GraphRAG
 *
 * Extracts and assembles a Patient Context Object (PCO) from multiple sources:
 * 1. Profile data (if authenticated)
 * 2. patient_entities table
 * 3. entity_relationships table
 * 4. Graph traversal for related entities
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  PatientContextObject,
  PCODiagnosis,
  PCOBiomarker,
  PCOTreatment,
  PCORelatedEntity,
  PatientEntityRow,
  EntityRelationshipRow,
  TraversalConfig,
  TreatmentType,
  TreatmentStatus,
  BiomarkerResultType,
  BiomarkerSource,
  RelationshipType,
} from './types'

// ============================================================================
// Supabase Client
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

let supabaseInstance: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY)
  }
  return supabaseInstance
}

// ============================================================================
// Entity Type Mappings
// ============================================================================

const TREATMENT_TYPE_MAP: Record<string, TreatmentType> = {
  chemotherapy: 'chemotherapy',
  chemo: 'chemotherapy',
  targeted: 'targeted',
  'targeted therapy': 'targeted',
  immunotherapy: 'immunotherapy',
  'immune therapy': 'immunotherapy',
  surgery: 'surgery',
  'surgical': 'surgery',
  radiation: 'radiation',
  'radiation therapy': 'radiation',
  radiotherapy: 'radiation',
  hormonal: 'hormonal',
  'hormone therapy': 'hormonal',
  'endocrine therapy': 'hormonal',
  'stem cell': 'stem_cell',
  'bone marrow transplant': 'stem_cell',
  'clinical trial': 'clinical_trial',
}

const BIOMARKER_POSITIVE_KEYWORDS = ['positive', '+', 'detected', 'present', 'mutant', 'mutation', 'amplified', 'overexpressed']
const BIOMARKER_NEGATIVE_KEYWORDS = ['negative', '-', 'not detected', 'absent', 'wild type', 'normal']

// ============================================================================
// Helper Functions
// ============================================================================

function inferTreatmentType(value: string): TreatmentType {
  const lower = value.toLowerCase()

  for (const [keyword, type] of Object.entries(TREATMENT_TYPE_MAP)) {
    if (lower.includes(keyword)) {
      return type
    }
  }

  // Specific drug mappings
  if (lower.includes('osimertinib') || lower.includes('erlotinib') || lower.includes('gefitinib') ||
      lower.includes('olaparib') || lower.includes('niraparib') || lower.includes('rucaparib') ||
      lower.includes('trastuzumab') || lower.includes('pertuzumab') || lower.includes('palbociclib')) {
    return 'targeted'
  }

  if (lower.includes('pembrolizumab') || lower.includes('nivolumab') || lower.includes('atezolizumab') ||
      lower.includes('ipilimumab') || lower.includes('durvalumab')) {
    return 'immunotherapy'
  }

  if (lower.includes('tamoxifen') || lower.includes('letrozole') || lower.includes('anastrozole') ||
      lower.includes('lupron') || lower.includes('enzalutamide') || lower.includes('abiraterone')) {
    return 'hormonal'
  }

  if (lower.includes('carboplatin') || lower.includes('cisplatin') || lower.includes('paclitaxel') ||
      lower.includes('docetaxel') || lower.includes('folfox') || lower.includes('folfiri')) {
    return 'chemotherapy'
  }

  return 'other'
}

function inferTreatmentStatus(entity: PatientEntityRow): TreatmentStatus {
  const status = entity.entity_status?.toLowerCase() || ''
  const value = entity.entity_value?.toLowerCase() || ''

  if (status.includes('current') || status.includes('active') || status.includes('ongoing')) {
    return 'current'
  }
  if (status.includes('completed') || status.includes('finished') || status.includes('stopped')) {
    return 'completed'
  }
  if (status.includes('planned') || status.includes('scheduled') || status.includes('upcoming')) {
    return 'planned'
  }
  if (status.includes('discontinued') || status.includes('stopped due to')) {
    return 'discontinued'
  }

  // Check if there's an end date
  if (entity.entity_date) {
    const entityDate = new Date(entity.entity_date)
    const now = new Date()
    if (entityDate < now) {
      return 'completed'
    }
  }

  return 'current' // Default assumption
}

function inferBiomarkerResultType(entity: PatientEntityRow): BiomarkerResultType {
  const value = entity.entity_value?.toLowerCase() || ''
  const status = entity.entity_status?.toLowerCase() || ''

  if (entity.numeric_value !== null) {
    return 'numeric'
  }

  if (BIOMARKER_POSITIVE_KEYWORDS.some(k => value.includes(k) || status.includes(k))) {
    return 'positive'
  }

  if (BIOMARKER_NEGATIVE_KEYWORDS.some(k => value.includes(k) || status.includes(k))) {
    return 'negative'
  }

  return 'unknown'
}

function inferBiomarkerSource(entity: PatientEntityRow): BiomarkerSource {
  const value = entity.entity_value?.toLowerCase() || ''
  const text = entity.source_text?.toLowerCase() || ''
  const metadata = entity.metadata as Record<string, unknown> || {}

  if (value.includes('germline') || text.includes('germline') || metadata.source === 'germline') {
    return 'germline'
  }

  if (value.includes('somatic') || text.includes('somatic') || text.includes('tumor') || metadata.source === 'somatic') {
    return 'somatic'
  }

  // BRCA mutations are often germline by default
  if (value.includes('brca') && !value.includes('somatic')) {
    return 'germline'
  }

  return 'unknown'
}

function extractBiomarkerName(value: string): string {
  // Extract clean biomarker name from entity value
  // e.g., "BRCA2 pathogenic mutation" -> "BRCA2"
  // e.g., "ER positive 95%" -> "ER"
  // e.g., "PD-L1 TPS 80%" -> "PD-L1"

  const knownBiomarkers = [
    'BRCA1', 'BRCA2', 'EGFR', 'ALK', 'ROS1', 'KRAS', 'NRAS', 'BRAF', 'HER2',
    'ER', 'PR', 'PD-L1', 'MSI', 'TMB', 'PIK3CA', 'ATM', 'PALB2', 'CHEK2',
    'TP53', 'RB1', 'PTEN', 'APC', 'MLH1', 'MSH2', 'MSH6', 'PMS2'
  ]

  const upper = value.toUpperCase()

  for (const marker of knownBiomarkers) {
    if (upper.includes(marker)) {
      return marker
    }
  }

  // Return first word if no known marker found
  return value.split(/\s+/)[0]
}

function calculateCompletenessScore(pco: Partial<PatientContextObject>): number {
  let score = 0
  const maxScore = 10

  // Has diagnosis (3 points)
  if (pco.diagnoses && pco.diagnoses.length > 0) {
    score += 3
    // Bonus for stage
    if (pco.diagnoses.some(d => d.stage)) score += 0.5
    // Bonus for histology
    if (pco.diagnoses.some(d => d.histology)) score += 0.5
  }

  // Has biomarkers (3 points)
  if (pco.biomarkers && pco.biomarkers.length > 0) {
    score += 2
    // Bonus for multiple biomarkers
    if (pco.biomarkers.length >= 3) score += 1
  }

  // Has treatments (2 points)
  if (pco.treatments && pco.treatments.length > 0) {
    score += 2
  }

  // Has related entities from graph (1 point)
  if (pco.related_entities && pco.related_entities.length > 0) {
    score += 1
  }

  return Math.min(score / maxScore, 1)
}

// ============================================================================
// Main PCO Extractor
// ============================================================================

export interface ExtractPCOOptions {
  userId?: string | null
  sessionId: string
  traversalConfig?: TraversalConfig
  includeRelatedEntities?: boolean
}

/**
 * Extract a Patient Context Object from all available sources
 */
export async function extractPCO(options: ExtractPCOOptions): Promise<PatientContextObject> {
  const {
    userId,
    sessionId,
    traversalConfig = { max_hops: 2, min_confidence: 0.5, max_results: 100 },
    includeRelatedEntities = true
  } = options

  const supabase = getSupabase()
  const startTime = Date.now()

  // 1. Fetch profile data (if user is authenticated)
  let profile: PatientContextObject['profile'] | undefined
  if (userId) {
    const { data: profileData } = await supabase
      .from('opencancer_profiles')
      .select('email, name, role, location')
      .eq('user_id', userId)
      .single()

    if (profileData) {
      profile = {
        email: profileData.email,
        name: profileData.name,
        role: profileData.role,
        location: profileData.location
      }
    }
  }

  // Also check by session
  if (!profile) {
    const { data: sessionProfile } = await supabase
      .from('opencancer_profiles')
      .select('email, name, role, location')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (sessionProfile) {
      profile = {
        email: sessionProfile.email,
        name: sessionProfile.name,
        role: sessionProfile.role,
        location: sessionProfile.location
      }
    }
  }

  // 2. Fetch all patient entities
  let query = supabase
    .from('patient_entities')
    .select('*')
    .order('confidence', { ascending: false })

  if (userId) {
    query = query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`)
  } else {
    query = query.eq('session_id', sessionId)
  }

  const { data: entities, error: entitiesError } = await query.limit(500)

  if (entitiesError) {
    console.error('Error fetching entities:', entitiesError)
  }

  const entityList = (entities || []) as PatientEntityRow[]

  // 3. Categorize entities into PCO clusters
  const diagnoses: PCODiagnosis[] = []
  const biomarkers: PCOBiomarker[] = []
  const treatments: PCOTreatment[] = []
  const symptoms: PatientContextObject['symptoms'] = []
  const labResults: PatientContextObject['lab_results'] = []

  for (const entity of entityList) {
    const sourceType = (entity.metadata as Record<string, string>)?.source_type || 'records'

    switch (entity.entity_type) {
      case 'diagnosis':
      case 'cancer_type':
        // Check if we already have this diagnosis
        const existingDiag = diagnoses.find(d =>
          d.cancer_type.toLowerCase() === entity.entity_value.toLowerCase()
        )
        if (!existingDiag) {
          diagnoses.push({
            cancer_type: entity.entity_value,
            histology: (entity.metadata as Record<string, string>)?.histology,
            stage: entity.entity_status || (entity.metadata as Record<string, string>)?.stage,
            grade: (entity.metadata as Record<string, string>)?.grade,
            primary_site: (entity.metadata as Record<string, string>)?.primary_site,
            date_of_diagnosis: entity.entity_date || undefined,
            confidence: entity.confidence,
            source: sourceType as PCODiagnosis['source']
          })
        }
        break

      case 'stage':
        // Add stage to existing diagnosis
        const diagForStage = diagnoses[0]
        if (diagForStage && !diagForStage.stage) {
          diagForStage.stage = entity.entity_value
        }
        break

      case 'biomarker':
        const biomarkerName = extractBiomarkerName(entity.entity_value)
        // Check if we already have this biomarker
        const existingBiomarker = biomarkers.find(b =>
          b.name.toUpperCase() === biomarkerName.toUpperCase()
        )
        if (!existingBiomarker) {
          biomarkers.push({
            name: biomarkerName,
            value: entity.entity_value,
            result_type: inferBiomarkerResultType(entity),
            source: inferBiomarkerSource(entity),
            numeric_value: entity.numeric_value || undefined,
            numeric_unit: entity.numeric_unit || undefined,
            test_date: entity.entity_date || undefined,
            confidence: entity.confidence
          })
        }
        break

      case 'treatment':
      case 'medication':
        // Filter out non-treatment entities
        const NON_TREATMENT = ['monitoring', 'observation', 'follow-up', 'watchful waiting', 'active surveillance']
        if (NON_TREATMENT.some(t => entity.entity_value.toLowerCase().includes(t))) {
          break
        }

        const existingTreatment = treatments.find(t =>
          t.name.toLowerCase() === entity.entity_value.toLowerCase()
        )
        if (!existingTreatment) {
          treatments.push({
            name: entity.entity_value,
            type: inferTreatmentType(entity.entity_value),
            status: inferTreatmentStatus(entity),
            start_date: entity.entity_date || undefined,
            line_of_therapy: (entity.metadata as Record<string, number>)?.line_of_therapy,
            confidence: entity.confidence
          })
        }
        break

      case 'symptom':
        symptoms.push({
          name: entity.entity_value,
          severity: entity.entity_status || undefined,
          onset_date: entity.entity_date || undefined,
          related_to: (entity.metadata as Record<string, string>)?.related_to
        })
        break

      case 'lab_result':
        if (entity.numeric_value !== null) {
          labResults.push({
            name: entity.entity_value,
            value: entity.numeric_value,
            unit: entity.numeric_unit || '',
            reference_range: entity.reference_range || undefined,
            date: entity.entity_date || undefined,
            status: entity.entity_status as 'normal' | 'elevated' | 'low' || undefined
          })
        }
        break
    }
  }

  // 4. Fetch relationships for graph traversal
  let relatedEntities: PCORelatedEntity[] = []
  let relationshipCount = 0

  if (includeRelatedEntities && entityList.length > 0) {
    const entityIds = entityList.map(e => e.id)

    // Get direct relationships
    const { data: relationships } = await supabase
      .from('entity_relationships')
      .select('*')
      .or(`entity_a_id.in.(${entityIds.join(',')}),entity_b_id.in.(${entityIds.join(',')})`)
      .gte('confidence', traversalConfig.min_confidence || 0.5)
      .limit(traversalConfig.max_results || 100)

    relationshipCount = relationships?.length || 0

    // Build related entities from relationships
    if (relationships && relationships.length > 0) {
      const relatedEntityIds = new Set<string>()

      for (const rel of relationships as EntityRelationshipRow[]) {
        // Find the "other" entity in the relationship
        const isEntityA = entityIds.includes(rel.entity_a_id)
        const relatedId = isEntityA ? rel.entity_b_id : rel.entity_a_id

        if (!relatedEntityIds.has(relatedId)) {
          relatedEntityIds.add(relatedId)
        }
      }

      // Fetch the related entity details
      if (relatedEntityIds.size > 0) {
        const { data: relatedEntityData } = await supabase
          .from('patient_entities')
          .select('id, entity_type, entity_value, confidence')
          .in('id', Array.from(relatedEntityIds))
          .limit(50)

        if (relatedEntityData) {
          for (const entity of relatedEntityData) {
            // Find the relationship that connects this entity
            const rel = relationships.find((r: EntityRelationshipRow) =>
              r.entity_a_id === entity.id || r.entity_b_id === entity.id
            ) as EntityRelationshipRow | undefined

            relatedEntities.push({
              entity_id: entity.id,
              entity_type: entity.entity_type,
              entity_value: entity.entity_value,
              relationship: (rel?.relationship_type as RelationshipType) || 'indicates',
              relationship_direction: rel?.entity_a_id === entity.id ? 'incoming' : 'outgoing',
              confidence: entity.confidence,
              hop_distance: 1
            })
          }
        }
      }
    }
  }

  // 5. Count source records
  const { count: recordCount } = await supabase
    .from('medical_records')
    .select('*', { count: 'exact', head: true })
    .or(`user_id.eq.${userId || 'null'},session_id.eq.${sessionId}`)

  // 6. Assemble the PCO
  const pco: PatientContextObject = {
    user_id: userId || undefined,
    session_id: sessionId,
    extracted_at: new Date().toISOString(),
    profile,
    diagnoses,
    biomarkers,
    treatments,
    symptoms,
    lab_results: labResults,
    related_entities: relatedEntities,
    communities: [], // Will be populated by community detection (Phase 2+)
    entity_count: entityList.length,
    relationship_count: relationshipCount,
    source_record_count: recordCount || 0,
    completeness_score: 0, // Calculated below
    has_diagnosis: diagnoses.length > 0,
    has_biomarkers: biomarkers.length > 0,
    has_treatments: treatments.length > 0,
    has_records: (recordCount || 0) > 0
  }

  // Calculate completeness score
  pco.completeness_score = calculateCompletenessScore(pco)

  console.log(`[PCO] Extracted in ${Date.now() - startTime}ms: ${diagnoses.length} diagnoses, ${biomarkers.length} biomarkers, ${treatments.length} treatments`)

  return pco
}

/**
 * Quick check if a user/session has enough data for meaningful PCO
 */
export async function hasSufficientData(userId?: string | null, sessionId?: string): Promise<boolean> {
  if (!sessionId && !userId) return false

  const supabase = getSupabase()

  let query = supabase
    .from('patient_entities')
    .select('entity_type', { count: 'exact', head: true })

  if (userId) {
    query = query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`)
  } else if (sessionId) {
    query = query.eq('session_id', sessionId)
  }

  const { count } = await query

  // Require at least 3 entities for a meaningful PCO
  return (count || 0) >= 3
}

/**
 * Get a minimal PCO for quick lookups (no graph traversal)
 */
export async function extractMinimalPCO(options: { userId?: string | null; sessionId: string }): Promise<Partial<PatientContextObject>> {
  return extractPCO({
    ...options,
    includeRelatedEntities: false,
    traversalConfig: { max_hops: 0 }
  })
}
