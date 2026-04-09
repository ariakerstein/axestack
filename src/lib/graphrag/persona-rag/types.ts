/**
 * Persona-RAG Types
 *
 * Extended types for the specialized per-persona retrieval system.
 */

import type { PatientContextObject, RetrievedChunk, Citation, PersonaName } from '../types'

// ============================================================================
// Data Source Configuration
// ============================================================================

export type DataSourceType =
  | 'nccn_guidelines'     // NCCN cancer guidelines
  | 'asco_guidelines'     // ASCO clinical guidelines
  | 'oncokb'              // OncoKB biomarker database
  | 'clinicaltrials'      // ClinicalTrials.gov
  | 'pubmed'              // PubMed recent publications
  | 'surveillance'        // Surveillance protocol documents
  | 'survivorship'        // Survivorship care resources
  | 'qol_studies'         // Quality of life research
  | 'internal_chunks'     // Our guideline_chunks table

export interface DataSourceConfig {
  type: DataSourceType
  name: string
  priority: number        // 1 = highest priority
  enabled: boolean
  apiKey?: string         // For external APIs
  baseUrl?: string
}

// ============================================================================
// Retriever Configuration
// ============================================================================

export interface RetrieverConfig {
  persona: PersonaName
  sources: DataSourceConfig[]
  maxChunks: number           // Max chunks to return
  minRelevanceScore: number   // Minimum relevance threshold (0-1)
  timeoutMs: number           // Retrieval timeout
  fallbackToGeneral: boolean  // Use general knowledge if no specific match
}

// ============================================================================
// Retrieval Request/Response
// ============================================================================

export interface RetrievalRequest {
  pco: PatientContextObject
  query: string
  config?: Partial<RetrieverConfig>
}

export interface RetrievalResponse {
  persona: PersonaName
  chunks: RetrievedChunk[]
  citations: Citation[]
  retrieval_time_ms: number
  sources_used: DataSourceType[]
  query_expansion?: string[]  // How the query was expanded for retrieval
  confidence: number          // Overall retrieval confidence
  fallback_used: boolean
}

// ============================================================================
// NCCN Guideline Types
// ============================================================================

export interface NCCNGuidelineChunk {
  id: string
  guideline_name: string      // e.g., "Ovarian Cancer/Fallopian Tube Cancer/Primary Peritoneal Cancer"
  version: string             // e.g., "2.2024"
  section: string             // e.g., "Maintenance Therapy"
  content: string
  page_number?: number
  embedding?: number[]
  cancer_types: string[]      // Normalized cancer types this applies to
  topics: string[]            // e.g., ["PARP inhibitors", "BRCA", "maintenance"]
}

// ============================================================================
// OncoKB Types (for Molecular Oncologist)
// ============================================================================

export interface OncoKBAnnotation {
  gene: string
  alteration: string          // e.g., "Pathogenic Mutation"
  cancerType: string
  level: '1' | '2' | '3A' | '3B' | '4' | 'R1' | 'R2'  // Evidence level
  fdaLevel?: 'Fda1' | 'Fda2' | 'Fda3'
  drugs: string[]             // Approved/investigational drugs
  pmids: string[]             // PubMed IDs for evidence
  description: string
}

export interface OncoKBQuery {
  hugoSymbol: string          // Gene symbol e.g., "BRCA2"
  alteration?: string         // Specific alteration
  tumorType?: string          // Cancer type (OncoTree code)
}

// ============================================================================
// Clinical Trials Types (for Emerging Treatments)
// ============================================================================

export interface ClinicalTrialMatch {
  nctId: string
  title: string
  phase: string
  status: string
  conditions: string[]
  interventions: string[]
  locations: Array<{
    facility: string
    city: string
    state?: string
    country: string
  }>
  eligibilityCriteria?: string
  briefSummary: string
  lastUpdated: string
  url: string
}

export interface TrialSearchParams {
  condition: string[]         // Cancer types
  biomarkers?: string[]       // Biomarker requirements
  treatment?: string[]        // Specific treatments
  phase?: string[]            // Phase 1, 2, 3
  status?: string[]           // Recruiting, Active, etc.
  location?: {
    country?: string
    state?: string
    city?: string
    distance?: number         // miles from location
  }
}

// ============================================================================
// Surveillance Protocol Types (for Watch & Wait)
// ============================================================================

export interface SurveillanceProtocol {
  cancerType: string
  stage?: string
  condition: string           // e.g., "Post-treatment", "Active surveillance"
  schedule: Array<{
    test: string              // e.g., "CT scan", "PSA", "Colonoscopy"
    frequency: string         // e.g., "Every 6 months", "Annually"
    duration: string          // e.g., "Years 1-3", "Indefinitely"
    notes?: string
  }>
  guidelines_source: string   // e.g., "NCCN 2024", "ASCO 2023"
  considerations: string[]    // Special considerations
}

// ============================================================================
// Survivorship Types (for Whole Person)
// ============================================================================

export interface SurvivorshipResource {
  id: string
  title: string
  category: 'physical' | 'emotional' | 'social' | 'practical' | 'nutritional' | 'exercise'
  cancerTypes: string[]       // Applicable cancer types (empty = all)
  treatmentRelated?: string[] // Specific to certain treatments
  content: string
  source: string
  url?: string
}

// ============================================================================
// Internal Guideline Chunks (from guideline_chunks table)
// ============================================================================

export interface GuidelineChunkRow {
  id: string
  guideline_title: string
  guideline_source: string
  section_heading: string | null
  chunk_text: string
  chunk_index: number
  chunk_embedding_vec: number[] | null
  cancer_type: string | null
  content_tier: string | null
  content_type: string | null
  page_start: number | null
  page_end: number | null
  storage_path: string | null
  url: string | null
  created_at: string
}

// ============================================================================
// Query Expansion
// ============================================================================

export interface QueryExpansion {
  original: string
  expanded: string[]
  synonyms: Record<string, string[]>  // term -> synonyms
  biomarkerNormalized?: string[]      // Normalized biomarker names
  cancerTypeNormalized?: string       // Normalized cancer type
}
