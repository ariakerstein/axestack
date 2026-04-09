/**
 * Emerging Treatments Retriever
 *
 * Retrieves clinical trial information and cutting-edge treatment options.
 * Focuses on investigational therapies, recent publications, and novel approaches.
 *
 * Primary sources:
 * - ClinicalTrials.gov API (or encoded knowledge)
 * - Recent publications and conference abstracts
 * - Novel drug combinations and mechanisms
 */

import { BaseRetriever, queryGuidelineChunks } from './base-retriever'
import type { PatientContextObject, RetrievedChunk, Citation } from '../types'
import type {
  RetrieverConfig,
  RetrievalRequest,
  RetrievalResponse,
  ClinicalTrialMatch,
  TrialSearchParams
} from './types'

// ============================================================================
// Emerging Treatment Knowledge Base
// ============================================================================

/**
 * Key emerging treatment areas by cancer type
 * This serves as the knowledge base when ClinicalTrials.gov API is not available
 */
const EMERGING_TREATMENTS: Record<string, Array<{
  name: string
  mechanism: string
  targets: string[]  // Biomarkers or conditions
  phase: string
  trials: string[]   // NCT numbers
  notes: string
}>> = {
  'ovarian cancer': [
    {
      name: 'ADC therapies (Mirvetuximab soravtansine)',
      mechanism: 'Antibody-drug conjugate targeting FRα',
      targets: ['FRα-positive', 'platinum-resistant'],
      phase: 'FDA Approved 2022',
      trials: ['NCT04296890', 'NCT02631876'],
      notes: 'Approved for FRα-positive platinum-resistant ovarian cancer. Consider FRα testing.'
    },
    {
      name: 'PARP + immune checkpoint combinations',
      mechanism: 'Combining DNA damage response inhibition with immunotherapy',
      targets: ['BRCA1', 'BRCA2', 'HRD'],
      phase: 'Phase 2/3',
      trials: ['NCT03737643', 'NCT03824704'],
      notes: 'Multiple trials exploring olaparib + pembrolizumab and niraparib + dostarlimab combinations.'
    },
    {
      name: 'WEE1 inhibitors',
      mechanism: 'Cell cycle checkpoint inhibition',
      targets: ['platinum-resistant', 'TP53-mutated'],
      phase: 'Phase 2',
      trials: ['NCT04516447'],
      notes: 'Adavosertib showing activity in platinum-resistant disease, especially TP53-mutated tumors.'
    }
  ],

  'breast cancer': [
    {
      name: 'Trastuzumab deruxtecan (Enhertu) in HER2-low',
      mechanism: 'ADC with potent topoisomerase I payload',
      targets: ['HER2-low', 'HER2 IHC 1+/2+'],
      phase: 'FDA Approved 2022',
      trials: ['NCT03734029'],
      notes: 'DESTINY-Breast04 showed benefit in HER2-low (IHC 1+ or 2+/FISH-). Paradigm shift in HER2 classification.'
    },
    {
      name: 'CDK4/6 inhibitor combinations',
      mechanism: 'Cell cycle inhibition + endocrine therapy',
      targets: ['HR+', 'HER2-negative'],
      phase: 'Phase 3',
      trials: ['NCT03425838', 'NCT03701334'],
      notes: 'Exploring earlier lines and combinations with novel agents.'
    },
    {
      name: 'Sacituzumab govitecan',
      mechanism: 'Trop-2 directed ADC',
      targets: ['TNBC', 'HR+/HER2-'],
      phase: 'FDA Approved',
      trials: ['NCT02574455', 'NCT04595565'],
      notes: 'Approved for TNBC and HR+/HER2- after progression on endocrine therapy.'
    },
    {
      name: 'Oral SERDs (Elacestrant)',
      mechanism: 'Selective estrogen receptor degrader',
      targets: ['ER+', 'ESR1 mutation'],
      phase: 'FDA Approved 2023',
      trials: ['NCT03778931'],
      notes: 'Oral SERD approved for ESR1-mutated ER+ breast cancer after prior endocrine therapy.'
    }
  ],

  'non-small cell lung cancer': [
    {
      name: 'EGFR exon 20 insertion inhibitors',
      mechanism: 'Selective inhibition of exon 20 insertions',
      targets: ['EGFR exon 20 insertion'],
      phase: 'FDA Approved',
      trials: ['NCT02716116', 'NCT04129502'],
      notes: 'Amivantamab and mobocertinib address previously undruggable mutations.'
    },
    {
      name: 'Perioperative immunotherapy',
      mechanism: 'Neoadjuvant/adjuvant checkpoint inhibition',
      targets: ['resectable', 'stage II-IIIA'],
      phase: 'FDA Approved',
      trials: ['NCT03800134', 'NCT02504372'],
      notes: 'CheckMate 816 and other trials establishing perioperative IO in resectable NSCLC.'
    },
    {
      name: 'Bispecific antibodies',
      mechanism: 'Dual-target engagement (EGFR/MET)',
      targets: ['EGFR mutations', 'MET amplification'],
      phase: 'Phase 1/2',
      trials: ['NCT04077463'],
      notes: 'Addressing resistance mechanisms through dual targeting.'
    },
    {
      name: 'KRAS G12D inhibitors',
      mechanism: 'Direct KRAS inhibition',
      targets: ['KRAS G12D'],
      phase: 'Phase 1/2',
      trials: ['NCT04330664'],
      notes: 'MRTX1133 and other G12D inhibitors in early development following G12C success.'
    }
  ],

  'prostate cancer': [
    {
      name: 'Lutetium-177 PSMA (Pluvicto)',
      mechanism: 'Radioligand therapy targeting PSMA',
      targets: ['PSMA-positive', 'mCRPC'],
      phase: 'FDA Approved 2022',
      trials: ['NCT03511664'],
      notes: 'VISION trial showed OS benefit in PSMA+ mCRPC after prior ARPI and taxane.'
    },
    {
      name: 'PARP inhibitors in HRR-mutated',
      mechanism: 'DNA damage response inhibition',
      targets: ['BRCA1', 'BRCA2', 'ATM', 'CDK12'],
      phase: 'FDA Approved',
      trials: ['NCT02987543', 'NCT02975934'],
      notes: 'PROfound established PARP benefit in HRR-mutated mCRPC. Testing recommended for all mCRPC.'
    },
    {
      name: 'Bipolar androgen therapy',
      mechanism: 'Rapid cycling between high and low testosterone',
      targets: ['AR pathway', 'mCRPC'],
      phase: 'Phase 2/3',
      trials: ['NCT02090166'],
      notes: 'Novel approach exploiting AR dynamics. May re-sensitize to subsequent therapies.'
    }
  ],

  'colorectal cancer': [
    {
      name: 'HER2-directed therapy in CRC',
      mechanism: 'Anti-HER2 combinations',
      targets: ['HER2-amplified'],
      phase: 'FDA Approved',
      trials: ['NCT03365882'],
      notes: 'Tucatinib + trastuzumab approved for HER2+ mCRC. HER2 testing now recommended.'
    },
    {
      name: 'Immunotherapy in MSS CRC',
      mechanism: 'Combination approaches to overcome IO resistance',
      targets: ['MSS', 'microsatellite stable'],
      phase: 'Phase 2/3',
      trials: ['NCT04068610', 'NCT02997228'],
      notes: 'Multiple trials exploring combinations to make MSS tumors responsive to immunotherapy.'
    },
    {
      name: 'Circulating tumor DNA-guided therapy',
      mechanism: 'ctDNA for MRD detection and treatment selection',
      targets: ['Stage II/III', 'post-resection'],
      phase: 'Phase 3',
      trials: ['NCT04068103'],
      notes: 'DYNAMIC and CIRCULATE trials using ctDNA to guide adjuvant decisions.'
    }
  ],

  'melanoma': [
    {
      name: 'LAG-3 inhibitors',
      mechanism: 'Novel checkpoint inhibition',
      targets: ['Anti-PD-1 refractory', 'first-line combination'],
      phase: 'FDA Approved 2022',
      trials: ['NCT01968109'],
      notes: 'Relatlimab + nivolumab (Opdualag) approved as first-line for advanced melanoma.'
    },
    {
      name: 'TIL therapy (Lifileucel)',
      mechanism: 'Tumor-infiltrating lymphocyte therapy',
      targets: ['Checkpoint-refractory', 'prior anti-PD-1'],
      phase: 'FDA Approved 2024',
      trials: ['NCT02360579'],
      notes: 'First FDA-approved TIL therapy. For patients who progressed after prior therapy.'
    },
    {
      name: 'Neoadjuvant IO',
      mechanism: 'Preoperative checkpoint inhibition',
      targets: ['resectable stage III'],
      phase: 'Standard of care',
      trials: ['NCT02519322'],
      notes: 'High pCR rates with neoadjuvant nivo/ipi. Changing surgical approach.'
    }
  ],

  'pancreatic cancer': [
    {
      name: 'KRAS G12C inhibitors',
      mechanism: 'Direct KRAS inhibition',
      targets: ['KRAS G12C'],
      phase: 'Phase 1/2',
      trials: ['NCT04330664'],
      notes: 'KRAS G12C found in ~1-2% of PDAC. Early signals of activity.'
    },
    {
      name: 'CLDN18.2-targeted therapies',
      mechanism: 'Claudin 18.2 targeting',
      targets: ['CLDN18.2-positive'],
      phase: 'Phase 3',
      trials: ['NCT03653507'],
      notes: 'Zolbetuximab showing promise in CLDN18.2+ gastric and pancreatic cancers.'
    }
  ],

  'lymphoma': [
    {
      name: 'Bispecific antibodies',
      mechanism: 'CD20xCD3 T-cell engagers',
      targets: ['relapsed/refractory DLBCL', 'FL'],
      phase: 'FDA Approved',
      trials: ['NCT02500407', 'NCT03075696'],
      notes: 'Mosunetuzumab, epcoritamab, glofitamab approved for r/r DLBCL. Major advance post-CAR-T.'
    },
    {
      name: 'CAR-T cell therapy',
      mechanism: 'Autologous CAR-T targeting CD19',
      targets: ['relapsed/refractory DLBCL', 'MCL', 'FL'],
      phase: 'FDA Approved',
      trials: ['NCT02348216', 'NCT02601313'],
      notes: 'Multiple CAR-T products approved. Moving to earlier lines in some settings.'
    }
  ]
}

