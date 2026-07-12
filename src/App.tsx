import React, { Suspense, lazy } from 'react'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const bypassAuth = localStorage.getItem('drovik:bypass-auth') === '1'
  if ((!session || requiresLogin) && !bypassAuth) return <Login />

  const wrap = (el: React.ReactElement) => <ErrorBoundary>{el}</ErrorBoundary>

  return (
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
