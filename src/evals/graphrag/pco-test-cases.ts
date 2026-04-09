/**
 * GraphRAG PCO Evaluation Test Cases
 *
 * The PARP Test is the minimum bar for GraphRAG quality:
 * "I have ovarian cancer with a BRCA2 mutation. My oncologist mentioned
 *  PARP inhibitors. Should I be on one?"
 *
 * Expected: cites indication match, FDA-approved options, resistance patterns,
 * germline vs somatic implications, and Watch & Wait option if stable.
 */

import type { PatientContextObject, PCODiagnosis, PCOBiomarker, PCOTreatment } from '@/lib/graphrag/types'

// ============================================================================
// Test Case Types
// ============================================================================

export interface PCOTestCase {
  id: string
  name: string
  description: string
  scenario: string
  input: {
    diagnoses: PCODiagnosis[]
    biomarkers: PCOBiomarker[]
    treatments: PCOTreatment[]
  }
  query: string
  expected: {
    // Which persona perspectives should be present
    required_personas: string[]
    // Keywords that MUST appear in the response
    required_keywords: string[]
    // Sources that should be cited
    expected_citations: string[]
    // Specific questions that should be suggested for the doctor
    expected_doctor_questions: string[]
  }
  priority: 'P0' | 'P1' | 'P2'
}

// ============================================================================
// The PARP Test (Minimum Bar)
// ============================================================================

export const PARP_TEST: PCOTestCase = {
  id: 'parp-test-001',
  name: 'The PARP Test',
  description: 'Minimum quality bar for GraphRAG. BRCA2+ ovarian cancer patient asking about PARP inhibitors.',
  scenario: 'Patient completed platinum-based chemo with complete response, has germline BRCA2 mutation',
  input: {
    diagnoses: [
      {
        cancer_type: 'ovarian cancer',
        histology: 'high-grade serous',
        stage: 'IIIC',
        date_of_diagnosis: '2023-06-15',
        confidence: 0.95,
        source: 'records'
      }
    ],
    biomarkers: [
      {
        name: 'BRCA2',
        value: 'pathogenic mutation',
        result_type: 'positive',
        source: 'germline',
        test_date: '2023-06-20',
        confidence: 0.98
      }
    ],
    treatments: [
      {
        name: 'carboplatin/paclitaxel',
        type: 'chemotherapy',
        status: 'completed',
        start_date: '2023-07-01',
        end_date: '2023-12-01',
        response: 'complete',
        line_of_therapy: 1,
        confidence: 0.95
      }
    ]
  },
  query: 'My oncologist mentioned PARP inhibitors. Should I be on one?',
  expected: {
    required_personas: ['SOC Advisor', 'Molecular Oncologist', 'Watch & Wait'],
    required_keywords: [
      'PARP inhibitor',
      'maintenance',
      'olaparib', // or niraparib, rucaparib
      'BRCA',
      'platinum',
      'response'
    ],
    expected_citations: [
      'NCCN Ovarian Cancer',
      'FDA', // olaparib label
      'OncoKB' // BRCA2 actionability
    ],
    expected_doctor_questions: [
      'timing', // When to start maintenance
      'side effects', // What to expect
      'duration' // How long to take it
    ]
  },
  priority: 'P0'
}

// ============================================================================
// Additional Test Cases by Cancer Type
// ============================================================================

