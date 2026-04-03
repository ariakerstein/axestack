'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, getSessionId, saveProfile, getProfileByEmail, OpenCancerProfile } from './supabase'

// Profile structure matching localStorage format
interface LocalProfile {
  name: string
  role: 'patient' | 'caregiver'
  cancerType: string
  stage?: string
  location?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  profile: OpenCancerProfile | null
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  isAnonymous: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<OpenCancerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // FAST: Check localStorage immediately on mount (sync, no network)
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Quick check: if no auth tokens in localStorage, we're definitely a guest
    const hasAuthTokens = localStorage.getItem('sb-felofmlhqwcdpiyjgstx-auth-token')
    if (!hasAuthTokens) {
      // No tokens = definitely guest, stop loading immediately
      setLoading(false)
    } else {
      // Has tokens - but add a failsafe timeout in case getSession() hangs
      const timeout = setTimeout(() => {
        setLoading(false)
      }, 2000) // Max 2 seconds wait
      return () => clearTimeout(timeout)
    }
  }, [])

  // Load profile from Supabase for authenticated user
  const loadProfile = async (email: string) => {
    const supabaseProfile = await getProfileByEmail(email)
    setProfile(supabaseProfile)
    return supabaseProfile
  }

  // Sync localStorage profile to Supabase
  const syncProfileToSupabase = async (email: string) => {
    const localData = localStorage.getItem('patient-profile')
    if (!localData) return null

    try {
      const local: LocalProfile = JSON.parse(localData)

      // Save to Supabase (this will update if exists, create if not)
      const savedProfile = await saveProfile({
        email,
        name: local.name,
        role: local.role,
        cancerType: local.cancerType,
        stage: local.stage,
        location: local.location,
      })

      if (savedProfile) {
        setProfile(savedProfile)
        return savedProfile
      }
    } catch (e) {
      console.error('Error syncing profile:', e)
    }
    return null
  }

  // Refresh profile from Supabase
  const refreshProfile = async () => {
    if (user?.email) {
      await loadProfile(user.email)
    }
  }

  useEffect(() => {
    // Get initial session (async, but we may have already set loading=false for guests)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)

      // Set loading false IMMEDIATELY after session check
      // Don't wait for profile - that's a nice-to-have, not blocking
      setLoading(false)

      // Load profile and migrate data in background for logged in users
      if (session?.user) {
        // All of these run in background - don't block UI
        migrateSessionDecks(session.user.id)
        loadProfile(session.user.email!).then(existingProfile => {
          if (!existingProfile) {
            syncProfileToSupabase(session.user.email!)
          }
        })
      }
    }).catch(() => {
      // Even on error, stop loading
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        // On sign in, migrate data and sync profile
        if (event === 'SIGNED_IN' && session?.user) {
          await migrateSessionDecks(session.user.id)

          // Sync localStorage profile to Supabase
          const existingProfile = await loadProfile(session.user.email!)
          if (!existingProfile) {
            await syncProfileToSupabase(session.user.email!)
          }
        }

        // On sign out, clear profile
        if (event === 'SIGNED_OUT') {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Migrate anonymous session decks to user account
  const migrateSessionDecks = async (userId: string) => {
    const sessionId = getSessionId()
    if (!sessionId) return

    try {
      // Update all decks with this session_id to belong to the user
      const { error } = await supabase
        .from('promptdeck_versions')
        .update({ user_id: userId })
        .eq('session_id', sessionId)
        .is('user_id', null)

      if (error) {
        console.error('Error migrating decks:', error)
      }
    } catch (e) {
      console.error('Migration error:', e)
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/records`,
      },
    })
    if (error) console.error('Google sign in error:', error)
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        console.error('Sign in error:', error)
        return { error: error.message }
      }
      if (!data.user) {
        return { error: 'Sign in failed - no user returned' }
      }
      return { error: null }
    } catch (e) {
      console.error('Sign in exception:', e)
      return { error: 'Sign in failed - please try again' }
    }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/records`,
        },
      })
      if (error) {
        console.error('Sign up error:', error)
        return { error: error.message }
      }
      // If identities array is empty, user already exists
      if (data.user && data.user.identities?.length === 0) {
        return { error: 'An account with this email already exists. Please sign in.' }
      }
      return { error: null }
    } catch (e) {
      console.error('Sign up exception:', e)
      return { error: 'Sign up failed - please try again' }
    }
  }

  const signOut = async () => {
    try {
      // Clear state first
      setUser(null)
      setSession(null)
      setProfile(null)

      // NOTE: We keep localStorage profile so returning users retain their data
      // This allows: sign in → set profile → sign out → sign in → profile still there
      // The profile will sync to Supabase on next sign-in if needed

      // Sign out from Supabase (clears auth tokens)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Supabase signOut error:', error)
      }

      // Force page reload to clear any cached state
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (e) {
      console.error('SignOut error:', e)
      // Force reload anyway
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profile,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        isAnonymous: !user,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
