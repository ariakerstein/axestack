-- Add email source tracking to medical_records
-- This allows records uploaded via @opencancer.ai email to be tracked

ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload',
ADD COLUMN IF NOT EXISTS source_email TEXT,
ADD COLUMN IF NOT EXISTS source_subject TEXT;

-- Add index for querying by source
CREATE INDEX IF NOT EXISTS idx_medical_records_source ON medical_records(source);

COMMENT ON COLUMN medical_records.source IS 'How this record was added: upload, email, api';
COMMENT ON COLUMN medical_records.source_email IS 'For email source: the from address';
COMMENT ON COLUMN medical_records.source_subject IS 'For email source: the email subject line';