// ============================================================================
// Emerging Treatments Retriever Implementation
// ============================================================================

export class EmergingTreatmentsRetriever extends BaseRetriever {
  constructor(config?: Partial<RetrieverConfig>) {
    super({
      persona: 'Emerging Treatments',
      sources: [
        { type: 'clinicaltrials', name: 'ClinicalTrials.gov', priority: 1, enabled: true },
        { type: 'pubmed', name: 'Recent Publications', priority: 2, enabled: false }, // Future
        { type: 'internal_chunks', name: 'Emerging Treatment Guidelines', priority: 3, enabled: true },
      ],
      maxChunks: 8,
      minRelevanceScore: 0.25,
      timeoutMs: 15000,
      fallbackToGeneral: true,
      ...config
    })
  }

  async retrieve(request: RetrievalRequest): Promise<RetrievalResponse> {
    const startTime = Date.now()
    const { pco, query } = request

    try {
      const chunks: RetrievedChunk[] = []
      const citations: Citation[] = []
      const sourcesUsed: Set<string> = new Set()

      // 1. Get emerging treatment matches from knowledge base
      const emergingChunks = this.getEmergingTreatmentMatches(pco, query)
      if (emergingChunks.length > 0) {
        chunks.push(...emergingChunks)
        sourcesUsed.add('clinicaltrials')
      }

      // 2. Try ClinicalTrials.gov API if available
      const trialChunks = await this.queryClinicalTrials(pco, query)
      if (trialChunks.length > 0) {
        chunks.push(...trialChunks)
        sourcesUsed.add('clinicaltrials')
      }

      // 3. Query guideline sections about clinical trials and emerging options
      const guidelineChunks = await this.queryEmergingGuidelines(pco, query)
      if (guidelineChunks.length > 0) {
        chunks.push(...guidelineChunks)
        sourcesUsed.add('internal_chunks')
      }

      // 4. Score, dedupe, rank
      const scoredChunks = chunks.map(chunk => ({
        ...chunk,
        relevance_score: this.scoreRelevanceForEmerging(chunk.content, query, pco)
      }))

      const rankedChunks = this.rankAndLimit(this.deduplicateChunks(scoredChunks))

      // 5. Build citations
      rankedChunks.forEach((chunk, i) => {
        citations.push(this.buildEmergingCitation(chunk, i))
      })

      const response: RetrievalResponse = {
        persona: 'Emerging Treatments',
        chunks: rankedChunks,
        citations,
        retrieval_time_ms: Date.now() - startTime,
        sources_used: Array.from(sourcesUsed) as any[],
        confidence: this.calculateEmergingConfidence(rankedChunks, pco),
        fallback_used: rankedChunks.length === 0
      }

      this.logRetrieval(request, response)
      return response
    } catch (error) {
      console.error('[Emerging Treatments] Retrieval error:', error)
      return this.createFallbackResponse(request, startTime)
    }
  }

