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

// Consolidated localStorage clearing function to prevent data leakage between users
const clearUserLocalStorage = (options?: { keepLastUserId?: boolean; includeAuthToken?: boolean }) => {
  if (typeof window === 'undefined') return

  // Core user data - always clear
  localStorage.removeItem('patient-profile')
  localStorage.removeItem('axestack-translations')
  localStorage.removeItem('axestack-translations-data')
  localStorage.removeItem('axestack-patient-notes')
  localStorage.removeItem('axestack-case-brief')
  localStorage.removeItem('combat-diagnosis-result')
  localStorage.removeItem('combat-treatment-result')

  // Session IDs - clear to prevent email/data leakage
  localStorage.removeItem('opencancer_session_id')
  localStorage.removeItem('opencancer-session-id')

  // Onboarding flag - clear so new user gets onboarding
  localStorage.removeItem('opencancer-onboarding-dismissed')

  // Last user ID - optionally preserve (for detecting user switches)
  if (!options?.keepLastUserId) {
    localStorage.removeItem('opencancer_last_user_id')
  }

  // Auth token - only clear on explicit sign out
  if (options?.includeAuthToken) {
    localStorage.removeItem('sb-felofmlhqwcdpiyjgstx-auth-token')
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<OpenCancerProfile | null>(null)
  const [loading, setLoading] = useState(true)

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

  // Single consolidated auth initialization - no race conditions
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        // Get session - this is the single source of truth
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('[Auth] getSession error:', error)
        }

        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Load profile and migrate data in background for logged in users
        if (session?.user) {
          // All of these run in background - don't block UI
          migrateSessionDecks(session.user.id)
          loadProfile(session.user.email!).then(existingProfile => {
            if (!mounted) return
            if (!existingProfile) {
              // Try to sync from localStorage first
              syncProfileToSupabase(session.user.email!).then(syncedProfile => {
                if (!mounted) return
                if (!syncedProfile) {
                  // No localStorage profile either - create a minimal default profile
                  const defaultProfile: OpenCancerProfile = {
                    id: session.user.id,
                    session_id: getSessionId(),
                    email: session.user.email!,
                    name: session.user.email!.split('@')[0],
                    role: 'patient',
                    cancer_type: 'other',
                    stage: null,
                    location: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }
                  setProfile(defaultProfile)
                  // Save to Supabase in background
                  saveProfile({
                    email: session.user.email!,
                    name: session.user.email!.split('@')[0],
                    role: 'patient',
                    cancerType: 'other',
                  }).catch(err => console.error('Failed to save default profile:', err))
                }
              })
            }
          })
        }
      } catch (err) {
        console.error('[Auth] Init error:', err)
        if (mounted) setLoading(false)
      }
    }

    // Add timeout safety - if auth takes > 3s, force ready
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[Auth] Timeout reached, forcing ready state')
        setLoading(false)
      }
    }, 3000)

    initAuth()

    return () => {
      mounted = false
      clearTimeout(timeout)
    }
  }, [])

  // Listen for auth changes (separate useEffect for clarity)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        // On sign in, check if different user and clear localStorage
        if (event === 'SIGNED_IN' && session?.user) {
          // CRITICAL: Check if this is a different user than last signed in
          const lastUserId = typeof window !== 'undefined'
            ? localStorage.getItem('opencancer_last_user_id')
            : null

          // FIRST: Migrate any localStorage records to cloud BEFORE clearing
          // This ensures records uploaded anonymously aren't lost on sign-in
          if (typeof window !== 'undefined') {
            await migrateLocalRecordsToCloud(session.access_token)
          }

          if (lastUserId && lastUserId !== session.user.id) {
            // Different user! Clear all user-specific localStorage
            console.log('[Auth] Different user detected, clearing localStorage')
            clearUserLocalStorage({ keepLastUserId: true })
          }

          // Store current user ID for future comparison
          if (typeof window !== 'undefined') {
            localStorage.setItem('opencancer_last_user_id', session.user.id)
          }

          await migrateSessionDecks(session.user.id)

          // Sync localStorage profile to Supabase
          const existingProfile = await loadProfile(session.user.email!)
          if (!existingProfile) {
            const syncedProfile = await syncProfileToSupabase(session.user.email!)
            if (!syncedProfile) {
              // No localStorage profile - create a minimal default profile
              const defaultProfile: OpenCancerProfile = {
                id: session.user.id,
                session_id: getSessionId(),
                email: session.user.email!,
                name: session.user.email!.split('@')[0],
                role: 'patient',
                cancer_type: 'other',
                stage: null,
                location: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
              setProfile(defaultProfile)
              // Save to Supabase in background
              saveProfile({
                email: session.user.email!,
                name: session.user.email!.split('@')[0],
                role: 'patient',
                cancerType: 'other',
              }).catch(err => console.error('Failed to save default profile:', err))
            }
          }
        }

        // On sign out, clear profile and records localStorage
        if (event === 'SIGNED_OUT') {
          setProfile(null)
          clearUserLocalStorage()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Migrate localStorage records to cloud on sign-in
  // This ensures records uploaded anonymously are saved to the user's account
  const migrateLocalRecordsToCloud = async (accessToken: string) => {
    if (typeof window === 'undefined') return

    const data = localStorage.getItem('axestack-translations-data')
    if (!data) return

    try {
      const translations = JSON.parse(data)
      const records = Object.values(translations) as Array<{
        id: string
        fileName: string
        documentType: string
        result: unknown
        documentText?: string
      }>

      if (records.length === 0) return

      console.log('[Auth] Migrating', records.length, 'local records to cloud')

      // Upload each record to cloud
      for (const record of records) {
        try {
          const response = await fetch('/api/records/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              fileName: record.fileName,
              documentType: record.documentType,
              result: record.result,
              documentText: record.documentText || '',
              chatMessages: [],
            }),
          })

          if (response.ok) {
            console.log('[Auth] Migrated record:', record.fileName)
          } else {
            console.warn('[Auth] Failed to migrate record:', record.fileName)
          }
        } catch (err) {
          console.error('[Auth] Migration error for', record.fileName, err)
        }
      }
    } catch (e) {
      console.error('[Auth] Failed to parse localStorage records:', e)
    }
  }

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
      // IMPORTANT: Clear localStorage BEFORE setting state to null
      // This prevents race condition where Navbar re-renders and reads stale localStorage
      clearUserLocalStorage({ includeAuthToken: true })

      // Sign out from Supabase (clears auth tokens from cookies/storage)
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        console.error('Supabase signOut error:', error)
      }

      // Clear state last (this triggers re-renders, but localStorage is already clean)
      setUser(null)
      setSession(null)
      setProfile(null)

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
