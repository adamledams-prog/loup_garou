import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import io from 'socket.io-client'
import config from '../config'

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
        console.log('🔌 Connexion Socket.io vers:', config.serverUrl)
        const newSocket = io(config.serverUrl)
        setSocket(newSocket)

        newSocket.on('connect', () => {
            console.log('✅ Socket.io connecté !')
        })

        newSocket.on('connect_error', (error) => {
            console.error('❌ Erreur connexion Socket.io:', error)
        })

        // Écouter la création de salle
        newSocket.on('roomCreated', (data) => {
            console.log('Salle créée:', data)
            setRoomCode(data.roomCode)
            setPlayers(data.players)
            setView('waiting')
            // Sauvegarder pour reconnexion
            localStorage.setItem('playerId', data.playerId)
            localStorage.setItem('roomCode', data.roomCode)
        })

        // Écouter le join de salle
        newSocket.on('roomJoined', (data) => {
            console.log('Salle rejointe:', data)
            setRoomCode(data.roomCode)
            setPlayers(data.players)
            setView('waiting')
            // Sauvegarder pour reconnexion
            localStorage.setItem('playerId', data.playerId)
            localStorage.setItem('roomCode', data.roomCode)
        })

        // Écouter les nouveaux joueurs
        newSocket.on('playerJoined', (data) => {
            console.log('Nouveau joueur:', data)
            setPlayers(data.players)
        })

        // Écouter les changements de statut prêt
        newSocket.on('playerReady', (data) => {
            console.log('Statut prêt mis à jour:', data)
            setPlayers(data.players)
        })

        // Écouter le démarrage de la partie
        newSocket.on('gameStarted', (data) => {
            console.log('🎮 Jeu démarré, data reçue:', data)
            // Sauvegarder les données du jeu dans localStorage
            localStorage.setItem('gameData', JSON.stringify({
                role: data.role,
                players: data.players,
                phase: data.phase,
                nightNumber: data.nightNumber
            }))
            // Toujours utiliser localStorage car il est à jour
            const code = localStorage.getItem('roomCode')
            console.log('📍 RoomCode depuis localStorage:', code)
            if (code) {
                console.log('✅ Navigation vers /game/' + code)
                // Fermer le socket Lobby avant de naviguer
                newSocket.close()
                navigate(`/game/${code}`)
            } else {
                console.error('❌ Aucun roomCode dans localStorage !')
            }
        })

        // Écouter les erreurs
        newSocket.on('error', (data) => {
            alert(data.message)
        })

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
                    <div className="space-y-4 animate-slideUp">
                        <div className="card-glow">
                            <h2 className="text-2xl font-bold mb-4 text-blood">Créer une partie</h2>
                            <input
                                type="text"
                                placeholder="Votre nom"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                className="input-primary mb-4"
                            />
                            <button
                                className="btn-primary w-full"
                                onClick={() => {
                                    if (playerName.trim() && socket) {
                                        socket.emit('createRoom', { playerName })
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
                                className="input-primary mb-3"
                            />
                            <input
                                type="text"
                                placeholder="ABC123"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                className="input-code mb-4"
                                maxLength={6}
                            />
                            <button
                                className="btn-secondary w-full"
                                onClick={() => {
                                    if (playerName.trim() && roomCode.trim() && socket) {
                                        socket.emit('joinRoom', { roomCode, playerName })
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
                                {roomCode || 'ABC123'}
                            </div>
                            <p className="text-sm text-gray-500">Partagez ce code avec vos amis</p>
                        </div>

                        <div className="card">
                            <h3 className="text-xl font-bold mb-4 text-gray-300">
                                👥 Joueurs ({players.length}/10)
                            </h3>
                            <div className="space-y-2">
                                {players.map((player, index) => (
                                    <div key={player.id} className="bg-night-800 p-3 rounded-lg flex justify-between items-center">
                                        <span className="font-bold">
                                            {player.name} {player.isHost && '(Hôte)'}
                                        </span>
                                        <span className={player.ready ? 'text-green-500' : 'text-gray-500'}>
                                            {player.isHost ? '👑' : player.ready ? '✅' : '⏳'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                className="btn-secondary flex-1"
                                onClick={() => {
                                    if (socket) socket.close()
                                    navigate('/')
                                }}
                            >
                                ❌ Quitter
                            </button>
                            <button
                                className="btn-primary flex-1"
                                onClick={() => {
                                    if (socket) {
                                        socket.emit('toggleReady')
                                    }
                                }}
                            >
                                {players.find(p => p.id === localStorage.getItem('playerId'))?.ready ? '✅ Prêt !' : '⏳ Pas prêt'}
                            </button>
                        </div>

                        {/* Bouton Lancer visible uniquement pour l'hôte */}
                        {players.find(p => p.id === localStorage.getItem('playerId'))?.isHost && (
                            <button
                                className="btn-primary w-full text-xl py-4"
                                onClick={() => {
                                    if (socket) socket.emit('startGame')
                                }}
                            >
                                🎮 LANCER LA PARTIE
                            </button>
                        )}
                    </div>
                )}

            </div>
        </div>
    )
}

export default Lobby
