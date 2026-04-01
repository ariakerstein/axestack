// Suggested questions fetched from Supabase patient_questions2 table
// Uses the same database as navis.health

import { supabase } from './supabase'

export interface SuggestedQuestion {
  id: number
  question: string
  category?: string
  persona?: string
}

// Map opencancer.ai cancer codes to navis database cancer_code values
const CANCER_CODE_MAPPING: Record<string, string> = {
  // Solid tumors
  breast: 'breast_cancer',
  prostate: 'prostate_cancer',
  lung: 'lung_nsclc',
  colorectal: 'colorectal_cancer',
  colon: 'colorectal_cancer',
  rectal: 'colorectal_cancer',
  pancreatic: 'pancreatic_cancer',
  melanoma: 'melanoma',
  ovarian: 'ovarian_cancer',
  bladder: 'bladder_cancer',
  kidney: 'kidney_rcc',
  renal_cell: 'kidney_rcc',
  thyroid: 'thyroid_cancer',
  liver: 'liver_hcc',
  hepatocellular: 'liver_hcc',
  brain: 'glioma',
  glioblastoma: 'glioma',
  stomach: 'gastric_cancer',
  gastric: 'gastric_cancer',
  esophageal: 'esophageal_cancer',
  head_neck: 'head_neck_squamous',
  cervical: 'cervical_cancer',
  uterine: 'endometrial_cancer',
  endometrial: 'endometrial_cancer',

  // Blood cancers
  leukemia: 'aml',
  lymphoma: 'hodgkin_lymphoma',
  myeloma: 'multiple_myeloma',
  follicular_lymphoma: 'nhl_follicular',
  dlbcl: 'nhl_dlbcl',
  hodgkin: 'hodgkin_lymphoma',
  non_hodgkin: 'nhl_follicular',
  mantle_cell: 'nhl_mantle_cell',
  marginal_zone: 'nhl_marginal_zone',
  aml: 'aml',
  all: 'all',
  cml: 'cml',
  cll: 'cll_sll',

  // Default
  other: 'general',
}

// Default questions when database fetch fails or no specific questions available
const DEFAULT_QUESTIONS: SuggestedQuestion[] = [
  {
    id: 1,
    question: "What are the standard treatment options for my cancer type and stage?",
    category: "Treatment",
    persona: "patient"
  },
  {
    id: 2,
    question: "What side effects should I expect from treatment?",
    category: "Side Effects",
    persona: "patient"
  },
  {
    id: 3,
    question: "What questions should I ask my oncologist at my next appointment?",
    category: "Care Planning",
    persona: "patient"
  },
  {
    id: 4,
    question: "Are there any clinical trials I might be eligible for?",
    category: "Clinical Trials",
    persona: "patient"
  }
]

