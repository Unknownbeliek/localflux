import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import AdminDashboard from './pages/AdminDashboard'
import Host from './components/Host'
import Player from './components/Player'
import DeckStudio from './pages/DeckStudio'
import { useState } from 'react'
import { HostTokenProvider } from './context/HostTokenProvider'
import { HostAuthProvider } from './context/HostAuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LocalhostBouncer } from './components/LocalhostBouncer'
import { BgmProvider } from './context/BgmProvider'

function AppRoutes() {
  const [studioQuestions, setStudioQuestions] = useState(null)
  const navigate = useNavigate()

  return (
    <Routes>
      {/* Public Player Route */}
      <Route path="/play" element={<Player onBack={() => navigate('/')} />} />

      {/* Host/Admin Only Routes - Password / Host Protected */}
      <Route element={<LocalhostBouncer />}>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/host" element={<ProtectedRoute element={<Host studioQuestions={studioQuestions} onBack={() => navigate('/')} />} />} />
        <Route
          path="/studio"
          element={
            <ProtectedRoute element={
              <DeckStudio
                onBack={() => navigate('/')}
                onHostDeck={(questions) => {
                  setStudioQuestions(questions)
                  navigate('/host')
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
                onBack={() => navigate('/')}
                onHostDeck={(questions) => {
                  setStudioQuestions(questions)
                  navigate('/host')
                }}
              />
            } />
          }
        />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <HostAuthProvider>
      <HostTokenProvider>
        <BgmProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </BgmProvider>
      </HostTokenProvider>
    </HostAuthProvider>
  )
}

export default App
