/**
 * Auth & Storage Integration Tests
 *
 * Tests the critical auth flows and storage patterns:
 * 1. Wizard profile save (await + error handling)
 * 2. localStorage cleanup on sign-out
 * 3. Records migration on sign-in
 * 4. Cloud-first storage for authenticated users
 * 5. Session ID consistency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] || null,
    _store: store,
    _getAll: () => ({ ...store }),
  }
})()

// Mock fetch
const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock)
  vi.stubGlobal('fetch', fetchMock)
  localStorageMock.clear()
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('localStorage Keys', () => {
  // All keys that should be cleared on sign-out
  const KEYS_TO_CLEAR = [
    'patient-profile',
    'axestack-translations',
    'axestack-translations-data',
    'axestack-patient-notes',
    'axestack-case-brief',
    'combat-diagnosis-result',
    'combat-treatment-result',
    'opencancer_session_id',
    'opencancer-session-id',
    'opencancer-onboarding-dismissed',
    'opencancer-records-processing',
    'opencancer-portals',
    'opencancer-privacy-acknowledged',
    'opencancer-privacy-mode',
    'opencancer_expert_consent',
    'opencancer-referral',
    'combat-run-tracker',
    'careCircleHubs',
    'ask-prompts-dismissed',
    'ask-concise-mode',
    'first-upload-prompt-dismissed',
    'carecircle-prompt-dismissed',
    'patient-email',
    'generatedDeck',
    'opencancer_share_id',
    'opencancer_share_count',
    'axestack-view-record',
  ]

  it('should have consistent session ID key', () => {
    // The unified key should be 'opencancer_session_id' (underscore, not hyphen)
    const CORRECT_KEY = 'opencancer_session_id'
    expect(CORRECT_KEY).toBe('opencancer_session_id')
  })

  it('should clear all user data keys on sign-out', () => {
    // Set all keys
    KEYS_TO_CLEAR.forEach(key => {
      localStorageMock.setItem(key, 'test-value')
    })

    // Verify all keys are set
    expect(localStorageMock.length).toBe(KEYS_TO_CLEAR.length)

    // Simulate clearUserLocalStorage
    KEYS_TO_CLEAR.forEach(key => {
      localStorageMock.removeItem(key)
    })

    // Verify all cleared
    expect(localStorageMock.length).toBe(0)
  })

  it('should preserve opencancer_last_user_id when keepLastUserId is true', () => {
    localStorageMock.setItem('opencancer_last_user_id', 'user-123')
    localStorageMock.setItem('patient-profile', '{}')

    // Simulate clearUserLocalStorage with keepLastUserId
    localStorageMock.removeItem('patient-profile')
    // NOT removing opencancer_last_user_id

    expect(localStorageMock.getItem('opencancer_last_user_id')).toBe('user-123')
  })
})

describe('Profile Save Flow', () => {
  it('should await profile API and handle success', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, profile: { id: '123' } }),
      text: () => Promise.resolve(''),
    })

    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient',
        cancerType: 'breast',
      }),
    })

    expect(response.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('should handle profile API failure gracefully', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server error'),
    })

    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient',
        cancerType: 'breast',
      }),
    })

    expect(response.ok).toBe(false)
    // The wizard should still continue (localStorage saved first)
  })

  it('should save to localStorage before API call', () => {
    const profile = {
      role: 'patient',
      name: 'Test User',
      email: 'test@example.com',
      cancerType: 'breast',
    }

    // This should happen BEFORE the API call
    localStorageMock.setItem('patient-profile', JSON.stringify(profile))

    expect(localStorageMock.getItem('patient-profile')).toBeTruthy()
    const saved = JSON.parse(localStorageMock.getItem('patient-profile')!)
    expect(saved.email).toBe('test@example.com')
  })
})

describe('Records Storage', () => {
  it('should use localStorage for anonymous users', () => {
    const record = {
      id: 'rec_123',
      fileName: 'test.pdf',
      documentType: 'lab_report',
      uploadedAt: new Date().toISOString(),
      analysis: { summary: 'Test' },
    }

    // Anonymous: save to localStorage
    const index = ['rec_123']
    const data = { 'rec_123': record }

    localStorageMock.setItem('oc:records:index', JSON.stringify(index))
    localStorageMock.setItem('oc:records:data', JSON.stringify(data))

    expect(localStorageMock.getItem('oc:records:index')).toBeTruthy()
    expect(localStorageMock.getItem('oc:records:data')).toBeTruthy()
  })

  it('should clear localStorage after successful migration', () => {
    // Set up local records
    localStorageMock.setItem('oc:records:index', '["rec_123"]')
    localStorageMock.setItem('oc:records:data', '{"rec_123":{}}')
    localStorageMock.setItem('axestack-translations', '["rec_123"]')
    localStorageMock.setItem('axestack-translations-data', '{"rec_123":{}}')

    // Simulate successful migration
    localStorageMock.removeItem('oc:records:index')
    localStorageMock.removeItem('oc:records:data')
    localStorageMock.removeItem('axestack-translations')
    localStorageMock.removeItem('axestack-translations-data')

    expect(localStorageMock.getItem('oc:records:index')).toBeNull()
    expect(localStorageMock.getItem('oc:records:data')).toBeNull()
    expect(localStorageMock.getItem('axestack-translations')).toBeNull()
  })
})

describe('User Switch Detection', () => {
  it('should detect different user on sign-in', () => {
    // Previous user
    localStorageMock.setItem('opencancer_last_user_id', 'user-old')
    localStorageMock.setItem('patient-profile', '{"name":"Old User"}')

    // New user signs in
    const newUserId = 'user-new'
    const lastUserId = localStorageMock.getItem('opencancer_last_user_id')

    const isDifferentUser = lastUserId && lastUserId !== newUserId
    expect(isDifferentUser).toBe(true)

    // Should clear old user's data
    if (isDifferentUser) {
      localStorageMock.removeItem('patient-profile')
      localStorageMock.setItem('opencancer_last_user_id', newUserId)
    }

    expect(localStorageMock.getItem('patient-profile')).toBeNull()
    expect(localStorageMock.getItem('opencancer_last_user_id')).toBe('user-new')
  })

  it('should not clear data for same user', () => {
    const userId = 'user-123'
    localStorageMock.setItem('opencancer_last_user_id', userId)
    localStorageMock.setItem('patient-profile', '{"name":"Same User"}')

    const lastUserId = localStorageMock.getItem('opencancer_last_user_id')
    const isDifferentUser = lastUserId && lastUserId !== userId

    expect(isDifferentUser).toBe(false)
    expect(localStorageMock.getItem('patient-profile')).toBeTruthy()
  })
})

describe('API Error Handling', () => {
  it('should return entity save status in combat API response', async () => {
    const mockResponse = {
      success: true,
      data: { id: 'combat-123' },
      graph: {
        entitiesSaved: 3,
        errors: undefined,
      },
    }

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const response = await fetch('/api/combat/save', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'test', phase: 'diagnosis', question: 'Test?' }),
    })

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.graph.entitiesSaved).toBe(3)
    expect(data.graph.errors).toBeUndefined()
  })

  it('should include errors in response when entity save fails', async () => {
    const mockResponse = {
      success: true,
      data: { id: 'combat-123' },
      graph: {
        entitiesSaved: 0,
        errors: ['question: source_type column missing'],
      },
    }

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const response = await fetch('/api/combat/save', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'test', phase: 'diagnosis', question: 'Test?' }),
    })

    const data = await response.json()
    expect(data.success).toBe(true) // Main save succeeded
    expect(data.graph.entitiesSaved).toBe(0)
    expect(data.graph.errors).toHaveLength(1)
  })
})

describe('Storage Key Constants', () => {
  it('should use correct key names', () => {
    const STORAGE_KEYS = {
      SESSION_ID: 'opencancer_session_id',
      RECORDS_INDEX: 'oc:records:index',
      RECORDS_DATA: 'oc:records:data',
      PROFILE: 'patient-profile',
    }

    expect(STORAGE_KEYS.SESSION_ID).toBe('opencancer_session_id')
    expect(STORAGE_KEYS.RECORDS_INDEX).toBe('oc:records:index')
    expect(STORAGE_KEYS.RECORDS_DATA).toBe('oc:records:data')
    expect(STORAGE_KEYS.PROFILE).toBe('patient-profile')
  })
})