// Cancer-specific questions for common cancer types (fallback if database unavailable)
const CANCER_SPECIFIC_FALLBACK: Record<string, SuggestedQuestion[]> = {
  breast: [
    { id: 1, question: "What is my HER2 status and how does it affect my treatment options?", category: "Biomarkers" },
    { id: 2, question: "Should I get an Oncotype DX test to determine if I need chemotherapy?", category: "Testing" },
    { id: 3, question: "Am I eligible for targeted therapy based on my tumor biomarkers?", category: "Treatment" },
    { id: 4, question: "What are the benefits and risks of breast-conserving surgery vs mastectomy?", category: "Surgery" },
  ],
  lung: [
    { id: 1, question: "Have I been tested for all actionable mutations including EGFR, ALK, ROS1, and KRAS G12C?", category: "Biomarkers" },
    { id: 2, question: "Should I get a liquid biopsy if tissue biopsy wasn't sufficient?", category: "Testing" },
    { id: 3, question: "What is my PD-L1 expression level and does it qualify me for immunotherapy?", category: "Treatment" },
    { id: 4, question: "Are there clinical trials for my specific lung cancer mutation?", category: "Clinical Trials" },
  ],
  colorectal: [
    { id: 1, question: "Is my tumor MSI-High or MSS, and how does this affect treatment?", category: "Biomarkers" },
    { id: 2, question: "Have I been tested for RAS and BRAF mutations?", category: "Testing" },
    { id: 3, question: "Should I get ctDNA monitoring after treatment to detect early recurrence?", category: "Monitoring" },
    { id: 4, question: "What are my options if my cancer is resistant to first-line therapy?", category: "Treatment" },
  ],
  prostate: [
    { id: 1, question: "Should I get germline testing for BRCA and ATM mutations?", category: "Genetic Testing" },
    { id: 2, question: "Would a PSMA PET scan be more accurate than a traditional bone scan for my case?", category: "Imaging" },
    { id: 3, question: "Am I a candidate for active surveillance or do I need immediate treatment?", category: "Treatment Planning" },
    { id: 4, question: "Should my family members get genetic testing based on my diagnosis?", category: "Family Implications" },
  ],
  lymphoma: [
    { id: 1, question: "What is my lymphoma subtype and how does it affect my prognosis?", category: "Diagnosis" },
    { id: 2, question: "Have I been tested for double-hit or triple-hit lymphoma?", category: "Testing" },
    { id: 3, question: "Am I a candidate for CAR-T cell therapy?", category: "Treatment" },
    { id: 4, question: "What does PET-CT show about my response to treatment?", category: "Monitoring" },
  ],
  leukemia: [
    { id: 1, question: "What are my cytogenetic results and how do they affect my risk category?", category: "Diagnosis" },
    { id: 2, question: "Have I been tested for FLT3, NPM1, and IDH mutations?", category: "Biomarkers" },
    { id: 3, question: "What is my minimal residual disease (MRD) status after treatment?", category: "Monitoring" },
    { id: 4, question: "Am I a candidate for a stem cell transplant?", category: "Treatment" },
  ],
  melanoma: [
    { id: 1, question: "Have I been tested for BRAF V600 mutation?", category: "Biomarkers" },
    { id: 2, question: "Should I get gene expression profiling to assess recurrence risk?", category: "Testing" },
    { id: 3, question: "Am I a candidate for adjuvant immunotherapy?", category: "Treatment" },
    { id: 4, question: "How often should I have skin checks and follow-up imaging?", category: "Monitoring" },
  ],
  ovarian: [
    { id: 1, question: "Have I been tested for both germline and somatic BRCA mutations?", category: "Genetic Testing" },
    { id: 2, question: "Should I get HRD testing to determine PARP inhibitor eligibility?", category: "Biomarkers" },
    { id: 3, question: "Am I a candidate for maintenance therapy with a PARP inhibitor?", category: "Treatment" },
    { id: 4, question: "How should my CA-125 levels be monitored during and after treatment?", category: "Monitoring" },
  ],
  pancreatic: [
    { id: 1, question: "Have I been tested for BRCA, PALB2, and other germline mutations?", category: "Genetic Testing" },
    { id: 2, question: "What is my tumor's molecular profile and are there any targetable mutations?", category: "Biomarkers" },
    { id: 3, question: "Am I a candidate for surgery or is neoadjuvant therapy recommended first?", category: "Treatment Planning" },
    { id: 4, question: "What clinical trials are available for pancreatic cancer in my stage?", category: "Clinical Trials" },
  ],
}

/**
 * Fetch cancer-specific suggested questions from the database
 * Falls back to local data if database is unavailable or times out
 */
