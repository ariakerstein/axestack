import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthModal } from '@/components/AuthModal'

// Mock Supabase
const mockSignInWithOtp = vi.fn()
const mockSignInWithPassword = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args)
    }
  }
}))

describe('AuthModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<AuthModal isOpen={false} onClose={vi.fn()} />)
      expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
    })

    it('should render sign in form when isOpen is true', () => {
      render(<AuthModal {...defaultProps} />)
      expect(screen.getByText('Sign in')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
    })

    it('should show both magic link and password options', () => {
      render(<AuthModal {...defaultProps} />)
      expect(screen.getByText('Send magic link')).toBeInTheDocument()
      expect(screen.getByText('Sign in with password')).toBeInTheDocument()
    })

    it('should disable buttons when email is empty', () => {
      render(<AuthModal {...defaultProps} />)
      const magicLinkButton = screen.getByText('Send magic link')
      const passwordButton = screen.getByText('Sign in with password')

      expect(magicLinkButton).toBeDisabled()
      expect(passwordButton).toBeDisabled()
    })
  })

  describe('Magic Link Flow', () => {
    it('should enable buttons when email is entered', async () => {
      const user = userEvent.setup()
      render(<AuthModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('your@email.com')
      await user.type(emailInput, 'test@example.com')

      expect(screen.getByText('Send magic link')).not.toBeDisabled()
    })

    it('should switch to magic link mode when magic link button is clicked', async () => {
      const user = userEvent.setup()
      render(<AuthModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('your@email.com')
      await user.type(emailInput, 'test@example.com')

      const magicLinkButton = screen.getByText('Send magic link')
      await user.click(magicLinkButton)

      expect(screen.getByText('Send magic link', { selector: 'h2' })).toBeInTheDocument()
      expect(screen.getByText('to test@example.com')).toBeInTheDocument()
    })

    it('should send magic link and show success message', async () => {
      mockSignInWithOtp.mockResolvedValueOnce({ error: null })

      const user = userEvent.setup()
      render(<AuthModal {...defaultProps} />)

      // Enter email
      const emailInput = screen.getByPlaceholderText('your@email.com')
      await user.type(emailInput, 'test@example.com')

      // Click magic link button
      await user.click(screen.getByText('Send magic link'))

      // Click send button in magic link mode
      await user.click(screen.getByText('Send sign-in link'))

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith({
          email: 'test@example.com',
          options: {
            emailRedirectTo: 'http://localhost:3000/records'
          }
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument()
      })
    })

    it('should show error message when magic link fails', async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        error: { message: 'Rate limit exceeded' }
      })

      const user = userEvent.setup()
      render(<AuthModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('your@email.com')
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByText('Send magic link'))
      await user.click(screen.getByText('Send sign-in link'))

      await waitFor(() => {
        expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
      })
    })
  })

  describe('Password Login Flow', () => {
    it('should switch to password mode when password button is clicked', async () => {
      const user = userEvent.setup()
      render(<AuthModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('your@email.com')
      await user.type(emailInput, 'test@example.com')

      await user.click(screen.getByText('Sign in with password'))

      expect(screen.getByText('Sign in with password', { selector: 'h2' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    })

    it('should show forgot password option in password mode', async () => {
      const user = userEvent.setup()
      render(<AuthModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('your@email.com')
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByText('Sign in with password'))

      expect(screen.getByText('Forgot password? Use magic link instead')).toBeInTheDocument()
    })

    it('should login with password successfully', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123' },
          session: { access_token: 'token-abc' }
        },
        error: null
      })

      const user = userEvent.setup()
      render(<AuthModal {...defaultProps} />)

      // Enter email
      const emailInput = screen.getByPlaceholderText('your@email.com')
      await user.type(emailInput, 'test@example.com')

      // Switch to password mode
      await user.click(screen.getByText('Sign in with password'))

      // Enter password
      const passwordInput = screen.getByPlaceholderText('Password')
      await user.type(passwordInput, 'mypassword123')

      // Submit
      await user.click(screen.getByText('Sign in'))

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'mypassword123'
        })
      })
    })

    it('should show error message for invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      })

      const user = userEvent.setup()
      render(<AuthModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('your@email.com')
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByText('Sign in with password'))

      const passwordInput = screen.getByPlaceholderText('Password')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(screen.getByText('Sign in'))

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password. Try magic link instead?')).toBeInTheDocument()
      })
    })
  })

  describe('localStorage Migration', () => {
    it('should migrate localStorage records on successful password login', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true })
      global.fetch = mockFetch

      // Set up localStorage with existing records
      const localRecords = {
        'record-1': {
          fileName: 'test.pdf',
          documentType: 'lab_result',
          result: { summary: 'Test result' },
          documentText: 'Test content',
          chatMessages: []
        },
        'record-2': {
          fileName: 'scan.pdf',
          documentType: 'imaging',
          result: { summary: 'Scan result' },
          documentText: 'Scan content',
          chatMessages: [{ role: 'user', content: 'Question' }]
        }
      }
      localStorage.setItem('axestack-translations-data', JSON.stringify(localRecords))

      mockSignInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123' },
          session: { access_token: 'token-abc' }
        },
        error: null
      })

      const user = userEvent.setup()
      render(<AuthModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('your@email.com')
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByText('Sign in with password'))

      const passwordInput = screen.getByPlaceholderText('Password')
      await user.type(passwordInput, 'password123')
      await user.click(screen.getByText('Sign in'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2) // Two records
      })

      // Verify the migration API was called with correct data
      expect(mockFetch).toHaveBeenCalledWith('/api/records/save', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer token-abc'
        })
      }))
    })

    it('should clear localStorage after successful migration', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true })

      localStorage.setItem('axestack-translations-data', JSON.stringify({
        'record-1': { fileName: 'test.pdf', documentType: 'lab', result: {} }
      }))
      localStorage.setItem('axestack-translations', 'some-old-data')

      mockSignInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123' },
          session: { access_token: 'token-abc' }
        },
        error: null
      })

      const user = userEvent.setup()
      render(<AuthModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('your@email.com')
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByText('Sign in with password'))

      const passwordInput = screen.getByPlaceholderText('Password')
      await user.type(passwordInput, 'password123')
      await user.click(screen.getByText('Sign in'))

      await waitFor(() => {
        expect(localStorage.getItem('axestack-translations-data')).toBeNull()
        expect(localStorage.getItem('axestack-translations')).toBeNull()
      })
    })

    it('should not clear localStorage if migration has failures', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true }) // First record succeeds
        .mockResolvedValueOnce({ ok: false }) // Second record fails

      localStorage.setItem('axestack-translations-data', JSON.stringify({
        'record-1': { fileName: 'test1.pdf', documentType: 'lab', result: {} },
        'record-2': { fileName: 'test2.pdf', documentType: 'lab', result: {} }
      }))

      mockSignInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123' },
          session: { access_token: 'token-abc' }
        },
        error: null
      })

      const user = userEvent.setup()
      render(<AuthModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('your@email.com')
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByText('Sign in with password'))

      const passwordInput = screen.getByPlaceholderText('Password')
      await user.type(passwordInput, 'password123')
      await user.click(screen.getByText('Sign in'))

      // Wait for migration to complete
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      // localStorage should NOT be cleared due to failure
      expect(localStorage.getItem('axestack-translations-data')).not.toBeNull()
    })
  })

  describe('Navigation', () => {
    it('should allow navigating back from magic link mode', async () => {
      const user = userEvent.setup()
      render(<AuthModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('your@email.com')
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByText('Send magic link'))

      // Verify we're in magic link mode
      expect(screen.getByText('Send sign-in link')).toBeInTheDocument()

      // Click back
      await user.click(screen.getByText('Back'))

      // Should be back to choice mode
      expect(screen.getByText('Send magic link')).toBeInTheDocument()
      expect(screen.getByText('Sign in with password')).toBeInTheDocument()
    })

    it('should allow navigating back from password mode', async () => {
      const user = userEvent.setup()
      render(<AuthModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('your@email.com')
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByText('Sign in with password'))

      // Verify we're in password mode
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()

      // Click back
      await user.click(screen.getByText('Back'))

      // Should be back to choice mode
      expect(screen.getByText('Send magic link')).toBeInTheDocument()
    })

    it('should close modal when backdrop is clicked', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<AuthModal isOpen={true} onClose={onClose} />)

      // Click backdrop (the dark overlay)
      const backdrop = document.querySelector('.bg-black\\/40')
      if (backdrop) {
        await user.click(backdrop)
        expect(onClose).toHaveBeenCalled()
      }
    })

    it('should close modal when X button is clicked', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<AuthModal isOpen={true} onClose={onClose} />)

      await user.click(screen.getByText('✕'))
      expect(onClose).toHaveBeenCalled()
    })
  })
})
