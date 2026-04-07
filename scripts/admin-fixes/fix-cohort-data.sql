-- EMERGENCY FIX FOR COHORT DATA
-- This script creates a direct access function for cohort data

-- Create a function to get cohort analysis data directly
DROP FUNCTION IF EXISTS get_cohort_analysis_data(text);
CREATE OR REPLACE FUNCTION get_cohort_analysis_data(period_type text DEFAULT 'week')
RETURNS TABLE (
    cohort_period text,
    cohort_size integer,
    period_0 integer,
    period_1 integer,
    period_2 integer,
    period_3 integer,
    period_4 integer
) AS $$
DECLARE
    cohort_data RECORD;
    user_ids uuid[];
    cohort_users uuid[];
    active_users integer;
    activity_start timestamp;
    activity_end timestamp;
BEGIN
    -- For each cohort period
    FOR cohort_data IN 
        SELECT 
            CASE 
                WHEN period_type = 'week' THEN DATE_TRUNC('week', created_at)::text
                ELSE DATE_TRUNC('month', created_at)::text
            END as period,
            COUNT(*) as size
        FROM 
            user_profiles
        WHERE 
            created_at IS NOT NULL
        GROUP BY 
            period
        ORDER BY 
            period
    LOOP
        -- Set cohort period and size
        cohort_period := cohort_data.period;
        cohort_size := cohort_data.size;
        period_0 := cohort_data.size; -- Period 0 is always 100%
        
        -- Get users in this cohort
        SELECT ARRAY_AGG(id) INTO cohort_users
        FROM user_profiles
        WHERE 
            CASE 
                WHEN period_type = 'week' THEN DATE_TRUNC('week', created_at)::text = cohort_data.period
                ELSE DATE_TRUNC('month', created_at)::text = cohort_data.period
            END;
        
        -- Calculate Period 1
        IF period_type = 'week' THEN
            activity_start := (cohort_data.period::timestamp) + INTERVAL '8 hours';
            activity_end := (cohort_data.period::timestamp) + INTERVAL '16 hours';
        ELSE
            activity_start := (cohort_data.period::timestamp) + INTERVAL '1 day';
            activity_end := (cohort_data.period::timestamp) + INTERVAL '3 days';
        END IF;
        
        SELECT COUNT(DISTINCT user_id) INTO period_1
        FROM analytics_events
        WHERE 
            user_id = ANY(cohort_users)
            AND event_timestamp >= activity_start
            AND event_timestamp < activity_end;
        
        -- Calculate Period 2
        IF period_type = 'week' THEN
            activity_start := (cohort_data.period::timestamp) + INTERVAL '16 hours';
            activity_end := (cohort_data.period::timestamp) + INTERVAL '24 hours';
        ELSE
            activity_start := (cohort_data.period::timestamp) + INTERVAL '3 days';
            activity_end := (cohort_data.period::timestamp) + INTERVAL '5 days';
        END IF;
        
        SELECT COUNT(DISTINCT user_id) INTO period_2
        FROM analytics_events
        WHERE 
            user_id = ANY(cohort_users)
            AND event_timestamp >= activity_start
            AND event_timestamp < activity_end;
        
        -- Calculate Period 3
        IF period_type = 'week' THEN
            activity_start := (cohort_data.period::timestamp) + INTERVAL '1 day';
            activity_end := (cohort_data.period::timestamp) + INTERVAL '2 days';
        ELSE
            activity_start := (cohort_data.period::timestamp) + INTERVAL '5 days';
            activity_end := (cohort_data.period::timestamp) + INTERVAL '7 days';
        END IF;
        
        SELECT COUNT(DISTINCT user_id) INTO period_3
        FROM analytics_events
        WHERE 
            user_id = ANY(cohort_users)
            AND event_timestamp >= activity_start
            AND event_timestamp < activity_end;
        
        -- Calculate Period 4
        IF period_type = 'week' THEN
            activity_start := (cohort_data.period::timestamp) + INTERVAL '2 days';
            activity_end := (cohort_data.period::timestamp) + INTERVAL '3 days';
        ELSE
            activity_start := (cohort_data.period::timestamp) + INTERVAL '7 days';
            activity_end := (cohort_data.period::timestamp) + INTERVAL '10 days';
        END IF;
        
        SELECT COUNT(DISTINCT user_id) INTO period_4
        FROM analytics_events
        WHERE 
            user_id = ANY(cohort_users)
            AND event_timestamp >= activity_start
            AND event_timestamp < activity_end;
        
        -- Return this row
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_cohort_analysis_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cohort_analysis_data(text) TO service_role;

-- Test the function
SELECT * FROM get_cohort_analysis_data('week') LIMIT 5;





