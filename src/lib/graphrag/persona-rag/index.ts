/**
 * Persona-RAG Module
 *
 * Unified interface for the 5-persona specialized retrieval system.
 * Each persona has dedicated retrieval sources optimized for their perspective.
 *
 * Usage:
 * ```typescript
 * import { orchestratePersonaRAG, createRetriever } from '@/lib/graphrag/persona-rag'
 *
 * // Run all 5 retrievers in parallel (for Combat)
 * const results = await orchestratePersonaRAG(pco, query)
 *
 * // Or use individual retrievers (for Ask Navis, targeted queries)
 * const socRetriever = createRetriever('SOC Advisor')
 * const result = await socRetriever.retrieve({ pco, query })
 * ```
 */

// Export types
export * from './types'

// Export base class and utilities
export { BaseRetriever, getSupabaseClient, queryGuidelineChunks } from './base-retriever'

// Export individual retrievers
export { SOCAdvisorRetriever, createSOCAdvisorRetriever } from './soc-advisor'
export { MolecularOncologistRetriever, createMolecularOncologistRetriever } from './molecular'
export { EmergingTreatmentsRetriever, createEmergingTreatmentsRetriever } from './emerging'
export { WatchWaitRetriever, createWatchWaitRetriever } from './watch-wait'
export { WholePersonRetriever, createWholePersonRetriever } from './whole-person'

// Import for internal use
import type { PatientContextObject, PersonaName, RetrievedChunk, Citation } from '../types'
import type { RetrievalRequest, RetrievalResponse, RetrieverConfig } from './types'
import { createSOCAdvisorRetriever } from './soc-advisor'
import { createMolecularOncologistRetriever } from './molecular'
import { createEmergingTreatmentsRetriever } from './emerging'
import { createWatchWaitRetriever } from './watch-wait'
import { createWholePersonRetriever } from './whole-person'
import { BaseRetriever } from './base-retriever'

// ============================================================================
// Persona Retriever Factory
// ============================================================================

/**
 * Create a retriever for a specific persona
 */
export function createRetriever(
  persona: PersonaName,
  config?: Partial<RetrieverConfig>
): BaseRetriever {
  switch (persona) {
    case 'SOC Advisor':
      return createSOCAdvisorRetriever(config)
    case 'Molecular Oncologist':
      return createMolecularOncologistRetriever(config)
    case 'Emerging Treatments':
      return createEmergingTreatmentsRetriever(config)
    case 'Watch & Wait':
      return createWatchWaitRetriever(config)
    case 'Whole Person':
      return createWholePersonRetriever(config)
    default:
      throw new Error(`Unknown persona: ${persona}`)
  }
}

/**
 * Get all available persona names
 */
export function getPersonaNames(): PersonaName[] {
  return [
    'SOC Advisor',
    'Molecular Oncologist',
    'Emerging Treatments',
    'Watch & Wait',
    'Whole Person'
  ]
}

// ============================================================================
// Orchestrator
// ============================================================================

export interface OrchestratorResult {
  results: RetrievalResponse[]
  total_time_ms: number
  successful_retrievals: number
  total_chunks: number
  combined_confidence: number
}

/**
 * Run all 5 persona retrievers in parallel
 *
 * This is the main entry point for Combat feature integration.
 * Each persona retrieves independently, then results are combined.
 */
export async function orchestratePersonaRAG(
  pco: PatientContextObject,
  query: string,
  config?: {
    personas?: PersonaName[]  // Subset of personas to use (default: all)
    timeout?: number          // Global timeout (default: 15000ms)
    parallel?: boolean        // Run in parallel (default: true)
  }
): Promise<OrchestratorResult> {
  const startTime = Date.now()
  const {
    personas = getPersonaNames(),
    timeout = 15000,
    parallel = true
  } = config || {}

  // Create retrievers for requested personas
  const retrievers = personas.map(p => ({
    persona: p,
    retriever: createRetriever(p)
  }))

  // Create request
  const request: RetrievalRequest = { pco, query }

  // Run retrievals
  let results: RetrievalResponse[]

  if (parallel) {
    // Run all in parallel with timeout
    const retrievalPromises = retrievers.map(async ({ persona, retriever }) => {
      try {
        return await Promise.race([
          retriever.retrieve(request),
          new Promise<RetrievalResponse>((_, reject) =>
            setTimeout(() => reject(new Error(`${persona} timeout`)), timeout)
          )
        ])
      } catch (error) {
        console.error(`[Orchestrator] ${persona} failed:`, error)
        return createEmptyResponse(persona, Date.now() - startTime)
      }
    })

    results = await Promise.all(retrievalPromises)
  } else {
    // Run sequentially (for debugging)
    results = []
    for (const { persona, retriever } of retrievers) {
      try {
        const result = await retriever.retrieve(request)
        results.push(result)
      } catch (error) {
        console.error(`[Orchestrator] ${persona} failed:`, error)
        results.push(createEmptyResponse(persona, Date.now() - startTime))
      }
    }
  }

  // Calculate combined metrics
  const totalChunks = results.reduce((sum, r) => sum + r.chunks.length, 0)
  const successfulRetrievals = results.filter(r => r.chunks.length > 0).length
  const avgConfidence = results.length > 0
    ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    : 0

  return {
    results,
    total_time_ms: Date.now() - startTime,
    successful_retrievals: successfulRetrievals,
    total_chunks: totalChunks,
    combined_confidence: avgConfidence
  }
}

