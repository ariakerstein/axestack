-- Migration: Fix schema gaps discovered in data audit
-- Date: 2026-04-09
-- Issues addressed:
--   1. Missing column: patient_entities.source_type
--   2. Missing tables: purchases, lifestyle_inquiries, combat_results
--   3. Missing indexes on large tables (medical_records, analytics_events, guideline_chunks)
--   4. Missing views: patient_graph_edges_derived

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add source_type column to patient_entities (required by combat/save and ask APIs)
ALTER TABLE patient_entities
ADD COLUMN IF NOT EXISTS source_type TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_patient_entities_source_type
ON patient_entities(source_type);

CREATE INDEX IF NOT EXISTS idx_patient_entities_user_session
ON patient_entities(user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_patient_entities_type
ON patient_entities(entity_type);

-- ============================================================================
-- 2. CREATE MISSING TABLES
-- ============================================================================

-- purchases table (used by checkout and stripe webhook)
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  email TEXT NOT NULL,
  product_type TEXT NOT NULL, -- 'expert_review', 'premium', etc.
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_email ON purchases(email);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe ON purchases(stripe_payment_intent_id);

-- lifestyle_inquiries table (used by lifestyle API)
CREATE TABLE IF NOT EXISTS lifestyle_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  email TEXT,
  name TEXT,
  cancer_type TEXT,
  inquiry_type TEXT, -- 'nutrition', 'exercise', 'mental_health', etc.
  message TEXT,
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'completed'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifestyle_inquiries_email ON lifestyle_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_lifestyle_inquiries_type ON lifestyle_inquiries(inquiry_type);

-- combat_results table (used by expert-review page, distinct from combat_analyses)
CREATE TABLE IF NOT EXISTS combat_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  combat_analysis_id UUID REFERENCES combat_analyses(id),
  result_type TEXT, -- 'diagnosis_summary', 'treatment_summary'
  summary TEXT,
  key_findings JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_combat_results_user ON combat_results(user_id);
CREATE INDEX IF NOT EXISTS idx_combat_results_session ON combat_results(session_id);

-- patient_records table (used by admin timeline, distinct from medical_records)
CREATE TABLE IF NOT EXISTS patient_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  record_type TEXT, -- 'lab', 'imaging', 'pathology', 'note', etc.
  record_date DATE,
  summary TEXT,
  source TEXT, -- 'upload', 'email', 'portal'
  medical_record_id UUID REFERENCES medical_records(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_records_user ON patient_records(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_records_date ON patient_records(record_date);

-- ============================================================================
-- 3. CREATE MISSING GRAPH TABLES/VIEWS
-- ============================================================================

-- patient_graph_stats (materialized view for graph statistics)
CREATE TABLE IF NOT EXISTS patient_graph_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE DEFAULT CURRENT_DATE,
  total_entities INTEGER DEFAULT 0,
  total_relationships INTEGER DEFAULT 0,
  entities_by_type JSONB DEFAULT '{}',
  relationships_by_type JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- entity_cooccurrence (for "patients like you" feature)
CREATE TABLE IF NOT EXISTS entity_cooccurrence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_a_type TEXT NOT NULL,
  entity_a_value TEXT NOT NULL,
  entity_b_type TEXT NOT NULL,
  entity_b_value TEXT NOT NULL,
  cooccurrence_count INTEGER DEFAULT 1,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_a_type, entity_a_value, entity_b_type, entity_b_value)
);

CREATE INDEX IF NOT EXISTS idx_entity_cooccurrence_a ON entity_cooccurrence(entity_a_type, entity_a_value);
CREATE INDEX IF NOT EXISTS idx_entity_cooccurrence_b ON entity_cooccurrence(entity_b_type, entity_b_value);

-- patient_similarity (for finding similar patients)
CREATE TABLE IF NOT EXISTS patient_similarity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_a_id UUID,
  patient_a_session TEXT,
  patient_b_id UUID,
  patient_b_session TEXT,
  similarity_score FLOAT NOT NULL,
  shared_entities JSONB DEFAULT '[]',
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_similarity_a ON patient_similarity(patient_a_id, patient_a_session);
CREATE INDEX IF NOT EXISTS idx_patient_similarity_score ON patient_similarity(similarity_score DESC);

-- patient_graph_edges_derived view (used by ask API and admin)
CREATE OR REPLACE VIEW patient_graph_edges_derived AS
SELECT
  er.id,
  er.entity_a_id,
  er.entity_b_id,
  er.relationship_type,
  er.confidence,
  ea.user_id,
  ea.session_id,
  ea.entity_type as entity_a_type,
  ea.entity_value as entity_a_value,
  eb.entity_type as entity_b_type,
  eb.entity_value as entity_b_value,
  er.created_at
FROM entity_relationships er
JOIN patient_entities ea ON er.entity_a_id = ea.id
JOIN patient_entities eb ON er.entity_b_id = eb.id;

-- ============================================================================
-- 4. ADD INDEXES TO LARGE TABLES (fixes timeout issues)
-- ============================================================================

-- medical_records indexes
CREATE INDEX IF NOT EXISTS idx_medical_records_user ON medical_records(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_created ON medical_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON medical_records(record_type);

-- analytics_events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);

-- guideline_chunks indexes (for RAG)
CREATE INDEX IF NOT EXISTS idx_guideline_chunks_source ON guideline_chunks(source);
CREATE INDEX IF NOT EXISTS idx_guideline_chunks_cancer ON guideline_chunks(cancer_type);

-- ============================================================================
-- 5. UPDATE RLS POLICIES (allow service role inserts)
-- ============================================================================

-- Ensure patient_entities allows inserts with service role
ALTER TABLE patient_entities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Service role can do anything" ON patient_entities;
CREATE POLICY "Service role can do anything" ON patient_entities
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can view own entities" ON patient_entities;
CREATE POLICY "Users can view own entities" ON patient_entities
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR session_id = current_setting('request.headers', true)::json->>'x-session-id'
  );

-- Same for entity_relationships
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can do anything" ON entity_relationships;
CREATE POLICY "Service role can do anything" ON entity_relationships
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Same for patient_activity
ALTER TABLE patient_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can do anything" ON patient_activity;
CREATE POLICY "Service role can do anything" ON patient_activity
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Same for api_usage
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can do anything" ON api_usage;
CREATE POLICY "Service role can do anything" ON api_usage
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON purchases TO authenticated;
GRANT ALL ON purchases TO service_role;

GRANT ALL ON lifestyle_inquiries TO authenticated;
GRANT ALL ON lifestyle_inquiries TO service_role;

GRANT ALL ON combat_results TO authenticated;
GRANT ALL ON combat_results TO service_role;

GRANT ALL ON patient_records TO authenticated;
GRANT ALL ON patient_records TO service_role;

GRANT ALL ON patient_graph_stats TO authenticated;
GRANT ALL ON patient_graph_stats TO service_role;

GRANT ALL ON entity_cooccurrence TO authenticated;
GRANT ALL ON entity_cooccurrence TO service_role;

GRANT ALL ON patient_similarity TO authenticated;
GRANT ALL ON patient_similarity TO service_role;

GRANT SELECT ON patient_graph_edges_derived TO authenticated;
GRANT SELECT ON patient_graph_edges_derived TO service_role;
