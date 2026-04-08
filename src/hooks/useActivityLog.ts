'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth'

// Get or create session ID for anonymous users
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sessionId = localStorage.getItem('opencancer-session-id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('opencancer-session-id', sessionId)
  }
  return sessionId
}

// Get the last action node ID for behavioral chains
function getLastActionNodeId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('opencancer-last-action-id')
}

// Store the last action node ID
function setLastActionNodeId(actionId: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('opencancer-last-action-id', actionId)
}

export type ActivityType =
  // Clinical
  | 'record_upload'
  | 'combat_run'
  | 'combat_view'
  | 'entity_extracted'
  // Discovery
  | 'trial_search'
  | 'trial_view'
  | 'trial_save'
  | 'trial_contact'
  | 'oncologist_search'
  | 'oncologist_view'
  | 'research_query'
  | 'ask_question'
  // Financial
  | 'coverage_search'
  | 'coverage_view'
  | 'coverage_apply'
  // Relationship
  | 'caregiver_invite'
  | 'caregiver_accept'
  | 'share_record'
  | 'hub_update'
  // Outcomes
  | 'combat_outcome'

interface LogActivityParams {
  activityType: ActivityType
  metadata?: Record<string, unknown>
  cancerType?: string
  sourcePage?: string
  durationMs?: number
}

export function useActivityLog() {
  const { user, profile } = useAuth()
  const [sessionId, setSessionId] = useState<string>('')

  useEffect(() => {
    setSessionId(getSessionId())
  }, [])

  const logActivity = useCallback(async (params: LogActivityParams) => {
    const { activityType, metadata = {}, cancerType, sourcePage, durationMs } = params

    // Get sessionId directly to avoid race condition with useEffect initialization
    // This ensures we always have a sessionId even on first call
    const currentSessionId = sessionId || getSessionId()

    // Don't log if we don't have identity
    if (!user?.id && !currentSessionId) return

    try {
      // Get previous action for behavioral chain
      const previousActionId = getLastActionNodeId()

      const response = await fetch('/api/activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityType,
          userId: user?.id,
          sessionId: currentSessionId,
          cancerType: cancerType || profile?.cancer_type,
          sourcePage: sourcePage || (typeof window !== 'undefined' ? window.location.pathname : undefined),
          durationMs,
          metadata,
          previousActionId, // For behavioral chains
        }),
      })

      // Store this action's node ID for the next action in the chain
      const data = await response.json()
      if (data.actionNodeId) {
        setLastActionNodeId(data.actionNodeId)
      }
    } catch (err) {
      // Non-blocking - don't let logging failures affect UX
      console.error('Activity log failed:', err)
    }
  }, [user?.id, sessionId, profile?.cancer_type])

  // Convenience methods for common activities
  const logCombatRun = useCallback((metadata: {
    phase: 'diagnosis' | 'treatment'
    recordsCount: number
    evidenceStrength?: number
  }) => {
    logActivity({ activityType: 'combat_run', metadata })
  }, [logActivity])

  const logTrialView = useCallback((metadata: {
    trialId: string
    trialTitle?: string
    distance?: number
  }) => {
    logActivity({ activityType: 'trial_view', metadata })
  }, [logActivity])

  const logTrialSave = useCallback((metadata: {
    trialId: string
    trialTitle?: string
  }) => {
    logActivity({ activityType: 'trial_save', metadata })
  }, [logActivity])

  const logTrialSearch = useCallback((metadata: {
    query?: string
    filters?: Record<string, unknown>
    resultsCount?: number
  }) => {
    logActivity({ activityType: 'trial_search', metadata })
  }, [logActivity])

  const logOncologistSearch = useCallback((metadata: {
    specialty?: string
    location?: string
    resultsCount?: number
  }) => {
    logActivity({ activityType: 'oncologist_search', metadata })
  }, [logActivity])

  const logRecordUpload = useCallback((metadata: {
    fileType?: string
    fileSize?: number
    extractedEntities?: number
  }) => {
    logActivity({ activityType: 'record_upload', metadata })
  }, [logActivity])

  const logQuestion = useCallback((metadata: {
    question: string
    hasPatientContext?: boolean
  }) => {
    logActivity({ activityType: 'ask_question', metadata })
  }, [logActivity])

  return {
    logActivity,
    logCombatRun,
    logTrialView,
    logTrialSave,
    logTrialSearch,
    logOncologistSearch,
    logRecordUpload,
    logQuestion,
    sessionId,
    userId: user?.id,
  }
}
