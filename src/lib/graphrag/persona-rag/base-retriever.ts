/**
 * Base Retriever Class
 *
 * Abstract base class for all persona-specific retrievers.
 * Provides common functionality for retrieval, caching, and error handling.
 */

import type { PatientContextObject, RetrievedChunk, Citation, PersonaName } from '../types'
import type {
  RetrieverConfig,
  RetrievalRequest,
  RetrievalResponse,
  DataSourceType,
  QueryExpansion
} from './types'

// ============================================================================
// Abstract Base Class
// ============================================================================

export abstract class BaseRetriever {
  protected config: RetrieverConfig

  constructor(config: Partial<RetrieverConfig>) {
    this.config = {
      persona: config.persona || 'SOC Advisor',
      sources: config.sources || [],
      maxChunks: config.maxChunks || 10,
      minRelevanceScore: config.minRelevanceScore || 0.3,
      timeoutMs: config.timeoutMs || 10000,
      fallbackToGeneral: config.fallbackToGeneral ?? true,
      ...config
    }
  }

  /**
   * Main retrieval method - implemented by each persona retriever
   */
  abstract retrieve(request: RetrievalRequest): Promise<RetrievalResponse>

  /**
   * Expand query with synonyms, biomarker names, cancer type variations
   * Override in subclasses for persona-specific expansion
   */
  protected async expandQuery(query: string, pco: PatientContextObject): Promise<QueryExpansion> {
    const expansion: QueryExpansion = {
      original: query,
      expanded: [query],
      synonyms: {}
    }

    // Add cancer type to query expansion
    if (pco.diagnoses.length > 0) {
      const cancerType = pco.diagnoses[0].cancer_type
      expansion.cancerTypeNormalized = this.normalizeCancerType(cancerType)
      expansion.expanded.push(`${query} ${expansion.cancerTypeNormalized}`)
    }

    // Add biomarkers to query expansion
    if (pco.biomarkers.length > 0) {
      expansion.biomarkerNormalized = pco.biomarkers
        .filter(b => b.result_type === 'positive')
        .map(b => this.normalizeBiomarker(b.name))

      if (expansion.biomarkerNormalized.length > 0) {
        expansion.expanded.push(`${query} ${expansion.biomarkerNormalized.join(' ')}`)
      }
    }

    return expansion
  }

  /**
   * Normalize cancer type for consistent matching
   */
  protected normalizeCancerType(cancerType: string): string {
    const normalized = cancerType.toLowerCase().trim()

    // Common normalizations
    const mappings: Record<string, string> = {
      'breast': 'breast cancer',
      'lung': 'lung cancer',
      'nsclc': 'non-small cell lung cancer',
      'sclc': 'small cell lung cancer',
      'ovarian': 'ovarian cancer',
      'prostate': 'prostate cancer',
      'colorectal': 'colorectal cancer',
      'colon': 'colorectal cancer',
      'pancreatic': 'pancreatic cancer',
      'melanoma': 'melanoma',
      'lymphoma': 'lymphoma',
      'leukemia': 'leukemia',
      'aml': 'acute myeloid leukemia',
      'cml': 'chronic myeloid leukemia',
      'all': 'acute lymphoblastic leukemia',
      'cll': 'chronic lymphocytic leukemia',
      'myeloma': 'multiple myeloma',
      'glioblastoma': 'glioblastoma',
      'gbm': 'glioblastoma',
    }

    for (const [abbrev, full] of Object.entries(mappings)) {
      if (normalized.includes(abbrev)) {
        return full
      }
    }

    // Ensure "cancer" is in the name
    if (!normalized.includes('cancer') && !normalized.includes('carcinoma') &&
        !normalized.includes('lymphoma') && !normalized.includes('leukemia') &&
        !normalized.includes('melanoma') && !normalized.includes('myeloma') &&
        !normalized.includes('sarcoma') && !normalized.includes('glioblastoma')) {
      return `${normalized} cancer`
    }

    return normalized
  }

  /**
   * Normalize biomarker name for consistent matching
   */
  protected normalizeBiomarker(biomarker: string): string {
    const normalized = biomarker.toUpperCase().trim()

    // Common normalizations
    const mappings: Record<string, string> = {
      'BRCA 1': 'BRCA1',
      'BRCA 2': 'BRCA2',
      'HER-2': 'HER2',
      'HER 2': 'HER2',
      'ERBB2': 'HER2',
      'PD-L1': 'PD-L1',
      'PDL1': 'PD-L1',
      'MSI-H': 'MSI-H',
      'MSIH': 'MSI-H',
      'MICROSATELLITE INSTABILITY': 'MSI-H',
      'ALK+': 'ALK',
      'ROS-1': 'ROS1',
      'EGFR+': 'EGFR',
    }

    return mappings[normalized] || normalized
  }

  /**
   * Score chunk relevance based on query match
   */
  protected scoreRelevance(
    chunk: string,
    query: string,
    pco: PatientContextObject
  ): number {
    let score = 0
    const chunkLower = chunk.toLowerCase()
    const queryLower = query.toLowerCase()

    // Query term match (up to 0.4)
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2)
    const matchedTerms = queryTerms.filter(term => chunkLower.includes(term))
    score += (matchedTerms.length / queryTerms.length) * 0.4

