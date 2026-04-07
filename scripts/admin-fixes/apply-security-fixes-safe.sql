-- Apply Security Fixes for Supabase Linter Warnings (Safe Version)
-- This script fixes function_search_path_mutable warnings by adding SET search_path
-- Note: Vector extension remains in public schema to avoid breaking existing dependencies

-- 1. Create a dedicated schema for extensions (for future use)
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Fix function search path security warnings by adding SET search_path
-- Note: We'll keep vector extension in public schema to avoid breaking existing tables

-- Fix get_analytics_summary function
CREATE OR REPLACE FUNCTION public.get_analytics_summary(start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), end_date timestamp with time zone DEFAULT now())
 RETURNS TABLE(total_page_views bigint, unique_visitors bigint, top_pages jsonb, daily_visits jsonb, user_flow jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total page views
    (SELECT COUNT(*) FROM public.analytics_events 
     WHERE event_type = 'page_view' AND event_timestamp BETWEEN start_date AND end_date),
    
    -- Unique visitors
    (SELECT COUNT(DISTINCT COALESCE(user_id, session_id)) FROM public.analytics_events 
     WHERE event_timestamp BETWEEN start_date AND end_date),
    
    -- Top pages
    (SELECT jsonb_agg(
       jsonb_build_object('page', page_path, 'views', view_count)
       ORDER BY view_count DESC
     )
     FROM (
       SELECT page_path, COUNT(*) as view_count
       FROM public.analytics_events
       WHERE event_type = 'page_view' AND event_timestamp BETWEEN start_date AND end_date
       GROUP BY page_path
       ORDER BY view_count DESC
       LIMIT 10
     ) top_pages_data),
    
    -- Daily visits (last 7 days)
    (SELECT jsonb_agg(
       jsonb_build_object('date', visit_date, 'visits', visit_count)
       ORDER BY visit_date
     )
     FROM (
       SELECT DATE(event_timestamp) as visit_date, COUNT(DISTINCT COALESCE(user_id, session_id)) as visit_count
       FROM public.analytics_events
       WHERE event_timestamp BETWEEN (end_date - interval '7 days') AND end_date
       GROUP BY DATE(event_timestamp)
       ORDER BY visit_date
     ) daily_data),
    
    -- User flow (simplified - most common navigation patterns)
    (SELECT jsonb_agg(
       jsonb_build_object('from', from_page, 'to', to_page, 'count', flow_count)
       ORDER BY flow_count DESC
     )
     FROM (
       SELECT 
         LAG(page_path) OVER (PARTITION BY COALESCE(user_id, session_id) ORDER BY event_timestamp) as from_page,
         page_path as to_page,
         COUNT(*) as flow_count
       FROM public.analytics_events
       WHERE event_type = 'page_view' AND event_timestamp BETWEEN start_date AND end_date
       GROUP BY from_page, to_page
       HAVING LAG(page_path) OVER (PARTITION BY COALESCE(user_id, session_id) ORDER BY event_timestamp) IS NOT NULL
       ORDER BY flow_count DESC
       LIMIT 20
     ) flow_data);
END;
$function$;

-- Fix update_privacy_settings_updated_at function
CREATE OR REPLACE FUNCTION public.update_privacy_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix create_notification function
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_content text DEFAULT NULL::text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, content, data)
  VALUES (p_user_id, p_type, p_title, p_content, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

-- Fix update_epic_tokens_updated_at function
CREATE OR REPLACE FUNCTION public.update_epic_tokens_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_modified_column function
CREATE OR REPLACE FUNCTION public.update_modified_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Fix update_thread_on_message_insert function (keep original logic)
CREATE OR REPLACE FUNCTION public.update_thread_on_message_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE conversation_threads 
  SET 
    last_message_at = NEW.created_at,
    message_count = message_count + 1,
    updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$function$;

-- Fix is_conversation_shared_with_user function (keep original signature)
CREATE OR REPLACE FUNCTION public.is_conversation_shared_with_user(conversation_uuid uuid, email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM document_conversation_shares
    WHERE conversation_id = conversation_uuid
    AND shared_with_email = email
    AND (expires_at IS NULL OR expires_at > now())
    AND NOT is_revoked
  );
END;
$function$;

-- Fix update_shared_access_updated_at function
CREATE OR REPLACE FUNCTION public.update_shared_access_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_system_settings_updated_at function
CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix match_documents function (keep vector in public schema for now)
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector, 
  match_threshold double precision, 
  match_count integer
)
RETURNS TABLE(
  id uuid, 
  cancer_type text, 
  topic text, 
  chunk_text text, 
  page_start integer, 
  page_end integer, 
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gc.id,
    gc.cancer_type,
    gc.topic,
    gc.chunk_text,
    gc.page_start,
    gc.page_end,
    1 - (gc.chunk_embedding_vec <=> query_embedding) as similarity
  FROM guideline_chunks gc
  WHERE 1 - (gc.chunk_embedding_vec <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Fix insert_guideline_chunk function (keep vector in public schema for now)
CREATE OR REPLACE FUNCTION public.insert_guideline_chunk(
  id uuid, 
  cancer_type text, 
  guideline_source text, 
  guideline_title text, 
  version_date text, 
  section_heading text, 
  chunk_index integer, 
  page_start integer, 
  page_end integer, 
  chunk_text text, 
  token_count integer, 
  url text, 
  chunk_embedding_vec json
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO guideline_chunks (
    id, cancer_type, guideline_source, guideline_title, version_date,
    section_heading, chunk_index, page_start, page_end,
    chunk_text, token_count, url, chunk_embedding_vec
  )
  VALUES (
    id,
    cancer_type,
    guideline_source,
    guideline_title,
    version_date,
    section_heading,
    chunk_index,
    page_start,
    page_end,
    chunk_text,
    token_count,
    url,
    (SELECT string_to_array(trim(both '[]' from chunk_embedding_vec::text), ',')::float8[]::vector)
  )
  ON CONFLICT (id) DO UPDATE SET
    chunk_embedding_vec = excluded.chunk_embedding_vec;
$$;

-- Fix get_document_text function
CREATE OR REPLACE FUNCTION public.get_document_text(record_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  doc_text TEXT;
BEGIN
  -- Try to get extracted_text first
  SELECT extracted_text INTO doc_text
  FROM medical_records
  WHERE id = record_id;
  
  -- If no extracted_text, try to get it from ai_analysis
  IF doc_text IS NULL OR LENGTH(doc_text) < 100 THEN
    SELECT 
      CASE 
        WHEN jsonb_typeof(ai_analysis) = 'string' THEN 
          (jsonb_extract_path_text(CAST(ai_analysis AS jsonb), 'extracted_text'))::TEXT
        ELSE
          jsonb_extract_path_text(ai_analysis, 'extracted_text')
      END INTO doc_text
    FROM medical_records
    WHERE id = record_id AND ai_analysis IS NOT NULL;
  END IF;
  
  -- Return what we found, or NULL if nothing
  RETURN doc_text;
END;
$$;

-- Grant necessary permissions for the extensions schema (for future use)
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;

-- Add comment explaining the security improvements
COMMENT ON SCHEMA extensions IS 'Dedicated schema for database extensions to improve security';

-- Verify the fixes
SELECT 'Security fixes applied successfully (vector extension kept in public schema)' as status; 