/**
 * Create an empty response for failed retrievals
 */
function createEmptyResponse(persona: PersonaName, timeMs: number): RetrievalResponse {
  return {
    persona,
    chunks: [],
    citations: [],
    retrieval_time_ms: timeMs,
    sources_used: [],
    confidence: 0,
    fallback_used: true
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Select best persona for a given query (for Ask Navis single-persona mode)
 */
export function selectBestPersona(query: string, pco: PatientContextObject): PersonaName {
  const queryLower = query.toLowerCase()

  // Biomarker/molecular questions → Molecular Oncologist
  const molecularTerms = ['brca', 'her2', 'egfr', 'alk', 'mutation', 'biomarker', 'genomic', 'genetic', 'test', 'actionable']
  if (molecularTerms.some(t => queryLower.includes(t))) {
    return 'Molecular Oncologist'
  }

  // Clinical trial questions → Emerging Treatments
  const trialTerms = ['trial', 'clinical', 'emerging', 'new', 'investigational', 'experimental', 'research']
  if (trialTerms.some(t => queryLower.includes(t))) {
    return 'Emerging Treatments'
  }

  // Surveillance/monitoring questions → Watch & Wait
  const watchTerms = ['surveillance', 'monitoring', 'follow-up', 'watch', 'wait', 'observe', 'scan', 'when', 'frequency']
  if (watchTerms.some(t => queryLower.includes(t))) {
    return 'Watch & Wait'
  }

  // Side effects/QoL questions → Whole Person
  const qolTerms = ['side effect', 'fatigue', 'nausea', 'pain', 'quality', 'cope', 'feeling', 'symptom', 'help', 'support', 'exercise', 'diet', 'nutrition']
  if (qolTerms.some(t => queryLower.includes(t))) {
    return 'Whole Person'
  }

  // Default to SOC Advisor for treatment/guideline questions
  return 'SOC Advisor'
}

/**
 * Combine chunks from multiple retrievals, deduplicating and ranking
 */
export function combineRetrievals(results: RetrievalResponse[]): {
  chunks: RetrievedChunk[]
  citations: Citation[]
} {
  const allChunks: RetrievedChunk[] = []
  const allCitations: Citation[] = []
  const seenContent = new Set<string>()
  const seenCitations = new Set<string>()

  for (const result of results) {
    for (const chunk of result.chunks) {
      // Dedupe by content fingerprint
      const fingerprint = chunk.content.slice(0, 100).toLowerCase().replace(/\s+/g, ' ')
      if (!seenContent.has(fingerprint)) {
        seenContent.add(fingerprint)
        allChunks.push(chunk)
      }
    }

    for (const citation of result.citations) {
      // Dedupe by source
      if (!seenCitations.has(citation.source)) {
        seenCitations.add(citation.source)
        allCitations.push(citation)
      }
    }
  }

  // Sort by relevance score
  allChunks.sort((a, b) => b.relevance_score - a.relevance_score)

  return {
    chunks: allChunks,
    citations: allCitations
  }
}

/**
 * Format retrieval results for prompt injection
 */
export function formatForPrompt(result: OrchestratorResult): string {
  if (result.total_chunks === 0) {
    return '[No specific retrieval context available]'
  }

  const sections: string[] = []

  for (const personaResult of result.results) {
    if (personaResult.chunks.length === 0) continue

    const personaSection = `
### ${personaResult.persona} Context
${personaResult.chunks.map(c => `
**Source:** ${c.source}
${c.content}
`).join('\n---\n')}
`.trim()

    sections.push(personaSection)
  }

  return sections.join('\n\n')
}

// ============================================================================
// Integration Helpers
// ============================================================================

/**
 * Configuration for different use cases
 */
export const RETRIEVAL_CONFIGS = {
  // Full Combat analysis - all 5 personas
  combat: {
    personas: getPersonaNames(),
    timeout: 15000,
    parallel: true
  },

  // Ask Navis - single best persona
  askNavis: {
    timeout: 10000,
    parallel: false
  },

  // Quick answer - SOC only
  quick: {
    personas: ['SOC Advisor'] as PersonaName[],
    timeout: 5000,
    parallel: false
  },

  // Biomarker-focused - Molecular + SOC
  biomarker: {
    personas: ['Molecular Oncologist', 'SOC Advisor'] as PersonaName[],
    timeout: 10000,
    parallel: true
  },

  // QoL focus - Whole Person + Watch & Wait
  qol: {
    personas: ['Whole Person', 'Watch & Wait'] as PersonaName[],
    timeout: 10000,
    parallel: true
  }
}
