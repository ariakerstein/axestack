'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { recordsStorage, StoredRecord, storageUtils } from '@/lib/storage'

/**
 * Hook for accessing records with automatic cloud/local switching
 * - Authenticated users: fetches from Supabase
 * - Anonymous users: fetches from localStorage
 */
export function useRecords() {
  const { user } = useAuth()
  const [records, setRecords] = useState<StoredRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = user?.id

  // Fetch records on mount and when user changes
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await recordsStorage.getAll(userId)
      setRecords(data)
    } catch (err) {
      setError('Failed to load records')
      console.error('[useRecords] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // Save a new record
  const saveRecord = useCallback(async (record: Omit<StoredRecord, 'id'>) => {
    const newRecord: StoredRecord = {
      ...record,
      id: storageUtils.generateRecordId(),
    }

    const result = await recordsStorage.save(newRecord, userId)

    if (result.success) {
      // Refetch to get the updated list
      await fetchRecords()
    }

    return result
  }, [userId, fetchRecords])

  // Delete a record
  const deleteRecord = useCallback(async (id: string) => {
    const success = await recordsStorage.delete(id, userId)

    if (success) {
      setRecords(prev => prev.filter(r => r.id !== id))
    }

    return success
  }, [userId])

  // Check if user has any records
  const hasRecords = records.length > 0

  return {
    records,
    loading,
    error,
    hasRecords,
    saveRecord,
    deleteRecord,
    refetch: fetchRecords,
  }
}

/**
 * Lightweight hook just to check if user has records
 * Useful for conditional UI without loading all record data
 */
export function useHasRecords() {
  const { user } = useAuth()
  const [hasRecords, setHasRecords] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      setLoading(true)
      const result = await recordsStorage.hasRecords(user?.id)
      setHasRecords(result)
      setLoading(false)
    }

    check()
  }, [user?.id])

  return { hasRecords, loading }
}
