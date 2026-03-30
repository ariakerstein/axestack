/**
 * Coverage Data for Financial Coverage Tool
 * Data sources: Medicare.gov, CancerCare.org, NCOA
 * Last updated: March 2026
 */

// 2026 Medicare numbers
export const MEDICARE_2026 = {
  partA: {
    deductible: 1736,
    coinsurance: {
      days1to60: 0,
      days61to90: 434,
      days91to150: 868, // lifetime reserve days
    },
    description: 'Hospital Insurance - covers inpatient hospital stays, skilled nursing, hospice',
  },
  partB: {
    deductible: 283,
    coinsurance: 0.20, // 20% of Medicare-approved amount
    premium: 185, // standard monthly premium (approximate)
    description: 'Medical Insurance - covers outpatient care, doctor visits, preventive services',
  },
  partD: {
    outOfPocketCap: 2100, // NEW in 2026!
    description: 'Prescription Drug Coverage - covers medications including oral cancer drugs',
  },
  medigap: {
    description: 'Supplemental insurance that helps pay remaining costs after Original Medicare',
  },
  advantage: {
    maxOutOfPocket: 9250, // 2026 in-network max
    description: 'Medicare Advantage (Part C) - private plans that include Parts A, B, and often D',
  },
}

// Insurance types
export const INSURANCE_TYPES = {
  medicare_original: {
    label: 'Original Medicare (Parts A & B)',
    description: 'Traditional fee-for-service Medicare',
  },
  medicare_advantage: {
    label: 'Medicare Advantage (Part C)',
    description: 'Private plan that replaces Original Medicare',
  },
  medicare_partd: {
    label: 'Medicare Part D (Drug Coverage)',
    description: 'Prescription drug plan',
  },
  medicaid: {
    label: 'Medicaid',
    description: 'State/federal program for low-income individuals',
  },
  private: {
    label: 'Private Insurance (Employer/Individual)',
    description: 'Insurance from employer or purchased individually',
  },
  uninsured: {
    label: 'No Insurance',
    description: 'Currently uninsured',
  },
  tricare: {
    label: 'TRICARE (Military)',
    description: 'Military healthcare program',
  },
  va: {
    label: 'VA Healthcare',
    description: 'Veterans Affairs healthcare',
  },
  not_sure: {
    label: "I'm not sure",
    description: 'Need help understanding my coverage',
  },
}

// Treatment types and what typically covers them
export const TREATMENT_COVERAGE = {
  chemotherapy: {
    label: 'Chemotherapy',
    icon: '💉',
    medicare: {
      partA: 'Covered if inpatient (hospital deductible applies)',
      partB: 'Covered if outpatient (20% coinsurance after deductible)',
      partD: 'N/A for IV chemo',
      advantage: 'Covered (check plan for copay)',
    },
    notes: 'Most chemotherapy is now given outpatient and covered by Part B',
  },
  radiation: {
    label: 'Radiation Therapy',
    icon: '☢️',
    medicare: {
      partA: 'Covered if inpatient',
      partB: 'Covered if outpatient (20% coinsurance)',
      partD: 'N/A',
      advantage: 'Covered (check plan)',
    },
    notes: 'Includes external beam, brachytherapy, and proton therapy at approved facilities',
  },
  surgery: {
    label: 'Surgery',
    icon: '🏥',
    medicare: {
      partA: 'Covered (hospital deductible applies)',
      partB: 'Covers surgeon fees (20% coinsurance)',
      partD: 'N/A',
      advantage: 'Covered (check plan)',
    },
    notes: 'Includes tumor removal, biopsies, and reconstructive surgery',
  },
  immunotherapy: {
    label: 'Immunotherapy',
    icon: '🛡️',
    medicare: {
      partA: 'Covered if inpatient',
      partB: 'Covered if outpatient (20% coinsurance)',
      partD: 'Oral immunotherapy drugs covered',
      advantage: 'Covered (check formulary)',
    },
    notes: 'Includes checkpoint inhibitors, CAR-T cell therapy',
  },
  oral_medications: {
    label: 'Oral Cancer Medications',
    icon: '💊',
    medicare: {
      partA: 'N/A',
      partB: 'Some covered if replacing IV drugs',
      partD: 'Primary coverage for oral cancer drugs',
      advantage: 'Check plan formulary',
    },
    notes: '2026 Part D cap of $2,100/year significantly reduces costs for expensive oral cancer drugs',
  },
  diagnostic_imaging: {
    label: 'Imaging (CT, MRI, PET scans)',
    icon: '📷',
    medicare: {
      partA: 'Covered if inpatient',
      partB: 'Covered outpatient (20% coinsurance)',
      partD: 'N/A',
      advantage: 'Covered (may need prior auth)',
    },
    notes: 'May require prior authorization for advanced imaging',
  },
  genetic_testing: {
    label: 'Genetic/Biomarker Testing',
    icon: '🧬',
    medicare: {
      partA: 'N/A',
      partB: 'Covered for approved tests',
      partD: 'N/A',
      advantage: 'Coverage varies by plan',
    },
    notes: 'Coverage expanding for tumor genomic testing',
  },
  hospice: {
    label: 'Hospice Care',
    icon: '🕊️',
    medicare: {
      partA: 'Fully covered with small copays',
      partB: 'N/A',
      partD: 'Limited (comfort meds may be covered)',
      advantage: 'Reverts to Original Medicare for hospice',
    },
    notes: 'Available when curative treatment stops; includes pain management, counseling',
  },
  clinical_trials: {
    label: 'Clinical Trials',
    icon: '🔬',
    medicare: {
      partA: 'Routine costs covered',
      partB: 'Routine costs covered',
      partD: 'Study drugs typically free',
      advantage: 'Must cover like Original Medicare',
    },
    notes: 'Medicare covers routine costs; experimental drugs usually provided free',
  },
}

