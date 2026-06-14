import React, { Suspense, lazy, useState, useEffect, useRef } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { UnitsProvider } from './contexts/UnitsContext'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import Home from './pages/Home'
import Programs from './pages/Programs'
import ProgramDetail from './pages/ProgramDetail'
import DayDetail from './pages/DayDetail'
import Log from './pages/Log'
import History from './pages/History'
import SessionDetail from './pages/SessionDetail'
import Exercises from './pages/Exercises'
import Settings from './pages/Settings'
import Calculator from './pages/Calculator'
import Goals from './pages/Goals'
import Nutrition from './pages/Nutrition'
import More from './pages/More'
import Profile from './pages/Profile'

const Progress  = lazy(() => import('./pages/Progress'))
const BodyStats = lazy(() => import('./pages/BodyStats'))

const lazyFallback = (
  <div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>
)

// Splash transition phases:
//   splash   → iframe visible, dark overlay transparent (we see the animation)
//   covering → dark overlay fades TO opaque (400ms) — hides the iframe
//   revealing → iframe removed, dark overlay fades TO transparent (600ms) — login/app fades in
//   done     → everything removed
type SplashPhase = 'splash' | 'covering' | 'revealing' | 'done'

function AppRoutes() {
  const { session, loading, requiresLogin } = useAuth()

  const [splashDone, setSplashDone] = useState(false)
  const [phase, setPhase]           = useState<SplashPhase>('splash')
  const phaseRef                    = useRef<SplashPhase>('splash')

  function startTransition() {
    if (phaseRef.current !== 'splash') return
    phaseRef.current = 'covering'
    setPhase('covering')
    setTimeout(() => {
      phaseRef.current = 'revealing'
      setPhase('revealing')
      setTimeout(() => {
        phaseRef.current = 'done'
        setPhase('done')
      }, 600)
    }, 400)
  }

  // Listen for postMessage from splash iframe; fallback after 12s in case WebGL fails on mobile
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === 'drovik:splash-complete') setSplashDone(true)
    }
    window.addEventListener('message', onMsg)
    const fallback = setTimeout(() => setSplashDone(true), 12000)
    return () => {
      window.removeEventListener('message', onMsg)
      clearTimeout(fallback)
    }
  }, [])

  // Kick off the transition once both the splash animation and auth are ready
  useEffect(() => {
    if (splashDone && !loading) startTransition()
  }, [splashDone, loading])

  const wrap = (el: React.ReactElement) => <ErrorBoundary>{el}</ErrorBoundary>

  let content: React.ReactNode = null
  if (!loading) {
    if (!session || requiresLogin) {
      content = <Login />
    } else {
      content = (
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index                                   element={wrap(<Home />)} />
            <Route path="programs"                         element={wrap(<Programs />)} />
            <Route path="programs/:programId"              element={wrap(<ProgramDetail />)} />
            <Route path="programs/:programId/days/:dayId"  element={wrap(<DayDetail />)} />
            <Route path="log"                              element={wrap(<Log />)} />
            <Route path="history"                          element={wrap(<History />)} />
            <Route path="history/:sessionId"               element={wrap(<SessionDetail />)} />
            <Route path="progress"                         element={wrap(<Suspense fallback={lazyFallback}><Progress /></Suspense>)} />
            <Route path="exercises"                        element={wrap(<Exercises />)} />
            <Route path="calculator"                       element={wrap(<Calculator />)} />
            <Route path="settings"                         element={wrap(<Settings />)} />
            <Route path="goals"                            element={wrap(<Goals />)} />
            <Route path="nutrition"                        element={wrap(<Nutrition />)} />
            <Route path="more"                             element={wrap(<More />)} />
            <Route path="profile"                          element={wrap(<Profile />)} />
            <Route path="body"                             element={wrap(<Suspense fallback={lazyFallback}><BodyStats /></Suspense>)} />
            <Route path="*"                                element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      )
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    background: '#050505',
    opacity: phase === 'covering' ? 1 : 0,
    transition: phase === 'covering'
      ? 'opacity 400ms ease'
      : phase === 'revealing'
        ? 'opacity 600ms ease'
        : 'none',
    pointerEvents: phase === 'covering' ? 'auto' : 'none',
  }

  return (
    <>
      {content}

      {/* Splash iframe — removed as soon as the dark overlay covers it */}
      {(phase === 'splash' || phase === 'covering') && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9998,
            background: '#050505',
          }}
        >
          <iframe
            src={`${import.meta.env.BASE_URL}splash.html`}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title="Loading"
          />
        </div>
      )}

      {/* Dark overlay drives the transition — plain div so CSS transitions work on iOS */}
      {phase !== 'done' && <div style={overlayStyle} />}
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <UnitsProvider>
          <AuthProvider>
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          </AuthProvider>
        </UnitsProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
