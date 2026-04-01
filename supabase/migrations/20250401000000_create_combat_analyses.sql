-- Create combat_analyses table to store CancerCombat analysis results
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS combat_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phase TEXT NOT NULL CHECK (phase IN ('diagnosis', 'treatment')),
  question TEXT NOT NULL,
  perspectives JSONB NOT NULL DEFAULT '[]',
  synthesis TEXT NOT NULL DEFAULT '',
  consensus JSONB NOT NULL DEFAULT '[]',
  divergence JSONB NOT NULL DEFAULT '[]',
  records_summary JSONB NOT NULL DEFAULT '{"count": 0, "cancer_type": null, "document_types": []}',
  evidence_strength INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_combat_analyses_session_id ON combat_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_combat_analyses_user_id ON combat_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_combat_analyses_created_at ON combat_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_combat_analyses_phase ON combat_analyses(phase);

-- Enable Row Level Security
ALTER TABLE combat_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own analyses (by user_id or session_id)
CREATE POLICY "Users can view own combat analyses" ON combat_analyses
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR session_id = current_setting('request.headers')::json->>'x-session-id'
  );

-- Policy: Anyone can insert (we'll validate session_id in the app)
CREATE POLICY "Anyone can insert combat analyses" ON combat_analyses
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own analyses
CREATE POLICY "Users can update own combat analyses" ON combat_analyses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own analyses
CREATE POLICY "Users can delete own combat analyses" ON combat_analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_combat_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER combat_analyses_updated_at
  BEFORE UPDATE ON combat_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_combat_analyses_updated_at();

-- Grant permissions
GRANT ALL ON combat_analyses TO authenticated;
GRANT ALL ON combat_analyses TO anon;
