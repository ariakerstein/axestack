import { describe, it, expect } from 'vitest'

// Test the upload progress bar visibility logic
// This tests the condition: (isProcessing || uploadedFiles.some(f => f.status === 'processing'))

interface UploadedFile {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'error'
}

// The progress bar visibility logic extracted from records/page.tsx
function shouldShowProgressBar(
  isProcessing: boolean,
  uploadedFiles: UploadedFile[]
): boolean {
  return isProcessing || uploadedFiles.some(f => f.status === 'processing')
}

// The progress display count logic
function getProgressCount(
  bulkProgressCurrent: number,
  uploadedFiles: UploadedFile[]
): number {
  const completedOrError = uploadedFiles.filter(
    f => f.status === 'completed' || f.status === 'error'
  ).length
  return Math.max(bulkProgressCurrent, completedOrError + 1)
}

function getProgressTotal(
  bulkProgressTotal: number,
  uploadedFilesLength: number
): number {
  return bulkProgressTotal || uploadedFilesLength
}

describe('Upload Progress Bar Visibility', () => {
  describe('shouldShowProgressBar', () => {
    it('should show when isProcessing is true', () => {
      expect(shouldShowProgressBar(true, [])).toBe(true)
    })

    it('should show when any file has processing status', () => {
      const files: UploadedFile[] = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'processing' },
        { id: '3', status: 'pending' }
      ]
      expect(shouldShowProgressBar(false, files)).toBe(true)
    })

    it('should NOT show when isProcessing is false and no files are processing', () => {
      const files: UploadedFile[] = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'pending' },
        { id: '3', status: 'error' }
      ]
      expect(shouldShowProgressBar(false, files)).toBe(false)
    })

    it('should NOT show when there are no files', () => {
      expect(shouldShowProgressBar(false, [])).toBe(false)
    })

    it('should show when both isProcessing and file processing (redundant but correct)', () => {
      const files: UploadedFile[] = [
        { id: '1', status: 'processing' }
      ]
      expect(shouldShowProgressBar(true, files)).toBe(true)
    })
  })

  describe('Regression: Progress bar disappearing bug', () => {
    /**
     * This tests the bug where the progress bar would disappear during processing.
     *
     * The bug occurred because:
     * 1. User uploads 20 files
     * 2. Processing starts, isProcessing = true
     * 3. React state update race condition: isProcessing becomes false briefly
     * 4. Progress bar disappears even though files are still processing
     *
     * The fix: Also check if any file has 'processing' status, which is more reliable
     * than the isProcessing state alone.
     */
    it('should remain visible even if isProcessing becomes false while files processing', () => {
      // Simulate the race condition: isProcessing is false but file is still processing
      const files: UploadedFile[] = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'processing' }, // Still processing!
        { id: '3', status: 'pending' }
      ]

      // Old buggy behavior would return false here
      // New fixed behavior returns true
      expect(shouldShowProgressBar(false, files)).toBe(true)
    })

    it('should hide after all files are done (completed or error)', () => {
      const files: UploadedFile[] = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'error' }
      ]

      expect(shouldShowProgressBar(false, files)).toBe(false)
    })
  })

  describe('getProgressCount', () => {
    it('should use bulkProgressCurrent when it is higher', () => {
      const files: UploadedFile[] = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'processing' }
      ]
      // bulkProgressCurrent = 5, completedOrError = 1, so completed+1 = 2
      // Max(5, 2) = 5
      expect(getProgressCount(5, files)).toBe(5)
    })

    it('should use completedOrError+1 when it is higher', () => {
      const files: UploadedFile[] = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'error' },
        { id: '4', status: 'processing' }
      ]
      // bulkProgressCurrent = 1, completedOrError = 3, so completed+1 = 4
      // Max(1, 4) = 4
      expect(getProgressCount(1, files)).toBe(4)
    })

    it('should return 1 when nothing is complete and bulkProgressCurrent is 0', () => {
      const files: UploadedFile[] = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'processing' }
      ]
      // Max(0, 0+1) = 1
      expect(getProgressCount(0, files)).toBe(1)
    })
  })

  describe('getProgressTotal', () => {
    it('should use bulkProgressTotal when set', () => {
      expect(getProgressTotal(20, 5)).toBe(20)
    })

    it('should fall back to uploadedFiles.length when bulkProgressTotal is 0', () => {
      expect(getProgressTotal(0, 15)).toBe(15)
    })
  })

  describe('Full progress display scenarios', () => {
    it('should display "1 of 20" at start of bulk upload', () => {
      const files: UploadedFile[] = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        status: i === 0 ? 'processing' : 'pending' as const
      }))

      expect(shouldShowProgressBar(true, files)).toBe(true)
      expect(getProgressCount(1, files)).toBe(1)
      expect(getProgressTotal(20, files.length)).toBe(20)
    })

    it('should display "10 of 20" midway through', () => {
      const files: UploadedFile[] = [
        ...Array.from({ length: 9 }, (_, i) => ({
          id: String(i),
          status: 'completed' as const
        })),
        { id: '9', status: 'processing' },
        ...Array.from({ length: 10 }, (_, i) => ({
          id: String(i + 10),
          status: 'pending' as const
        }))
      ]

      expect(shouldShowProgressBar(true, files)).toBe(true)
      expect(getProgressCount(10, files)).toBe(10)
    })

    it('should hide after all 20 complete', () => {
      const files: UploadedFile[] = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        status: 'completed' as const
      }))

      expect(shouldShowProgressBar(false, files)).toBe(false)
    })
  })
})