export async function fetchSuggestedQuestions(cancerType: string | null): Promise<SuggestedQuestion[]> {
  // If no cancer type selected, return default generic questions
  if (!cancerType) {
    return DEFAULT_QUESTIONS
  }

  // Map opencancer cancer code to navis database cancer_code
  const dbCancerCode = CANCER_CODE_MAPPING[cancerType] || CANCER_CODE_MAPPING.other

  // Add timeout to prevent hanging - fallback to local after 3 seconds
  const timeoutPromise = new Promise<SuggestedQuestion[]>((resolve) => {
    setTimeout(() => {
      console.log('[Ask] Question fetch timed out, using fallback')
      resolve(getFallbackQuestions(cancerType))
    }, 3000)
  })

  const fetchPromise = async (): Promise<SuggestedQuestion[]> => {
    try {
      // Query the patient_questions2 table (same as navis.health uses)
      const { data, error } = await supabase
        .from('patient_questions2')
        .select('id, question, category, persona')
        .eq('cancer_code', dbCancerCode)
        .order('id', { ascending: true })
        .limit(6)

      if (error) {
        console.error('Error fetching questions:', error)
        return getFallbackQuestions(cancerType)
      }

      if (data && data.length > 0) {
        console.log(`[Ask] Found ${data.length} questions for ${cancerType} (${dbCancerCode})`)
        return data
      }

      // If no questions found for specific code, try parent category
      const parentCode = getParentCancerCode(dbCancerCode)
      if (parentCode) {
        const { data: parentData, error: parentError } = await supabase
          .from('patient_questions2')
          .select('id, question, category, persona')
          .eq('cancer_code', parentCode)
          .order('id', { ascending: true })
          .limit(6)

        if (!parentError && parentData && parentData.length > 0) {
          console.log(`[Ask] Found ${parentData.length} questions from parent category ${parentCode}`)
          return parentData
        }
      }

      // Try the generated_questions cache - use maybeSingle to avoid hanging on no results
      const { data: cachedData, error: cacheError } = await supabase
        .from('generated_questions')
        .select('questions')
        .eq('cancer_code', dbCancerCode)
        .is('stage', null)
        .limit(1)

      if (!cacheError && cachedData && cachedData.length > 0 && cachedData[0]?.questions) {
        console.log(`[Ask] Found cached AI-generated questions for ${dbCancerCode}`)
        const questions = cachedData[0].questions as Array<{ text: string; category?: string }>
        return questions.slice(0, 6).map((q, index) => ({
          id: index + 1,
          question: q.text,
          category: q.category || 'General',
          persona: 'patient'
        }))
      }

      // Fall back to local hardcoded questions
      return getFallbackQuestions(cancerType)

    } catch (err) {
      console.error('Error in fetchSuggestedQuestions:', err)
      return getFallbackQuestions(cancerType)
    }
  }

  // Race between fetch and timeout
  return Promise.race([fetchPromise(), timeoutPromise])
}

/**
 * Get fallback questions from local data
 */
function getFallbackQuestions(cancerType: string): SuggestedQuestion[] {
  return CANCER_SPECIFIC_FALLBACK[cancerType] || DEFAULT_QUESTIONS
}

/**
 * Map specific cancer subtypes to parent categories
 */
function getParentCancerCode(code: string): string | null {
  const parentMapping: Record<string, string> = {
    // Breast subtypes
    'breast_metastatic': 'breast_cancer',
    'breast_triple_negative': 'breast_cancer',
    'breast_her2_positive': 'breast_cancer',
    // Lung subtypes
    'lung_sclc': 'lung_nsclc',
    // Lymphoma subtypes
    'nhl_dlbcl': 'nhl_follicular',
    'nhl_mantle_cell': 'nhl_follicular',
    'nhl_marginal_zone': 'nhl_follicular',
    // Leukemia subtypes
    'all': 'aml',
    'cml': 'aml',
    'cll_sll': 'aml',
    // Colorectal subtypes
    'colon_cancer': 'colorectal_cancer',
    'rectal_cancer': 'colorectal_cancer',
    // Gynecologic
    'cervical_cancer': 'ovarian_cancer',
    'endometrial_cancer': 'ovarian_cancer',
  }

  return parentMapping[code] || null
}

/**
 * Get category color for UI styling
 */
export function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    'Treatment': 'bg-violet-100 text-violet-700',
    'Testing': 'bg-blue-100 text-blue-700',
    'Biomarkers': 'bg-purple-100 text-purple-700',
    'Side Effects': 'bg-amber-100 text-amber-700',
    'Clinical Trials': 'bg-emerald-100 text-emerald-700',
    'Care Planning': 'bg-cyan-100 text-cyan-700',
    'Surgery': 'bg-red-100 text-red-700',
    'Monitoring': 'bg-green-100 text-green-700',
    'Genetic Testing': 'bg-indigo-100 text-indigo-700',
    'Imaging': 'bg-sky-100 text-sky-700',
    'Diagnosis': 'bg-orange-100 text-orange-700',
    'Family Implications': 'bg-pink-100 text-pink-700',
    'Treatment Planning': 'bg-fuchsia-100 text-fuchsia-700',
    'General': 'bg-slate-100 text-slate-700',
  }

  return colorMap[category || 'General'] || 'bg-slate-100 text-slate-700'
}
