/**
 * Molecular Oncologist Retriever
 *
 * Retrieves biomarker actionability information from OncoKB knowledge,
 * genomic databases, and molecular oncology literature.
 *
 * Primary sources:
 * - OncoKB actionability database (encoded knowledge)
 * - Biomarker-specific guideline sections
 * - Molecular pathology resources
 *
 * Key responsibility: Determine if biomarkers are ACTIONABLE and what drugs match.
 * Must distinguish pathogenic mutations from VUS, SNPs, benign variants.
 */

import { BaseRetriever, queryGuidelineChunks } from './base-retriever'
import type { PatientContextObject, RetrievedChunk, Citation } from '../types'
import type {
  RetrieverConfig,
  RetrievalRequest,
  RetrievalResponse,
  OncoKBAnnotation,
  QueryExpansion
} from './types'

// ============================================================================
// OncoKB Evidence Levels (Encoded Knowledge)
// ============================================================================

/**
 * OncoKB Evidence Levels:
 * Level 1:  FDA-recognized biomarker predictive of response
 * Level 2:  Standard care biomarker predictive of response
 * Level 3A: Compelling clinical evidence supports biomarker
 * Level 3B: Standard care or investigational evidence in another tumor type
 * Level 4:  Compelling biological evidence supports biomarker
 * Level R1: Standard care biomarker predictive of resistance
 * Level R2: Compelling clinical evidence supports biomarker resistance
 */

