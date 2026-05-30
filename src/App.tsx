import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { UnitsProvider } from './contexts/UnitsContext'
import Layout from './components/Layout'
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

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="programs"                         element={<Programs />} />
        <Route path="programs/:programId"              element={<ProgramDetail />} />
        <Route path="programs/:programId/days/:dayId"  element={<DayDetail />} />
        <Route path="log"                              element={<Log />} />
        <Route path="history"                          element={<History />} />
        <Route path="history/:sessionId"               element={<SessionDetail />} />
        <Route path="progress"                         element={<Suspense fallback={<div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>}><Progress /></Suspense>} />
        <Route path="exercises"                        element={<Exercises />} />
        <Route path="calculator"                       element={<Calculator />} />
        <Route path="settings"                         element={<Settings />} />
        <Route path="goals"                            element={<Goals />} />
        <Route path="nutrition"                        element={<Nutrition />} />
        <Route path="more"                             element={<More />} />
        <Route path="profile"                          element={<Profile />} />
        <Route path="body"                             element={<Suspense fallback={<div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>}><BodyStats /></Suspense>} />
        <Route path="*"                                element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <UnitsProvider>
        <AuthProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </AuthProvider>
      </UnitsProvider>
    </ToastProvider>
  )
}
