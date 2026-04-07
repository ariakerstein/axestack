'use client'

import { AuthProvider } from '@/lib/auth'
import { PasswordResetModal } from '@/components/PasswordResetModal'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <PasswordResetModal />
    </AuthProvider>
  )
}
