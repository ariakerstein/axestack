-- Create email_addresses table for @opencancer.ai email feature
-- Users can claim username@opencancer.ai and forward medical docs there

CREATE TABLE IF NOT EXISTS email_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  username TEXT NOT NULL UNIQUE,
  email_address TEXT GENERATED ALWAYS AS (username || '@opencancer.ai') STORED,
  display_name TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure either user_id or session_id is provided
  CONSTRAINT user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_addresses_username ON email_addresses(username);
CREATE INDEX IF NOT EXISTS idx_email_addresses_user_id ON email_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_email_addresses_session_id ON email_addresses(session_id);

-- Table for received emails (documents forwarded to @opencancer.ai)
CREATE TABLE IF NOT EXISTS received_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address_id UUID NOT NULL REFERENCES email_addresses(id) ON DELETE CASCADE,
  from_address TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  -- Metadata for tracking
  has_attachments BOOLEAN DEFAULT false,
  attachment_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_received_emails_address ON received_emails(email_address_id);
CREATE INDEX IF NOT EXISTS idx_received_emails_received ON received_emails(received_at);

-- Table for email attachments (the actual medical documents)
CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_email_id UUID NOT NULL REFERENCES received_emails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  storage_path TEXT, -- Path in Supabase Storage
  -- Link to records if auto-imported
  record_id TEXT, -- Links to saved translation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_email ON email_attachments(received_email_id);

-- Enable RLS
ALTER TABLE email_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE received_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_addresses
CREATE POLICY "Users can view own email addresses" ON email_addresses
  FOR SELECT USING (
    auth.uid() = user_id OR
    (user_id IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can insert email addresses" ON email_addresses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own email addresses" ON email_addresses
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policies for received_emails
CREATE POLICY "Users can view own received emails" ON received_emails
  FOR SELECT USING (
    email_address_id IN (
      SELECT id FROM email_addresses WHERE auth.uid() = user_id OR user_id IS NULL
    )
  );

-- Service role can insert (webhook handler)
CREATE POLICY "Service can insert received emails" ON received_emails
  FOR INSERT WITH CHECK (true);

-- RLS Policies for email_attachments
CREATE POLICY "Users can view own attachments" ON email_attachments
  FOR SELECT USING (
    received_email_id IN (
      SELECT re.id FROM received_emails re
      JOIN email_addresses ea ON re.email_address_id = ea.id
      WHERE auth.uid() = ea.user_id OR ea.user_id IS NULL
    )
  );

CREATE POLICY "Service can insert attachments" ON email_attachments
  FOR INSERT WITH CHECK (true);
