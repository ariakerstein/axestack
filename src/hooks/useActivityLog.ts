'use client'

import { useCallback, useEffect, useState } from 'react'
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

    // Don't log if we don't have identity
    if (!user?.id && !sessionId) return

    try {
      await fetch('/api/activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityType,
          userId: user?.id,
          sessionId,
          cancerType: cancerType || profile?.cancer_type,
          sourcePage: sourcePage || (typeof window !== 'undefined' ? window.location.pathname : undefined),
          durationMs,
          metadata,
        }),
      })
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
