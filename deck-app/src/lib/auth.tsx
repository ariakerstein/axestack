'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, getSessionId } from './supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  isAnonymous: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Migrate anonymous decks to user on login
      if (session?.user) {
        migrateSessionDecks(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        // Migrate decks when user signs in
        if (event === 'SIGNED_IN' && session?.user) {
          await migrateSessionDecks(session.user.id)
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
        redirectTo: `${window.location.origin}/editor`,
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
          emailRedirectTo: `${window.location.origin}/editor`,
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
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        isAnonymous: !user,
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
