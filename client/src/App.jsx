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

function App() {
  const [studioQuestions, setStudioQuestions] = useState(null)

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
                  onHostDeck={(questions) => {
                    setStudioQuestions(questions)
                    window.location.href = '/host'
                  }}
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
                  onHostDeck={(questions) => {
                    setStudioQuestions(questions)
                    window.location.href = '/host'
                  }}
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
