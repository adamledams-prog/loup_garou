import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import io from 'socket.io-client'
import config from '../config'

function Game() {
    const { roomCode } = useParams()
    const navigate = useNavigate()

    const [socket, setSocket] = useState(null)
    const [myRole, setMyRole] = useState(null)
    const [players, setPlayers] = useState([])
    const [phase, setPhase] = useState('night')
    const [nightNumber, setNightNumber] = useState(1)
    const [selectedPlayer, setSelectedPlayer] = useState(null)
    const [messages, setMessages] = useState([])
    const [messageInput, setMessageInput] = useState('')

    useEffect(() => {
        const newSocket = io(config.serverUrl)
        setSocket(newSocket)

        // Récupérer les infos du localStorage pour rejoindre la room
        const storedPlayerId = localStorage.getItem('playerId')
        const storedRoomCode = localStorage.getItem('roomCode')

        if (storedPlayerId && storedRoomCode) {
            // Rejoindre la partie en cours
            newSocket.emit('reconnectToGame', {
                roomCode: storedRoomCode,
                playerId: storedPlayerId
            })
        }

        // Recevoir l'état du jeu lors de la reconnexion
        newSocket.on('gameState', (data) => {
            console.log('État du jeu reçu:', data)
            setMyRole(data.role)
            setPhase(data.phase)
            setNightNumber(data.nightNumber)
            setPlayers(data.players)
        })

        // Recevoir le rôle et démarrage du jeu
        newSocket.on('gameStarted', (data) => {
            console.log('Jeu démarré:', data)
            setMyRole(data.role)
            setPlayers(data.players)
            setPhase(data.phase)
            setNightNumber(data.nightNumber)
        })

        // Phase de nuit
        newSocket.on('nightPhase', (data) => {
            console.log('Phase de nuit:', data)
            setPhase('night')
            setNightNumber(data.nightNumber)
            setPlayers(data.players)
        })

        // Phase de jour
        newSocket.on('dayPhase', (data) => {
            console.log('Phase de jour:', data)
            setPhase('day')
            setPlayers(data.players)
            if (data.killedPlayer) {
                alert(`${data.killedPlayer} est mort cette nuit...`)
            }
        })

        // Phase de vote
        newSocket.on('votePhase', (data) => {
            setPhase('vote')
            setPlayers(data.players)
        })

        // Fin de partie
        newSocket.on('gameOver', (data) => {
            alert(`Partie terminée ! ${data.winner} a gagné !`)
            navigate('/')
        })

        // Messages chat
        newSocket.on('chatMessage', (data) => {
            setMessages(prev => [...prev, data])
        })

        // Erreurs
        newSocket.on('error', (data) => {
            alert(data.message)
        })

        return () => newSocket.close()
    }, [navigate])

    const handleAction = () => {
        if (!selectedPlayer || !socket) return

        socket.emit('nightAction', {
            action: myRole === 'loup' ? 'kill' : myRole === 'voyante' ? 'see' : 'heal',
            targetId: selectedPlayer
        })

        setSelectedPlayer(null)
        alert('Action enregistrée !')
    }

    const handleVote = () => {
        if (!selectedPlayer || !socket) return

        socket.emit('vote', { targetId: selectedPlayer })
        setSelectedPlayer(null)
        alert('Vote enregistré !')
    }

    const sendMessage = () => {
        if (!messageInput.trim() || !socket) return

        socket.emit('chatMessage', { message: messageInput })
        setMessageInput('')
    }

    const getRoleEmoji = (role) => {
        const emojis = {
            'loup': '🐺',
            'voyante': '🔮',
            'sorciere': '🧙‍♀️',
            'chasseur': '🏹',
            'cupidon': '💘',
            'riche': '💰',
            'livreur': '🍕',
            'villageois': '👤'
        }
        return emojis[role] || '👤'
    }

    const getRoleDescription = (role) => {
        const descriptions = {
            'loup': 'Éliminez les villageois sans vous faire démasquer',
            'voyante': 'Voyez le rôle d\'un joueur chaque nuit',
            'sorciere': 'Une potion de vie, une potion de mort',
            'chasseur': 'Si vous mourez, éliminez un joueur',
            'cupidon': 'Créez un couple au début de la partie',
            'riche': 'Votre vote compte double',
            'livreur': 'Protégez un joueur chaque nuit',
            'villageois': 'Trouvez les loups-garous et votez le jour'
        }
        return descriptions[role] || 'Participez au vote pour éliminer les loups'
    }

    return (
        <div className="min-h-screen p-4">
            <div className="max-w-6xl mx-auto">

                {/* En-tête */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-blood">
                            🐺 Partie en cours
                        </h1>
                        <p className="text-gray-500 text-sm">Salle: {roomCode}</p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="btn-secondary text-sm"
                    >
                        ❌ Quitter
                    </button>
                </div>

                {/* Zone de jeu principale */}
                <div className="grid lg:grid-cols-3 gap-6">

                    {/* Jeu principal */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Rôle du joueur */}
                        <div className="card-glow text-center">
                            <div className="text-6xl mb-3">{getRoleEmoji(myRole)}</div>
                            <h2 className="text-3xl font-black text-blood mb-2">
                                {myRole ? myRole.charAt(0).toUpperCase() + myRole.slice(1) : 'Chargement...'}
                            </h2>
                            <p className="text-gray-400">
                                {myRole ? getRoleDescription(myRole) : 'En attente...'}
                            </p>
                        </div>

                        {/* Phase actuelle */}
                        <div className={`card text-center ${phase === 'night' ? 'bg-gradient-to-r from-night-800 to-blood-900/50' :
                            phase === 'day' ? 'bg-gradient-to-r from-yellow-900/50 to-orange-900/50' :
                                'bg-gradient-to-r from-blood-800 to-blood-900/50'
                            }`}>
                            <h3 className="text-2xl font-bold mb-2">
                                {phase === 'night' ? '🌙 Phase de Nuit' :
                                    phase === 'day' ? '☀️ Phase de Jour' :
                                        '⚖️ Phase de Vote'}
                            </h3>
                            <p className="text-gray-300">
                                {phase === 'night' ? `Nuit ${nightNumber} - Les rôles spéciaux agissent...` :
                                    phase === 'day' ? 'Discutez et trouvez les loups-garous' :
                                        'Votez pour éliminer un joueur'}
                            </p>
                        </div>

                        {/* Grille de joueurs */}
                        <div className="card">
                            <h3 className="text-xl font-bold mb-4">
                                👥 Joueurs {phase === 'night' && myRole === 'loup' ? '(Cliquez pour tuer)' :
                                    phase === 'vote' ? '(Cliquez pour voter)' : ''}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {players.map((player) => (
                                    <div
                                        key={player.id}
                                        onClick={() => {
                                            if (player.alive && ((phase === 'night' && myRole === 'loup') || phase === 'vote')) {
                                                setSelectedPlayer(player.id)
                                            }
                                        }}
                                        className={`p-4 rounded-xl text-center cursor-pointer border-2 transition-all
                                            ${!player.alive ? 'bg-gray-900 opacity-50' : 'bg-night-800 hover:bg-blood-900/30'}
                                            ${selectedPlayer === player.id ? 'border-blood-600 shadow-neon-red' : 'border-transparent hover:border-blood-600'}
                                        `}
                                    >
                                        <div className="text-3xl mb-2">{player.alive ? '😊' : '💀'}</div>
                                        <p className="font-bold">{player.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {player.alive ? 'En vie' : 'Mort'}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Bouton d'action */}
                            {selectedPlayer && (
                                <button
                                    onClick={phase === 'vote' ? handleVote : handleAction}
                                    className="btn-primary w-full mt-4"
                                >
                                    {phase === 'vote' ? '⚖️ Voter' : '✅ Confirmer l\'action'}
                                </button>
                            )}
                        </div>

                    </div>

                    {/* Panneau latéral (Chat + Info) */}
                    <div className="space-y-6">

                        {/* Info de la partie */}
                        <div className="card">
                            <h3 className="text-lg font-bold mb-3 text-blood">📊 Statistiques</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Nuit :</span>
                                    <span className="font-bold">{nightNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Vivants :</span>
                                    <span className="font-bold">
                                        {players.filter(p => p.alive).length}/{players.length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Phase :</span>
                                    <span className="font-bold">
                                        {phase === 'night' ? '🌙' : phase === 'day' ? '☀️' : '⚖️'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Chat */}
                        <div className="card h-96 flex flex-col">
                            <h3 className="text-lg font-bold mb-3">💬 Chat</h3>
                            <div className="flex-1 bg-night-900 rounded-lg p-3 mb-3 overflow-y-auto">
                                {messages.length === 0 ? (
                                    <p className="text-gray-500 text-sm italic">Aucun message</p>
                                ) : (
                                    messages.map((msg, index) => (
                                        <div key={index} className="mb-2">
                                            <span className="font-bold text-blood-500">{msg.playerName}: </span>
                                            <span className="text-gray-300">{msg.message}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Écrivez un message..."
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    className="flex-1 bg-night-800 border-2 border-night-600 focus:border-blood-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 transition-all outline-none"
                                />
                                <button
                                    onClick={sendMessage}
                                    className="bg-blood-600 hover:bg-blood-700 px-4 rounded-lg transition-all"
                                >
                                    📤
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    )
}

export default Game