export const TEST_CASES: PCOTestCase[] = [
  PARP_TEST,

  // Breast Cancer - HER2+
  {
    id: 'breast-her2-001',
    name: 'HER2+ Breast Cancer Treatment',
    description: 'Early stage HER2+ breast cancer, asking about targeted therapy',
    scenario: 'Newly diagnosed Stage II HER2+ invasive ductal carcinoma',
    input: {
      diagnoses: [
        {
          cancer_type: 'breast cancer',
          histology: 'invasive ductal carcinoma',
          stage: 'IIA',
          date_of_diagnosis: '2024-01-10',
          confidence: 0.95,
          source: 'records'
        }
      ],
      biomarkers: [
        {
          name: 'HER2',
          value: '3+',
          result_type: 'positive',
          source: 'somatic',
          confidence: 0.98
        },
        {
          name: 'ER',
          value: '95%',
          result_type: 'positive',
          source: 'somatic',
          numeric_value: 95,
          numeric_unit: '%',
          confidence: 0.98
        },
        {
          name: 'PR',
          value: '80%',
          result_type: 'positive',
          source: 'somatic',
          numeric_value: 80,
          numeric_unit: '%',
          confidence: 0.98
        }
      ],
      treatments: []
    },
    query: 'What targeted therapies should I expect for my HER2+ breast cancer?',
    expected: {
      required_personas: ['SOC Advisor', 'Molecular Oncologist'],
      required_keywords: [
        'trastuzumab',
        'Herceptin',
        'pertuzumab',
        'HER2',
        'targeted'
      ],
      expected_citations: [
        'NCCN Breast Cancer'
      ],
      expected_doctor_questions: [
        'regimen',
        'duration',
        'cardiac monitoring' // HER2 drugs require cardiac monitoring
      ]
    },
    priority: 'P0'
  },

  // Lung Cancer - EGFR mutation
  {
    id: 'lung-egfr-001',
    name: 'EGFR+ NSCLC Treatment',
    description: 'Advanced NSCLC with EGFR exon 19 deletion',
    scenario: 'Stage IV NSCLC, EGFR exon 19 deletion positive',
    input: {
      diagnoses: [
        {
          cancer_type: 'non-small cell lung cancer',
          histology: 'adenocarcinoma',
          stage: 'IV',
          date_of_diagnosis: '2024-02-01',
          confidence: 0.95,
          source: 'records'
        }
      ],
      biomarkers: [
        {
          name: 'EGFR',
          value: 'exon 19 deletion',
          result_type: 'positive',
          source: 'somatic',
          confidence: 0.98
        },
        {
          name: 'PD-L1',
          value: 'TPS 10%',
          result_type: 'numeric',
          source: 'somatic',
          numeric_value: 10,
          numeric_unit: '%',
          confidence: 0.95
        }
      ],
      treatments: []
    },
    query: 'What are my treatment options for EGFR-mutated lung cancer?',
    expected: {
      required_personas: ['SOC Advisor', 'Molecular Oncologist', 'Emerging Treatments'],
      required_keywords: [
        'osimertinib',
        'Tagrisso',
        'EGFR',
        'tyrosine kinase',
        'TKI'
      ],
      expected_citations: [
        'NCCN NSCLC',
        'OncoKB'
      ],
      expected_doctor_questions: [
        'brain metastases', // Osimertinib CNS penetration
        'resistance',
        'monitoring'
      ]
    },
    priority: 'P0'
  },

  // Prostate Cancer - Castration Resistant
  {
    id: 'prostate-crpc-001',
    name: 'Castration-Resistant Prostate Cancer',
    description: 'mCRPC with BRCA2 mutation',
    scenario: 'Metastatic castration-resistant prostate cancer, progressed on ADT',
    input: {
      diagnoses: [
        {
          cancer_type: 'prostate cancer',
          histology: 'adenocarcinoma',
          stage: 'IV',
          date_of_diagnosis: '2022-03-15',
          confidence: 0.95,
          source: 'records'
        }
      ],
      biomarkers: [
        {
          name: 'BRCA2',
          value: 'pathogenic mutation',
          result_type: 'positive',
          source: 'germline',
          confidence: 0.98
        },
        {
          name: 'PSA',
          value: '45.2',
          result_type: 'numeric',
          source: 'somatic',
          numeric_value: 45.2,
          numeric_unit: 'ng/mL',
          confidence: 0.99
        }
      ],
      treatments: [
        {
          name: 'ADT (leuprolide)',
          type: 'hormonal',
          status: 'current',
          start_date: '2022-04-01',
          confidence: 0.95
        },
        {
          name: 'enzalutamide',
          type: 'hormonal',
          status: 'completed',
          start_date: '2023-01-01',
          end_date: '2024-01-01',
          response: 'progression',
          confidence: 0.95
        }
      ]
    },
    query: 'My PSA is rising on enzalutamide. What are my options now?',
    expected: {
      required_personas: ['SOC Advisor', 'Molecular Oncologist', 'Emerging Treatments'],
      required_keywords: [
        'PARP',
        'olaparib',
        'BRCA',
        'castration-resistant',
        'docetaxel' // or cabazitaxel
      ],
      expected_citations: [
        'NCCN Prostate Cancer',
        'OncoKB'
      ],
      expected_doctor_questions: [
        'sequencing', // Treatment sequencing
        'PARP inhibitor',
        'clinical trial'
      ]
    },
    priority: 'P1'
  },

  // Colorectal Cancer - MSI-High
  {
    id: 'colorectal-msi-001',
    name: 'MSI-High Colorectal Cancer',
    description: 'Metastatic colorectal with MSI-High status',
    scenario: 'Stage IV colorectal cancer, MSI-High/dMMR',
    input: {
      diagnoses: [
        {
          cancer_type: 'colorectal cancer',
          histology: 'adenocarcinoma',
          stage: 'IV',
          primary_site: 'sigmoid colon',
          date_of_diagnosis: '2024-01-20',
          confidence: 0.95,
          source: 'records'
        }
      ],
      biomarkers: [
        {
          name: 'MSI',
          value: 'MSI-High',
          result_type: 'positive',
          source: 'somatic',
          confidence: 0.98
        },
        {
          name: 'KRAS',
          value: 'wild-type',
          result_type: 'negative',
          source: 'somatic',
          confidence: 0.95
        }
      ],
      treatments: []
    },
    query: 'I have MSI-High colorectal cancer. Does this change my treatment?',
    expected: {
      required_personas: ['SOC Advisor', 'Molecular Oncologist'],
      required_keywords: [
        'immunotherapy',
        'pembrolizumab',
        'Keytruda',
        'MSI-High',
        'checkpoint inhibitor'
      ],
      expected_citations: [
        'NCCN Colorectal',
        'FDA Keytruda'
      ],
      expected_doctor_questions: [
        'first-line', // MSI-H can get immunotherapy first-line
        'side effects',
        'response rate'
      ]
    },
    priority: 'P1'
  },

  // Watch & Wait Scenario
  {
    id: 'lymphoma-indolent-001',
    name: 'Indolent Lymphoma Watch & Wait',
    description: 'Low-grade follicular lymphoma, asymptomatic',
    scenario: 'Stage III follicular lymphoma, grade 1, no symptoms',
    input: {
      diagnoses: [
        {
          cancer_type: 'follicular lymphoma',
          histology: 'grade 1',
          stage: 'III',
          date_of_diagnosis: '2024-02-10',
          confidence: 0.95,
          source: 'records'
        }
      ],
      biomarkers: [],
      treatments: []
    },
    query: 'My doctor said we could watch and wait. Is that really safe?',
    expected: {
      required_personas: ['SOC Advisor', 'Watch & Wait', 'Whole Person'],
      required_keywords: [
        'watch and wait',
        'active surveillance',
        'indolent',
        'symptoms',
        'quality of life'
      ],
      expected_citations: [
        'NCCN B-Cell Lymphomas'
      ],
      expected_doctor_questions: [
        'when to start treatment',
        'warning signs',
        'follow-up schedule'
      ]
    },
    priority: 'P1'
  }
]

