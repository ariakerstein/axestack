// Cancer Checklist Data
// Extracted from Navis Health - NCCN-aligned recommendations

// Cancer type labels
export const CANCER_TYPES: Record<string, string> = {
  // Solid tumors - common
  breast: 'Breast Cancer',
  prostate: 'Prostate Cancer',
  lung: 'Lung Cancer',
  colorectal: 'Colorectal Cancer',
  colon: 'Colon Cancer',
  rectal: 'Rectal Cancer',
  pancreatic: 'Pancreatic Cancer',
  melanoma: 'Melanoma',
  ovarian: 'Ovarian Cancer',
  bladder: 'Bladder Cancer',
  kidney: 'Kidney Cancer',
  renal_cell: 'Renal Cell Carcinoma',
  thyroid: 'Thyroid Cancer',
  liver: 'Liver Cancer',
  hepatocellular: 'Hepatocellular Carcinoma (HCC)',
  brain: 'Brain Cancer',
  glioblastoma: 'Glioblastoma (GBM)',
  stomach: 'Stomach Cancer',
  gastric: 'Gastric Cancer',
  esophageal: 'Esophageal Cancer',
  head_neck: 'Head & Neck Cancer',
  oral: 'Oral Cancer',
  throat: 'Throat/Laryngeal Cancer',
  sarcoma: 'Sarcoma',
  soft_tissue_sarcoma: 'Soft Tissue Sarcoma',
  osteosarcoma: 'Osteosarcoma',
  cervical: 'Cervical Cancer',
  uterine: 'Uterine Cancer',
  endometrial: 'Endometrial Cancer',
  testicular: 'Testicular Cancer',
  // GI cancers
  anal_squamous: 'Squamous Cell Carcinoma of Anus (Anorectum)',
  bile_duct: 'Bile Duct Cancer (Cholangiocarcinoma)',
  gallbladder: 'Gallbladder Cancer',
  small_intestine: 'Small Intestine Cancer',
  appendiceal: 'Appendiceal Cancer',
  gist: 'GIST (Gastrointestinal Stromal Tumor)',
  neuroendocrine: 'Neuroendocrine Tumor (NET)',
  carcinoid: 'Carcinoid Tumor',
  // Thoracic
  mesothelioma: 'Mesothelioma',
  thymoma: 'Thymoma',
  // Skin
  basal_cell: 'Basal Cell Carcinoma',
  squamous_cell_skin: 'Squamous Cell Carcinoma (Skin)',
  merkel_cell: 'Merkel Cell Carcinoma',
  // Rare/Other
  adrenal: 'Adrenal Cancer',
  eye: 'Eye Cancer (Ocular)',
  penile: 'Penile Cancer',
  vulvar: 'Vulvar Cancer',
  vaginal: 'Vaginal Cancer',
  unknown_primary: 'Cancer of Unknown Primary (CUP)',
  // Blood cancers - main categories
  leukemia: 'Leukemia',
  lymphoma: 'Lymphoma',
  myeloma: 'Multiple Myeloma',
  // Lymphoma subtypes
  follicular_lymphoma: 'Follicular Lymphoma',
  dlbcl: 'Diffuse Large B-Cell (DLBCL)',
  hodgkin: "Hodgkin's Lymphoma",
  non_hodgkin: "Non-Hodgkin's Lymphoma",
  mantle_cell: 'Mantle Cell Lymphoma',
  marginal_zone: 'Marginal Zone Lymphoma',
  t_cell_lymphoma: 'T-Cell Lymphoma',
  burkitt: "Burkitt's Lymphoma",
  waldenstrom: "Waldenstrom's Macroglobulinemia",
  // Leukemia subtypes
  aml: 'Acute Myeloid Leukemia (AML)',
  all: 'Acute Lymphoblastic (ALL)',
  cml: 'Chronic Myeloid (CML)',
  cll: 'Chronic Lymphocytic (CLL)',
  hairy_cell: 'Hairy Cell Leukemia',
  // Other blood disorders
  mpn: 'Myeloproliferative Neoplasm (MPN)',
  mds: 'Myelodysplastic Syndrome (MDS)',
  aplastic_anemia: 'Aplastic Anemia',
  // Pediatric (for caregivers)
  neuroblastoma: 'Neuroblastoma',
  wilms: "Wilms' Tumor",
  retinoblastoma: 'Retinoblastoma',
  ewing_sarcoma: "Ewing's Sarcoma",
  rhabdomyosarcoma: 'Rhabdomyosarcoma',
  // Other
  other: 'Other / Rare Cancer',
}

