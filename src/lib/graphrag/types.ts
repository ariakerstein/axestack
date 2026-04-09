/**
 * GraphRAG Types for OpenCancer.ai
 *
 * Patient Context Object (PCO) and related types for the 4-layer GraphRAG system.
 * This is the foundation for personalized cancer guidance using graph-guided retrieval.
 */

// ============================================================================
// Core Entity Types (aligned with patient_entities table)
// ============================================================================

export type EntityType =
  | 'diagnosis'
  | 'biomarker'
  | 'treatment'
  | 'medication'
  | 'procedure'
  | 'lab_result'
  | 'provider'
  | 'institution'
  | 'symptom'
  | 'vital_sign'
  | 'cancer_type'  // From profile
  | 'stage'        // From profile
  | 'role'         // patient/caregiver

export type RelationshipType =
  | 'treated_with'
  | 'indicates'
  | 'monitored_by'
  | 'responds_to'
  | 'sensitive_to'
  | 'resistant_to'
  | 'performed_at'
  | 'prescribed_by'
  | 'caused_by'

export type TreatmentType =
  | 'chemotherapy'
  | 'targeted'
  | 'immunotherapy'
  | 'surgery'
  | 'radiation'
  | 'hormonal'
  | 'stem_cell'
  | 'clinical_trial'
  | 'other'

export type TreatmentStatus =
  | 'current'
  | 'completed'
  | 'planned'
  | 'discontinued'

export type TreatmentResponse =
  | 'complete'
  | 'partial'
  | 'stable'
  | 'progression'
  | 'unknown'

export type BiomarkerResultType =
  | 'positive'
  | 'negative'
  | 'numeric'
  | 'unknown'

export type BiomarkerSource =
  | 'germline'
  | 'somatic'
  | 'unknown'

// ============================================================================
// Patient Context Object (PCO) - Core Data Structure
// ============================================================================

/**
 * Diagnosis information extracted from records or profile
 */
export interface PCODiagnosis {
  cancer_type: string           // e.g., "ovarian cancer"
  histology?: string            // e.g., "high-grade serous"
  stage?: string                // e.g., "IIIC"
  grade?: string                // e.g., "Grade 3"
  primary_site?: string         // e.g., "ovary"
  date_of_diagnosis?: string    // ISO date
  confidence: number            // 0-1
  source: 'profile' | 'records' | 'combat' | 'navis_chat'
}

/**
 * Biomarker information (genomic, protein expression, etc.)
 */
export interface PCOBiomarker {
  name: string                  // e.g., "BRCA2", "ER", "PD-L1"
  value?: string                // e.g., "pathogenic mutation", "95%"
  result_type: BiomarkerResultType
  source: BiomarkerSource
  numeric_value?: number        // e.g., 95 for "95% positive"
  numeric_unit?: string         // e.g., "%", "ng/mL"
  test_date?: string
  confidence: number
  // Actionability from OncoKB (future)
  actionability_tier?: 1 | 2 | 3 | 4  // OncoKB tiers
}

/**
 * Treatment information
 */
export interface PCOTreatment {
  name: string                  // e.g., "carboplatin/paclitaxel"
  type: TreatmentType
  status: TreatmentStatus
  start_date?: string
  end_date?: string
  response?: TreatmentResponse
  line_of_therapy?: number      // 1st line, 2nd line, etc.
  confidence: number
}

/**
 * Related entity from graph traversal
 */
export interface PCORelatedEntity {
  entity_id: string
  entity_type: EntityType
  entity_value: string
  relationship: RelationshipType
  relationship_direction: 'outgoing' | 'incoming'
  confidence: number
  hop_distance: number          // 1 = direct, 2 = 2-hop, etc.
}

/**
 * Community membership for "patients like you"
 */
export interface PCOCommunity {
  community_id: string
  level: 0 | 1 | 2              // Fine, medium, coarse
  affinity_score: number        // How well patient fits community
  community_title?: string      // Human-readable community description
  member_count?: number
}

/**
 * Patient Context Object (PCO)
 *
 * The structured representation of everything we know about a patient.
 * Used as input to all persona RAGs in the GraphRAG pipeline.
 */
