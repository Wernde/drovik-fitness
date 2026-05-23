/**
 * Login — the gate screen shown when the user is not authenticated.
 *
 * Single-user app: the user has one account (created once in Supabase Auth).
 * No sign-up flow in the app — just sign in.
 *
 * All data is still stored locally in Dexie so the app is usable offline
 * even before a successful login.
 */

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password.'); return }

    setLoading(true)
    setError('')

    const err = await signIn(email, password)
    if (err) {
      setError(err)
      setLoading(false)
    }
    // On success, AuthContext updates `session` → App.tsx renders the main app.
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:bg-gray-950">
      <div className="w-full max-w-sm">

        {/* Logo / title */}
        <div className="flex flex-col items-center mb-10">
          <img src="icon.svg" alt="Drovik Fitness" className="w-16 h-16 mb-4" />
          <h1 className="text-2xl font-bold">Drovik Fitness</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Sign in to sync your data</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-lime-400 text-gray-900 py-3 font-semibold text-sm disabled:opacity-60 active:bg-lime-500 mt-2"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