// Primary categories for the selector
export const PRIMARY_CATEGORIES = [
  { code: 'breast', label: 'Breast', icon: '🎀' },
  { code: 'lung', label: 'Lung & Chest', icon: '🫁' },
  { code: 'prostate', label: 'Prostate', icon: '👨' },
  { code: 'colorectal', label: 'Colorectal & GI', icon: '🔴' },
  { code: 'blood', label: 'Blood & Lymphatic', icon: '🩸' },
]

// Blood cancer subtypes (shown when "Blood & Lymphatic" selected)
export const BLOOD_CANCERS = ['leukemia', 'lymphoma', 'myeloma', 'cll', 'mpn', 'mds']

// Cancer subtypes for more specific recommendations
export const CANCER_SUBTYPES: Record<string, { code: string; label: string }[]> = {
  breast: [
    { code: 'her2_positive', label: 'HER2-Positive' },
    { code: 'her2_low', label: 'HER2-Low' },
    { code: 'triple_negative', label: 'Triple Negative (TNBC)' },
    { code: 'er_positive', label: 'ER/PR-Positive (Hormone Receptor+)' },
    { code: 'dcis', label: 'DCIS (Stage 0)' },
    { code: 'inflammatory', label: 'Inflammatory' },
    { code: 'unknown', label: "Not sure yet" },
  ],
  lung: [
    { code: 'nsclc_adeno', label: 'NSCLC - Adenocarcinoma' },
    { code: 'nsclc_squamous', label: 'NSCLC - Squamous Cell' },
    { code: 'nsclc_large', label: 'NSCLC - Large Cell' },
    { code: 'sclc', label: 'Small Cell (SCLC)' },
    { code: 'unknown', label: "Not sure yet" },
  ],
  colorectal: [
    { code: 'msi_high', label: 'MSI-High / dMMR' },
    { code: 'mss', label: 'MSS / pMMR' },
    { code: 'left_sided', label: 'Left-Sided' },
    { code: 'right_sided', label: 'Right-Sided' },
    { code: 'rectal', label: 'Rectal' },
    { code: 'unknown', label: "Not sure yet" },
  ],
  prostate: [
    { code: 'localized', label: 'Localized' },
    { code: 'locally_advanced', label: 'Locally Advanced' },
    { code: 'metastatic_hspc', label: 'Metastatic Hormone-Sensitive (mHSPC)' },
    { code: 'metastatic_crpc', label: 'Metastatic Castration-Resistant (mCRPC)' },
    { code: 'unknown', label: "Not sure yet" },
  ],
  lymphoma: [
    { code: 'dlbcl', label: 'Diffuse Large B-Cell (DLBCL)' },
    { code: 'follicular', label: 'Follicular' },
    { code: 'hodgkin', label: "Hodgkin's Lymphoma" },
    { code: 'mantle_cell', label: 'Mantle Cell' },
    { code: 'marginal_zone', label: 'Marginal Zone' },
    { code: 't_cell', label: 'T-Cell Lymphoma' },
    { code: 'unknown', label: "Not sure yet" },
  ],
  leukemia: [
    { code: 'aml', label: 'Acute Myeloid (AML)' },
    { code: 'all', label: 'Acute Lymphoblastic (ALL)' },
    { code: 'cml', label: 'Chronic Myeloid (CML)' },
    { code: 'cll', label: 'Chronic Lymphocytic (CLL)' },
    { code: 'unknown', label: "Not sure yet" },
  ],
  melanoma: [
    { code: 'cutaneous', label: 'Cutaneous (Skin)' },
    { code: 'uveal', label: 'Uveal (Eye)' },
    { code: 'mucosal', label: 'Mucosal' },
    { code: 'acral', label: 'Acral' },
    { code: 'unknown', label: "Not sure yet" },
  ],
  ovarian: [
    { code: 'hgsoc', label: 'High-Grade Serous' },
    { code: 'lgsoc', label: 'Low-Grade Serous' },
    { code: 'endometrioid', label: 'Endometrioid' },
    { code: 'clear_cell', label: 'Clear Cell' },
    { code: 'mucinous', label: 'Mucinous' },
    { code: 'unknown', label: "Not sure yet" },
  ],
  pancreatic: [
    { code: 'adenocarcinoma', label: 'Adenocarcinoma' },
    { code: 'neuroendocrine', label: 'Neuroendocrine (PNET)' },
    { code: 'acinar', label: 'Acinar Cell' },
    { code: 'unknown', label: "Not sure yet" },
  ],
}