    // Cancer type match (up to 0.3)
    if (pco.diagnoses.length > 0) {
      const cancerType = this.normalizeCancerType(pco.diagnoses[0].cancer_type)
      if (chunkLower.includes(cancerType)) {
        score += 0.3
      } else if (cancerType.split(' ').some(word => chunkLower.includes(word))) {
        score += 0.15
      }
    }

    // Biomarker match (up to 0.2)
    const positiveBiomarkers = pco.biomarkers.filter(b => b.result_type === 'positive')
    if (positiveBiomarkers.length > 0) {
      const matchedBiomarkers = positiveBiomarkers.filter(b =>
        chunkLower.includes(b.name.toLowerCase())
      )
      if (matchedBiomarkers.length > 0) {
        score += 0.2 * (matchedBiomarkers.length / positiveBiomarkers.length)
      }
    }

    // Treatment match (up to 0.1)
    const currentTreatments = pco.treatments.filter(t =>
      t.status === 'current' || t.status === 'completed'
    )
    if (currentTreatments.length > 0) {
      const matchedTreatments = currentTreatments.filter(t =>
        chunkLower.includes(t.name.toLowerCase())
      )
      if (matchedTreatments.length > 0) {
        score += 0.1
      }
    }

    return Math.min(score, 1)
  }

  /**
   * Build citation from chunk metadata
   */
  protected buildCitation(
    chunk: RetrievedChunk,
    index: number
  ): Citation {
    return {
      id: `${this.config.persona.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`,
      title: chunk.metadata?.title as string || chunk.source,
      source: chunk.source,
      url: chunk.metadata?.url as string,
      accessed_date: new Date().toISOString().split('T')[0]
    }
  }

  /**
   * Deduplicate chunks by content similarity
   */
  protected deduplicateChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
    const seen = new Set<string>()
    const unique: RetrievedChunk[] = []

    for (const chunk of chunks) {
      // Create a fingerprint from the first 100 chars
      const fingerprint = chunk.content.slice(0, 100).toLowerCase().replace(/\s+/g, ' ')
      if (!seen.has(fingerprint)) {
        seen.add(fingerprint)
        unique.push(chunk)
      }
    }

    return unique
  }

  /**
   * Sort chunks by relevance and limit to maxChunks
   */
  protected rankAndLimit(chunks: RetrievedChunk[]): RetrievedChunk[] {
    return chunks
      .filter(c => c.relevance_score >= this.config.minRelevanceScore)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, this.config.maxChunks)
  }

  /**
   * Create a fallback response when no relevant content is found
   */
  protected createFallbackResponse(
    request: RetrievalRequest,
    startTime: number
  ): RetrievalResponse {
    return {
      persona: this.config.persona,
      chunks: [],
      citations: [],
      retrieval_time_ms: Date.now() - startTime,
      sources_used: [],
      confidence: 0,
      fallback_used: true
    }
  }

  /**
   * Log retrieval for debugging and analytics
   */
  protected logRetrieval(
    request: RetrievalRequest,
    response: RetrievalResponse
  ): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.config.persona}] Retrieved ${response.chunks.length} chunks in ${response.retrieval_time_ms}ms`)
      console.log(`  Query: ${request.query.slice(0, 50)}...`)
      console.log(`  Sources: ${response.sources_used.join(', ')}`)
      console.log(`  Confidence: ${response.confidence.toFixed(2)}`)
    }
  }
}

// ============================================================================
// Supabase Helper for Internal Chunks
// ============================================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY

export function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

/**
 * Query guideline_chunks table with simple cancer-type filter
 * Actual schema columns: guideline_title, chunk_text, section_heading, cancer_type, page_start, page_end
 *
 * Note: Full-text search on chunk_text is slow. We filter by cancer_type first (indexed),
 * then let the retriever score relevance based on content matching.
 */
export async function queryGuidelineChunks(params: {
  query: string
  cancerType?: string
  topics?: string[]
  limit?: number
}): Promise<RetrievedChunk[]> {
  const supabase = getSupabaseClient()
  const { cancerType, limit = 10 } = params

  try {
    // Simple query - filter by cancer type, get recent chunks
    let dbQuery = supabase
      .from('guideline_chunks')
      .select('id, guideline_title, guideline_source, section_heading, chunk_text, cancer_type, page_start, page_end, content_tier')
      .order('updated_at', { ascending: false })
      .limit(limit * 3)  // Get more, filter in-app

    // Filter by cancer type if provided (this is indexed and fast)
    if (cancerType) {
      const normalizedCancerType = cancerType.toLowerCase()
      // Use simple ilike on cancer_type - this should use index
      dbQuery = dbQuery.ilike('cancer_type', `%${normalizedCancerType}%`)
    }

    const { data, error } = await dbQuery

    if (error) {
      console.error('Error querying guideline_chunks:', error)
      return []
    }

    // Convert to RetrievedChunk format
    return (data || []).map(row => ({
      id: row.id,
      content: row.chunk_text || '',
      source: `${row.guideline_title || ''} - ${row.section_heading || ''}`.trim() || row.guideline_source || 'Guidelines',
      relevance_score: 0.5, // Will be re-scored by retriever
      metadata: {
        guideline_title: row.guideline_title,
        guideline_source: row.guideline_source,
        section: row.section_heading,
        page_start: row.page_start,
        page_end: row.page_end,
        cancer_type: row.cancer_type,
        content_tier: row.content_tier
      }
    }))
  } catch (err) {
    console.error('Exception querying guideline_chunks:', err)
    return []
  }
}
