import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const EyeOff = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
    <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113zM15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.48 15.53l-4.243-4.244a3.75 3.75 0 004.244 4.243zM6.94 9.44l-2.12-2.12A11.249 11.249 0 001.323 11.44a1.125 1.125 0 000 1.113C2.813 16.777 7.027 20 12 20c1.498 0 2.93-.294 4.243-.827l-1.577-1.577A5.25 5.25 0 016.94 9.44z" />
  </svg>
)

const EyeOn = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
  </svg>
)

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.65rem',
  fontWeight: 700,
  color: 'rgba(144,144,160,0.85)',
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  marginBottom: 8,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
}

export default function Login() {
  const { signIn } = useAuth()

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPw,       setShowPw]       = useState(false)
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [resetSent,    setResetSent]    = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleForgotPassword() {
    const addr = email.trim()
    if (!addr) { setError('Enter your email above, then tap Forgot password.'); return }
    setResetLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(addr, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    })
    setResetLoading(false)
    if (err) { setError(err.message); return }
    setResetSent(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    setError('')
    const err = await signIn(email, password)
    if (err) { setError(err); setLoading(false) }
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '28px 24px',
      background: '#020509',
    }}>

      {/* Ambient layer 1 — diagonal orange-to-blue wash, 30s */}
      <div className="login-ambient-1" />
      {/* Ambient layer 2 — counter-diagonal at 42s, adds depth */}
      <div className="login-ambient-2" />

      {/* Logo & branding */}
      <div className="login-logo-section" style={{ marginBottom: '1.625rem' }}>
        <div className="login-icon-wrap">
          <div className="login-icon-glow" />
          <img
            src={`${import.meta.env.BASE_URL}icon-192.png`}
            alt="Drovik"
            style={{
              width: 84, height: 84,
              borderRadius: 22,
              position: 'relative', zIndex: 1,
              boxShadow: '0 16px 48px -10px rgba(0,0,0,0.90), 0 0 0 1px rgba(255,255,255,0.09)',
            }}
          />
        </div>

        <h1 style={{
          fontSize: '2.85rem',
          fontWeight: 900,
          letterSpacing: '0.18em',
          margin: 0,
          lineHeight: 1,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: 'linear-gradient(130deg, #FF8C00 0%, #FFB347 45%, #FFD888 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 22px rgba(255,100,0,0.50))',
        }}>
          DROVIK
        </h1>

        <p style={{
          fontSize: '0.68rem',
          color: 'rgba(200,200,215,0.60)',
          margin: '10px 0 0',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 600,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          Your personal fitness tracker
        </p>
      </div>

      {/* Glass card */}
      <div className="login-card">
        <h2 style={{
          fontSize: '1.1rem',
          fontWeight: 800,
          color: '#EDEDF2',
          margin: '0 0 26px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          letterSpacing: '0.01em',
        }}>
          Sign in
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div>
            <label style={labelStyle}>Email</label>
            <div className="login-input-wrap">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="login-input"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <div className="login-input-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="login-input"
                style={{ paddingRight: 46 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="login-pw-toggle"
                tabIndex={-1}
              >
                {showPw ? <EyeOff /> : <EyeOn />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              borderRadius: 12,
              background: 'rgba(248,113,113,0.07)',
              border: '1px solid rgba(248,113,113,0.18)',
              padding: '10px 14px',
            }}>
              <p style={{
                fontSize: '0.8125rem', color: '#F87171', margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-btn"
            style={{ marginTop: 2 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          {resetSent ? (
            <p style={{
              fontSize: '0.8125rem', color: '#22C55E',
              textAlign: 'center', margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500,
            }}>
              Reset link sent — check your email.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading}
              style={{
                background: 'none', border: 'none',
                width: '100%', textAlign: 'center',
                fontSize: '0.8125rem',
                color: 'rgba(144,144,160,0.65)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500, cursor: 'pointer',
                padding: '2px 0 0',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(200,200,212,0.90)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(144,144,160,0.65)')}
            >
              {resetLoading ? 'Sending…' : 'Forgot password?'}
            </button>
          )}

        </form>
      </div>

      <p style={{
        fontSize: '0.6875rem',
        color: 'rgba(96,96,112,0.70)',
        marginTop: 30,
        textAlign: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        letterSpacing: '0.05em',
        position: 'relative', zIndex: 1,
      }}>
        Drovik Fitness — your data, your device
      </p>

    </div>
  )
}