// Stage options
export const STAGES = [
  { code: '0', label: 'Stage 0', description: 'Pre-invasive' },
  { code: '1', label: 'Stage I', description: 'Small, localized' },
  { code: '2', label: 'Stage II', description: 'Locally advanced' },
  { code: '3', label: 'Stage III', description: 'Regional spread' },
  { code: '4', label: 'Stage IV', description: 'Metastatic' },
  { code: 'unknown', label: 'Not sure yet', description: '' },
]

// Test type
export interface Test {
  name: string
  reason: string
  priority: 'essential' | 'emerging'
  urgency?: string
}

// NCCN-aligned tests per cancer type
export const TESTS: Record<string, Test[]> = {
  breast: [
    { name: 'HER2 Expression (IHC + FISH)', reason: 'Determines targeted therapy eligibility', priority: 'essential' },
    { name: 'Oncotype DX / MammaPrint', reason: 'Determines if you need chemotherapy', priority: 'essential' },
    { name: 'ER/PR Receptor Status', reason: 'Guides hormone therapy decisions', priority: 'essential' },
    { name: 'HER2-Low Reclassification', reason: 'New category: may qualify you for T-DXd', priority: 'emerging', urgency: 'FDA approved 2022' },
    { name: 'PIK3CA Testing', reason: '40% of HR+ patients have this mutation', priority: 'emerging', urgency: 'New drug approved' },
    { name: 'Circulating Tumor DNA', reason: 'Detects recurrence months before imaging', priority: 'emerging', urgency: 'Emerging standard' },
  ],
  lung: [
    { name: 'Comprehensive Genomic Profiling', reason: 'Tests EGFR, ALK, ROS1, KRAS, MET, RET, NTRK, BRAF', priority: 'essential' },
    { name: 'PD-L1 Expression', reason: 'High PD-L1 may allow immunotherapy alone', priority: 'essential' },
    { name: 'Liquid Biopsy (ctDNA)', reason: 'FDA-approved alternative to tissue biopsy', priority: 'emerging', urgency: 'FDA approved 2020' },
    { name: 'MET Amplification', reason: 'New targeted therapies available', priority: 'emerging', urgency: 'Drug approved Aug 2024' },
    { name: 'HER2 Mutations', reason: '35% of patients saw treatment changes', priority: 'emerging', urgency: 'T-DXd approved 2024' },
  ],
  colorectal: [
    { name: 'MSI / MMR Testing', reason: 'MSI-H tumors have 40-50% response to immunotherapy', priority: 'essential' },
    { name: 'Extended RAS Testing', reason: 'KRAS/NRAS wild-type needed for anti-EGFR therapy', priority: 'essential' },
    { name: 'BRAF V600E', reason: 'BRAF+ has different prognosis and treatment', priority: 'essential' },
    { name: 'HER2 Amplification', reason: '5% of CRC: new targeted options', priority: 'emerging', urgency: 'Often missed' },
    { name: 'Circulating Tumor DNA', reason: 'Detects recurrence 8+ months earlier', priority: 'emerging', urgency: 'NCCN Category 2A' },
  ],
  prostate: [
    { name: 'Germline Testing (BRCA, ATM)', reason: 'BRCA+ qualifies for PARP inhibitors', priority: 'essential' },
    { name: 'PSMA PET/CT', reason: 'More sensitive than bone scan for staging', priority: 'essential' },
    { name: 'Tumor Genomic Profiling', reason: 'Identifies HRR mutations for PARPi', priority: 'emerging', urgency: 'Underutilized' },
    { name: 'AR-V7 Testing', reason: 'Predicts resistance, saves failed treatment', priority: 'emerging', urgency: 'Liquid biopsy' },
    { name: 'AI-Assisted Gleason Grading', reason: 'More accurate than traditional pathology', priority: 'emerging', urgency: 'Emerging 2024' },
  ],
  pancreatic: [
    { name: 'Germline Testing', reason: '10% have BRCA/PALB2, qualifies for PARPi', priority: 'essential' },
    { name: 'Tumor Molecular Profiling', reason: 'Rare but actionable: NTRK, NRG1, MSI-H', priority: 'essential' },
    { name: 'KRAS G12C Testing', reason: 'New targeted therapy in trials', priority: 'emerging', urgency: 'Breakthrough 2024' },
    { name: 'Liquid Biopsy', reason: 'Monitors treatment response in real-time', priority: 'emerging', urgency: 'Emerging standard' },
  ],
  lymphoma: [
    { name: 'PET-CT Staging', reason: 'Standard for staging and response assessment', priority: 'essential' },
    { name: 'Cell of Origin Testing', reason: 'GCB vs ABC affects prognosis in DLBCL', priority: 'essential' },
    { name: 'MYC/BCL2/BCL6 FISH', reason: 'Double-hit lymphomas need intensive therapy', priority: 'essential' },
    { name: 'Circulating Tumor DNA', reason: 'Predicts relapse before imaging', priority: 'emerging', urgency: 'Emerging 2024' },
  ],
  leukemia: [
    { name: 'Cytogenetics (Karyotype)', reason: 'Chromosomal changes define risk category', priority: 'essential' },
    { name: 'FISH Panel', reason: 'Detects specific translocations and deletions', priority: 'essential' },
    { name: 'Molecular Panel (FLT3, NPM1, IDH)', reason: 'Guides targeted therapy selection', priority: 'essential' },
    { name: 'Flow Cytometry', reason: 'Confirms diagnosis and monitors MRD', priority: 'essential' },
    { name: 'TP53 Mutation Testing', reason: 'Changes treatment approach significantly', priority: 'emerging', urgency: 'Often undertested' },
  ],
  melanoma: [
    { name: 'BRAF V600 Mutation', reason: 'BRAF+ patients respond to targeted combo therapy', priority: 'essential' },
    { name: 'Sentinel Lymph Node Biopsy', reason: 'Required for staging intermediate thickness', priority: 'essential' },
    { name: 'Gene Expression Profiling', reason: 'Predicts recurrence risk', priority: 'emerging', urgency: 'DecisionDx' },
    { name: 'Circulating Tumor DNA', reason: 'Early detection of recurrence', priority: 'emerging', urgency: 'Emerging 2024' },
  ],
  ovarian: [
    { name: 'Germline BRCA1/2', reason: 'BRCA+ qualifies for PARP inhibitor maintenance', priority: 'essential' },
    { name: 'Somatic BRCA Testing', reason: 'Tumor BRCA also qualifies for PARPi', priority: 'essential' },
    { name: 'HRD Testing', reason: 'HRD+ without BRCA may still benefit from PARPi', priority: 'essential' },
    { name: 'CCNE1 Amplification', reason: 'Predicts platinum resistance', priority: 'emerging', urgency: 'Often missed' },
    { name: 'Tumor Genomic Profiling', reason: 'Identifies rare actionable mutations', priority: 'emerging', urgency: 'Underutilized' },
  ],
  anal_squamous: [
    { name: 'HPV Testing (p16)', reason: 'HPV+ anal cancers have better prognosis and treatment response', priority: 'essential' },
    { name: 'HIV Testing', reason: 'HIV status affects treatment planning and monitoring', priority: 'essential' },
    { name: 'PET-CT Staging', reason: 'Standard for staging and detecting nodal/distant disease', priority: 'essential' },
    { name: 'PD-L1 Expression', reason: 'Pembrolizumab approved for recurrent/metastatic anal cancer', priority: 'essential' },
    { name: 'MSI / MMR Testing', reason: 'MSI-H tumors may respond to immunotherapy', priority: 'emerging', urgency: 'NCCN recommended' },
    { name: 'Comprehensive Genomic Profiling', reason: 'Identifies PIK3CA, EGFR, and other actionable mutations', priority: 'emerging', urgency: 'For metastatic disease' },
  ],
  // Default for other/uncommon cancer types
  other: [
    { name: 'Comprehensive Genomic Profiling', reason: 'Identifies targetable mutations across cancer types', priority: 'essential' },
    { name: 'MSI / MMR Testing', reason: 'MSI-H tumors may respond to immunotherapy regardless of origin', priority: 'essential' },
    { name: 'Germline Testing', reason: 'May reveal hereditary syndromes affecting treatment', priority: 'emerging', urgency: 'Family implications' },
    { name: 'PD-L1 Expression', reason: 'May predict immunotherapy benefit', priority: 'emerging', urgency: 'Tumor-agnostic' },
    { name: 'Liquid Biopsy', reason: 'Alternative when tissue is limited', priority: 'emerging', urgency: 'FDA approved' },
  ],
}

