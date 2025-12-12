import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Lobby from './pages/Lobby'
import Game from './pages/Game'
import Rules from './pages/Rules'

function App() {
  return (
    <Router>
      <div className="min-h-screen w-full bg-gradient-to-br from-night-900 via-night-700 to-blood-900">
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
