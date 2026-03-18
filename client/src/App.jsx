import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminDashboard from './pages/AdminDashboard'
import Host from './components/Host'
import Player from './components/Player'
import DeckStudio from './pages/DeckStudio'
import { useState } from 'react'

function App() {
  const [studioQuestions, setStudioQuestions] = useState(null)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/host" element={<Host studioQuestions={studioQuestions} onBack={() => window.location.href = '/'} />} />
        <Route path="/play" element={<Player onBack={() => window.location.href = '/'} />} />
        <Route
          path="/studio"
          element={
            <DeckStudio
              onBack={() => window.location.href = '/'}
              onHostDeck={(questions) => {
                setStudioQuestions(questions)
                window.location.href = '/host'
              }}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
