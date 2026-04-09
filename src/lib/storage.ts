/**
 * Centralized Storage Abstraction
 *
 * Design principles:
 * - Authenticated users: cloud-first (Supabase), localStorage as cache only
 * - Anonymous users: localStorage with session_id, migrated to cloud on sign-in
 * - Single source of truth: avoid dual storage that causes sync bugs
 */

import { supabase, getSessionId } from './supabase'

// ============================================================================
// Types
// ============================================================================

export interface StoredRecord {
  id: string
  fileName: string
  documentType: string
  uploadedAt: string
  analysis: {
    plain_english_summary?: string
    document_type?: string
    key_findings?: string[]
    extracted_entities?: Record<string, unknown>
    chat_history?: Array<{ role: string; content: string }>
    [key: string]: unknown
  }
  extractedText?: string
  source?: string
}

export interface StoredProfile {
  name: string
  role: 'patient' | 'caregiver'
  cancerType: string
  stage?: string
  location?: string
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
  // Session (always localStorage)
  SESSION_ID: 'opencancer_session_id',

  // Records (localStorage for anon, cloud for auth)
  RECORDS_INDEX: 'oc:records:index',
  RECORDS_DATA: 'oc:records:data',

  // Profile (localStorage for anon, cloud for auth)
  PROFILE: 'patient-profile',

  // UI preferences (always localStorage)
  THEME: 'navis-theme',
  CONCISE_MODE: 'ask-concise-mode',
  DISMISSED_PROMPTS: 'oc:dismissed',
} as const

// ============================================================================
// Records Storage
// ============================================================================

export const recordsStorage = {
  /**
   * Get all records for current user/session
   * - Authenticated: fetch from Supabase
   * - Anonymous: fetch from localStorage
   */
  async getAll(userId?: string): Promise<StoredRecord[]> {
    if (userId) {
      return this.getFromCloud(userId)
    }
    return this.getFromLocal()
  },

  /**
   * Get a single record by ID
   */
  async getById(id: string, userId?: string): Promise<StoredRecord | null> {
    const records = await this.getAll(userId)
    return records.find(r => r.id === id) || null
  },

  /**
   * Save a record
   * - Authenticated: save to Supabase immediately
   * - Anonymous: save to localStorage, will be migrated on sign-in
   */
  async save(record: StoredRecord, userId?: string): Promise<{ success: boolean; id: string }> {
    if (userId) {
      return this.saveToCloud(record, userId)
    }
    return this.saveToLocal(record)
  },

  /**
   * Delete a record
   */
  async delete(id: string, userId?: string): Promise<boolean> {
    if (userId) {
      return this.deleteFromCloud(id, userId)
    }
    return this.deleteFromLocal(id)
  },

  /**
   * Check if user has any records
   */
  async hasRecords(userId?: string): Promise<boolean> {
    if (userId) {
      const { count } = await supabase
        .from('medical_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      return (count || 0) > 0
    }
    const records = this.getFromLocal()
    return records.length > 0
  },

  // === Cloud Operations ===

  async getFromCloud(userId: string): Promise<StoredRecord[]> {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('id, original_name, record_type, created_at, ai_analysis, extracted_text, source')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map(row => ({
        id: row.id,
        fileName: row.original_name,
        documentType: row.record_type || 'document',
        uploadedAt: row.created_at,
        analysis: row.ai_analysis || {},
        extractedText: row.extracted_text,
        source: row.source,
      }))
    } catch (err) {
      console.error('[Storage] Failed to fetch records from cloud:', err)
      return []
    }
  },

  async saveToCloud(record: StoredRecord, userId: string): Promise<{ success: boolean; id: string }> {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .insert({
          user_id: userId,
          original_name: record.fileName,
          file_path: `opencancer/${userId}/${Date.now()}_${record.fileName}`,
          file_type: record.fileName.split('.').pop() || 'unknown',
          file_size: 0,
          content_type: 'application/json',
          record_type: record.documentType,
          source: record.source || 'opencancer',
          extracted_text: record.extractedText?.substring(0, 100000) || null,
          ai_analysis: {
            ...record.analysis,
            analyzed_at: new Date().toISOString(),
            analyzed_by: 'opencancer.ai',
          },
        })
        .select('id')
        .single()

      if (error) throw error

      return { success: true, id: data.id }
    } catch (err) {
      console.error('[Storage] Failed to save record to cloud:', err)
      return { success: false, id: record.id }
    }
  },

  async deleteFromCloud(id: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      return !error
    } catch {
      return false
    }
  },

  // === Local Operations ===

  getFromLocal(): StoredRecord[] {
    if (typeof window === 'undefined') return []

    try {
      const index = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS_INDEX) || '[]')
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS_DATA) || '{}')

      return index.map((id: string) => {
        const record = data[id]
        if (!record) return null
        return {
          id,
          fileName: record.fileName || record.original_name || 'Unknown',
          documentType: record.documentType || record.document_type || 'document',
          uploadedAt: record.uploadedAt || record.analyzed_at || new Date().toISOString(),
          analysis: record.analysis || record,
          extractedText: record.extractedText,
          source: record.source || 'opencancer',
        }
      }).filter(Boolean) as StoredRecord[]
    } catch {
      return []
    }
  },

  saveToLocal(record: StoredRecord): { success: boolean; id: string } {
    if (typeof window === 'undefined') return { success: false, id: record.id }

    try {
      const index = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS_INDEX) || '[]')
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS_DATA) || '{}')

      if (!index.includes(record.id)) {
        index.unshift(record.id)
      }
      data[record.id] = record

      localStorage.setItem(STORAGE_KEYS.RECORDS_INDEX, JSON.stringify(index))
      localStorage.setItem(STORAGE_KEYS.RECORDS_DATA, JSON.stringify(data))

      return { success: true, id: record.id }
    } catch {
      return { success: false, id: record.id }
    }
  },

  deleteFromLocal(id: string): boolean {
    if (typeof window === 'undefined') return false

    try {
      const index = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS_INDEX) || '[]')
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS_DATA) || '{}')

      const newIndex = index.filter((i: string) => i !== id)
      delete data[id]

      localStorage.setItem(STORAGE_KEYS.RECORDS_INDEX, JSON.stringify(newIndex))
      localStorage.setItem(STORAGE_KEYS.RECORDS_DATA, JSON.stringify(data))

      return true
    } catch {
      return false
    }
  },

  /**
   * Clear all local records (called after migration or sign-out)
   */
  clearLocal(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEYS.RECORDS_INDEX)
    localStorage.removeItem(STORAGE_KEYS.RECORDS_DATA)
    // Also clear legacy keys
    localStorage.removeItem('axestack-translations')
    localStorage.removeItem('axestack-translations-data')
  },
}

