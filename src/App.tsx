import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Programs from './pages/Programs'
import Log from './pages/Log'
import History from './pages/History'
import Progress from './pages/Progress'
import Exercises from './pages/Exercises'

// ── Route guard ───────────────────────────────────────────────────────────────

// Wraps the main app routes: shows a spinner while the session is being
// restored from localStorage, then either the app or the login screen.
function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="programs"  element={<Programs />} />
        <Route path="log"       element={<Log />} />
        <Route path="history"   element={<History />} />
        <Route path="progress"  element={<Progress />} />
        <Route path="exercises" element={<Exercises />} />
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
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  )
}
