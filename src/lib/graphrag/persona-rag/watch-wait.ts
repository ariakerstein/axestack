/**
 * Watch & Wait Retriever
 *
 * Retrieves surveillance protocols, de-escalation strategies, and active monitoring approaches.
 * Focuses on when treatment may be deferred and quality of life considerations.
 *
 * Primary sources:
 * - NCCN surveillance guidelines
 * - Active surveillance protocols
 * - De-escalation trial data
 */

import { BaseRetriever, queryGuidelineChunks } from './base-retriever'
import type { PatientContextObject, RetrievedChunk, Citation } from '../types'
import type {
  RetrieverConfig,
  RetrievalRequest,
  RetrievalResponse,
  SurveillanceProtocol
} from './types'

// ============================================================================
// Surveillance Protocol Knowledge Base
// ============================================================================

const SURVEILLANCE_PROTOCOLS: Record<string, SurveillanceProtocol[]> = {
  'prostate cancer': [
    {
      cancerType: 'Prostate Cancer',
      stage: 'Very Low Risk / Low Risk',
      condition: 'Active Surveillance Candidate',
      schedule: [
        { test: 'PSA', frequency: 'Every 6 months', duration: 'Ongoing', notes: 'Trend more important than absolute value' },
        { test: 'DRE', frequency: 'Every 12 months', duration: 'Ongoing' },
        { test: 'Repeat biopsy', frequency: 'Every 1-2 years initially', duration: 'First 5 years, then individualize' },
        { test: 'mpMRI', frequency: 'Every 1-2 years', duration: 'Ongoing', notes: 'Can help guide biopsy decisions' }
      ],
      guidelines_source: 'NCCN 2024',
      considerations: [
        'Active surveillance is PREFERRED for very low and low-risk prostate cancer',
        'Quality of life preservation is a key benefit',
        'Progression triggers: PSA doubling time <3 years, Gleason upgrade, volume increase',
        'Conversion to treatment remains possible if disease progresses'
      ]
    },
    {
      cancerType: 'Prostate Cancer',
      stage: 'Post-treatment',
      condition: 'After definitive therapy',
      schedule: [
        { test: 'PSA', frequency: 'Every 6-12 months', duration: 'Years 1-5', notes: 'Every 12 months after 5 years' },
        { test: 'DRE', frequency: 'Every 12 months', duration: 'Ongoing', notes: 'After radiation therapy' }
      ],
      guidelines_source: 'NCCN 2024',
      considerations: [
        'PSA nadir and trend are key indicators',
        'Biochemical recurrence definitions differ by treatment modality',
        'Imaging indicated only for symptoms or rising PSA'
      ]
    }
  ],

  'breast cancer': [
    {
      cancerType: 'Breast Cancer',
      stage: 'Early Stage (I-II)',
      condition: 'After curative treatment',
      schedule: [
        { test: 'History & physical', frequency: 'Every 3-6 months', duration: 'Years 1-3, then annually' },
        { test: 'Mammogram', frequency: 'Annually', duration: 'Lifelong', notes: 'First 6-12 months post-radiation' },
        { test: 'Breast MRI', frequency: 'Individualized', duration: 'As needed', notes: 'High-risk patients or dense breasts' }
      ],
      guidelines_source: 'NCCN 2024',
      considerations: [
        'Routine tumor markers (CA 27-29, CEA) NOT recommended for surveillance',
        'Routine imaging scans NOT recommended in asymptomatic patients',
        'Focus on breast/chest wall and axilla examination',
        'Manage long-term effects of treatment (lymphedema, bone health)'
      ]
    },
    {
      cancerType: 'Breast Cancer',
      stage: 'DCIS',
      condition: 'Post-treatment surveillance',
      schedule: [
        { test: 'Mammogram', frequency: 'Every 6-12 months initially', duration: 'Then annually' },
        { test: 'Clinical breast exam', frequency: 'Every 6-12 months', duration: 'Ongoing' }
      ],
      guidelines_source: 'NCCN 2024',
      considerations: [
        'DCIS has excellent prognosis',
        'Risk of ipsilateral invasive recurrence ~1% per year',
        'Tamoxifen may reduce contralateral risk'
      ]
    }
  ],

  'colorectal cancer': [
    {
      cancerType: 'Colorectal Cancer',
      stage: 'Stage I-III',
      condition: 'After curative resection',
      schedule: [
        { test: 'CEA', frequency: 'Every 3-6 months', duration: 'Years 1-2, then every 6 months for 3 more years' },
        { test: 'CT chest/abdomen/pelvis', frequency: 'Every 6-12 months', duration: 'Up to 5 years' },
        { test: 'Colonoscopy', frequency: 'At 1 year, then 3 years, then every 5 years', duration: 'Lifelong' },
        { test: 'History & physical', frequency: 'Every 3-6 months', duration: 'Years 1-2, then every 6 months' }
      ],
      guidelines_source: 'NCCN 2024',
      considerations: [
        'Most recurrences occur within first 3-4 years',
        'CEA elevation should prompt imaging',
        'Colonoscopy surveillance for metachronous tumors'
      ]
    }
  ],

  'thyroid cancer': [
    {
      cancerType: 'Thyroid Cancer',
      stage: 'Differentiated (Low Risk)',
      condition: 'Post-thyroidectomy',
      schedule: [
        { test: 'TSH', frequency: 'Every 6-12 months', duration: 'Lifelong' },
        { test: 'Thyroglobulin', frequency: 'Every 6-12 months', duration: 'Lifelong', notes: 'With anti-Tg antibodies' },
        { test: 'Neck ultrasound', frequency: 'Every 6-12 months initially', duration: 'Then less frequently if stable' }
      ],
      guidelines_source: 'NCCN 2024',
      considerations: [
        'Excellent prognosis for low-risk differentiated thyroid cancer',
        'Thyroglobulin is an excellent tumor marker',
        'TSH suppression goals vary by risk category'
      ]
    }
  ],

  'lymphoma': [
    {
      cancerType: 'Follicular Lymphoma',
      stage: 'Indolent/Low Tumor Burden',
      condition: 'Watch and Wait',
      schedule: [
        { test: 'History & physical', frequency: 'Every 3 months', duration: 'First 2 years, then less frequently' },
        { test: 'Labs (CBC, LDH)', frequency: 'Every 3-6 months', duration: 'Ongoing' },
        { test: 'CT scan', frequency: 'Every 6-12 months initially', duration: 'Then as indicated' }
      ],
      guidelines_source: 'NCCN 2024',
      considerations: [
        'Many patients with indolent NHL can be observed without treatment',
        'Treatment initiation triggers: symptoms, rapid progression, organ compromise',
        'No survival benefit to immediate treatment in asymptomatic patients',
        'Watch and wait preserves quality of life and avoids treatment toxicity'
      ]
    },
    {
      cancerType: 'CLL/SLL',
      stage: 'Early Stage / Asymptomatic',
      condition: 'Watch and Wait',
      schedule: [
        { test: 'History & physical', frequency: 'Every 3-12 months', duration: 'Based on stability' },
        { test: 'CBC with differential', frequency: 'Every 3-12 months', duration: 'Ongoing' }
      ],
      guidelines_source: 'NCCN 2024',
      considerations: [
        'Rai stage 0-I or Binet A often observed without treatment',
        'Treatment for: cytopenias, symptomatic lymphadenopathy, B symptoms',
        'Doubling time < 6 months is concerning',
        'Many patients never require treatment'
      ]
    }
  ],

  'ovarian cancer': [
    {
      cancerType: 'Ovarian Cancer',
      stage: 'Post-treatment',
      condition: 'After primary treatment',
      schedule: [
        { test: 'History & physical', frequency: 'Every 2-4 months', duration: 'Years 1-2, then every 3-6 months' },
        { test: 'CA-125', frequency: 'Every visit if elevated at diagnosis', duration: 'Ongoing' },
        { test: 'CT scan', frequency: 'As clinically indicated', duration: 'Not routine', notes: 'For symptoms or rising CA-125' }
      ],
      guidelines_source: 'NCCN 2024',
      considerations: [
        'Routine imaging NOT recommended in asymptomatic patients',
        'CA-125 trends more important than absolute values',
        'No survival benefit to treating asymptomatic CA-125 rise (NICE guidelines)',
        'Quality of life considerations in relapsed disease'
      ]
    }
  ],

  'melanoma': [
    {
      cancerType: 'Melanoma',
      stage: 'Stage I-II',
      condition: 'Post-resection',
      schedule: [
        { test: 'Full skin exam', frequency: 'Every 3-12 months', duration: 'Years 1-2, then annually' },
        { test: 'Regional lymph node exam', frequency: 'Every 3-6 months', duration: 'Years 1-5' }
      ],
      guidelines_source: 'NCCN 2024',
      considerations: [
        'Patient self-examination education is crucial',
        'Routine imaging not recommended for stage I-IIA',
        'LDH and imaging may be considered for stage IIB-IIC',
        'Second primary melanoma risk is increased'
      ]
    }
  ]
}