// ============================================================================
// Migration
// ============================================================================

export const migration = {
  /**
   * Migrate all localStorage records to cloud for newly authenticated user
   * Called on sign-in when user has localStorage records
   */
  async migrateRecordsToCloud(userId: string): Promise<{ migrated: number; failed: number }> {
    const localRecords = recordsStorage.getFromLocal()

    if (localRecords.length === 0) {
      return { migrated: 0, failed: 0 }
    }

    console.log(`[Migration] Migrating ${localRecords.length} records to cloud for user ${userId}`)

    let migrated = 0
    let failed = 0

    for (const record of localRecords) {
      const result = await recordsStorage.saveToCloud(record, userId)
      if (result.success) {
        migrated++
      } else {
        failed++
      }
    }

    // Clear localStorage only if all records migrated successfully
    if (failed === 0) {
      recordsStorage.clearLocal()
      console.log('[Migration] All records migrated, localStorage cleared')
    } else {
      console.warn(`[Migration] ${failed} records failed to migrate, keeping localStorage`)
    }

    return { migrated, failed }
  },

  /**
   * Migrate legacy localStorage keys to new format
   */
  migrateLegacyKeys(): void {
    if (typeof window === 'undefined') return

    // Migrate axestack-translations to oc:records:index
    const legacyIndex = localStorage.getItem('axestack-translations')
    if (legacyIndex && !localStorage.getItem(STORAGE_KEYS.RECORDS_INDEX)) {
      localStorage.setItem(STORAGE_KEYS.RECORDS_INDEX, legacyIndex)
    }

    // Migrate axestack-translations-data to oc:records:data
    const legacyData = localStorage.getItem('axestack-translations-data')
    if (legacyData && !localStorage.getItem(STORAGE_KEYS.RECORDS_DATA)) {
      localStorage.setItem(STORAGE_KEYS.RECORDS_DATA, legacyData)
    }
  },
}

// ============================================================================
// Profile Storage (simplified - uses existing auth.tsx logic)
// ============================================================================

export const profileStorage = {
  getLocal(): StoredProfile | null {
    if (typeof window === 'undefined') return null
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  },

  saveLocal(profile: StoredProfile): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile))
  },

  clearLocal(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEYS.PROFILE)
  },
}

// ============================================================================
// Utilities
// ============================================================================

export const storageUtils = {
  /**
   * Generate a unique record ID
   */
  generateRecordId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  },

  /**
   * Check if running in browser
   */
  isBrowser(): boolean {
    return typeof window !== 'undefined'
  },
}