  /**
   * Get emerging treatment matches from knowledge base
   */
  private getEmergingTreatmentMatches(
    pco: PatientContextObject,
    query: string
  ): RetrievedChunk[] {
    const chunks: RetrievedChunk[] = []
    const cancerType = this.normalizeCancerType(pco.diagnoses[0]?.cancer_type || '')

    // Find matching cancer type in our knowledge base
    const matchingKey = Object.keys(EMERGING_TREATMENTS).find(key =>
      cancerType.includes(key) || key.includes(cancerType.split(' ')[0])
    )

    if (!matchingKey) return chunks

    const treatments = EMERGING_TREATMENTS[matchingKey]

    for (const treatment of treatments) {
      // Check if treatment matches patient's biomarkers or situation
      const matchesBiomarker = pco.biomarkers.some(b =>
        treatment.targets.some(t =>
          t.toLowerCase().includes(b.name.toLowerCase()) ||
          b.name.toLowerCase().includes(t.toLowerCase())
        )
      )

      // Check if query mentions relevant topics
      const queryLower = query.toLowerCase()
      const matchesQuery = treatment.name.toLowerCase().includes(queryLower) ||
        treatment.mechanism.toLowerCase().includes(queryLower) ||
        treatment.targets.some(t => queryLower.includes(t.toLowerCase())) ||
        queryLower.includes('trial') ||
        queryLower.includes('emerging') ||
        queryLower.includes('new') ||
        queryLower.includes('investigational')

      if (matchesBiomarker || matchesQuery) {
        chunks.push({
          id: `emerging-${treatment.name.toLowerCase().replace(/\s+/g, '-')}`,
          content: this.formatEmergingTreatment(treatment, matchingKey),
          source: `Emerging Treatments - ${treatment.phase}`,
          relevance_score: matchesBiomarker ? 0.8 : 0.6,
          metadata: {
            name: treatment.name,
            mechanism: treatment.mechanism,
            phase: treatment.phase,
            trials: treatment.trials,
            targets: treatment.targets
          }
        })
      }
    }

    return chunks
  }

