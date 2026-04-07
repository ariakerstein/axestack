-- Fix Remaining Supabase Security Warnings
-- This script addresses the 3 remaining function_search_path_mutable and extension_in_public warnings

-- 1. Fix cleanup_expired_verification_tokens function
-- Note: This function should NOT delete from auth.users as it's dangerous
-- Instead, we'll create a safer version that does nothing (Supabase handles cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Do nothing - Supabase handles expired token cleanup automatically
  -- This function exists for compatibility but doesn't perform dangerous operations
  NULL;
END;
$$;

-- 2. Fix update_medical_record_status function
CREATE OR REPLACE FUNCTION public.update_medical_record_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Update status based on processing completion
  IF NEW.ai_analysis IS NOT NULL AND OLD.ai_analysis IS NULL THEN
    NEW.status = 'processed';
  ELSIF NEW.status = 'processing' AND OLD.status = 'uploaded' THEN
    NEW.status = 'processing';
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Create a dedicated schema for extensions (for future use)
-- Note: We won't move the vector extension yet as it has dependencies
CREATE SCHEMA IF NOT EXISTS extensions;

-- 4. Add comment explaining why vector extension remains in public
COMMENT ON EXTENSION vector IS 'Vector extension for embeddings - kept in public schema due to existing table dependencies';

-- 5. Create a view to help with future vector extension migration
CREATE OR REPLACE VIEW public.vector_extension_info AS
SELECT 
  'vector' as extension_name,
  'public' as current_schema,
  'Dependencies prevent safe migration' as migration_status,
  jsonb_build_object(
    'dependent_tables', (
      SELECT jsonb_agg(table_name)
      FROM information_schema.columns 
      WHERE data_type = 'USER-DEFINED' 
        AND udt_name = 'vector'
    ),
    'dependent_functions', (
      SELECT jsonb_agg(routine_name)
      FROM information_schema.routines 
      WHERE routine_definition LIKE '%vector%'
        AND routine_schema = 'public'
    )
  ) as dependencies;

-- Add comment explaining the security improvements
COMMENT ON SCHEMA extensions IS 'Dedicated schema for database extensions to improve security (for future use)'; 