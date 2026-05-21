import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Programs from './pages/Programs'
import Log from './pages/Log'
import History from './pages/History'
import Progress from './pages/Progress'

// HashRouter is used instead of BrowserRouter because GitHub Pages doesn't support
// server-side URL rewriting. With HashRouter, the URL looks like:
//   https://wernde.github.io/drovik-fitness/#/programs
// The server always serves index.html and React handles the rest.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="programs" element={<Programs />} />
          <Route path="log" element={<Log />} />
          <Route path="history" element={<History />} />
          <Route path="progress" element={<Progress />} />
          {/* Redirect any unknown URL back to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
