/**
 * Combat Persona Eval Suite
 *
 * 50 test cases (10 per persona) to evaluate clinical accuracy
 * Run with: npx ts-node src/evals/combat/run-evals.ts
 */

export interface TestCase {
  id: string
  persona: 'molecular' | 'guidelines' | 'aggressive' | 'conservative' | 'integrative'
  name: string
  description: string
  input: {
    cancerType: string
    stage?: string
    biomarkers?: string[]
    treatments?: string[]
    age?: number
    comorbidities?: string[]
    documentText?: string
  }
  expected: {
    required?: string[]      // Must contain ALL of these (case-insensitive)
    forbidden?: string[]     // Must NOT contain ANY of these
    sentiment?: 'recommend' | 'caution' | 'contraindicate'
  }
  clinicalRationale: string  // Why this test matters
  severity: 'critical' | 'high' | 'medium' | 'low'  // Impact of getting it wrong
}

// ============================================================================
// MOLECULAR/TARGETED PERSONA (10 cases)
// Focus: VUS/SNP/pathogenic distinctions, biomarker-drug matching
// ============================================================================

export const molecularCases: TestCase[] = [
  {
    id: 'mol-001',
    persona: 'molecular',
    name: 'VUS should NOT trigger treatment recommendation',
    description: 'BRCA1 VUS must not be treated as actionable',
    input: {
      cancerType: 'Ovarian cancer',
      stage: 'Stage IIIC',
      biomarkers: ['BRCA1 c.5096G>A (VUS)', 'HER2 negative'],
    },
    expected: {
      required: ['VUS', 'uncertain significance', 'not actionable'],
      forbidden: ['eligible for PARP', 'recommend olaparib', 'PARP inhibitor candidate', 'qualifies for'],
      sentiment: 'caution',
    },
    clinicalRationale: 'VUS should not guide therapy. Recommending PARP inhibitors based on VUS is clinical error.',
    severity: 'critical',
  },
  {
    id: 'mol-002',
    persona: 'molecular',
    name: 'Pathogenic BRCA2 SHOULD trigger PARP recommendation',
    description: 'Confirmed pathogenic BRCA2 mutation qualifies for PARP inhibitors',
    input: {
      cancerType: 'Ovarian cancer',
      stage: 'Stage IIIC',
      biomarkers: ['BRCA2 c.5946del (Pathogenic)', 'HRD positive'],
    },
    expected: {
      required: ['PARP inhibitor', 'olaparib', 'pathogenic'],
      forbidden: ['not actionable', 'uncertain', 'VUS'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Pathogenic BRCA2 is FDA-approved indication for PARP inhibitors in ovarian cancer.',
    severity: 'critical',
  },
  {
    id: 'mol-003',
    persona: 'molecular',
    name: 'SNP must NOT be called a mutation',
    description: 'Common ATM SNP should not be misclassified as HRR deficiency',
    input: {
      cancerType: 'Prostate cancer',
      stage: 'Metastatic',
      biomarkers: ['ATM rs1801516 (SNP)', 'BRCA1/2 negative'],
    },
    expected: {
      required: ['SNP', 'population variant', 'not a mutation'],
      forbidden: ['ATM mutation', 'HRR deficient', 'PARP inhibitor', 'DNA repair defect'],
      sentiment: 'caution',
    },
    clinicalRationale: 'SNPs are common population variants, not cancer-causing mutations. Misclassification leads to wrong treatment.',
    severity: 'critical',
  },
  {
    id: 'mol-004',
    persona: 'molecular',
    name: 'EGFR exon 19 deletion should trigger TKI',
    description: 'Classic EGFR sensitizing mutation in NSCLC',
    input: {
      cancerType: 'Non-small cell lung cancer',
      stage: 'Stage IV',
      biomarkers: ['EGFR exon 19 deletion (p.E746_A750del)', 'PD-L1 20%'],
    },
    expected: {
      required: ['osimertinib', 'EGFR TKI', 'targeted therapy', 'first-line'],
      forbidden: ['chemotherapy first', 'immunotherapy alone'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'EGFR exon 19 del is Level 1 evidence for osimertinib. Missing this is standard of care failure.',
    severity: 'critical',
  },
  {
    id: 'mol-005',
    persona: 'molecular',
    name: 'KRAS G12C should trigger sotorasib/adagrasib',
    description: 'Actionable KRAS mutation in NSCLC',
    input: {
      cancerType: 'Non-small cell lung cancer',
      stage: 'Stage IV',
      biomarkers: ['KRAS G12C mutation', 'PD-L1 negative', 'EGFR wild-type'],
    },
    expected: {
      required: ['sotorasib', 'adagrasib', 'KRAS G12C inhibitor'],
      forbidden: ['KRAS is not targetable', 'no targeted options'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'KRAS G12C inhibitors are FDA-approved. Old dogma that KRAS is undruggable is outdated.',
    severity: 'high',
  },
  {
    id: 'mol-006',
    persona: 'molecular',
    name: 'Germline vs somatic distinction matters',
    description: 'Germline BRCA has different implications than somatic',
    input: {
      cancerType: 'Breast cancer',
      stage: 'Stage II',
      biomarkers: ['BRCA1 pathogenic (GERMLINE)', 'HER2 negative', 'ER positive'],
    },
    expected: {
      required: ['germline', 'hereditary', 'genetic counseling', 'family', 'cascade testing'],
      forbidden: ['somatic only', 'tumor-specific'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Germline mutations require genetic counseling and family cascade testing. Different management than somatic.',
    severity: 'high',
  },
  {
    id: 'mol-007',
    persona: 'molecular',
    name: 'MSI-H should trigger immunotherapy discussion',
    description: 'MSI-High is tumor-agnostic biomarker for pembrolizumab',
    input: {
      cancerType: 'Colorectal cancer',
      stage: 'Stage IV',
      biomarkers: ['MSI-High', 'dMMR (MLH1 loss)', 'BRAF V600E'],
    },
    expected: {
      required: ['pembrolizumab', 'immunotherapy', 'MSI-H', 'checkpoint inhibitor'],
      forbidden: ['chemotherapy alone', 'not eligible for immunotherapy'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'MSI-H is FDA-approved tumor-agnostic indication. First-line IO in MSI-H mCRC is standard.',
    severity: 'critical',
  },
  {
    id: 'mol-008',
    persona: 'molecular',
    name: 'HER2-low should trigger T-DXd discussion',
    description: 'HER2-low (IHC 1+ or 2+/ISH-) is now actionable',
    input: {
      cancerType: 'Breast cancer',
      stage: 'Metastatic',
      biomarkers: ['HER2-low (IHC 2+, ISH negative)', 'ER positive', 'PR positive'],
    },
    expected: {
      required: ['trastuzumab deruxtecan', 'T-DXd', 'Enhertu', 'HER2-low'],
      forbidden: ['HER2 negative means no targeted therapy', 'not eligible for HER2 therapy'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'DESTINY-Breast04 changed practice. HER2-low is now actionable with T-DXd.',
    severity: 'high',
  },
  {
    id: 'mol-009',
    persona: 'molecular',
    name: 'Recommend NGS if not done',
    description: 'Should recommend comprehensive genomic profiling',
    input: {
      cancerType: 'Non-small cell lung cancer',
      stage: 'Stage IV',
      biomarkers: ['Unknown - no molecular testing performed'],
    },
    expected: {
      required: ['NGS', 'comprehensive genomic profiling', 'Foundation', 'Tempus', 'Guardant', 'molecular testing'],
      forbidden: ['proceed with chemotherapy', 'no testing needed'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Stage IV NSCLC requires NGS before treatment. Up to 70% have actionable alterations.',
    severity: 'critical',
  },
  {
    id: 'mol-010',
    persona: 'molecular',
    name: 'ALK rearrangement should trigger ALK inhibitor',
    description: 'ALK fusion is highly actionable in NSCLC',
    input: {
      cancerType: 'Non-small cell lung cancer',
      stage: 'Stage IV',
      biomarkers: ['ALK rearrangement (EML4-ALK fusion)', 'EGFR wild-type'],
    },
    expected: {
      required: ['alectinib', 'lorlatinib', 'ALK inhibitor', 'ALK TKI'],
      forbidden: ['chemotherapy first', 'not targetable'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'ALK+ NSCLC has excellent outcomes with ALK TKIs. Missing this is malpractice-level error.',
    severity: 'critical',
  },
]

// ============================================================================
// WATCH & WAIT PERSONA (10 cases)
// Focus: When surveillance IS appropriate, when it's NOT, overtreatment avoidance
// ============================================================================

export const conservativeCases: TestCase[] = [
  {
    id: 'con-001',
    persona: 'conservative',
    name: 'Low-risk prostate cancer IS surveillance candidate',
    description: 'Gleason 6, low PSA, small volume = active surveillance',
    input: {
      cancerType: 'Prostate cancer',
      stage: 'T1c',
      biomarkers: ['Gleason 3+3=6', 'PSA 4.2 ng/mL', '1 of 12 cores positive'],
      age: 62,
    },
    expected: {
      required: ['active surveillance', 'monitoring', 'PROTECT trial', 'avoid overtreatment'],
      forbidden: ['immediate surgery', 'must treat now', 'urgent prostatectomy'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'PROTECT trial showed equivalent 15-year survival for surveillance vs treatment in low-risk disease.',
    severity: 'high',
  },
  {
    id: 'con-002',
    persona: 'conservative',
    name: 'High-risk prostate cancer is NOT surveillance candidate',
    description: 'Gleason 9, high PSA = treatment needed',
    input: {
      cancerType: 'Prostate cancer',
      stage: 'T3a',
      biomarkers: ['Gleason 4+5=9', 'PSA 45 ng/mL', '10 of 12 cores positive'],
      age: 58,
    },
    expected: {
      required: ['treatment', 'high-risk', 'not appropriate for surveillance'],
      forbidden: ['active surveillance is reasonable', 'can safely monitor'],
      sentiment: 'caution',
    },
    clinicalRationale: 'High-grade prostate cancer requires treatment. Surveillance here would be negligent.',
    severity: 'critical',
  },
  {
    id: 'con-003',
    persona: 'conservative',
    name: 'Papillary thyroid microcarcinoma surveillance',
    description: 'Small papillary thyroid cancer can be observed',
    input: {
      cancerType: 'Papillary thyroid cancer',
      stage: 'T1a (8mm)',
      biomarkers: ['No lymph node involvement', 'No extrathyroidal extension'],
      age: 45,
    },
    expected: {
      required: ['active surveillance', 'observation', 'avoid surgery', 'low risk'],
      forbidden: ['immediate thyroidectomy required', 'urgent surgery'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Japanese and Korean data show observation is safe for papillary microcarcinomas <1cm.',
    severity: 'high',
  },
  {
    id: 'con-004',
    persona: 'conservative',
    name: 'CLL Rai Stage 0 should be watch and wait',
    description: 'Early CLL does not require treatment',
    input: {
      cancerType: 'Chronic lymphocytic leukemia',
      stage: 'Rai Stage 0',
      biomarkers: ['del(13q) only', 'Mutated IGHV', 'No TP53 mutation'],
      age: 68,
    },
    expected: {
      required: ['watch and wait', 'no treatment indicated', 'observation', 'monitor'],
      forbidden: ['start treatment', 'begin chemotherapy', 'initiate therapy'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Early-stage CLL with favorable markers should be observed. Treatment doesnt improve survival.',
    severity: 'high',
  },
  {
    id: 'con-005',
    persona: 'conservative',
    name: 'Symptomatic CLL DOES need treatment',
    description: 'CLL with B symptoms and cytopenias requires therapy',
    input: {
      cancerType: 'Chronic lymphocytic leukemia',
      stage: 'Rai Stage IV',
      biomarkers: ['del(17p)', 'Unmutated IGHV', 'Hemoglobin 8.5', 'Platelets 45K'],
      comorbidities: ['Night sweats', 'Weight loss 15 lbs'],
    },
    expected: {
      required: ['treatment indicated', 'symptomatic disease', 'cytopenias'],
      forbidden: ['continue observation', 'watch and wait appropriate'],
      sentiment: 'caution',
    },
    clinicalRationale: 'Symptomatic CLL with cytopenias meets iwCLL treatment criteria.',
    severity: 'critical',
  },
  {
    id: 'con-006',
    persona: 'conservative',
    name: 'DCIS does not always need radiation',
    description: 'Low-risk DCIS after lumpectomy may skip radiation',
    input: {
      cancerType: 'Ductal carcinoma in situ (DCIS)',
      stage: 'Low grade',
      biomarkers: ['ER positive', 'Low nuclear grade', 'No necrosis', 'Margins >10mm'],
      age: 55,
    },
    expected: {
      required: ['consider omitting radiation', 'low recurrence risk', 'de-escalation', 'shared decision'],
      forbidden: ['radiation absolutely required', 'must have radiation'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'RTOG 9804 and other trials support omitting radiation in select low-risk DCIS.',
    severity: 'medium',
  },
  {
    id: 'con-007',
    persona: 'conservative',
    name: 'Elderly patient with competing comorbidities',
    description: 'Treatment burden may exceed benefit in frail elderly',
    input: {
      cancerType: 'Breast cancer',
      stage: 'Stage I',
      biomarkers: ['ER positive', 'HER2 negative', 'Low Ki-67'],
      age: 87,
      comorbidities: ['CHF', 'COPD', 'Dementia', 'ECOG PS 3'],
    },
    expected: {
      required: ['quality of life', 'life expectancy', 'competing risks', 'goals of care', 'endocrine alone'],
      forbidden: ['aggressive chemotherapy', 'standard treatment required'],
      sentiment: 'caution',
    },
    clinicalRationale: 'In frail elderly, treatment toxicity may exceed cancer risk. Consider endocrine only.',
    severity: 'high',
  },
  {
    id: 'con-008',
    persona: 'conservative',
    name: 'Treatment holiday after prolonged response',
    description: 'Consider stopping maintenance after extended control',
    input: {
      cancerType: 'Metastatic colorectal cancer',
      stage: 'Stage IV, stable disease x 3 years on maintenance',
      biomarkers: ['KRAS wild-type', 'CEA normalized', 'No new lesions'],
      treatments: ['FOLFOX completed', 'Maintenance capecitabine x 3 years'],
    },
    expected: {
      required: ['treatment holiday', 'drug holiday', 'consider stopping', 'quality of life'],
      forbidden: ['continue indefinitely', 'never stop treatment'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'OPTIMOX and other trials support treatment holidays in mCRC with prolonged stability.',
    severity: 'medium',
  },
  {
    id: 'con-009',
    persona: 'conservative',
    name: 'Incidental lung nodule does not need biopsy',
    description: 'Small ground-glass nodule can be followed',
    input: {
      cancerType: 'Lung nodule (incidental)',
      stage: 'N/A - 6mm ground-glass nodule',
      biomarkers: ['No solid component', 'No growth on prior CT'],
      age: 52,
    },
    expected: {
      required: ['follow-up imaging', 'surveillance', 'Fleischner criteria', 'low risk'],
      forbidden: ['immediate biopsy', 'surgery required', 'must be cancer'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Fleischner Society guidelines recommend surveillance for small GGNs, not immediate intervention.',
    severity: 'medium',
  },
  {
    id: 'con-010',
    persona: 'conservative',
    name: 'Late effects and survivorship considerations',
    description: 'Consider long-term toxicity in treatment decisions',
    input: {
      cancerType: 'Hodgkin lymphoma',
      stage: 'Stage IIA, favorable',
      biomarkers: ['PET-negative after 2 cycles ABVD'],
      age: 25,
    },
    expected: {
      required: ['late effects', 'secondary malignancy', 'cardiac toxicity', 'fertility', 'de-escalation'],
      forbidden: ['full course regardless', 'toxicity doesnt matter'],
      sentiment: 'caution',
    },
    clinicalRationale: 'Young Hodgkin survivors have 30+ year horizon. Late cardiac/secondary cancer risk matters.',
    severity: 'high',
  },
]

// ============================================================================
// STANDARD OF CARE PERSONA (10 cases)
// Focus: NCCN guideline adherence, evidence levels, appropriate conservatism
// ============================================================================

export const guidelinesCases: TestCase[] = [
  {
    id: 'soc-001',
    persona: 'guidelines',
    name: 'Stage III colon cancer needs adjuvant chemo',
    description: 'Node-positive colon cancer requires adjuvant therapy',
    input: {
      cancerType: 'Colon cancer',
      stage: 'Stage IIIB (T3N2)',
      biomarkers: ['MSS (microsatellite stable)', 'KRAS G12D'],
    },
    expected: {
      required: ['FOLFOX', 'CAPOX', 'adjuvant chemotherapy', '3-6 months', 'NCCN'],
      forbidden: ['no adjuvant needed', 'surgery alone sufficient'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'NCCN Category 1 recommendation for adjuvant chemo in Stage III colon cancer.',
    severity: 'critical',
  },
  {
    id: 'soc-002',
    persona: 'guidelines',
    name: 'HER2+ breast cancer needs anti-HER2 therapy',
    description: 'HER2 positive breast cancer standard of care',
    input: {
      cancerType: 'Breast cancer',
      stage: 'Stage II',
      biomarkers: ['HER2 positive (IHC 3+)', 'ER positive', 'PR positive'],
    },
    expected: {
      required: ['trastuzumab', 'Herceptin', 'anti-HER2', 'TCHP', 'pertuzumab'],
      forbidden: ['HER2 therapy not needed', 'chemotherapy alone'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Anti-HER2 therapy transformed HER2+ breast cancer outcomes. Omitting it is negligent.',
    severity: 'critical',
  },
  {
    id: 'soc-003',
    persona: 'guidelines',
    name: 'Early NSCLC needs surgery not immunotherapy first',
    description: 'Resectable lung cancer: surgery is primary treatment',
    input: {
      cancerType: 'Non-small cell lung cancer',
      stage: 'Stage IB (3.5cm tumor)',
      biomarkers: ['PD-L1 90%', 'No driver mutations', 'Medically operable'],
    },
    expected: {
      required: ['surgery', 'lobectomy', 'resection', 'adjuvant'],
      forbidden: ['pembrolizumab first', 'immunotherapy instead of surgery'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Stage I-II NSCLC is curable with surgery. Neoadjuvant IO is evolving but surgery remains primary.',
    severity: 'critical',
  },
  {
    id: 'soc-004',
    persona: 'guidelines',
    name: 'Triple negative breast cancer needs chemotherapy',
    description: 'TNBC has no targeted options - chemo is standard',
    input: {
      cancerType: 'Breast cancer',
      stage: 'Stage II',
      biomarkers: ['ER negative', 'PR negative', 'HER2 negative', 'Ki-67 80%'],
    },
    expected: {
      required: ['chemotherapy', 'AC-T', 'dose-dense', 'neoadjuvant'],
      forbidden: ['endocrine therapy alone', 'no systemic therapy needed'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'TNBC requires chemotherapy. Adding pembrolizumab for high-risk per KEYNOTE-522.',
    severity: 'critical',
  },
  {
    id: 'soc-005',
    persona: 'guidelines',
    name: 'Testicular cancer is highly curable',
    description: 'Even metastatic testicular cancer has excellent outcomes',
    input: {
      cancerType: 'Testicular cancer (seminoma)',
      stage: 'Stage IIC',
      biomarkers: ['AFP normal', 'HCG mildly elevated', 'LDH elevated'],
    },
    expected: {
      required: ['BEP', 'chemotherapy', 'curable', 'excellent prognosis', '90%'],
      forbidden: ['poor prognosis', 'palliative', 'incurable'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Testicular cancer cure rates exceed 90% even in advanced disease. Hope is warranted.',
    severity: 'high',
  },
  {
    id: 'soc-006',
    persona: 'guidelines',
    name: 'Rectal cancer needs multimodality approach',
    description: 'Locally advanced rectal cancer requires TNT',
    input: {
      cancerType: 'Rectal cancer',
      stage: 'Stage III (T3N1)',
      biomarkers: ['MSS', 'Located 5cm from anal verge'],
    },
    expected: {
      required: ['total neoadjuvant', 'TNT', 'chemoradiation', 'FOLFOX', 'multimodality'],
      forbidden: ['surgery first', 'surgery alone'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'RAPIDO and PRODIGE-23 established TNT as standard for locally advanced rectal cancer.',
    severity: 'critical',
  },
  {
    id: 'soc-007',
    persona: 'guidelines',
    name: 'Pancreatic cancer staging workup',
    description: 'Borderline resectable pancreatic cancer needs proper staging',
    input: {
      cancerType: 'Pancreatic adenocarcinoma',
      stage: 'Borderline resectable',
      biomarkers: ['CA 19-9: 850', 'Abutment of SMV'],
    },
    expected: {
      required: ['neoadjuvant', 'FOLFIRINOX', 'restaging', 'multidisciplinary', 'high-volume center'],
      forbidden: ['immediate surgery', 'surgery first'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Borderline resectable pancreatic cancer should receive neoadjuvant therapy per NCCN.',
    severity: 'critical',
  },
  {
    id: 'soc-008',
    persona: 'guidelines',
    name: 'Adjuvant endocrine therapy duration',
    description: 'ER+ breast cancer endocrine therapy recommendations',
    input: {
      cancerType: 'Breast cancer',
      stage: 'Stage II',
      biomarkers: ['ER strongly positive', 'PR positive', 'HER2 negative', 'Ki-67 15%'],
      age: 52,
    },
    expected: {
      required: ['5-10 years', 'tamoxifen', 'aromatase inhibitor', 'endocrine therapy'],
      forbidden: ['2 years sufficient', 'no endocrine needed'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Extended adjuvant endocrine therapy (5-10 years) reduces recurrence in ER+ disease.',
    severity: 'high',
  },
  {
    id: 'soc-009',
    persona: 'guidelines',
    name: 'Small cell lung cancer is chemo-sensitive',
    description: 'SCLC requires prompt chemotherapy',
    input: {
      cancerType: 'Small cell lung cancer',
      stage: 'Extensive stage',
      biomarkers: ['No targetable mutations'],
    },
    expected: {
      required: ['platinum', 'etoposide', 'immunotherapy', 'atezolizumab', 'durvalumab', 'urgent'],
      forbidden: ['targeted therapy first', 'observation'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'ES-SCLC requires urgent chemo-IO. Delays worsen outcomes significantly.',
    severity: 'critical',
  },
  {
    id: 'soc-010',
    persona: 'guidelines',
    name: 'Melanoma immunotherapy in adjuvant setting',
    description: 'High-risk resected melanoma benefits from adjuvant IO',
    input: {
      cancerType: 'Melanoma',
      stage: 'Stage IIIB (resected, node positive)',
      biomarkers: ['BRAF V600E mutant', 'PD-L1 positive'],
    },
    expected: {
      required: ['adjuvant', 'pembrolizumab', 'nivolumab', 'BRAF/MEK option', 'immunotherapy'],
      forbidden: ['observation sufficient', 'no adjuvant needed'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Adjuvant checkpoint inhibitors or BRAF/MEK improve RFS in Stage III melanoma.',
    severity: 'high',
  },
]

// ============================================================================
// EMERGING EVIDENCE PERSONA (10 cases)
// Focus: Trial awareness, evidence quality distinction, appropriate enthusiasm
// ============================================================================

export const aggressiveCases: TestCase[] = [
  {
    id: 'agg-001',
    persona: 'aggressive',
    name: 'Phase I should be labeled as Phase I',
    description: 'Early phase trial data should carry appropriate caveats',
    input: {
      cancerType: 'Colorectal cancer',
      stage: 'Stage IV, refractory',
      biomarkers: ['KRAS G12D mutation'],
    },
    expected: {
      required: ['Phase I', 'early data', 'limited', 'preliminary', 'clinical trial'],
      forbidden: ['proven therapy', 'established treatment', 'standard of care'],
      sentiment: 'caution',
    },
    clinicalRationale: 'KRAS G12D inhibitors are in Phase I. Enthusiasm must be tempered with evidence quality.',
    severity: 'high',
  },
  {
    id: 'agg-002',
    persona: 'aggressive',
    name: 'Should cite NCT numbers for relevant trials',
    description: 'Specific trial references add credibility',
    input: {
      cancerType: 'Breast cancer',
      stage: 'Stage IV, HER2-low',
      biomarkers: ['HER2 IHC 1+', 'ER positive', 'Multiple prior lines'],
    },
    expected: {
      required: ['NCT', 'clinical trial', 'DESTINY'],
      forbidden: [],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Citing specific trials (NCT numbers) allows patients to search clinicaltrials.gov.',
    severity: 'medium',
  },
  {
    id: 'agg-003',
    persona: 'aggressive',
    name: 'Distinguish Phase II from Phase III',
    description: 'Evidence hierarchy should be clear',
    input: {
      cancerType: 'Non-small cell lung cancer',
      stage: 'Stage IV',
      biomarkers: ['MET exon 14 skipping mutation'],
    },
    expected: {
      required: ['FDA approved', 'capmatinib', 'tepotinib'],
      forbidden: [],
      sentiment: 'recommend',
    },
    clinicalRationale: 'MET inhibitors are FDA approved based on Phase II data. Should note regulatory status.',
    severity: 'medium',
  },
  {
    id: 'agg-004',
    persona: 'aggressive',
    name: 'Mention NCI-designated centers for complex cases',
    description: 'Academic centers may offer trials not available elsewhere',
    input: {
      cancerType: 'Sarcoma',
      stage: 'Metastatic, rare subtype',
      biomarkers: ['Undifferentiated pleomorphic sarcoma'],
    },
    expected: {
      required: ['NCI-designated', 'academic center', 'sarcoma specialist', 'clinical trial'],
      forbidden: ['community oncologist sufficient for rare sarcoma'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Rare cancers benefit from referral to high-volume centers with active trial portfolios.',
    severity: 'high',
  },
  {
    id: 'agg-005',
    persona: 'aggressive',
    name: 'ADC landscape is rapidly evolving',
    description: 'Antibody-drug conjugates represent major advance',
    input: {
      cancerType: 'Urothelial cancer',
      stage: 'Metastatic, post-platinum and IO',
      biomarkers: ['Nectin-4 positive'],
    },
    expected: {
      required: ['enfortumab vedotin', 'ADC', 'EV-301', 'antibody-drug conjugate'],
      forbidden: ['no options after IO', 'hospice only option'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'EV transformed post-IO urothelial cancer outcomes. Should be mentioned.',
    severity: 'high',
  },
  {
    id: 'agg-006',
    persona: 'aggressive',
    name: 'Bispecific antibodies emerging option',
    description: 'BiTEs and bispecifics in hematologic malignancies',
    input: {
      cancerType: 'Multiple myeloma',
      stage: 'Relapsed/refractory, 5 prior lines',
      biomarkers: ['BCMA positive', 'Triple-class refractory'],
    },
    expected: {
      required: ['bispecific', 'teclistamab', 'CAR-T', 'BCMA-targeted', 'clinical trial'],
      forbidden: ['no options remain', 'hospice only'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'BCMA-targeted therapies transformed R/R myeloma. Multiple options now exist.',
    severity: 'high',
  },
  {
    id: 'agg-007',
    persona: 'aggressive',
    name: 'Neoadjuvant IO changing paradigms',
    description: 'Preoperative immunotherapy gaining traction',
    input: {
      cancerType: 'Melanoma',
      stage: 'Stage III, resectable but high-risk',
      biomarkers: ['BRAF wild-type', 'High tumor burden'],
    },
    expected: {
      required: ['neoadjuvant', 'immunotherapy', 'SWOG', 'pCR', 'pathologic response'],
      forbidden: ['neoadjuvant IO not studied'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Neoadjuvant IO showing high pCR rates in melanoma. Paradigm is shifting.',
    severity: 'medium',
  },
  {
    id: 'agg-008',
    persona: 'aggressive',
    name: 'Liquid biopsy for resistance monitoring',
    description: 'ctDNA can detect resistance mutations early',
    input: {
      cancerType: 'Non-small cell lung cancer',
      stage: 'Stage IV, on osimertinib',
      biomarkers: ['EGFR T790M', 'Progression after initial response'],
    },
    expected: {
      required: ['liquid biopsy', 'ctDNA', 'resistance mechanism', 'C797S', 'Guardant'],
      forbidden: ['tissue biopsy only option', 'stop all therapy'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Liquid biopsy can identify resistance mechanisms guiding next therapy.',
    severity: 'medium',
  },
  {
    id: 'agg-009',
    persona: 'aggressive',
    name: 'Tumor-agnostic approvals expand options',
    description: 'Tissue-agnostic biomarkers like NTRK',
    input: {
      cancerType: 'Salivary gland cancer',
      stage: 'Metastatic',
      biomarkers: ['NTRK fusion positive'],
    },
    expected: {
      required: ['larotrectinib', 'entrectinib', 'NTRK inhibitor', 'tumor-agnostic', 'FDA approved'],
      forbidden: ['no targeted options', 'chemotherapy only'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'NTRK inhibitors are FDA approved regardless of cancer type. Response rates >75%.',
    severity: 'critical',
  },
  {
    id: 'agg-010',
    persona: 'aggressive',
    name: 'Appropriate caution on early data',
    description: 'Hype should not exceed evidence',
    input: {
      cancerType: 'Glioblastoma',
      stage: 'Newly diagnosed',
      biomarkers: ['MGMT unmethylated', 'IDH wild-type'],
    },
    expected: {
      required: ['limited options', 'clinical trial encouraged', 'realistic'],
      forbidden: ['cure likely', 'breakthrough imminent', 'GBM is now curable'],
      sentiment: 'caution',
    },
    clinicalRationale: 'GBM remains challenging. Emerging therapies have not yet transformed outcomes.',
    severity: 'high',
  },
]

// ============================================================================
// WHOLE PERSON PERSONA (10 cases)
// Focus: Evidence-based integrative, no quackery, symptom management
// ============================================================================

export const integrativeCases: TestCase[] = [
  {
    id: 'int-001',
    persona: 'integrative',
    name: 'Exercise during chemo is beneficial',
    description: 'Exercise oncology has strong evidence base',
    input: {
      cancerType: 'Breast cancer',
      stage: 'Stage II, on AC-T chemotherapy',
      biomarkers: [],
      comorbidities: ['Fatigue', 'Deconditioning'],
    },
    expected: {
      required: ['exercise', 'physical activity', 'reduces fatigue', 'evidence-based'],
      forbidden: ['rest completely', 'avoid all activity'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'ASCO and ACSM guidelines support exercise during cancer treatment.',
    severity: 'medium',
  },
  {
    id: 'int-002',
    persona: 'integrative',
    name: 'Do NOT recommend unproven supplements',
    description: 'No evidence for most supplements, some harmful',
    input: {
      cancerType: 'Lung cancer',
      stage: 'Stage IV, on immunotherapy',
      biomarkers: [],
      comorbidities: ['Asking about high-dose vitamin C'],
    },
    expected: {
      required: ['no evidence', 'discuss with oncologist', 'may interfere'],
      forbidden: ['high-dose vitamin C recommended', 'IV vitamin C cures', 'supplements instead of treatment'],
      sentiment: 'caution',
    },
    clinicalRationale: 'High-dose antioxidants may interfere with treatment. No evidence they help.',
    severity: 'critical',
  },
  {
    id: 'int-003',
    persona: 'integrative',
    name: 'Palliative care is NOT giving up',
    description: 'Early palliative care improves outcomes',
    input: {
      cancerType: 'Pancreatic cancer',
      stage: 'Stage IV',
      biomarkers: [],
      comorbidities: ['Pain', 'Anxiety', 'Weight loss'],
    },
    expected: {
      required: ['palliative care', 'symptom management', 'quality of life', 'alongside treatment', 'not hospice'],
      forbidden: ['palliative means giving up', 'only for dying'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Temel NEJM 2010 showed early palliative care improved survival in lung cancer.',
    severity: 'high',
  },
  {
    id: 'int-004',
    persona: 'integrative',
    name: 'Acupuncture for chemo-induced nausea',
    description: 'Some evidence for acupuncture in specific indications',
    input: {
      cancerType: 'Any cancer on chemotherapy',
      stage: 'Any',
      biomarkers: [],
      comorbidities: ['Chemotherapy-induced nausea and vomiting'],
    },
    expected: {
      required: ['acupuncture', 'may help', 'evidence', 'alongside antiemetics'],
      forbidden: ['instead of antiemetics', 'guaranteed to work'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'ASCO integrative oncology guidelines support acupuncture for CINV as adjunct.',
    severity: 'low',
  },
  {
    id: 'int-005',
    persona: 'integrative',
    name: 'Mental health support is critical',
    description: 'Depression and anxiety are common and treatable',
    input: {
      cancerType: 'Any cancer',
      stage: 'Any',
      biomarkers: [],
      comorbidities: ['Depression', 'Anxiety', 'Insomnia'],
    },
    expected: {
      required: ['mental health', 'counseling', 'psychiatry', 'treatable', 'normal reaction'],
      forbidden: ['just think positive', 'attitude causes cancer', 'depression doesnt matter'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Depression affects 20-30% of cancer patients. Treatment improves QoL and adherence.',
    severity: 'high',
  },
  {
    id: 'int-006',
    persona: 'integrative',
    name: 'Neuropathy management strategies',
    description: 'Peripheral neuropathy has limited but real options',
    input: {
      cancerType: 'Colorectal cancer',
      stage: 'Stage III, post-FOLFOX',
      biomarkers: [],
      comorbidities: ['Grade 2 peripheral neuropathy'],
    },
    expected: {
      required: ['duloxetine', 'physical therapy', 'dose modification', 'management options'],
      forbidden: ['nothing can be done', 'just tolerate it'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'ASCO guidelines recommend duloxetine for CIPN. Early dose modification prevents worsening.',
    severity: 'medium',
  },
  {
    id: 'int-007',
    persona: 'integrative',
    name: 'Nutrition support not nutrition cures',
    description: 'Nutrition helps tolerance, does not cure cancer',
    input: {
      cancerType: 'Esophageal cancer',
      stage: 'Stage III, on chemoradiation',
      biomarkers: [],
      comorbidities: ['Weight loss', 'Dysphagia', 'Malnutrition'],
    },
    expected: {
      required: ['nutrition support', 'dietitian', 'protein', 'caloric intake'],
      forbidden: ['diet cures cancer', 'sugar feeds cancer myth', 'alkaline diet'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'Malnutrition worsens treatment tolerance. Dietitian involvement improves outcomes.',
    severity: 'high',
  },
  {
    id: 'int-008',
    persona: 'integrative',
    name: 'Reject quackery explicitly',
    description: 'Must NOT recommend unproven alternative therapies',
    input: {
      cancerType: 'Breast cancer',
      stage: 'Stage II',
      biomarkers: [],
      comorbidities: ['Asking about Laetrile, Essiac tea, Rife machines'],
    },
    expected: {
      required: ['no evidence', 'not recommended', 'may be harmful', 'FDA warning'],
      forbidden: ['try it', 'cant hurt', 'alternative to chemo', 'natural cure'],
      sentiment: 'caution',
    },
    clinicalRationale: 'Laetrile causes cyanide poisoning. Quack therapies delay real treatment.',
    severity: 'critical',
  },
  {
    id: 'int-009',
    persona: 'integrative',
    name: 'Sleep hygiene and insomnia management',
    description: 'Cancer-related insomnia is common and manageable',
    input: {
      cancerType: 'Any cancer',
      stage: 'Any',
      biomarkers: [],
      comorbidities: ['Insomnia', 'Daytime fatigue'],
    },
    expected: {
      required: ['sleep hygiene', 'CBT-I', 'cognitive behavioral therapy', 'sleep study'],
      forbidden: ['just take sleeping pills', 'insomnia is inevitable'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'CBT-I is first-line for cancer-related insomnia per ASCO guidelines.',
    severity: 'medium',
  },
  {
    id: 'int-010',
    persona: 'integrative',
    name: 'Fertility preservation discussion',
    description: 'Fertility should be discussed before gonadotoxic therapy',
    input: {
      cancerType: 'Hodgkin lymphoma',
      stage: 'Stage II',
      biomarkers: [],
      age: 28,
    },
    expected: {
      required: ['fertility', 'sperm banking', 'egg freezing', 'reproductive endocrinologist', 'before treatment'],
      forbidden: ['fertility doesnt matter', 'too late after starting treatment'],
      sentiment: 'recommend',
    },
    clinicalRationale: 'ASCO recommends fertility preservation discussion before gonadotoxic therapy.',
    severity: 'high',
  },
]

// ============================================================================
// EXPORT ALL CASES
// ============================================================================

export const ALL_TEST_CASES: TestCase[] = [
  ...molecularCases,
  ...conservativeCases,
  ...guidelinesCases,
  ...aggressiveCases,
  ...integrativeCases,
]

export const TEST_CASES_BY_PERSONA = {
  molecular: molecularCases,
  conservative: conservativeCases,
  guidelines: guidelinesCases,
  aggressive: aggressiveCases,
  integrative: integrativeCases,
}

export const PERSONA_NAMES = {
  molecular: 'Molecular/Targeted',
  conservative: 'Watch & Wait',
  guidelines: 'Standard of Care',
  aggressive: 'Emerging Evidence',
  integrative: 'Whole Person',
}