const ONCOKB_ACTIONABILITY: Record<string, OncoKBAnnotation[]> = {
  // BRCA1/2 - PARP Inhibitors
  'BRCA1': [
    {
      gene: 'BRCA1',
      alteration: 'Oncogenic Mutation',
      cancerType: 'Ovarian Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Olaparib', 'Niraparib', 'Rucaparib'],
      pmids: ['29451435', '30345584'],
      description: 'PARP inhibitors are FDA-approved for BRCA-mutated ovarian cancer as maintenance after platinum response. Olaparib also approved for first-line maintenance with bevacizumab in HRD-positive tumors.'
    },
    {
      gene: 'BRCA1',
      alteration: 'Oncogenic Mutation',
      cancerType: 'Breast Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Olaparib', 'Talazoparib'],
      pmids: ['28578601'],
      description: 'PARP inhibitors are FDA-approved for germline BRCA-mutated, HER2-negative metastatic breast cancer. Requires confirmed germline pathogenic variant.'
    },
    {
      gene: 'BRCA1',
      alteration: 'Oncogenic Mutation',
      cancerType: 'Prostate Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Olaparib', 'Rucaparib'],
      pmids: ['32343890'],
      description: 'PARP inhibitors approved for mCRPC with BRCA1/2 mutations who have progressed on prior therapy.'
    },
    {
      gene: 'BRCA1',
      alteration: 'Oncogenic Mutation',
      cancerType: 'Pancreatic Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Olaparib'],
      pmids: ['31157963'],
      description: 'Olaparib approved as maintenance for germline BRCA-mutated metastatic pancreatic cancer without progression after platinum-based chemotherapy.'
    }
  ],
  'BRCA2': [
    {
      gene: 'BRCA2',
      alteration: 'Oncogenic Mutation',
      cancerType: 'Ovarian Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Olaparib', 'Niraparib', 'Rucaparib'],
      pmids: ['29451435', '30345584'],
      description: 'PARP inhibitors are FDA-approved for BRCA-mutated ovarian cancer as maintenance after platinum response. BRCA2 mutations are associated with particularly good PARP inhibitor responses.'
    },
    {
      gene: 'BRCA2',
      alteration: 'Oncogenic Mutation',
      cancerType: 'Breast Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Olaparib', 'Talazoparib'],
      pmids: ['28578601'],
      description: 'PARP inhibitors are FDA-approved for germline BRCA-mutated, HER2-negative metastatic breast cancer.'
    },
    {
      gene: 'BRCA2',
      alteration: 'Oncogenic Mutation',
      cancerType: 'Prostate Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Olaparib', 'Rucaparib'],
      pmids: ['32343890'],
      description: 'PARP inhibitors approved for mCRPC with BRCA mutations. BRCA2 is the most common HRR gene altered in prostate cancer.'
    }
  ],

  // HER2
  'HER2': [
    {
      gene: 'ERBB2',
      alteration: 'Amplification',
      cancerType: 'Breast Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Trastuzumab', 'Pertuzumab', 'T-DM1', 'Trastuzumab deruxtecan'],
      pmids: ['11752352', '30354866'],
      description: 'HER2-targeted therapy is standard of care for HER2-positive breast cancer. T-DXd has shown activity even in HER2-low tumors.'
    },
    {
      gene: 'ERBB2',
      alteration: 'Amplification',
      cancerType: 'Gastric Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Trastuzumab', 'Trastuzumab deruxtecan'],
      pmids: ['20728210'],
      description: 'Trastuzumab with chemotherapy is first-line standard for HER2-positive gastric/GEJ cancer.'
    }
  ],

  // EGFR
  'EGFR': [
    {
      gene: 'EGFR',
      alteration: 'Exon 19 deletion, L858R',
      cancerType: 'Non-Small Cell Lung Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Osimertinib', 'Erlotinib', 'Gefitinib', 'Afatinib'],
      pmids: ['29151359'],
      description: 'Osimertinib is preferred first-line therapy for EGFR-mutated NSCLC due to CNS penetration and T790M resistance coverage.'
    },
    {
      gene: 'EGFR',
      alteration: 'Exon 20 insertion',
      cancerType: 'Non-Small Cell Lung Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Amivantamab', 'Mobocertinib'],
      pmids: ['34071439'],
      description: 'EGFR exon 20 insertions are generally resistant to standard EGFR TKIs. Amivantamab and mobocertinib have activity.'
    }
  ],

  // ALK
  'ALK': [
    {
      gene: 'ALK',
      alteration: 'Fusion',
      cancerType: 'Non-Small Cell Lung Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Alectinib', 'Brigatinib', 'Lorlatinib', 'Crizotinib'],
      pmids: ['28586279'],
      description: 'Alectinib or brigatinib preferred first-line for ALK-rearranged NSCLC. Lorlatinib preferred for CNS involvement or after progression.'
    }
  ],

  // ROS1
  'ROS1': [
    {
      gene: 'ROS1',
      alteration: 'Fusion',
      cancerType: 'Non-Small Cell Lung Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Crizotinib', 'Entrectinib'],
      pmids: ['25264305'],
      description: 'Crizotinib or entrectinib for ROS1-rearranged NSCLC. Entrectinib has better CNS penetration.'
    }
  ],

  // BRAF V600E
  'BRAF': [
    {
      gene: 'BRAF',
      alteration: 'V600E',
      cancerType: 'Melanoma',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Dabrafenib + Trametinib', 'Encorafenib + Binimetinib', 'Vemurafenib + Cobimetinib'],
      pmids: ['25399551'],
      description: 'BRAF/MEK inhibitor combinations are standard for BRAF V600-mutated melanoma.'
    },
    {
      gene: 'BRAF',
      alteration: 'V600E',
      cancerType: 'Non-Small Cell Lung Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Dabrafenib + Trametinib'],
      pmids: ['27283860'],
      description: 'Dabrafenib plus trametinib approved for BRAF V600E-mutated NSCLC.'
    },
    {
      gene: 'BRAF',
      alteration: 'V600E',
      cancerType: 'Colorectal Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Encorafenib + Cetuximab'],
      pmids: ['31566309'],
      description: 'BRAF V600E in CRC is associated with poor prognosis. Encorafenib + cetuximab is approved after prior therapy.'
    }
  ],

  // KRAS G12C
  'KRAS': [
    {
      gene: 'KRAS',
      alteration: 'G12C',
      cancerType: 'Non-Small Cell Lung Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Sotorasib', 'Adagrasib'],
      pmids: ['34096690'],
      description: 'KRAS G12C inhibitors are approved for previously treated KRAS G12C-mutated NSCLC.'
    }
  ],

  // MSI-H/dMMR - Pan-cancer
  'MSI-H': [
    {
      gene: 'MSI',
      alteration: 'MSI-H',
      cancerType: 'All Solid Tumors',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Pembrolizumab', 'Dostarlimab'],
      pmids: ['26028255'],
      description: 'Pembrolizumab is FDA-approved for MSI-H/dMMR solid tumors regardless of tumor type (tissue-agnostic approval).'
    }
  ],

  // PD-L1
  'PD-L1': [
    {
      gene: 'CD274',
      alteration: 'High Expression (TPS ≥50%)',
      cancerType: 'Non-Small Cell Lung Cancer',
      level: '1',
      fdaLevel: 'Fda1',
      drugs: ['Pembrolizumab'],
      pmids: ['27718847'],
      description: 'Pembrolizumab monotherapy is preferred first-line for PD-L1 TPS ≥50% NSCLC without EGFR/ALK alterations.'
    }
  ],

  // ATM - HRR genes for prostate
  'ATM': [
    {
      gene: 'ATM',
      alteration: 'Oncogenic Mutation',
      cancerType: 'Prostate Cancer',
      level: '2',
      drugs: ['Olaparib'],
      pmids: ['32343890'],
      description: 'ATM mutations may sensitize to PARP inhibitors, though response rates are lower than BRCA mutations.'
    }
  ],

  // PALB2
  'PALB2': [
    {
      gene: 'PALB2',
      alteration: 'Oncogenic Mutation',
      cancerType: 'Breast Cancer',
      level: '2',
      drugs: ['Olaparib'],
      pmids: [],
      description: 'PALB2 mutations cause HRD and may respond to PARP inhibitors. FDA approval is for BRCA, but clinical evidence supports PALB2 activity.'
    }
  ],
}

