/**
 * Whole Person Retriever
 *
 * Retrieves survivorship care, quality of life resources, supportive care,
 * and holistic health considerations.
 *
 * Primary sources:
 * - ASCO Survivorship Guidelines
 * - Supportive care literature
 * - Side effect management resources
 * - Psycho-oncology resources
 */

import { BaseRetriever, queryGuidelineChunks } from './base-retriever'
import type { PatientContextObject, RetrievedChunk, Citation } from '../types'
import type {
  RetrieverConfig,
  RetrievalRequest,
  RetrievalResponse,
  SurvivorshipResource
} from './types'

// ============================================================================
// Survivorship & Supportive Care Knowledge Base
// ============================================================================

const SIDE_EFFECT_MANAGEMENT: Record<string, {
  description: string
  strategies: string[]
  when_to_call: string[]
  resources?: string[]
}> = {
  'neuropathy': {
    description: 'Peripheral neuropathy (numbness, tingling, pain in hands/feet) is common with platinum agents, taxanes, and some targeted therapies.',
    strategies: [
      'Ice therapy during infusion may reduce taxane-induced neuropathy',
      'Physical therapy and occupational therapy can help manage symptoms',
      'Gabapentin or duloxetine may help with neuropathic pain',
      'Acupuncture has shown benefit in some studies',
      'Vitamin B6 supplementation (with caution - excessive B6 can also cause neuropathy)'
    ],
    when_to_call: [
      'Difficulty walking or maintaining balance',
      'Dropping objects frequently',
      'Inability to feel temperature differences',
      'Severe pain not controlled by medications'
    ]
  },

  'fatigue': {
    description: 'Cancer-related fatigue is the most common side effect, affecting quality of life significantly.',
    strategies: [
      'Light to moderate exercise (walking, yoga) paradoxically improves energy',
      'Energy conservation techniques - prioritize important activities',
      'Sleep hygiene - consistent bedtime, limit naps to 30 minutes',
      'Address underlying causes (anemia, thyroid dysfunction, depression)',
      'Mindfulness and stress reduction'
    ],
    when_to_call: [
      'Sudden severe fatigue',
      'Fatigue accompanied by shortness of breath or chest pain',
      'Unable to perform basic activities of daily living',
      'Signs of depression (loss of interest, persistent sadness)'
    ]
  },

  'nausea': {
    description: 'Chemotherapy-induced nausea and vomiting (CINV) is highly preventable with modern antiemetics.',
    strategies: [
      'Take antiemetics as prescribed - prevention is easier than treatment',
      'Eat small, frequent meals rather than large ones',
      'Avoid strong smells and greasy/spicy foods',
      'Ginger (ginger ale, ginger candies) may help mild nausea',
      'Acupressure wristbands (Sea-Bands) for some patients'
    ],
    when_to_call: [
      'Unable to keep fluids down for 12+ hours',
      'Vomiting blood or material that looks like coffee grounds',
      'Signs of dehydration (dark urine, dizziness, dry mouth)',
      'Breakthrough nausea despite taking antiemetics'
    ]
  },

  'hair loss': {
    description: 'Alopecia from chemotherapy is often temporary but can be emotionally challenging.',
    strategies: [
      'Scalp cooling (cold caps) may reduce hair loss with some regimens',
      'Consider cutting hair short before treatment starts',
      'Explore wigs, scarves, hats before hair loss occurs',
      'American Cancer Society offers free wigs and support',
      'Hair typically begins regrowth 3-6 months after treatment ends'
    ],
    when_to_call: [
      'Severe scalp pain or irritation',
      'Signs of infection on the scalp'
    ]
  },

  'cognitive changes': {
    description: '"Chemo brain" or cancer-related cognitive impairment affects memory, concentration, and multitasking.',
    strategies: [
      'Use calendars, lists, and reminders consistently',
      'Reduce multitasking - focus on one thing at a time',
      'Regular physical exercise improves cognitive function',
      'Cognitive rehabilitation therapy with a specialist',
      'Brain games and puzzles may help (though evidence is mixed)'
    ],
    when_to_call: [
      'Sudden confusion or disorientation',
      'Severe memory problems affecting safety',
      'Associated headaches or vision changes'
    ]
  },

  'bone health': {
    description: 'Many cancer treatments (hormonal therapies, steroids) increase osteoporosis risk.',
    strategies: [
      'Regular bone density monitoring (DEXA scan)',
      'Calcium (1200mg/day) and Vitamin D supplementation',
      'Weight-bearing exercise and resistance training',
      'Bisphosphonates or denosumab if indicated',
      'Fall prevention strategies'
    ],
    when_to_call: [
      'Sudden severe bone pain',
      'Any fracture, even with minimal trauma',
      'Height loss of more than 1 inch'
    ]
  },

  'lymphedema': {
    description: 'Swelling from lymph node removal or radiation, common after breast cancer or gynecologic surgery.',
    strategies: [
      'Complete decongestive therapy (CDT) with certified lymphedema therapist',
      'Compression garments - properly fitted',
      'Manual lymphatic drainage (MLD) massage',
      'Skin care to prevent infections',
      'Exercise - especially swimming'
    ],
    when_to_call: [
      'Sudden increase in swelling',
      'Signs of infection (redness, warmth, fever)',
      'Pain or tightness that limits movement'
    ]
  },

  'sexual health': {
    description: 'Cancer treatment often affects sexual function and intimacy.',
    strategies: [
      'Open communication with partner and healthcare team',
      'Vaginal moisturizers and lubricants for dryness',
      'Pelvic floor physical therapy',
      'Counseling or sex therapy',
      'Medications for erectile dysfunction if appropriate'
    ],
    when_to_call: [
      'Vaginal bleeding after menopause',
      'Severe pain with intimacy',
      'Significant relationship distress'
    ]
  },

  'emotional wellbeing': {
    description: 'Anxiety, depression, and distress are common and treatable aspects of the cancer experience.',
    strategies: [
      'Professional counseling or therapy (CBT is well-studied)',
      'Support groups - in-person or online',
      'Mindfulness-based stress reduction (MBSR)',
      'Medication if appropriate (antidepressants, anti-anxiety)',
      'Exercise has antidepressant effects'
    ],
    when_to_call: [
      'Thoughts of self-harm or suicide',
      'Unable to function in daily activities',
      'Persistent anxiety or panic attacks',
      'Feeling hopeless for more than 2 weeks'
    ],
    resources: [
      'National Cancer Institute: 1-800-4-CANCER',
      'Cancer Support Community: cancersupportcommunity.org',
      'American Psychosocial Oncology Society: apos-society.org'
    ]
  }
}

