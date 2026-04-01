-- Fix RLS policies for combat_analyses table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own combat analyses" ON combat_analyses;
DROP POLICY IF EXISTS "Anyone can insert combat analyses" ON combat_analyses;
DROP POLICY IF EXISTS "Users can update own combat analyses" ON combat_analyses;
DROP POLICY IF EXISTS "Users can delete own combat analyses" ON combat_analyses;

-- Create simpler policies that work with anon key
-- Allow anyone to insert (session validation happens in app)
CREATE POLICY "Allow insert for all" ON combat_analyses
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read all data (filtering by session/user happens in app)
CREATE POLICY "Allow select all" ON combat_analyses
  FOR SELECT
  USING (true);

-- Allow updates on records without user_id or matching user_id
CREATE POLICY "Allow update own data" ON combat_analyses
  FOR UPDATE
  USING (user_id IS NULL OR auth.uid() = user_id);

-- Allow deletes on records without user_id or matching user_id
CREATE POLICY "Allow delete own data" ON combat_analyses
  FOR DELETE
  USING (user_id IS NULL OR auth.uid() = user_id);