  /**
   * Format emerging treatment as readable content
   */
  private formatEmergingTreatment(
    treatment: {
      name: string
      mechanism: string
      targets: string[]
      phase: string
      trials: string[]
      notes: string
    },
    cancerType: string
  ): string {
    return `
**${treatment.name}** (${treatment.phase})

Cancer Type: ${cancerType}
Mechanism: ${treatment.mechanism}
Target Population: ${treatment.targets.join(', ')}

${treatment.notes}

${treatment.trials.length > 0 ? `Clinical Trials: ${treatment.trials.map(t => `[${t}](https://clinicaltrials.gov/study/${t})`).join(', ')}` : ''}

**Ask Your Doctor:** Is this option appropriate for my specific situation? What would be the eligibility criteria?
`.trim()
  }

  /**
   * Query ClinicalTrials.gov API
   * Falls back gracefully if API is unavailable
   */
  private async queryClinicalTrials(
    pco: PatientContextObject,
    query: string
  ): Promise<RetrievedChunk[]> {
    // ClinicalTrials.gov API integration would go here
    // For now, we rely on the knowledge base
    // This is a future enhancement when API access is set up

    // TODO: Implement ClinicalTrials.gov API integration
    // const params: TrialSearchParams = {
    //   condition: [pco.diagnoses[0]?.cancer_type || ''],
    //   biomarkers: pco.biomarkers.filter(b => b.result_type === 'positive').map(b => b.name),
    //   status: ['Recruiting', 'Not yet recruiting', 'Active, not recruiting']
    // }

    return []
  }