export interface PatientContextObject {
  // Core identifiers
  user_id?: string
  session_id: string

  // Extracted/computed timestamp
  extracted_at: string          // ISO timestamp

  // Profile data (if authenticated)
  profile?: {
    email?: string
    name?: string
    role: 'patient' | 'caregiver'
    location?: string
  }

  // Diagnosis cluster
  diagnoses: PCODiagnosis[]

  // Biomarker cluster
  biomarkers: PCOBiomarker[]

  // Treatment cluster
  treatments: PCOTreatment[]

  // Additional entities (symptoms, labs, etc.)
  symptoms: Array<{
    name: string
    severity?: string
    onset_date?: string
    related_to?: string         // e.g., treatment name if side effect
  }>

  lab_results: Array<{
    name: string
    value: number
    unit: string
    reference_range?: string
    date?: string
    status?: 'normal' | 'elevated' | 'low'
  }>

  // Graph-derived context
  related_entities: PCORelatedEntity[]

  // Community memberships
  communities: PCOCommunity[]

  // Metadata
  entity_count: number          // Total entities in graph
  relationship_count: number    // Total relationships
  source_record_count: number   // Number of uploaded records

  // Quality indicators
  completeness_score: number    // 0-1, how complete is the PCO
  has_diagnosis: boolean
  has_biomarkers: boolean
  has_treatments: boolean
}

// ============================================================================
// Persona RAG Types
// ============================================================================

export type PersonaName =
  | 'SOC Advisor'
  | 'Molecular Oncologist'
  | 'Emerging Treatments'
  | 'Watch & Wait'
  | 'Whole Person'

export interface RetrievalResult {
  persona: PersonaName
  chunks: RetrievedChunk[]
  citations: Citation[]
  retrieval_time_ms: number
}

export interface RetrievedChunk {
  id: string
  content: string
  source: string                // e.g., "NCCN Ovarian Cancer v2.2024"
  relevance_score: number
  metadata?: Record<string, unknown>
}

export interface Citation {
  id: string
  title: string
  source: string
  url?: string
  accessed_date?: string
}

// ============================================================================
// Combat Response Types
// ============================================================================

export interface PersonaPerspective {
  persona: PersonaName
  claim: string
  evidence: string[]
  citations: Citation[]
  confidence: number
  ask_your_doctor: string[]     // Specific questions for their oncologist
  retrieval_sources: string[]   // Which sources were used
}

export interface CombatResponse {
  session_id: string
  query: string
  pco: PatientContextObject
  perspectives: PersonaPerspective[]
  synthesis: string
  quality_scores: {
    llm: number                 // 1-10
    rag: number                 // 1-10
    graph: number               // 1-10
  }
  response_time_ms: number
  created_at: string
}

// ============================================================================
// Feedback Types
// ============================================================================

export type FeedbackType = 'helpful' | 'not_helpful' | 'correction'

export interface CombatFeedback {
  feedback_id: string
  session_id: string
  perspective_id?: string
  feedback_type: FeedbackType
  correction_text?: string      // e.g., "My cancer type is actually lung, not breast"
  created_at: string
}

// ============================================================================
// Graph Traversal Types
// ============================================================================

export interface TraversalConfig {
  max_hops: number              // Default 2
  include_types?: EntityType[]  // Filter to specific types
  min_confidence?: number       // Default 0.5
  max_results?: number          // Default 100
}

export interface TraversalResult {
  entity_id: string
  entity_type: EntityType
  entity_value: string
  hop: number
  path: string[]                // Entity IDs in path
  relationship_types: RelationshipType[]
  confidence: number
}

// ============================================================================
// Database Row Types (for Supabase queries)
// ============================================================================

export interface PatientEntityRow {
  id: string
  user_id: string | null
  session_id: string | null
  entity_type: EntityType
  entity_value: string
  entity_date: string | null
  entity_status: string | null
  numeric_value: number | null
  numeric_unit: string | null
  reference_range: string | null
  source_record_id: string | null
  source_text: string | null
  confidence: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface EntityRelationshipRow {
  id: string
  entity_a_id: string
  entity_b_id: string
  relationship_type: RelationshipType
  confidence: number
  metadata: Record<string, unknown>
  created_at: string
}
