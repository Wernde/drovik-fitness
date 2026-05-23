import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
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

// Progress is lazy-loaded so Recharts (~360 KB) is only fetched when the tab is first opened.
const Progress = lazy(() => import('./pages/Progress'))

// ── Route guard ───────────────────────────────────────────────────────────────

// Wraps the main app routes: shows a spinner while the session is being
// restored from localStorage, then either the app or the login screen.
function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="programs"                          element={<Programs />} />
        <Route path="programs/:programId"              element={<ProgramDetail />} />
        <Route path="programs/:programId/days/:dayId"  element={<DayDetail />} />
        <Route path="log"       element={<Log />} />
        <Route path="history"             element={<History />} />
        <Route path="history/:sessionId"  element={<SessionDetail />} />
        <Route path="progress"  element={<Suspense fallback={<div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>}><Progress /></Suspense>} />
        <Route path="exercises" element={<Exercises />} />
        <Route path="settings"  element={<Settings />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

// HashRouter is used instead of BrowserRouter because GitHub Pages doesn't
// support server-side URL rewriting. URLs look like /#/programs.
export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