// Questions to ask oncologist
export const QUESTIONS: Record<string, string[]> = {
  breast: [
    'Have you checked if I qualify as HER2-Low?',
    'Should I get an Oncotype DX to see if I can skip chemo?',
    'Am I a candidate for a clinical trial?',
  ],
  lung: [
    'Have you tested for all 8 actionable mutations?',
    'Should I get a liquid biopsy if tissue is limited?',
    'Am I eligible for first-line immunotherapy?',
  ],
  colorectal: [
    'Is my tumor MSI-High or MSS?',
    'Should I get ctDNA monitoring after treatment?',
    'Have you tested for HER2 amplification?',
  ],
  prostate: [
    'Should I get a PSMA PET scan instead of bone scan?',
    'Am I a candidate for PARP inhibitor testing?',
    'Should my family get genetic testing?',
  ],
  pancreatic: [
    'Have I been tested for BRCA and PALB2?',
    'Is there a KRAS G12C clinical trial I qualify for?',
    'Should I get comprehensive tumor profiling?',
  ],
  lymphoma: [
    'What is my cell of origin subtype?',
    'Have you checked for double-hit lymphoma?',
    'Am I a candidate for CAR-T therapy?',
  ],
  leukemia: [
    'What are my cytogenetic risk factors?',
    'Have you tested for FLT3 and IDH mutations?',
    'Am I a candidate for targeted therapy?',
  ],
  melanoma: [
    'Have you tested for BRAF V600?',
    'Should I get gene expression profiling?',
    'Am I a candidate for adjuvant immunotherapy?',
  ],
  ovarian: [
    'Have I been tested for both germline AND somatic BRCA?',
    'Should I get HRD testing for PARP inhibitor eligibility?',
    'Am I a candidate for maintenance therapy?',
  ],
  anal_squamous: [
    'Is my tumor HPV-positive (p16)?',
    'Should I get PD-L1 testing for immunotherapy eligibility?',
    'Am I a candidate for chemoradiation or surgery?',
    'Should I get genomic profiling for actionable mutations?',
  ],
  other: [
    'Have you done comprehensive genomic profiling?',
    'Is my tumor MSI-High?',
    'Am I a candidate for a tumor-agnostic therapy?',
  ],
}

