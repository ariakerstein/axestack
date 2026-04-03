import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Supabase
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser
    },
    from: () => ({
      insert: mockInsert,
      select: mockSelect
    })
  })
}))

// Create a simple mock implementation of the route handler logic
// (Testing the logic patterns, not the actual Next.js route)
describe('Records Save API Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    mockSelect.mockReturnValue({ single: mockSingle })
    mockSingle.mockResolvedValue({ data: { id: 'record-123' }, error: null })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockEq.mockReturnValue({ order: mockOrder })
    mockOrder.mockResolvedValue({ data: [], error: null })
  })

  describe('Authentication', () => {
    it('should require Bearer token in Authorization header', async () => {
      // No auth header should fail
      const result = await verifyAuth(null)
      expect(result).toBeNull()
    })

    it('should reject invalid token format', async () => {
      const result = await verifyAuth('Basic abc123')
      expect(result).toBeNull()
    })

    it('should extract token from Bearer header', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const result = await verifyAuth('Bearer valid-token')
      expect(result).toBe('user-123')
      expect(mockGetUser).toHaveBeenCalledWith('valid-token')
    })

    it('should return null for invalid token', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      const result = await verifyAuth('Bearer invalid-token')
      expect(result).toBeNull()
    })
  })

  describe('Record Saving', () => {
    it('should save record with correct structure', async () => {
      const recordData = {
        fileName: 'test-report.pdf',
        documentType: 'lab_result',
        result: { summary: 'Normal results', findings: [] },
        documentText: 'Patient: John Doe...',
        chatMessages: [{ role: 'user', content: 'What does this mean?' }]
      }

      mockInsert.mockReturnValueOnce({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'new-record-id' }, error: null })
        })
      })

      const savedRecord = await saveRecord('user-123', recordData)

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-123',
        original_name: 'test-report.pdf',
        record_type: 'lab_result',
        source: 'opencancer'
      }))

      expect(savedRecord).toEqual({ id: 'new-record-id' })
    })

    it('should include AI analysis with chat history', async () => {
      const recordData = {
        fileName: 'scan.pdf',
        documentType: 'imaging',
        result: { diagnosis: 'Clear' },
        chatMessages: [
          { role: 'user', content: 'Is this normal?' },
          { role: 'assistant', content: 'Yes, this is normal.' }
        ]
      }

      mockInsert.mockImplementationOnce((data) => {
        // Verify AI analysis includes chat history
        expect(data.ai_analysis).toHaveProperty('chat_history')
        expect(data.ai_analysis.chat_history).toEqual(recordData.chatMessages)
        expect(data.ai_analysis).toHaveProperty('analyzed_at')
        expect(data.ai_analysis).toHaveProperty('analyzed_by', 'opencancer.ai')

        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'new-id' }, error: null })
          })
        }
      })

      await saveRecord('user-123', recordData)
    })

    it('should handle missing optional fields', async () => {
      const minimalRecordData = {
        fileName: 'minimal.pdf',
        documentType: 'other',
        result: {}
      }

      mockInsert.mockImplementationOnce((data) => {
        expect(data.extracted_text).toBeNull()
        expect(data.ai_analysis.chat_history).toEqual([])

        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'min-id' }, error: null })
          })
        }
      })

      await saveRecord('user-123', minimalRecordData)
    })

    it('should truncate very long document text', async () => {
      const longText = 'A'.repeat(150000) // 150k chars

      mockInsert.mockImplementationOnce((data) => {
        // Should be truncated to 100k
        expect(data.extracted_text.length).toBeLessThanOrEqual(100000)

        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'id' }, error: null })
          })
        }
      })

      await saveRecord('user-123', {
        fileName: 'long.pdf',
        documentType: 'lab',
        result: {},
        documentText: longText
      })
    })
  })

  describe('Error Handling', () => {
    it('should return error details on database failure', async () => {
      mockInsert.mockReturnValueOnce({
        select: () => ({
          single: () => Promise.resolve({
            data: null,
            error: { message: 'RLS violation', code: '42501' }
          })
        })
      })

      const result = await saveRecord('user-123', {
        fileName: 'test.pdf',
        documentType: 'lab',
        result: {}
      })

      expect(result.error).toBe('Failed to save record')
      expect(result.details).toBe('RLS violation')
    })
  })
})

// Helper functions that mirror the API route logic
async function verifyAuth(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const { data: { user }, error } = await mockGetUser(token)

  if (error || !user) {
    return null
  }

  return user.id
}

interface RecordData {
  fileName: string
  documentType: string
  result: Record<string, unknown>
  documentText?: string
  chatMessages?: Array<{ role: string; content: string }>
}

async function saveRecord(userId: string, data: RecordData) {
  const insertData = {
    user_id: userId,
    original_name: data.fileName,
    file_path: `opencancer/${userId}/${Date.now()}_${data.fileName}`,
    file_type: data.fileName.split('.').pop() || 'unknown',
    file_size: 0,
    content_type: 'application/json',
    record_type: data.documentType || 'document',
    source: 'opencancer',
    extracted_text: data.documentText?.substring(0, 100000) || null,
    ai_analysis: {
      ...data.result,
      chat_history: data.chatMessages || [],
      analyzed_at: new Date().toISOString(),
      analyzed_by: 'opencancer.ai'
    }
  }

  const { data: savedData, error } = await mockInsert(insertData)
    .select()
    .single()

  if (error) {
    return { error: 'Failed to save record', details: error.message, code: error.code }
  }

  return savedData
}