// ============================================================================
// Survivorship Care Topics
// ============================================================================

const SURVIVORSHIP_TOPICS: Record<string, {
  title: string
  content: string
  relevant_cancers: string[]
}> = {
  'cardiovascular': {
    title: 'Heart Health After Cancer Treatment',
    content: `
Several cancer treatments can affect heart health:
- **Anthracyclines** (doxorubicin): Can cause cardiomyopathy - baseline and periodic echocardiograms recommended
- **HER2-targeted therapy**: Trastuzumab requires cardiac monitoring
- **Radiation to chest**: Increases coronary artery disease risk long-term
- **Hormone therapy**: May affect cholesterol and cardiovascular risk

**Recommendations:**
- Regular cardiovascular monitoring based on treatment received
- Heart-healthy lifestyle (diet, exercise, not smoking)
- Manage traditional risk factors (blood pressure, cholesterol, diabetes)
- Discuss with cardiologist if high-risk or symptomatic
`,
    relevant_cancers: ['breast cancer', 'lymphoma', 'leukemia']
  },

  'fertility': {
    title: 'Fertility Preservation and Family Planning',
    content: `
Many cancer treatments can affect fertility. Planning BEFORE treatment is crucial.

**Options for fertility preservation:**
- **Women**: Egg freezing, embryo freezing, ovarian tissue cryopreservation, ovarian suppression during chemo (GnRH agonists)
- **Men**: Sperm banking (multiple samples recommended)

**Post-treatment considerations:**
- Most oncologists recommend waiting 2-3 years after treatment before pregnancy
- Genetic counseling may be recommended, especially for hereditary cancer syndromes
- Pregnancy after breast cancer does NOT increase recurrence risk in most studies

**Resources:**
- Alliance for Fertility Preservation: allianceforfertilitypreservation.org
- Livestrong Fertility: livestrong.org/we-can-help/livestrong-fertility
`,
    relevant_cancers: ['breast cancer', 'ovarian cancer', 'testicular cancer', 'lymphoma', 'leukemia']
  },

  'secondary_cancers': {
    title: 'Risk of Secondary Cancers',
    content: `
Some cancer treatments can increase risk of new cancers later.

**Known associations:**
- Radiation increases risk of solid tumors in irradiated field (10-20+ years later)
- Alkylating agents increase risk of leukemia (peak 5-10 years)
- BRCA carriers have elevated risks of multiple cancers

**Screening recommendations:**
- Follow cancer-specific surveillance guidelines
- Breast cancer survivors: Annual mammogram, consider MRI if high-risk
- Chest radiation survivors: Breast screening starting 8 years post-radiation or age 25
- Standard cancer screenings (colonoscopy, cervical cancer, etc.) are still important

**Risk reduction:**
- Healthy lifestyle (no smoking, limit alcohol, maintain healthy weight)
- Regular follow-up with oncology team
`,
    relevant_cancers: ['all']
  },

  'nutrition': {
    title: 'Nutrition During and After Cancer Treatment',
    content: `
Good nutrition supports treatment tolerance and recovery.

**During treatment:**
- Focus on adequate calories and protein to maintain weight
- Small, frequent meals if nausea is an issue
- Stay hydrated - aim for 8+ cups of fluid daily
- Food safety is important during immunosuppression

**After treatment (survivorship):**
- Plant-based diet pattern associated with better outcomes
- Limit red and processed meats
- Limit alcohol (increases recurrence risk for some cancers)
- Maintain healthy weight - obesity linked to worse outcomes
- Consider consultation with oncology dietitian

**What the evidence shows:**
- No single food or supplement prevents cancer recurrence
- "Superfoods" and "cancer diets" are not evidence-based
- Balanced diet matters more than any single food
`,
    relevant_cancers: ['all']
  },

  'exercise': {
    title: 'Physical Activity and Cancer',
    content: `
Exercise is one of the most evidence-based survivorship interventions.

**Benefits:**
- Reduces cancer recurrence risk (breast, colon - strongest evidence)
- Improves fatigue (even during treatment!)
- Maintains muscle mass and bone density
- Reduces anxiety and depression
- Improves cardiovascular health

**Recommendations:**
- 150 minutes moderate activity OR 75 minutes vigorous activity per week
- Plus strength training 2x/week
- Start slowly and build up - even 10 minutes helps
- Activities: walking, swimming, yoga, resistance bands

**Special considerations:**
- Clear with oncology team before starting
- Modifications for lymphedema, neuropathy, bone metastases
- Physical therapy referral if needed
- Exercise oncology specialists can help design safe programs
`,
    relevant_cancers: ['all']
  }
}

