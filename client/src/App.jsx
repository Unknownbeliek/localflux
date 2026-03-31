import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminDashboard from './pages/AdminDashboard'
import Host from './components/Host'
import Player from './components/Player'
import DeckStudio from './pages/DeckStudio'
import { useState } from 'react'
import { HostTokenProvider } from './context/HostTokenProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LocalhostBouncer } from './components/LocalhostBouncer'
import { BgmProvider } from './context/BgmProvider'

const STUDIO_LAUNCH_QUESTIONS_KEY = 'lf_studio_launch_questions'

function App() {
  const [studioQuestions, setStudioQuestions] = useState(null)

  const launchHostFromStudio = (questions) => {
    setStudioQuestions(questions)

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(STUDIO_LAUNCH_QUESTIONS_KEY, JSON.stringify(questions || []))
      } catch {
        // Ignore storage failures; in-memory state still works for same-session navigation.
      }

      const token = new URLSearchParams(window.location.search).get('token')
      const target = token
        ? `/host?token=${encodeURIComponent(token)}`
        : '/host'

      window.location.href = target
    }
  }

  return (
    <HostTokenProvider>
      <BgmProvider>
        <BrowserRouter>
      <Routes>
        {/* Public Player Route */}
        <Route path="/play" element={<Player onBack={() => window.location.href = '/'} />} />

        {/* Host/Admin Only Routes - Localhost Restricted */}
        <Route element={<LocalhostBouncer />}>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/host" element={<ProtectedRoute element={<Host studioQuestions={studioQuestions} onBack={() => window.location.href = '/'} />} />} />
          <Route
            path="/studio"
            element={
              <ProtectedRoute element={
                <DeckStudio
                  onBack={() => window.location.href = '/'}
                  onHostDeck={launchHostFromStudio}
                />
              } />
            }
          />
          <Route
            path="/deck"
            element={
              <ProtectedRoute element={
                <DeckStudio
                  onBack={() => window.location.href = '/'}
                  onHostDeck={launchHostFromStudio}
                />
              } />
            }
          />
        </Route>
      </Routes>
      </BrowserRouter>
      </BgmProvider>
    </HostTokenProvider>
  )
}

export default App
