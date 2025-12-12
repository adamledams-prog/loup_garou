import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from './pages/Home'
import Lobby from './pages/Lobby'
import Game from './pages/Game'
import Rules from './pages/Rules'

function App() {
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    const checkOrientation = () => {
      const landscape = window.innerWidth > window.innerHeight && window.innerHeight < 500
      setIsLandscape(landscape)
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  return (
    <Router>
      <div className="min-h-screen w-full bg-gradient-to-br from-night-900 via-night-700 to-blood-900">
        {/* ⚠️ Avertissement mode paysage */}
        {isLandscape && (
          <div className="landscape-warning">
            <div className="icon">📱</div>
            <h2 className="text-2xl font-bold">Tournez votre appareil</h2>
            <p className="text-gray-300">Cette application fonctionne mieux en mode portrait</p>
          </div>
        )}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/game/:roomCode" element={<Game />} />
          <Route path="/regles" element={<Rules />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