// Financial assistance programs
export const ASSISTANCE_PROGRAMS = [
  {
    name: 'CancerCare Co-Payment Assistance Foundation',
    url: 'https://www.cancercare.org/copayfoundation',
    description: 'Helps with copays for cancer treatment',
    eligibility: 'Must have insurance, meet income guidelines',
    cancerTypes: ['all'],
    insuranceTypes: ['medicare_original', 'medicare_advantage', 'private'],
  },
  {
    name: 'Patient Advocate Foundation',
    url: 'https://www.patientadvocate.org/',
    description: 'Case management and financial aid programs',
    eligibility: 'Various programs with different requirements',
    cancerTypes: ['all'],
    insuranceTypes: ['all'],
  },
  {
    name: 'HealthWell Foundation',
    url: 'https://www.healthwellfoundation.org/',
    description: 'Copay assistance for specific conditions',
    eligibility: 'Insurance required, income limits apply',
    cancerTypes: ['breast', 'colorectal', 'lung', 'melanoma'],
    insuranceTypes: ['medicare_original', 'medicare_advantage', 'private'],
  },
  {
    name: 'NeedyMeds',
    url: 'https://www.needymeds.org/',
    description: 'Database of patient assistance programs',
    eligibility: 'Varies by program',
    cancerTypes: ['all'],
    insuranceTypes: ['all'],
  },
  {
    name: 'Patient Access Network (PAN) Foundation',
    url: 'https://panfoundation.org/',
    description: 'Underwriting grants for out-of-pocket costs',
    eligibility: 'Federal poverty level limits',
    cancerTypes: ['all'],
    insuranceTypes: ['medicare_original', 'medicare_advantage'],
  },
  {
    name: 'Good Days',
    url: 'https://www.mygooddays.org/',
    description: 'Copay assistance for chronic conditions',
    eligibility: 'Income limits apply',
    cancerTypes: ['all'],
    insuranceTypes: ['medicare_original', 'medicare_advantage', 'private'],
  },
  {
    name: 'Leukemia & Lymphoma Society',
    url: 'https://www.lls.org/support-resources/financial-support',
    description: 'Financial assistance for blood cancer patients',
    eligibility: 'Blood cancer diagnosis',
    cancerTypes: ['leukemia', 'lymphoma'],
    insuranceTypes: ['all'],
  },
  {
    name: 'Susan G. Komen',
    url: 'https://www.komen.org/support-resources/financial-assistance/',
    description: 'Financial assistance for breast cancer patients',
    eligibility: 'Breast cancer diagnosis',
    cancerTypes: ['breast'],
    insuranceTypes: ['all'],
  },
  {
    name: 'American Cancer Society',
    url: 'https://www.cancer.org/support-programs-and-services/patient-lodging.html',
    description: 'Lodging, transportation, and support services',
    eligibility: 'Cancer patients receiving treatment away from home',
    cancerTypes: ['all'],
    insuranceTypes: ['all'],
  },
  {
    name: 'Medicare Low Income Subsidy (Extra Help)',
    url: 'https://www.ssa.gov/benefits/medicare/prescriptionhelp/',
    description: 'Reduces Part D costs for low-income Medicare beneficiaries',
    eligibility: 'Income up to 150% of federal poverty level',
    cancerTypes: ['all'],
    insuranceTypes: ['medicare_original', 'medicare_advantage'],
  },
  {
    name: 'Social Security Disability Insurance (SSDI)',
    url: 'https://www.ssa.gov/disability/',
    description: 'Income if unable to work due to cancer',
    eligibility: 'Work history and medical documentation required',
    cancerTypes: ['all'],
    insuranceTypes: ['all'],
  },
  {
    name: 'State Pharmaceutical Assistance Programs (SPAPs)',
    url: 'https://www.medicare.gov/pharmaceutical-assistance-program/',
    description: 'State programs to help with drug costs',
    eligibility: 'Varies by state',
    cancerTypes: ['all'],
    insuranceTypes: ['all'],
  },
]

