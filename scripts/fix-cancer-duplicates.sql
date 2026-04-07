-- Fix duplicate display names in cancer_taxonomy
-- Run in Supabase SQL Editor

-- 1. Breast cancer subtypes - make distinct
UPDATE cancer_taxonomy
SET navis_display_name = 'Breast cancer (HR+)'
WHERE navis_canonical_code = 'breast_hr_positive';

-- 2. CLL - make distinct
UPDATE cancer_taxonomy
SET navis_display_name = 'CLL / SLL'
WHERE navis_canonical_code = 'cll_sll';

UPDATE cancer_taxonomy
SET navis_display_name = 'CLL (Chronic lymphocytic leukemia)'
WHERE navis_canonical_code = 'cll';

-- 3. Pediatric lymphoma - distinguish HL vs NHL
UPDATE cancer_taxonomy
SET navis_display_name = 'Pediatric Hodgkin lymphoma'
WHERE navis_canonical_code = 'pediatric_hl';

UPDATE cancer_taxonomy
SET navis_display_name = 'Pediatric non-Hodgkin lymphoma'
WHERE navis_canonical_code = 'pediatric_nhl';

-- 4. True duplicates - prefer the entry with NCCN guidelines or better category
-- Delete the "Digestive system" duplicates, keep "Gastrointestinal" (more clinically standard)

-- Pancreatic: keep pancreatic_adenocarcinoma (Gastrointestinal), delete pancreatic_cancer (Digestive system)
DELETE FROM cancer_taxonomy
WHERE navis_canonical_code = 'pancreatic_cancer'
AND nccn_category_display = 'Digestive system';

-- Colon: keep colon_cancer (Gastrointestinal), delete colorectal_cancer (Digestive system)
-- Actually, colorectal is more accurate - colon + rectum. Let's rename instead.
UPDATE cancer_taxonomy
SET navis_display_name = 'Colorectal cancer'
WHERE navis_canonical_code = 'colorectal_cancer';

DELETE FROM cancer_taxonomy
WHERE navis_canonical_code = 'colon_cancer'
AND nccn_category_display = 'Gastrointestinal';

-- Bile duct: keep cholangiocarcinoma (clinical term), delete bile_duct_cancer
DELETE FROM cancer_taxonomy
WHERE navis_canonical_code = 'bile_duct_cancer';

-- Verify results
SELECT navis_canonical_code, navis_display_name, nccn_category_display
FROM cancer_taxonomy
WHERE navis_display_name IN (
  'Breast cancer', 'Breast cancer (HR+)',
  'CLL', 'CLL / SLL', 'CLL (Chronic lymphocytic leukemia)',
  'Pediatric lymphoma', 'Pediatric Hodgkin lymphoma', 'Pediatric non-Hodgkin lymphoma',
  'Pancreatic cancer', 'Pancreatic adenocarcinoma',
  'Colon cancer', 'Colorectal cancer',
  'Bile duct cancer', 'Cholangiocarcinoma', 'Bile duct cancer (cholangiocarcinoma)'
)
ORDER BY navis_display_name;
