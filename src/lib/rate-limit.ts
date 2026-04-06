/**
 * Simple in-memory rate limiter for API routes
 * Uses a sliding window approach
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (will reset on server restart, which is fine for basic protection)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

interface RateLimitConfig {
  limit: number      // Max requests
  windowMs: number   // Time window in ms
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
}

/**
 * Check rate limit for a given key (usually IP or user ID)
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // No existing entry or window has passed
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    })
    return {
      success: true,
      remaining: config.limit - 1,
      resetTime: now + config.windowMs
    }
  }

  // Existing entry within window
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime
  }
}

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(request: Request): string {
  // Try various headers for IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Vercel-specific header
  const vercelIp = request.headers.get('x-vercel-forwarded-for')
  if (vercelIp) {
    return vercelIp.split(',')[0].trim()
  }

  // Fallback to a hash of user-agent + accept-language as fingerprint
  const ua = request.headers.get('user-agent') || 'unknown'
  const lang = request.headers.get('accept-language') || 'unknown'
  return `fp:${hashCode(ua + lang)}`
}

function hashCode(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(16)
}

// Pre-configured rate limiters for different route types
export const RATE_LIMITS = {
  // AI-heavy routes (expensive)
  ai: { limit: 10, windowMs: 60000 },       // 10 per minute
  // Standard API routes
  standard: { limit: 60, windowMs: 60000 }, // 60 per minute
  // Auth routes (prevent brute force)
  auth: { limit: 5, windowMs: 60000 },      // 5 per minute
  // File upload routes
  upload: { limit: 20, windowMs: 60000 },   // 20 per minute
}