// Key facts to highlight
export const KEY_FACTS_2026 = [
  {
    title: 'Part D Out-of-Pocket Cap',
    value: '$2,100',
    description: 'NEW in 2026! Maximum you\'ll pay for prescriptions',
    icon: '💊',
  },
  {
    title: 'Medicare Advantage Max',
    value: '$9,250',
    description: 'Maximum out-of-pocket for in-network care',
    icon: '🏥',
  },
  {
    title: 'Drug Price Savings',
    value: '$1.5B',
    description: 'Annual savings from negotiated cancer drug prices',
    icon: '💰',
  },
  {
    title: 'Average MA Savings',
    value: '$668',
    description: 'Median savings vs Original Medicare for cancer patients',
    icon: '📉',
  },
]

// Get relevant programs for a user
export function getRelevantPrograms(
  cancerType: string,
  insuranceType: string
): typeof ASSISTANCE_PROGRAMS {
  return ASSISTANCE_PROGRAMS.filter(program => {
    const matchesCancer = program.cancerTypes.includes('all') ||
                          program.cancerTypes.includes(cancerType)
    const matchesInsurance = program.insuranceTypes.includes('all') ||
                             program.insuranceTypes.includes(insuranceType)
    return matchesCancer && matchesInsurance
  })
}

// Get coverage summary for insurance type
export function getCoverageSummary(insuranceType: string): string {
  switch (insuranceType) {
    case 'medicare_original':
      return `Original Medicare covers most cancer treatments. Part A covers hospital stays (${MEDICARE_2026.partA.deductible} deductible). Part B covers outpatient care (20% coinsurance after ${MEDICARE_2026.partB.deductible} deductible). Consider a Medigap plan to reduce out-of-pocket costs.`
    case 'medicare_advantage':
      return `Your Medicare Advantage plan covers all Medicare services. Check your plan's formulary for specific drug coverage. Maximum out-of-pocket is ${MEDICARE_2026.advantage.maxOutOfPocket} for in-network care.`
    case 'medicare_partd':
      return `Part D covers prescription drugs including oral cancer medications. NEW in 2026: Out-of-pocket costs capped at ${MEDICARE_2026.partD.outOfPocketCap}/year!`
    case 'medicaid':
      return 'Medicaid typically covers cancer treatment with little to no cost to you. Coverage varies by state. Contact your state Medicaid office for specifics.'
    case 'private':
      return 'Check your plan details for coverage specifics. Review your Summary of Benefits for deductibles, copays, and out-of-pocket maximums. Contact your HR department or insurance company.'
    case 'uninsured':
      return 'Many hospitals have financial assistance programs for uninsured patients. You may qualify for Medicaid. Contact a hospital financial counselor to discuss options.'
    case 'tricare':
      return 'TRICARE covers cancer treatment for active duty, retirees, and dependents. Coverage includes chemotherapy, radiation, surgery, and prescription drugs.'
    case 'va':
      return 'VA Healthcare provides comprehensive cancer care for eligible veterans. Contact your VA medical center for enrollment and coverage details.'
    default:
      return 'Contact your insurance company or a patient navigator to understand your specific coverage.'
  }
}