// ============================================================================
// Test Runner Utilities
// ============================================================================

/**
 * Build a mock PCO from test case input for testing
 */
export function buildTestPCO(testCase: PCOTestCase): PatientContextObject {
  return {
    user_id: `test-user-${testCase.id}`,
    session_id: `test-session-${testCase.id}`,
    extracted_at: new Date().toISOString(),
    diagnoses: testCase.input.diagnoses,
    biomarkers: testCase.input.biomarkers,
    treatments: testCase.input.treatments,
    symptoms: [],
    lab_results: [],
    related_entities: [],
    communities: [],
    entity_count: testCase.input.diagnoses.length + testCase.input.biomarkers.length + testCase.input.treatments.length,
    relationship_count: 0,
    source_record_count: 1,
    completeness_score: 0.8,
    has_diagnosis: testCase.input.diagnoses.length > 0,
    has_biomarkers: testCase.input.biomarkers.length > 0,
    has_treatments: testCase.input.treatments.length > 0,
    has_records: true
  }
}

/**
 * Validate that a response meets the expected criteria
 */
export function validateResponse(
  testCase: PCOTestCase,
  response: {
    perspectives: Array<{ persona: string; claim: string; evidence: string[]; citations: Array<{ source: string }> }>
    synthesis: string
  }
): {
  passed: boolean
  score: number
  failures: string[]
  warnings: string[]
} {
  const failures: string[] = []
  const warnings: string[] = []
  let score = 0
  const maxScore = 100

  // Check required personas (30 points)
  const presentPersonas = response.perspectives.map(p => p.persona)
  for (const requiredPersona of testCase.expected.required_personas) {
    if (presentPersonas.some(p => p.toLowerCase().includes(requiredPersona.toLowerCase()))) {
      score += 30 / testCase.expected.required_personas.length
    } else {
      failures.push(`Missing required persona: ${requiredPersona}`)
    }
  }

  // Check required keywords in synthesis (40 points)
  const synthesisLower = response.synthesis.toLowerCase()
  const allText = [
    synthesisLower,
    ...response.perspectives.map(p => p.claim.toLowerCase()),
    ...response.perspectives.flatMap(p => p.evidence.map(e => e.toLowerCase()))
  ].join(' ')

  for (const keyword of testCase.expected.required_keywords) {
    if (allText.includes(keyword.toLowerCase())) {
      score += 40 / testCase.expected.required_keywords.length
    } else {
      failures.push(`Missing required keyword: ${keyword}`)
    }
  }

  // Check citations (20 points)
  const allCitations = response.perspectives.flatMap(p => p.citations.map(c => c.source.toLowerCase()))
  for (const expectedCitation of testCase.expected.expected_citations) {
    if (allCitations.some(c => c.includes(expectedCitation.toLowerCase()))) {
      score += 20 / testCase.expected.expected_citations.length
    } else {
      warnings.push(`Missing expected citation: ${expectedCitation}`)
    }
  }

  // Check doctor questions (10 points) - more lenient
  for (const question of testCase.expected.expected_doctor_questions) {
    if (allText.includes(question.toLowerCase())) {
      score += 10 / testCase.expected.expected_doctor_questions.length
    }
  }

  return {
    passed: failures.length === 0 && score >= 70, // Pass if no failures and score >= 70
    score: Math.round(score),
    failures,
    warnings
  }
}

/**
 * Get test cases by priority
 */
export function getTestCasesByPriority(priority: 'P0' | 'P1' | 'P2'): PCOTestCase[] {
  return TEST_CASES.filter(tc => tc.priority === priority)
}

/**
 * Get all P0 test cases (must pass)
 */
export function getCriticalTestCases(): PCOTestCase[] {
  return getTestCasesByPriority('P0')
}
