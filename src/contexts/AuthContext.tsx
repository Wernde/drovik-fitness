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

const LAST_SIGN_IN_KEY = 'drovik:lastSignIn'
const MAX_DAYS = 3

function isLoginStale(): boolean {
  const stored = localStorage.getItem(LAST_SIGN_IN_KEY)
  if (!stored) return true
  return (Date.now() - Number(stored)) / 86_400_000 > MAX_DAYS
}

interface AuthContextValue {
  session:       Session | null
  loading:       boolean
  requiresLogin: boolean
  signIn:  (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,       setSession]       = useState<Session | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [requiresLogin, setRequiresLogin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session && isLoginStale()) setRequiresLogin(true)
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
    if (!error) {
      localStorage.setItem(LAST_SIGN_IN_KEY, String(Date.now()))
      setRequiresLogin(false)
    }
    return error ? error.message : null
  }

  async function signOut() {
    localStorage.removeItem(LAST_SIGN_IN_KEY)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, requiresLogin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
