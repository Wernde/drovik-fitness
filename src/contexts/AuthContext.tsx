/**
 * AuthContext — provides the current Supabase session to the whole app.
 *
 * Wraps the app in App.tsx. Any component can call useAuth() to get:
 *   - session: the current Supabase session (null = logged out)
 *   - loading:  true while we're waiting for Supabase to restore the session
 *               from localStorage on first load (usually < 200ms)
 *   - signIn / signOut helpers
 *
 * Supabase persists the session in localStorage automatically, so the user
 * stays logged in across page reloads and PWA restarts.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  loading:  boolean
  signIn:  (email: string, password: string) => Promise<string | null>  // returns error string or null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    // Restore existing session on mount (e.g. returning to the PWA).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Listen for login / logout events so the UI updates automatically.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
