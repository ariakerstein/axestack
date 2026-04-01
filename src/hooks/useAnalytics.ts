'use client'

import { useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { supabase, getSessionId } from '@/lib/supabase'

// Track page views and custom events to Supabase analytics_events table
// Viewable in /admin dashboard

// Parse device type from user agent
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent.toLowerCase()
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) return 'mobile'
  if (/ipad|android(?!.*mobile)|tablet/i.test(ua)) return 'tablet'
  return 'desktop'
}

// Get UTM parameters from URL
function getUtmParams(): Record<string, string | null> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    ref: params.get('ref'), // Our referral tracking
  }
}

// Parse traffic source from referrer and UTM
function getTrafficSource(referrer: string | null, utmSource: string | null): string {
  if (utmSource) return utmSource
  if (!referrer) return 'direct'
  try {
    const url = new URL(referrer)
    const host = url.hostname.toLowerCase()
    if (host.includes('google')) return 'google'
    if (host.includes('facebook') || host.includes('fb.')) return 'facebook'
    if (host.includes('twitter') || host.includes('t.co')) return 'twitter'
    if (host.includes('linkedin')) return 'linkedin'
    if (host.includes('instagram')) return 'instagram'
    if (host.includes('tiktok')) return 'tiktok'
    if (host.includes('reddit')) return 'reddit'
    if (host.includes('circle')) return 'circle'
    return host // Return the domain as source
  } catch {
    return 'unknown'
  }
}

export function useAnalytics() {
  const pathname = usePathname()
  const lastTrackedPath = useRef<string | null>(null)

  const trackEvent = useCallback(async (eventType: string, metadata?: Record<string, unknown>) => {
    try {
      const sessionId = getSessionId()
      const referrer = typeof document !== 'undefined' ? document.referrer || null : null
      const utmParams = getUtmParams()
      const deviceType = getDeviceType()
      const trafficSource = getTrafficSource(referrer, utmParams.utm_source)

      await supabase.from('analytics_events').insert({
        user_id: null, // Anonymous for now
        event_type: eventType,
        page_path: pathname,
        referrer,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        session_id: sessionId,
        metadata: {
          ...metadata,
          app: 'opencancer',
          timestamp: new Date().toISOString(),
          url: typeof window !== 'undefined' ? window.location.href : null,
          // Traffic source & device tracking
          device_type: deviceType,
          traffic_source: trafficSource,
          ...utmParams,
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