// ============================================================================
// Variant Classification Knowledge
// ============================================================================

const VARIANT_CLASSIFICATION = {
  ACTIONABLE: ['pathogenic', 'likely pathogenic', 'deleterious', 'oncogenic'],
  NOT_ACTIONABLE: ['vus', 'variant of uncertain significance', 'benign', 'likely benign', 'snp', 'polymorphism'],
  RESISTANCE: ['resistance', 'resistant', 't790m'],
}

// ============================================================================
// Molecular Oncologist Retriever Implementation
// ============================================================================

export class MolecularOncologistRetriever extends BaseRetriever {
  constructor(config?: Partial<RetrieverConfig>) {
    super({
      persona: 'Molecular Oncologist',
      sources: [
        { type: 'oncokb', name: 'OncoKB Precision Oncology Database', priority: 1, enabled: true },
        { type: 'nccn_guidelines', name: 'NCCN Biomarker Guidelines', priority: 2, enabled: true },
        { type: 'internal_chunks', name: 'Molecular Oncology Sections', priority: 3, enabled: true },
      ],
      maxChunks: 8,
      minRelevanceScore: 0.3,
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

      // 1. Look up OncoKB annotations for patient's biomarkers
      const oncoKBChunks = await this.getOncoKBAnnotations(pco)
      if (oncoKBChunks.length > 0) {
        chunks.push(...oncoKBChunks)
        sourcesUsed.add('oncokb')
      }

      // 2. Query biomarker-specific guideline sections
      const guidelineChunks = await this.queryBiomarkerGuidelines(pco, query)
      if (guidelineChunks.length > 0) {
        chunks.push(...guidelineChunks)
        sourcesUsed.add('nccn_guidelines')
      }

      // 3. Add variant classification context if needed
      const classificationChunks = this.getVariantClassificationContext(pco)
      if (classificationChunks.length > 0) {
        chunks.push(...classificationChunks)
      }

      // 4. Score, dedupe, and rank
      const scoredChunks = chunks.map(chunk => ({
        ...chunk,
        relevance_score: this.scoreRelevanceForMolecular(chunk.content, query, pco)
      }))

      const rankedChunks = this.rankAndLimit(this.deduplicateChunks(scoredChunks))

      // 5. Build citations
      rankedChunks.forEach((chunk, i) => {
        citations.push(this.buildMolecularCitation(chunk, i))
      })

      const response: RetrievalResponse = {
        persona: 'Molecular Oncologist',
        chunks: rankedChunks,
        citations,
        retrieval_time_ms: Date.now() - startTime,
        sources_used: Array.from(sourcesUsed) as any[],
        confidence: this.calculateMolecularConfidence(rankedChunks, pco),
        fallback_used: rankedChunks.length === 0
      }

      this.logRetrieval(request, response)
      return response
    } catch (error) {
      console.error('[Molecular Oncologist] Retrieval error:', error)
      return this.createFallbackResponse(request, startTime)
    }
  }

  /**
   * Get OncoKB actionability annotations for patient's biomarkers
   */
  private async getOncoKBAnnotations(pco: PatientContextObject): Promise<RetrievedChunk[]> {
    const chunks: RetrievedChunk[] = []
    const cancerType = pco.diagnoses[0]?.cancer_type || ''

    for (const biomarker of pco.biomarkers) {
      const normalized = this.normalizeBiomarker(biomarker.name)
      const annotations = ONCOKB_ACTIONABILITY[normalized]

      if (annotations) {
        // Find cancer-type specific annotations first, then pan-cancer
        const relevantAnnotations = annotations.filter(a =>
          cancerType.toLowerCase().includes(a.cancerType.toLowerCase()) ||
          a.cancerType === 'All Solid Tumors'
        )

        for (const annotation of relevantAnnotations.slice(0, 2)) {
          const content = this.formatOncoKBAnnotation(biomarker, annotation)
          chunks.push({
            id: `oncokb-${annotation.gene}-${annotation.cancerType}`,
            content,
            source: `OncoKB - ${annotation.gene} (Level ${annotation.level})`,
            relevance_score: this.getOncoKBRelevanceScore(annotation, biomarker),
            metadata: {
              gene: annotation.gene,
              level: annotation.level,
              fdaLevel: annotation.fdaLevel,
              drugs: annotation.drugs,
              pmids: annotation.pmids,
              isActionable: this.isBiomarkerActionable(biomarker)
            }
          })
        }
      }
    }

    return chunks
  }

  /**
   * Format OncoKB annotation as readable content
   */
  private formatOncoKBAnnotation(
    biomarker: { name: string; value?: string; source: string },
    annotation: OncoKBAnnotation
  ): string {
    const isActionable = this.isBiomarkerActionable(biomarker)
    const actionabilityNote = isActionable
      ? `This ${biomarker.source === 'germline' ? 'germline' : 'somatic'} mutation is ACTIONABLE.`
      : `NOTE: The variant classification must be confirmed. VUS and SNPs are NOT actionable.`

    return `
**${annotation.gene} - ${annotation.alteration}** (OncoKB Level ${annotation.level}${annotation.fdaLevel ? `, ${annotation.fdaLevel}` : ''})

Cancer Type: ${annotation.cancerType}

${actionabilityNote}

${annotation.description}

**Approved/Investigational Therapies:**
${annotation.drugs.map(d => `• ${d}`).join('\n')}

${annotation.pmids.length > 0 ? `References: ${annotation.pmids.map(p => `PMID:${p}`).join(', ')}` : ''}
`.trim()
  }

  /**
   * Determine if biomarker is actionable based on variant classification
   */
  private isBiomarkerActionable(biomarker: { name: string; value?: string }): boolean {
    const value = (biomarker.value || '').toLowerCase()

    // Check for non-actionable variants
    if (VARIANT_CLASSIFICATION.NOT_ACTIONABLE.some(term => value.includes(term))) {
      return false
    }

    // Check for actionable variants
    if (VARIANT_CLASSIFICATION.ACTIONABLE.some(term => value.includes(term))) {
      return true
    }

    // If "positive" or "mutation" without classification, assume potentially actionable
    if (value.includes('positive') || value.includes('mutation')) {
      return true
    }

    return false
  }

  /**
   * Get relevance score based on OncoKB evidence level
   */
  private getOncoKBRelevanceScore(
    annotation: OncoKBAnnotation,
    biomarker: { name: string; value?: string }
  ): number {
    const levelScores: Record<string, number> = {
      '1': 0.95,
      '2': 0.85,
      '3A': 0.75,
      '3B': 0.65,
      '4': 0.55,
      'R1': 0.80,
      'R2': 0.70,
    }

    let score = levelScores[annotation.level] || 0.5

    // Boost if biomarker is confirmed actionable
    if (this.isBiomarkerActionable(biomarker)) {
      score += 0.05
    }

    return Math.min(score, 1)
  }

  /**
   * Query guideline sections specific to biomarkers
   */
  private async queryBiomarkerGuidelines(
    pco: PatientContextObject,
    query: string
  ): Promise<RetrievedChunk[]> {
    const biomarkerNames = pco.biomarkers
      .filter(b => b.result_type === 'positive')
      .map(b => this.normalizeBiomarker(b.name))

    if (biomarkerNames.length === 0) {
      return []
    }

    const cancerType = pco.diagnoses[0]?.cancer_type

    return queryGuidelineChunks({
      query: `${biomarkerNames.join(' ')} ${query}`,
      cancerType,
      limit: 10
    })
  }

  /**
   * Add educational context about variant classification
   */
  private getVariantClassificationContext(pco: PatientContextObject): RetrievedChunk[] {
    const chunks: RetrievedChunk[] = []

    // Check if any biomarkers have ambiguous classification
    const ambiguousBiomarkers = pco.biomarkers.filter(b => {
      const value = (b.value || '').toLowerCase()
      return !VARIANT_CLASSIFICATION.ACTIONABLE.some(t => value.includes(t)) &&
             !VARIANT_CLASSIFICATION.NOT_ACTIONABLE.some(t => value.includes(t))
    })

    if (ambiguousBiomarkers.length > 0) {
      chunks.push({
        id: 'variant-classification-context',
        content: `
**IMPORTANT: Variant Classification Matters**

Not all genetic variants are actionable. The clinical significance depends on classification:

**ACTIONABLE (may affect treatment):**
• Pathogenic
• Likely Pathogenic
• Deleterious

**NOT ACTIONABLE (does not affect treatment):**
• Variant of Uncertain Significance (VUS)
• Benign / Likely Benign
• Single Nucleotide Polymorphism (SNP)

For ${ambiguousBiomarkers.map(b => b.name).join(', ')}: Please confirm the variant classification with your oncologist. A VUS in BRCA2, for example, does NOT qualify for PARP inhibitor therapy.

Germline vs Somatic also matters:
• Germline mutations (inherited) may have implications for family members
• Somatic mutations (tumor-only) affect treatment but not heredity
`.trim(),
        source: 'Molecular Oncology - Variant Classification',
        relevance_score: 0.7,
        metadata: { type: 'educational' }
      })
    }

    return chunks
  }

  /**
   * Score relevance for molecular oncology context
   */
  private scoreRelevanceForMolecular(
    content: string,
    query: string,
    pco: PatientContextObject
  ): number {
    let score = this.scoreRelevance(content, query, pco)
    const contentLower = content.toLowerCase()

    // Boost for drug/therapy mentions
    const therapyTerms = ['inhibitor', 'targeted therapy', 'tyrosine kinase', 'monoclonal antibody']
    if (therapyTerms.some(t => contentLower.includes(t))) {
      score += 0.1
    }

    // Boost for actionability terms
    const actionabilityTerms = ['fda-approved', 'approved', 'indicated', 'recommended', 'level 1', 'level 2']
    if (actionabilityTerms.some(t => contentLower.includes(t))) {
      score += 0.1
    }

    // Boost for biomarker-drug associations
    for (const biomarker of pco.biomarkers.filter(b => b.result_type === 'positive')) {
      const normalized = this.normalizeBiomarker(biomarker.name)
      const annotations = ONCOKB_ACTIONABILITY[normalized]
      if (annotations) {
        const drugs = annotations.flatMap(a => a.drugs)
        if (drugs.some(d => contentLower.includes(d.toLowerCase()))) {
          score += 0.15
        }
      }
    }

    return Math.min(score, 1)
  }

  /**
   * Build citation with molecular-specific metadata
   */
  private buildMolecularCitation(chunk: RetrievedChunk, index: number): Citation {
    const pmids = chunk.metadata?.pmids as string[]

    return {
      id: `molecular-${index + 1}`,
      title: chunk.source,
      source: chunk.metadata?.gene ? `OncoKB - ${chunk.metadata.gene}` : chunk.source,
      url: pmids && pmids.length > 0
        ? `https://pubmed.ncbi.nlm.nih.gov/${pmids[0]}/`
        : undefined,
      accessed_date: new Date().toISOString().split('T')[0]
    }
  }

  /**
   * Calculate confidence for molecular retrieval
   */
  private calculateMolecularConfidence(chunks: RetrievedChunk[], pco: PatientContextObject): number {
    if (chunks.length === 0) return 0

    // Higher confidence if we have OncoKB Level 1 annotations
    const hasLevel1 = chunks.some(c => c.metadata?.level === '1')
    const hasOncoKB = chunks.some(c => c.source.includes('OncoKB'))
    const avgScore = chunks.reduce((sum, c) => sum + c.relevance_score, 0) / chunks.length

    let confidence = avgScore * 0.5
    if (hasLevel1) confidence += 0.35
    else if (hasOncoKB) confidence += 0.2

    // Check if biomarkers are confirmed actionable
    const actionableBiomarkers = pco.biomarkers.filter(b => this.isBiomarkerActionable(b))
    if (actionableBiomarkers.length > 0) {
      confidence += 0.15
    }

    return Math.min(confidence, 1)
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMolecularOncologistRetriever(
  config?: Partial<RetrieverConfig>
): MolecularOncologistRetriever {
  return new MolecularOncologistRetriever(config)
}
