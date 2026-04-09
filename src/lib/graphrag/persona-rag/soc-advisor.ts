/**
 * SOC Advisor Retriever
 *
 * Retrieves from NCCN guidelines, ASCO guidelines, and FDA labels.
 * This is the "Standard of Care" persona - what guidelines recommend.
 *
 * Primary sources:
 * - guideline_chunks table (NCCN guidelines already ingested)
 * - ASCO guidelines (via their API or pre-indexed)
 * - FDA drug labels (for approved indications)
 */

import { BaseRetriever, getSupabaseClient, queryGuidelineChunks } from './base-retriever'
import type { PatientContextObject, RetrievedChunk, Citation } from '../types'
import type {
  RetrieverConfig,
  RetrievalRequest,
  RetrievalResponse,
  DataSourceType,
  QueryExpansion
} from './types'

// ============================================================================
// NCCN Topic Keywords
// ============================================================================

const TREATMENT_TOPICS = {
  'parp': ['PARP inhibitor', 'olaparib', 'niraparib', 'rucaparib', 'talazoparib', 'maintenance therapy', 'HRD', 'homologous recombination'],
  'immunotherapy': ['immunotherapy', 'checkpoint inhibitor', 'PD-1', 'PD-L1', 'pembrolizumab', 'nivolumab', 'atezolizumab', 'durvalumab'],
  'targeted': ['targeted therapy', 'tyrosine kinase', 'TKI', 'EGFR', 'ALK', 'ROS1', 'BRAF', 'HER2'],
  'chemotherapy': ['chemotherapy', 'cytotoxic', 'platinum', 'taxane', 'carboplatin', 'cisplatin', 'paclitaxel', 'docetaxel'],
  'hormonal': ['hormone therapy', 'endocrine therapy', 'tamoxifen', 'aromatase inhibitor', 'letrozole', 'anastrozole'],
  'radiation': ['radiation', 'radiotherapy', 'RT', 'SBRT', 'IMRT', 'proton'],
  'surgery': ['surgery', 'surgical', 'resection', 'mastectomy', 'lumpectomy', 'lymphadenectomy'],
}

const BIOMARKER_IMPLICATIONS: Record<string, string[]> = {
  'BRCA1': ['PARP inhibitor', 'platinum sensitivity', 'HRD', 'maintenance therapy'],
  'BRCA2': ['PARP inhibitor', 'platinum sensitivity', 'HRD', 'maintenance therapy'],
  'HER2': ['trastuzumab', 'pertuzumab', 'T-DM1', 'T-DXd', 'HER2-targeted'],
  'EGFR': ['erlotinib', 'gefitinib', 'osimertinib', 'EGFR-TKI'],
  'ALK': ['crizotinib', 'alectinib', 'lorlatinib', 'brigatinib', 'ALK-TKI'],
  'ROS1': ['crizotinib', 'entrectinib', 'ROS1-TKI'],
  'BRAF': ['dabrafenib', 'trametinib', 'vemurafenib', 'BRAF-targeted'],
  'KRAS G12C': ['sotorasib', 'adagrasib', 'KRAS inhibitor'],
  'PD-L1': ['pembrolizumab', 'nivolumab', 'immunotherapy', 'checkpoint inhibitor'],
  'MSI-H': ['pembrolizumab', 'immunotherapy', 'checkpoint inhibitor', 'microsatellite'],
  'dMMR': ['pembrolizumab', 'immunotherapy', 'mismatch repair'],
  'ER': ['tamoxifen', 'aromatase inhibitor', 'endocrine therapy', 'hormone receptor'],
  'PR': ['hormone receptor', 'endocrine therapy'],
  'TMB-H': ['pembrolizumab', 'immunotherapy', 'tumor mutational burden'],
}

// ============================================================================
// SOC Advisor Retriever Implementation
// ============================================================================

export class SOCAdvisorRetriever extends BaseRetriever {
  constructor(config?: Partial<RetrieverConfig>) {
    super({
      persona: 'SOC Advisor',
      sources: [
        { type: 'nccn_guidelines', name: 'NCCN Clinical Practice Guidelines', priority: 1, enabled: true },
        { type: 'internal_chunks', name: 'Guideline Chunks', priority: 2, enabled: true },
        { type: 'asco_guidelines', name: 'ASCO Guidelines', priority: 3, enabled: false }, // Future
      ],
      maxChunks: 8,
      minRelevanceScore: 0.25,
      timeoutMs: 10000,
      fallbackToGeneral: true,
      ...config
    })
  }

  async retrieve(request: RetrievalRequest): Promise<RetrievalResponse> {
    const startTime = Date.now()
    const { pco, query } = request

    try {
      // 1. Expand query with cancer type, biomarkers, treatment-specific keywords
      const expansion = await this.expandQueryForSOC(query, pco)

      // 2. Query guideline_chunks with expanded search
      const chunks = await this.queryGuidelines(expansion, pco)

      // 3. Score and rank chunks
      const scoredChunks = chunks.map(chunk => ({
        ...chunk,
        relevance_score: this.scoreRelevanceForSOC(chunk.content, expansion, pco)
      }))

      // 4. Deduplicate and limit
      const rankedChunks = this.rankAndLimit(this.deduplicateChunks(scoredChunks))

      // 5. Build citations
      const citations = rankedChunks.map((chunk, i) => this.buildCitation(chunk, i))

      // 6. Build response
      const response: RetrievalResponse = {
        persona: 'SOC Advisor',
        chunks: rankedChunks,
        citations,
        retrieval_time_ms: Date.now() - startTime,
        sources_used: rankedChunks.length > 0 ? ['nccn_guidelines', 'internal_chunks'] : [],
        query_expansion: expansion.expanded,
        confidence: this.calculateConfidence(rankedChunks, pco),
        fallback_used: rankedChunks.length === 0
      }

      this.logRetrieval(request, response)
      return response
    } catch (error) {
      console.error('[SOC Advisor] Retrieval error:', error)
      return this.createFallbackResponse(request, startTime)
    }
  }