// Key biomarkers by cancer type (from actionable_mutations)
export const BIOMARKERS: Record<string, { marker: string; drug: string; indication: string }[]> = {
  breast: [
    { marker: 'HER2+', drug: 'Trastuzumab, Pertuzumab', indication: 'HER2-positive breast cancer' },
    { marker: 'HER2-Low', drug: 'T-DXd (Enhertu)', indication: 'HER2-low breast cancer (FDA 2022)' },
    { marker: 'BRCA1/2', drug: 'Olaparib, Talazoparib', indication: 'BRCA-mutated breast cancer' },
    { marker: 'PIK3CA', drug: 'Alpelisib', indication: 'HR+/HER2- with PIK3CA mutation' },
  ],
  lung: [
    { marker: 'EGFR', drug: 'Osimertinib, Erlotinib', indication: 'EGFR-mutant NSCLC' },
    { marker: 'ALK fusion', drug: 'Alectinib, Lorlatinib', indication: 'ALK-positive NSCLC' },
    { marker: 'ROS1 fusion', drug: 'Crizotinib, Entrectinib', indication: 'ROS1-positive NSCLC' },
    { marker: 'KRAS G12C', drug: 'Sotorasib, Adagrasib', indication: 'KRAS G12C NSCLC' },
    { marker: 'MET exon 14', drug: 'Capmatinib, Tepotinib', indication: 'MET exon 14 skipping' },
  ],
  colorectal: [
    { marker: 'MSI-H/dMMR', drug: 'Pembrolizumab', indication: 'MSI-H colorectal cancer' },
    { marker: 'BRAF V600E', drug: 'Encorafenib + Cetuximab', indication: 'BRAF-mutant CRC' },
    { marker: 'HER2+', drug: 'Trastuzumab + Pertuzumab', indication: 'HER2-amplified CRC' },
  ],
  melanoma: [
    { marker: 'BRAF V600', drug: 'Dabrafenib + Trametinib', indication: 'BRAF-mutant melanoma' },
    { marker: 'PD-L1', drug: 'Pembrolizumab, Nivolumab', indication: 'Advanced melanoma' },
  ],
  ovarian: [
    { marker: 'BRCA1/2', drug: 'Olaparib, Niraparib', indication: 'BRCA-mutant ovarian cancer' },
    { marker: 'HRD+', drug: 'PARP inhibitors', indication: 'HRD-positive ovarian cancer' },
  ],
}

// Helper function to get tests for a cancer type
export function getTestsForCancer(cancerType: string): Test[] {
  return TESTS[cancerType] || TESTS.other
}

// Helper function to get questions for a cancer type
export function getQuestionsForCancer(cancerType: string): string[] {
  return QUESTIONS[cancerType] || QUESTIONS.other
}

// Helper function to get biomarkers for a cancer type
export function getBiomarkersForCancer(cancerType: string): typeof BIOMARKERS.breast {
  return BIOMARKERS[cancerType] || []
}