// ============================================================================
// Whole Person Retriever Implementation
// ============================================================================

export class WholePersonRetriever extends BaseRetriever {
  constructor(config?: Partial<RetrieverConfig>) {
    super({
      persona: 'Whole Person',
      sources: [
        { type: 'survivorship', name: 'Survivorship Care Guidelines', priority: 1, enabled: true },
        { type: 'qol_studies', name: 'Quality of Life Resources', priority: 2, enabled: true },
        { type: 'internal_chunks', name: 'Supportive Care Guidelines', priority: 3, enabled: true },
      ],
      maxChunks: 8,
      minRelevanceScore: 0.2,
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

      // 1. Get side effect management resources
      const sideEffectChunks = this.getSideEffectResources(pco, query)
      if (sideEffectChunks.length > 0) {
        chunks.push(...sideEffectChunks)
        sourcesUsed.add('qol_studies')
      }

      // 2. Get survivorship topics
      const survivorshipChunks = this.getSurvivorshipTopics(pco, query)
      if (survivorshipChunks.length > 0) {
        chunks.push(...survivorshipChunks)
        sourcesUsed.add('survivorship')
      }

      // 3. Query supportive care sections of guidelines
      const guidelineChunks = await this.querySupportiveCareGuidelines(pco, query)
      if (guidelineChunks.length > 0) {
        chunks.push(...guidelineChunks)
        sourcesUsed.add('internal_chunks')
      }

      // 4. Score, dedupe, rank
      const scoredChunks = chunks.map(chunk => ({
        ...chunk,
        relevance_score: this.scoreRelevanceForWholePerson(chunk.content, query, pco)
      }))

      const rankedChunks = this.rankAndLimit(this.deduplicateChunks(scoredChunks))

      // 5. Build citations
      rankedChunks.forEach((chunk, i) => {
        citations.push(this.buildWholePersonCitation(chunk, i))
      })

      const response: RetrievalResponse = {
        persona: 'Whole Person',
        chunks: rankedChunks,
        citations,
        retrieval_time_ms: Date.now() - startTime,
        sources_used: Array.from(sourcesUsed) as any[],
        confidence: this.calculateWholePersonConfidence(rankedChunks, pco),
        fallback_used: rankedChunks.length === 0
      }

      this.logRetrieval(request, response)
      return response
    } catch (error) {
      console.error('[Whole Person] Retrieval error:', error)
      return this.createFallbackResponse(request, startTime)
    }
  }

  /**
   * Get relevant side effect management resources
   */
  private getSideEffectResources(
    pco: PatientContextObject,
    query: string
  ): RetrievedChunk[] {
    const chunks: RetrievedChunk[] = []
    const queryLower = query.toLowerCase()

    // Check for symptom mentions in query
    for (const [symptom, resource] of Object.entries(SIDE_EFFECT_MANAGEMENT)) {
      const symptomMatches = queryLower.includes(symptom) ||
        symptom.split(' ').some(word => queryLower.includes(word))

      // Also check patient's reported symptoms
      const patientHasSymptom = pco.symptoms?.some(s =>
        s.name.toLowerCase().includes(symptom) ||
        symptom.includes(s.name.toLowerCase())
      )

      if (symptomMatches || patientHasSymptom) {
        chunks.push({
          id: `side-effect-${symptom}`,
          content: this.formatSideEffectResource(symptom, resource),
          source: 'Supportive Care Management',
          relevance_score: symptomMatches ? 0.85 : 0.7,
          metadata: { symptom, type: 'side_effect' }
        })
      }
    }

    // If query is about general side effects or quality of life
    if (queryLower.includes('side effect') || queryLower.includes('quality of life') ||
        queryLower.includes('feeling') || queryLower.includes('cope')) {
      // Add general emotional wellbeing if not already added
      if (!chunks.some(c => c.metadata?.symptom === 'emotional wellbeing')) {
        const resource = SIDE_EFFECT_MANAGEMENT['emotional wellbeing']
        chunks.push({
          id: 'side-effect-emotional-wellbeing',
          content: this.formatSideEffectResource('emotional wellbeing', resource),
          source: 'Psycho-Oncology Resources',
          relevance_score: 0.6,
          metadata: { symptom: 'emotional wellbeing', type: 'side_effect' }
        })
      }
    }

    return chunks
  }

  /**
   * Format side effect resource as readable content
   */
  private formatSideEffectResource(
    symptom: string,
    resource: {
      description: string
      strategies: string[]
      when_to_call: string[]
      resources?: string[]
    }
  ): string {
    return `
**Managing ${symptom.charAt(0).toUpperCase() + symptom.slice(1)}**

${resource.description}

**Strategies That May Help:**
${resource.strategies.map(s => `• ${s}`).join('\n')}

**When to Contact Your Care Team:**
${resource.when_to_call.map(s => `⚠️ ${s}`).join('\n')}

${resource.resources ? `\n**Resources:**\n${resource.resources.map(r => `• ${r}`).join('\n')}` : ''}
`.trim()
  }

  /**
   * Get relevant survivorship topics
   */
  private getSurvivorshipTopics(
    pco: PatientContextObject,
    query: string
  ): RetrievedChunk[] {
    const chunks: RetrievedChunk[] = []
    const queryLower = query.toLowerCase()
    const cancerType = this.normalizeCancerType(pco.diagnoses[0]?.cancer_type || '')

    for (const [key, topic] of Object.entries(SURVIVORSHIP_TOPICS)) {
      // Check if topic matches query
      const topicMatches = queryLower.includes(key) ||
        topic.title.toLowerCase().split(' ').some(word =>
          word.length > 3 && queryLower.includes(word)
        )

      // Check if topic is relevant to patient's cancer type
      const cancerRelevant = topic.relevant_cancers.includes('all') ||
        topic.relevant_cancers.some(ct => cancerType.includes(ct))

      if (topicMatches && cancerRelevant) {
        chunks.push({
          id: `survivorship-${key}`,
          content: `${topic.title}\n\n${topic.content.trim()}`,
          source: 'ASCO Survivorship Guidelines',
          relevance_score: 0.75,
          metadata: { topic: key, title: topic.title, type: 'survivorship' }
        })
      }
    }

    return chunks
  }

  /**
   * Query supportive care sections of guidelines
   */
  private async querySupportiveCareGuidelines(
    pco: PatientContextObject,
    query: string
  ): Promise<RetrievedChunk[]> {
    const cancerType = pco.diagnoses[0]?.cancer_type

    return queryGuidelineChunks({
      query: `${query} supportive care quality of life survivorship side effects management`,
      cancerType,
      limit: 6
    })
  }

  /**
   * Score relevance for whole person context
   */
  private scoreRelevanceForWholePerson(
    content: string,
    query: string,
    pco: PatientContextObject
  ): number {
    let score = this.scoreRelevance(content, query, pco)
    const contentLower = content.toLowerCase()

    // Boost for quality of life terms
    const qolTerms = ['quality of life', 'qol', 'wellbeing', 'well-being', 'coping', 'support']
    if (qolTerms.some(t => contentLower.includes(t))) {
      score += 0.1
    }

    // Boost for symptom management
    const symptomTerms = ['side effect', 'symptom', 'management', 'relief', 'help with']
    if (symptomTerms.some(t => contentLower.includes(t))) {
      score += 0.1
    }

    // Boost for practical advice
    const practicalTerms = ['tip', 'strategy', 'recommendation', 'try', 'consider']
    if (practicalTerms.some(t => contentLower.includes(t))) {
      score += 0.05
    }

    // Boost for patient-reported symptoms match
    if (pco.symptoms && pco.symptoms.length > 0) {
      const matchedSymptom = pco.symptoms.some(s =>
        contentLower.includes(s.name.toLowerCase())
      )
      if (matchedSymptom) score += 0.15
    }

    return Math.min(score, 1)
  }

  /**
   * Build citation for whole person content
   */
  private buildWholePersonCitation(chunk: RetrievedChunk, index: number): Citation {
    return {
      id: `whole-person-${index + 1}`,
      title: chunk.metadata?.title as string || chunk.source,
      source: chunk.source,
      url: undefined,
      accessed_date: new Date().toISOString().split('T')[0]
    }
  }

  /**
   * Calculate confidence for whole person retrieval
   */
  private calculateWholePersonConfidence(chunks: RetrievedChunk[], pco: PatientContextObject): number {
    if (chunks.length === 0) return 0

    const avgScore = chunks.reduce((sum, c) => sum + c.relevance_score, 0) / chunks.length

    // Boost if we matched patient symptoms
    const hasSymptomMatch = pco.symptoms?.some(s =>
      chunks.some(c => c.content.toLowerCase().includes(s.name.toLowerCase()))
    )

    let confidence = avgScore * 0.6
    if (hasSymptomMatch) confidence += 0.25
    if (chunks.length >= 2) confidence += 0.1

    return Math.min(confidence, 1)
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createWholePersonRetriever(
  config?: Partial<RetrieverConfig>
): WholePersonRetriever {
  return new WholePersonRetriever(config)
}