  /**
   * Expand query with SOC-specific terms
   */
  private async expandQueryForSOC(
    query: string,
    pco: PatientContextObject
  ): Promise<QueryExpansion> {
    const base = await this.expandQuery(query, pco)
    const queryLower = query.toLowerCase()

    // Add treatment-topic keywords based on query
    for (const [topic, keywords] of Object.entries(TREATMENT_TOPICS)) {
      if (queryLower.includes(topic) || keywords.some(k => queryLower.includes(k.toLowerCase()))) {
        base.expanded.push(...keywords.slice(0, 3))
        base.synonyms[topic] = keywords
      }
    }

    // Add biomarker-implication keywords
    for (const biomarker of pco.biomarkers.filter(b => b.result_type === 'positive')) {
      const normalized = this.normalizeBiomarker(biomarker.name)
      const implications = BIOMARKER_IMPLICATIONS[normalized]
      if (implications) {
        base.expanded.push(...implications.slice(0, 2))
        base.synonyms[normalized] = implications
      }
    }

    // Add stage-specific terms
    if (pco.diagnoses[0]?.stage) {
      const stage = pco.diagnoses[0].stage.toLowerCase()
      if (stage.includes('iv') || stage.includes('4') || stage.includes('metastatic')) {
        base.expanded.push('metastatic', 'advanced', 'systemic therapy')
      } else if (stage.includes('iii') || stage.includes('3')) {
        base.expanded.push('locally advanced', 'adjuvant', 'neoadjuvant')
      } else if (stage.includes('i') || stage.includes('1') || stage.includes('ii') || stage.includes('2')) {
        base.expanded.push('early stage', 'curative intent', 'surgery')
      }
    }

    return base
  }

  /**
   * Query NCCN guidelines from our database
   */
  private async queryGuidelines(
    expansion: QueryExpansion,
    pco: PatientContextObject
  ): Promise<RetrievedChunk[]> {
    const cancerType = expansion.cancerTypeNormalized || pco.diagnoses[0]?.cancer_type

    // Query with primary search terms
    const chunks = await queryGuidelineChunks({
      query: expansion.expanded.slice(0, 5).join(' '),
      cancerType,
      limit: 20 // Get more, then filter
    })

    // If no results and we have biomarkers, try biomarker-specific search
    if (chunks.length < 3 && expansion.biomarkerNormalized && expansion.biomarkerNormalized.length > 0) {
      const biomarkerChunks = await queryGuidelineChunks({
        query: expansion.biomarkerNormalized.join(' '),
        cancerType,
        limit: 10
      })
      chunks.push(...biomarkerChunks)
    }

    return chunks
  }

  /**
   * Score relevance with SOC-specific criteria
   */
  private scoreRelevanceForSOC(
    content: string,
    expansion: QueryExpansion,
    pco: PatientContextObject
  ): number {
    let score = this.scoreRelevance(content, expansion.original, pco)
    const contentLower = content.toLowerCase()

    // Boost for NCCN recommendation keywords
    const recommendationKeywords = [
      'recommended', 'preferred', 'category 1', 'category 2a',
      'standard of care', 'first-line', 'consider', 'may be used'
    ]
    const matchedRecs = recommendationKeywords.filter(k => contentLower.includes(k))
    score += matchedRecs.length * 0.05

    // Boost for biomarker-specific guidance
    for (const biomarker of pco.biomarkers.filter(b => b.result_type === 'positive')) {
      if (contentLower.includes(biomarker.name.toLowerCase())) {
        score += 0.15
      }
    }

    // Boost for treatment-specific guidance
    for (const treatment of pco.treatments.filter(t => t.status === 'current' || t.status === 'completed')) {
      if (contentLower.includes(treatment.name.toLowerCase())) {
        score += 0.1
      }
    }

    // Boost for stage-appropriate content
    if (pco.diagnoses[0]?.stage) {
      const stage = pco.diagnoses[0].stage.toLowerCase()
      if (contentLower.includes(stage) ||
          (stage.includes('iv') && contentLower.includes('metastatic')) ||
          (stage.includes('iii') && contentLower.includes('locally advanced'))) {
        score += 0.1
      }
    }

    return Math.min(score, 1)
  }

  /**
   * Calculate overall confidence based on retrieval quality
   */
  private calculateConfidence(chunks: RetrievedChunk[], pco: PatientContextObject): number {
    if (chunks.length === 0) return 0

    // Base confidence from chunk scores
    const avgScore = chunks.reduce((sum, c) => sum + c.relevance_score, 0) / chunks.length

    // Adjust based on cancer type match
    const cancerType = pco.diagnoses[0]?.cancer_type?.toLowerCase() || ''
    const hasCancerTypeMatch = chunks.some(c =>
      c.source.toLowerCase().includes(cancerType) ||
      (c.metadata?.cancer_types as string[])?.some(ct => ct.includes(cancerType))
    )

    // Adjust based on biomarker match
    const hasBiomarkerMatch = pco.biomarkers
      .filter(b => b.result_type === 'positive')
      .some(b => chunks.some(c => c.content.toLowerCase().includes(b.name.toLowerCase())))

    let confidence = avgScore * 0.6
    if (hasCancerTypeMatch) confidence += 0.25
    if (hasBiomarkerMatch) confidence += 0.15

    return Math.min(confidence, 1)
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSOCAdvisorRetriever(config?: Partial<RetrieverConfig>): SOCAdvisorRetriever {
  return new SOCAdvisorRetriever(config)
}
