import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import io from 'socket.io-client'

function Lobby() {
    const navigate = useNavigate()
    const [socket, setSocket] = useState(null)
    const [view, setView] = useState('menu') // menu, create, join, waiting
    const [playerName, setPlayerName] = useState('')
    const [roomCode, setRoomCode] = useState('')
    const [room, setRoom] = useState(null)
    const [players, setPlayers] = useState([])
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        const newSocket = io('http://localhost:3000')
        setSocket(newSocket)

        return () => newSocket.close()
    }, [])

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">

                {/* En-tête */}
                <div className="text-center mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="btn-secondary mb-6 text-sm"
                    >
                        ← Retour au menu
                    </button>
                    <h1 className="text-4xl md:text-5xl font-black mb-2">
                        <span className="text-blood">🐺 Lobby</span>
                    </h1>
                    <p className="text-gray-400">Rejoignez ou créez une partie</p>
                </div>

                {/* Menu principal */}
                {view === 'menu' && (
                    <div className="space-y-4">
                        <div className="card-glow">
                            <h2 className="text-2xl font-bold mb-4 text-blood">Créer une partie</h2>
                            <input
                                type="text"
                                placeholder="Votre nom"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                className="w-full bg-night-800 border-2 border-blood-900/50 focus:border-blood-600 rounded-xl px-4 py-3 mb-4 text-white placeholder-gray-500 transition-all"
                            />
                            <button
                                className="btn-primary w-full"
                                onClick={() => {
                                    if (playerName.trim()) {
                                        // TODO: Créer la salle
                                        setView('waiting')
                                    }
                                }}
                            >
                                🎮 Créer une salle
                            </button>
                        </div>

                        <div className="card">
                            <h2 className="text-2xl font-bold mb-4 text-gray-300">Rejoindre une partie</h2>
                            <input
                                type="text"
                                placeholder="Votre nom"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                className="w-full bg-night-800 border-2 border-night-600 focus:border-blood-600 rounded-xl px-4 py-3 mb-3 text-white placeholder-gray-500 transition-all"
                            />
                            <input
                                type="text"
                                placeholder="Code de la salle"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                className="w-full bg-night-800 border-2 border-night-600 focus:border-blood-600 rounded-xl px-4 py-3 mb-4 text-white placeholder-gray-500 uppercase text-center text-2xl font-bold tracking-widest transition-all"
                                maxLength={6}
                            />
                            <button
                                className="btn-secondary w-full"
                                onClick={() => {
                                    if (playerName.trim() && roomCode.trim()) {
                                        // TODO: Rejoindre la salle
                                        setView('waiting')
                                    }
                                }}
                            >
                                🚪 Rejoindre
                            </button>
                        </div>
                    </div>
                )}

                {/* Salle d'attente */}
                {view === 'waiting' && (
                    <div className="space-y-6">
                        <div className="card-glow text-center">
                            <p className="text-gray-400 mb-2">Code de la salle</p>
                            <div className="text-5xl font-black tracking-widest text-blood mb-4">
                                ABC123
                            </div>
                            <p className="text-sm text-gray-500">Partagez ce code avec vos amis</p>
                        </div>

                        <div className="card">
                            <h3 className="text-xl font-bold mb-4 text-gray-300">
                                👥 Joueurs ({players.length}/10)
                            </h3>
                            <div className="space-y-2">
                                {/* TODO: Liste des joueurs */}
                                <div className="bg-night-800 p-3 rounded-lg flex justify-between items-center">
                                    <span className="font-bold">Vous (Hôte)</span>
                                    <span className="text-yellow-500">👑</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button className="btn-secondary flex-1">
                                ❌ Quitter
                            </button>
                            <button className="btn-primary flex-1">
                                ✅ Prêt !
                            </button>
                        </div>

                        <button className="btn-primary w-full text-xl py-4">
                            🎮 LANCER LA PARTIE
                        </button>
                    </div>
                )}

            </div>
        </div>
    )
}

export default Lobby
