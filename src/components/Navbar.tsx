'use client'

import Link from 'next/link'
import { useState } from 'react'
import { User, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { AuthModal } from '@/components/AuthModal'

interface NavbarProps {
  showBack?: boolean
  backHref?: string
  backLabel?: string
}

export function Navbar({ showBack = false, backHref = '/', backLabel = 'Home' }: NavbarProps) {
  const { user, loading, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            {showBack && (
              <Link href={backHref} className="text-slate-500 hover:text-slate-900 text-sm">
                ← {backLabel}
              </Link>
            )}
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">
                opencancer
              </span>
              <span className="text-lg font-bold text-slate-400">.ai</span>
            </Link>
          </div>

          {/* Right side - Desktop */}
          <div className="hidden sm:flex items-center gap-4">
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/records" className="text-slate-600 hover:text-violet-600 transition-colors px-3 py-2 min-h-[44px] flex items-center">
                Records
              </Link>
              <Link href="/ask" className="text-slate-600 hover:text-violet-600 transition-colors px-3 py-2 min-h-[44px] flex items-center">
                Ask Navis
              </Link>
              <Link href="/trials" className="text-slate-600 hover:text-violet-600 transition-colors px-3 py-2 min-h-[44px] flex items-center">
                Trials
              </Link>
            </nav>

            <div className="h-4 w-px bg-slate-200" />

            {/* Auth state */}
            {loading ? (
              <div className="w-20 h-6 bg-slate-100 rounded animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm text-slate-700">
                  <User className="w-4 h-4 text-violet-500" />
                  {user.email?.split('@')[0]}
                </span>
                <button
                  onClick={async () => {
                    try {
                      await signOut()
                      window.location.reload()
                    } catch (err) {
                      console.error('Sign out error:', err)
                    }
                  }}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium px-3 py-1.5 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
              >
                <User className="w-4 h-4" />
                Sign in
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-700"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-100 bg-white">
            <nav className="flex flex-col px-4 py-2">
              <Link
                href="/records"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 min-h-[44px] flex items-center text-slate-700 hover:text-violet-600 transition-colors"
              >
                Records
              </Link>
              <Link
                href="/ask"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 min-h-[44px] flex items-center text-slate-700 hover:text-violet-600 transition-colors"
              >
                Ask Navis
              </Link>
              <Link
                href="/trials"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 min-h-[44px] flex items-center text-slate-700 hover:text-violet-600 transition-colors"
              >
                Trials
              </Link>

              <div className="border-t border-slate-100 pt-2 mt-2">
                {loading ? (
                  <div className="py-2 text-slate-400">Loading...</div>
                ) : user ? (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-violet-500" />
                      {user.email?.split('@')[0]}
                    </span>
                    <button
                      onClick={async () => {
                        await signOut()
                        window.location.reload()
                      }}
                      className="text-red-600 text-sm"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setShowAuthModal(true)
                    }}
                    className="w-full py-2 text-center bg-violet-600 text-white rounded-lg font-medium"
                  >
                    Sign in
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}