  /**
   * Query guideline sections about clinical trials and emerging treatments
   */
  private async queryEmergingGuidelines(
    pco: PatientContextObject,
    query: string
  ): Promise<RetrievedChunk[]> {
    const cancerType = pco.diagnoses[0]?.cancer_type

    // Search for clinical trial and emerging treatment sections
    return queryGuidelineChunks({
      query: `${query} clinical trial emerging investigational novel`,
      cancerType,
      limit: 8
    })
  }

  /**
   * Score relevance for emerging treatments context
   */
  private scoreRelevanceForEmerging(
    content: string,
    query: string,
    pco: PatientContextObject
  ): number {
    let score = this.scoreRelevance(content, query, pco)
    const contentLower = content.toLowerCase()

    // Boost for clinical trial terms
    const trialTerms = ['clinical trial', 'nct', 'phase 1', 'phase 2', 'phase 3', 'investigational', 'experimental']
    if (trialTerms.some(t => contentLower.includes(t))) {
      score += 0.15
    }

    // Boost for recent developments
    const emergingTerms = ['approved 2023', 'approved 2024', 'recently approved', 'breakthrough', 'accelerated approval']
    if (emergingTerms.some(t => contentLower.includes(t))) {
      score += 0.1
    }

    // Boost for biomarker-specific trials
    for (const biomarker of pco.biomarkers.filter(b => b.result_type === 'positive')) {
      if (contentLower.includes(biomarker.name.toLowerCase())) {
        score += 0.15
      }
    }

    return Math.min(score, 1)
  }

  /**
   * Build citation for emerging treatment
   */
  private buildEmergingCitation(chunk: RetrievedChunk, index: number): Citation {
    const trials = chunk.metadata?.trials as string[]

    return {
      id: `emerging-${index + 1}`,
      title: chunk.metadata?.name as string || chunk.source,
      source: chunk.source,
      url: trials && trials.length > 0
        ? `https://clinicaltrials.gov/study/${trials[0]}`
        : undefined,
      accessed_date: new Date().toISOString().split('T')[0]
    }
  }

  /**
   * Calculate confidence for emerging retrieval
   */
  private calculateEmergingConfidence(chunks: RetrievedChunk[], pco: PatientContextObject): number {
    if (chunks.length === 0) return 0

    const avgScore = chunks.reduce((sum, c) => sum + c.relevance_score, 0) / chunks.length

    // Boost if we have biomarker-matched trials
    const hasBiomarkerMatch = pco.biomarkers
      .filter(b => b.result_type === 'positive')
      .some(b => chunks.some(c =>
        (c.metadata?.targets as string[])?.some(t =>
          t.toLowerCase().includes(b.name.toLowerCase())
        )
      ))

    let confidence = avgScore * 0.6
    if (hasBiomarkerMatch) confidence += 0.3
    if (chunks.some(c => c.metadata?.trials)) confidence += 0.1

    return Math.min(confidence, 1)
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createEmergingTreatmentsRetriever(
  config?: Partial<RetrieverConfig>
): EmergingTreatmentsRetriever {
  return new EmergingTreatmentsRetriever(config)
}
