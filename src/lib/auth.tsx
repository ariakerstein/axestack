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
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)

      // Load profile and migrate data for logged in users
      if (session?.user) {
        migrateSessionDecks(session.user.id)

        // First try to load existing Supabase profile
        const existingProfile = await loadProfile(session.user.email!)

        // If no Supabase profile exists, sync from localStorage
        if (!existingProfile) {
          await syncProfileToSupabase(session.user.email!)
        }
      }

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
    // Clear localStorage profile - back to guest mode
    if (typeof window !== 'undefined') {
      localStorage.removeItem('patient-profile')
    }
    setProfile(null)
    await supabase.auth.signOut()
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