// ============================================================================
// De-escalation Knowledge
// ============================================================================

const DEESCALATION_APPROACHES: Record<string, string[]> = {
  'breast cancer': [
    'Omission of radiation in select low-risk elderly patients (PRIME II)',
    'Sentinel node biopsy avoiding full axillary dissection (ACOSOG Z0011)',
    'Shorter radiation courses (hypofractionation) - FAST Forward',
    'De-escalated HER2-directed therapy duration in low-risk HER2+',
    'Endocrine therapy alone for some ER+ patients (LUMINA trial)'
  ],
  'prostate cancer': [
    'Active surveillance for low-risk disease - PREFERRED approach',
    'Focal therapy options (HIFU, cryotherapy) for select patients',
    'Hypofractionated radiation - fewer treatments, equivalent outcomes',
    'Observation after biochemical recurrence in select patients'
  ],
  'lymphoma': [
    'Watch and wait for indolent lymphomas',
    'Limited cycles of chemotherapy in favorable-risk DLBCL',
    'Radiation omission in PET-negative interim responders',
    'Single-agent rituximab maintenance in low tumor burden FL'
  ],
  'colorectal cancer': [
    'Watch and wait after complete response to neoadjuvant therapy (rectal)',
    'Omission of adjuvant chemotherapy for MSI-H stage II',
    'Shorter FOLFOX duration (3 vs 6 months for low-risk stage III)'
  ]
}

