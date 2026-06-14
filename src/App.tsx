import React, { Suspense, lazy, useState, useEffect } from 'react'
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

function AppRoutes() {
  const { session, loading, requiresLogin } = useAuth()

  // Splash overlay state
  const [splashDone, setSplashDone] = useState(false)
  const [splashFade, setSplashFade] = useState(false)
  const [splashGone, setSplashGone] = useState(false)

  // Hear the postMessage from the splash iframe when the animation finishes
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === 'drovik:splash-complete') setSplashDone(true)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  // Once both splash and auth are ready, fade the overlay out then remove it
  useEffect(() => {
    if (!splashDone || loading) return
    setSplashFade(true)
    const t = setTimeout(() => setSplashGone(true), 700)
    return () => clearTimeout(t)
  }, [splashDone, loading])

  const wrap = (el: React.ReactElement) => <ErrorBoundary>{el}</ErrorBoundary>

  // Render the correct page behind the splash overlay.
  // While auth is loading we render nothing (splash covers it).
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

  return (
    <>
      {content}

      {/* Splash overlay — sits on top of everything, fades out when done */}
      {!splashGone && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            opacity: splashFade ? 0 : 1,
            transition: 'opacity 700ms ease',
            pointerEvents: splashFade ? 'none' : 'auto',
          }}
        >
          <iframe
            src={`${import.meta.env.BASE_URL}splash.html`}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title="Loading"
          />
        </div>
      )}
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
