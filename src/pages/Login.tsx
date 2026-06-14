import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    setError('')
    const err = await signIn(email, password)
    if (err) { setError(err); setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-app-bg">

      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <img
          src={`${import.meta.env.BASE_URL}icon-192.png`}
          alt="Drovik"
          className="w-20 h-20 rounded-3xl shadow-lg mb-5"
        />
        <h1 className="text-3xl font-extrabold text-app-text tracking-tight">Drovik</h1>
        <p className="text-sm text-app-muted mt-1 font-medium">Your personal fitness tracker</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-app-card rounded-3xl border border-app-border p-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-app-text mb-5">Sign in</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-app-muted uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-2xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-muted uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted active:text-app-text"
                tabIndex={-1}
              >
                {showPw
                  ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113zM15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.48 15.53l-4.243-4.244a3.75 3.75 0 004.244 4.243zM6.94 9.44l-2.12-2.12A11.249 11.249 0 001.323 11.44a1.125 1.125 0 000 1.113C2.813 16.777 7.027 20 12 20c1.498 0 2.93-.294 4.243-.827l-1.577-1.577A5.25 5.25 0 016.94 9.44z" /></svg>
                  : <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>
                }
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-accent text-app-text py-3.5 font-bold text-sm disabled:opacity-60 active:bg-accent-dark mt-1"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>

      <p className="text-xs text-app-faint mt-8 text-center">
        Drovik Fitness — your data, your device
      </p>
    </div>
  )
}
