'use client'

import { useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { supabase, getSessionId } from '@/lib/supabase'

// Track page views and custom events to Supabase analytics_events table
// Same table as Navis - viewable in /admin dashboard

export function useAnalytics() {
  const pathname = usePathname()
  const lastTrackedPath = useRef<string | null>(null)

  const trackEvent = useCallback(async (eventType: string, metadata?: Record<string, unknown>) => {
    try {
      const sessionId = getSessionId()

      await supabase.from('analytics_events').insert({
        user_id: null, // Prompt Deck is anonymous for now
        event_type: eventType,
        page_path: pathname,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        session_id: sessionId,
        metadata: {
          ...metadata,
          app: 'promptdeck', // Tag all events as promptdeck
          timestamp: new Date().toISOString(),
          url: typeof window !== 'undefined' ? window.location.href : null,
        },
        event_timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Analytics tracking error:', error)
    }
  }, [pathname])

  // Track page views on route change
  useEffect(() => {
    // Only track if path changed (avoid double-tracking on re-renders)
    if (pathname && pathname !== lastTrackedPath.current) {
      lastTrackedPath.current = pathname
      trackEvent('page_view')
    }
  }, [pathname, trackEvent])

  return { trackEvent }
}