// ============================================================================
// Watch & Wait Retriever Implementation
// ============================================================================

export class WatchWaitRetriever extends BaseRetriever {
  constructor(config?: Partial<RetrieverConfig>) {
    super({
      persona: 'Watch & Wait',
      sources: [
        { type: 'surveillance', name: 'Surveillance Protocols', priority: 1, enabled: true },
        { type: 'nccn_guidelines', name: 'NCCN Follow-up Guidelines', priority: 2, enabled: true },
        { type: 'qol_studies', name: 'Quality of Life Research', priority: 3, enabled: true },
      ],
      maxChunks: 6,
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
      const chunks: RetrievedChunk[] = []
      const citations: Citation[] = []
      const sourcesUsed: Set<string> = new Set()

      // 1. Get matching surveillance protocols
      const surveillanceChunks = this.getSurveillanceProtocols(pco, query)
      if (surveillanceChunks.length > 0) {
        chunks.push(...surveillanceChunks)
        sourcesUsed.add('surveillance')
      }

      // 2. Get de-escalation approaches
      const deescalationChunks = this.getDeescalationApproaches(pco, query)
      if (deescalationChunks.length > 0) {
        chunks.push(...deescalationChunks)
        sourcesUsed.add('qol_studies')
      }

      // 3. Query guideline sections about surveillance and follow-up
      const guidelineChunks = await this.querySurveillanceGuidelines(pco, query)
      if (guidelineChunks.length > 0) {
        chunks.push(...guidelineChunks)
        sourcesUsed.add('nccn_guidelines')
      }

      // 4. Score, dedupe, rank
      const scoredChunks = chunks.map(chunk => ({
        ...chunk,
        relevance_score: this.scoreRelevanceForWatchWait(chunk.content, query, pco)
      }))

      const rankedChunks = this.rankAndLimit(this.deduplicateChunks(scoredChunks))

      // 5. Build citations
      rankedChunks.forEach((chunk, i) => {
        citations.push(this.buildWatchWaitCitation(chunk, i))
      })

      const response: RetrievalResponse = {
        persona: 'Watch & Wait',
        chunks: rankedChunks,
        citations,
        retrieval_time_ms: Date.now() - startTime,
        sources_used: Array.from(sourcesUsed) as any[],
        confidence: this.calculateWatchWaitConfidence(rankedChunks, pco),
        fallback_used: rankedChunks.length === 0
      }

      this.logRetrieval(request, response)
      return response
    } catch (error) {
      console.error('[Watch & Wait] Retrieval error:', error)
      return this.createFallbackResponse(request, startTime)
    }
  }

  /**
   * Get matching surveillance protocols
   */
  private getSurveillanceProtocols(
    pco: PatientContextObject,
    query: string
  ): RetrievedChunk[] {
    const chunks: RetrievedChunk[] = []
    const cancerType = this.normalizeCancerType(pco.diagnoses[0]?.cancer_type || '')
    const stage = pco.diagnoses[0]?.stage?.toLowerCase() || ''

    // Find matching protocols
    const matchingKey = Object.keys(SURVEILLANCE_PROTOCOLS).find(key =>
      cancerType.includes(key) || key.includes(cancerType.split(' ')[0])
    )

    if (!matchingKey) return chunks

    const protocols = SURVEILLANCE_PROTOCOLS[matchingKey]

    for (const protocol of protocols) {
      // Check stage match if specified
      const stageMatch = !protocol.stage ||
        stage.includes(protocol.stage.toLowerCase()) ||
        protocol.stage.toLowerCase().includes(stage)

      // Check query relevance
      const queryLower = query.toLowerCase()
      const queryMatch = queryLower.includes('surveillance') ||
        queryLower.includes('follow') ||
        queryLower.includes('monitor') ||
        queryLower.includes('watch') ||
        queryLower.includes('wait') ||
        queryLower.includes('observation') ||
        queryLower.includes('test') ||
        queryLower.includes('scan')

      if (stageMatch || queryMatch) {
        chunks.push({
          id: `surveillance-${protocol.cancerType.toLowerCase().replace(/\s+/g, '-')}-${protocol.condition.toLowerCase().replace(/\s+/g, '-')}`,
          content: this.formatSurveillanceProtocol(protocol),
          source: `Surveillance Protocol - ${protocol.guidelines_source}`,
          relevance_score: stageMatch ? 0.8 : 0.6,
          metadata: {
            cancerType: protocol.cancerType,
            stage: protocol.stage,
            condition: protocol.condition,
            guidelines_source: protocol.guidelines_source
          }
        })
      }
    }

    return chunks
  }

  /**
   * Format surveillance protocol as readable content
   */
  private formatSurveillanceProtocol(protocol: SurveillanceProtocol): string {
    const scheduleLines = protocol.schedule.map(s =>
      `• **${s.test}**: ${s.frequency} (${s.duration})${s.notes ? ` - ${s.notes}` : ''}`
    ).join('\n')

    const considerationsLines = protocol.considerations.map(c => `• ${c}`).join('\n')

    return `
**${protocol.cancerType}${protocol.stage ? ` - ${protocol.stage}` : ''}**
Condition: ${protocol.condition}

**Recommended Surveillance Schedule:**
${scheduleLines}

**Key Considerations:**
${considerationsLines}

Source: ${protocol.guidelines_source}
`.trim()
  }

  /**
   * Get de-escalation approaches for the cancer type
   */
  private getDeescalationApproaches(
    pco: PatientContextObject,
    query: string
  ): RetrievedChunk[] {
    const chunks: RetrievedChunk[] = []
    const cancerType = this.normalizeCancerType(pco.diagnoses[0]?.cancer_type || '')

    const matchingKey = Object.keys(DEESCALATION_APPROACHES).find(key =>
      cancerType.includes(key) || key.includes(cancerType.split(' ')[0])
    )

    if (!matchingKey) return chunks

    const approaches = DEESCALATION_APPROACHES[matchingKey]

    // Check if query is about de-escalation or treatment decisions
    const queryLower = query.toLowerCase()
    const isRelevant = queryLower.includes('de-escalat') ||
      queryLower.includes('less treatment') ||
      queryLower.includes('avoid') ||
      queryLower.includes('skip') ||
      queryLower.includes('quality of life') ||
      queryLower.includes('side effect') ||
      queryLower.includes('necessary')

    if (isRelevant || approaches.length > 0) {
      chunks.push({
        id: `deescalation-${matchingKey.replace(/\s+/g, '-')}`,
        content: `
**De-escalation Approaches for ${matchingKey.charAt(0).toUpperCase() + matchingKey.slice(1)}**

Evidence-based approaches where less intensive treatment may be appropriate:

${approaches.map(a => `• ${a}`).join('\n')}

**Important:** De-escalation decisions should be made with your care team based on your specific tumor characteristics, overall health, and preferences.
`.trim(),
        source: 'De-escalation Evidence',
        relevance_score: isRelevant ? 0.75 : 0.5,
        metadata: { type: 'deescalation', cancerType: matchingKey }
      })
    }

    return chunks
  }

  /**
   * Query guideline sections about surveillance
   */
  private async querySurveillanceGuidelines(
    pco: PatientContextObject,
    query: string
  ): Promise<RetrievedChunk[]> {
    const cancerType = pco.diagnoses[0]?.cancer_type

    return queryGuidelineChunks({
      query: `${query} surveillance follow-up monitoring observation`,
      cancerType,
      limit: 8
    })
  }

  /**
   * Score relevance for watch & wait context
   */
  private scoreRelevanceForWatchWait(
    content: string,
    query: string,
    pco: PatientContextObject
  ): number {
    let score = this.scoreRelevance(content, query, pco)
    const contentLower = content.toLowerCase()

    // Boost for surveillance terms
    const surveillanceTerms = ['surveillance', 'follow-up', 'monitoring', 'observation', 'watch and wait', 'active surveillance']
    if (surveillanceTerms.some(t => contentLower.includes(t))) {
      score += 0.15
    }

    // Boost for de-escalation terms
    const deescalationTerms = ['de-escalation', 'less intensive', 'omission', 'avoid', 'hypofractionation']
    if (deescalationTerms.some(t => contentLower.includes(t))) {
      score += 0.1
    }

    // Boost for quality of life
    if (contentLower.includes('quality of life') || contentLower.includes('qol')) {
      score += 0.1
    }

    return Math.min(score, 1)
  }

  /**
   * Build citation for watch & wait content
   */
  private buildWatchWaitCitation(chunk: RetrievedChunk, index: number): Citation {
    return {
      id: `watch-wait-${index + 1}`,
      title: chunk.metadata?.condition as string || chunk.source,
      source: chunk.metadata?.guidelines_source as string || chunk.source,
      url: undefined,
      accessed_date: new Date().toISOString().split('T')[0]
    }
  }

  /**
   * Calculate confidence for watch & wait retrieval
   */
  private calculateWatchWaitConfidence(chunks: RetrievedChunk[], pco: PatientContextObject): number {
    if (chunks.length === 0) return 0

    const avgScore = chunks.reduce((sum, c) => sum + c.relevance_score, 0) / chunks.length

    // Boost if we have stage-matched protocols
    const hasStageMatch = chunks.some(c =>
      c.metadata?.stage && pco.diagnoses[0]?.stage &&
      (c.metadata.stage as string).toLowerCase().includes(pco.diagnoses[0].stage.toLowerCase())
    )

    let confidence = avgScore * 0.6
    if (hasStageMatch) confidence += 0.25
    if (chunks.length >= 2) confidence += 0.1

    return Math.min(confidence, 1)
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createWatchWaitRetriever(
  config?: Partial<RetrieverConfig>
): WatchWaitRetriever {
  return new WatchWaitRetriever(config)
}
