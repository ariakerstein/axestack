#!/usr/bin/env node
/**
 * Run deck analytics migration via Supabase
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDY3NDM4MCwiZXhwIjoyMDU2MjUwMzgwfQ.OC0ma2mN2Np_-AEL4siwLaUV0eGZ1tDXgbghMfB61pQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('🚀 Checking deck analytics table...\n');

  // Check if table exists by selecting from it
  const { data, error } = await supabase
    .from('deck_view_sessions')
    .select('id')
    .limit(1);

  if (error) {
    console.log('Error:', error.code, error.message);

    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.log('\n❌ Table does not exist. Creating it now...\n');

      // The service role key can't run DDL directly via REST API
      // We need to use the SQL editor or psql
      console.log('Please run this SQL in Supabase Dashboard > SQL Editor:\n');
      console.log('-------------------------------------------');
      console.log(`
CREATE TABLE IF NOT EXISTS deck_view_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id TEXT NOT NULL,
    investor_id TEXT,
    session_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    max_slide_reached INTEGER DEFAULT 1,
    total_slides INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deck_views_deck_id ON deck_view_sessions(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_views_investor_id ON deck_view_sessions(investor_id);
CREATE INDEX IF NOT EXISTS idx_deck_views_session_id ON deck_view_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_deck_views_started_at ON deck_view_sessions(started_at DESC);

ALTER TABLE deck_view_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous deck view inserts" ON deck_view_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous deck view updates" ON deck_view_sessions
    FOR UPDATE USING (true);

CREATE POLICY "Admins can read deck views" ON deck_view_sessions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM user_profiles WHERE role = 'admin'
        )
    );
`);
      console.log('-------------------------------------------');
      process.exit(1);
    }
  } else {
    console.log('✅ Table exists!');
    console.log(`   Found ${data?.length || 0} records`);

    // Try insert
    console.log('\n2. Testing insert...');
    const { data: inserted, error: insertErr } = await supabase
      .from('deck_view_sessions')
      .insert({
        deck_id: 'test-migration',
        session_id: 'test-' + Date.now(),
        total_slides: 10
      })
      .select();

    if (insertErr) {
      console.log('   ❌ Insert failed:', insertErr.message);
    } else {
      console.log('   ✅ Insert works!');
      // Cleanup
      await supabase.from('deck_view_sessions').delete().eq('id', inserted[0].id);
      console.log('   ✅ Cleaned up test record');
    }
  }

  console.log('\n✅ Done!');
}

runMigration().catch(console.error);
