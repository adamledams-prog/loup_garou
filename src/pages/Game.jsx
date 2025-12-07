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
    const [showWitchModal, setShowWitchModal] = useState(false)
    const [witchAction, setWitchAction] = useState(null) // 'heal' ou 'poison'
    const [timeRemaining, setTimeRemaining] = useState(60) // Timer de phase
    const [killedTonight, setKilledTonight] = useState(null) // Victime de la nuit (pour sorcière)
    const [voteProgress, setVoteProgress] = useState({ voted: 0, total: 0 }) // Compteur de votes
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const newSocket = io(config.serverUrl)
        setSocket(newSocket)

        // Récupérer les infos du localStorage pour rejoindre la room
        const storedPlayerId = localStorage.getItem('playerId')
        const storedRoomCode = localStorage.getItem('roomCode')

        // Vérifier cohérence URL et localStorage
        if (!storedPlayerId || !storedRoomCode) {
            console.error('❌ Pas de session sauvegardée')
            navigate('/lobby')
            return
        }

        if (roomCode && storedRoomCode !== roomCode) {
            console.error('❌ RoomCode URL ne correspond pas au localStorage')
            navigate('/lobby')
            return
        }

        // Attendre que le socket soit connecté avant d'émettre
        newSocket.on('connect', () => {
            console.log('✅ Socket Game connecté')
            // Reconnexion unifiée
            console.log('🔄 Reconnexion à la partie...')
            newSocket.emit('reconnectToGame', {
                roomCode: storedRoomCode,
                playerId: storedPlayerId
            })
        })

        // Recevoir l'état du jeu (reconnexion OU démarrage)
        newSocket.on('gameState', (data) => {
            console.log('État du jeu reçu:', data)
            setMyRole(data.role)
            setPhase(data.phase)
            setNightNumber(data.nightNumber)
            setPlayers(data.players)
            if (data.phaseTimeRemaining) {
                setTimeRemaining(data.phaseTimeRemaining)
            }
            if (data.killedTonight) {
                setKilledTonight(data.killedTonight)
            }
            setIsLoading(false)
            setError(null)
        })

        // Recevoir le démarrage initial du jeu
        newSocket.on('gameStarted', (data) => {
            console.log('🎮 Jeu démarré, données initiales:', data)
            setMyRole(data.role)
            setPhase(data.phase)
            setNightNumber(data.nightNumber)
            setPlayers(data.players)
            setIsLoading(false)
            setError(null)
        })

        // Phase de nuit
        newSocket.on('nightPhase', (data) => {
            console.log('Phase de nuit:', data)
            setPhase('night')
            setNightNumber(data.nightNumber)
            setPlayers(data.players)
            if (data.killedTonight) {
                setKilledTonight(data.killedTonight)
            }
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
            setVoteProgress({ voted: 0, total: data.players.filter(p => p.alive).length })
        })

        // Progression des votes
        newSocket.on('voteProgress', (data) => {
            setVoteProgress({ voted: data.voted, total: data.total })
        })

        // Fin de partie
        newSocket.on('gameOver', (data) => {
            alert(`Partie terminée ! ${data.winner} a gagné !`)
            navigate('/')
        })

        // Timer de phase
        newSocket.on('phaseTimer', (data) => {
            setTimeRemaining(data.timeRemaining)
        })

        // Messages chat
        newSocket.on('chatMessage', (data) => {
            setMessages(prev => [...prev, data])
        })

        // Erreurs
        newSocket.on('error', (data) => {
            console.error('❌ Erreur:', data.message)
            setError(data.message)
            setTimeout(() => setError(null), 5000) // Effacer après 5s
        })

        // Voyante : rôle révélé
        newSocket.on('roleRevealed', (data) => {
            alert(`🔮 ${data.targetName} est ${data.targetRole}`)
        })

        // Cupidon : vous êtes amoureux
        newSocket.on('inLove', (data) => {
            alert(`💘 Vous êtes amoureux avec ${data.partnerName} !`)
        })

        // Chasseur : vengeance
        newSocket.on('hunterRevenge', (data) => {
            alert(`🏹 ${data.message}`)
            setPhase('hunter') // Passer en mode chasseur
        })

        // Chasseur a tiré
        newSocket.on('hunterShot', (data) => {
            alert(`🏹 ${data.hunterName} a tiré sur ${data.targetName} !`)
        })

        return () => newSocket.close()
    }, [navigate, roomCode])

    const handleAction = () => {
        // Si sorcière, ouvrir la modal de choix (pas besoin de sélection pour soigner)
        if (myRole === 'sorciere') {
            setShowWitchModal(true)
            return
        }

        // Pour les autres rôles, vérifier qu'un joueur est sélectionné
        if (!selectedPlayer || !socket) return

        // Déterminer l'action selon le rôle
        let action = 'unknown'

        switch (myRole) {
            case 'loup':
                action = 'kill'
                break
            case 'voyante':
                action = 'see'
                break
            case 'livreur':
                action = 'protect'
                break
            case 'cupidon':
                action = 'couple'
                break
            case 'chasseur':
                action = 'shoot'
                break
            case 'riche':
            case 'villageois':
                // Ces rôles n'ont pas d'action de nuit
                return
            default:
                return
        }

        socket.emit('nightAction', {
            action,
            targetId: selectedPlayer
        })

        setSelectedPlayer(null)
    }

    const handleWitchAction = () => {
        if (!witchAction || !socket) return

        // Si soigner, on soigne automatiquement la victime (pas besoin de cible)
        if (witchAction === 'heal') {
            socket.emit('nightAction', {
                action: 'heal',
                targetId: killedTonight // Soigner la victime
            })
            setShowWitchModal(false)
            setWitchAction(null)
            setSelectedPlayer(null)
            return
        }

        // Si poison, on a besoin d'une cible
        if (witchAction === 'poison' && !selectedPlayer) {
            setError('Sélectionnez un joueur à empoisonner')
            return
        }

        socket.emit('nightAction', {
            action: witchAction,
            targetId: selectedPlayer
        })

        setShowWitchModal(false)
        setWitchAction(null)
        setSelectedPlayer(null)
    }

    const handleVote = () => {
        if (!selectedPlayer || !socket) return

        socket.emit('vote', { targetId: selectedPlayer })
        setSelectedPlayer(null)
    }

    const handleHunterShoot = () => {
        if (!selectedPlayer || !socket) return

        socket.emit('hunterShoot', { targetId: selectedPlayer })
        setSelectedPlayer(null)
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

                {/* Message d'erreur */}
                {error && (
                    <div className="mb-4 bg-red-900/30 border-2 border-red-600 rounded-lg p-4 animate-slideUp">
                        <p className="text-red-400 font-bold">❌ {error}</p>
                    </div>
                )}

                {/* Loading state */}
                {isLoading ? (
                    <div className="card-glow text-center py-12">
                        <div className="text-6xl mb-4 animate-pulse">🐺</div>
                        <h2 className="text-2xl font-bold text-blood mb-2">Connexion en cours...</h2>
                        <p className="text-gray-400">Récupération de l'état de la partie</p>
                    </div>
                ) : (
                    <>
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
                                                phase === 'hunter' ? '🏹 Vengeance du Chasseur' :
                                                    '⚖️ Phase de Vote'}
                                    </h3>
                                    <p className="text-gray-300 mb-3">
                                        {phase === 'night' ? `Nuit ${nightNumber} - Les rôles spéciaux agissent...` :
                                            phase === 'day' ? 'Discutez et trouvez les loups-garous' :
                                                phase === 'hunter' ? 'Le chasseur choisit sa cible...' :
                                                    'Votez pour éliminer un joueur'}
                                    </p>

                                    {/* Timer visuel */}
                                    <div className="mt-3">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <span className="text-3xl">⏱️</span>
                                            <span className={`text-4xl font-black ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                                {timeRemaining}s
                                            </span>
                                        </div>
                                        <div className="w-full bg-night-900 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${timeRemaining > 30 ? 'bg-green-500' :
                                                    timeRemaining > 10 ? 'bg-yellow-500' :
                                                        'bg-red-500'
                                                    }`}
                                                style={{ width: `${(timeRemaining / 60) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Grille de joueurs */}
                                <div className="card">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-bold">
                                            👥 Joueurs {
                                                phase === 'night' && ['loup', 'voyante', 'sorciere', 'livreur', 'cupidon'].includes(myRole)
                                                    ? '(Cliquez pour agir)'
                                                    : phase === 'vote'
                                                        ? '(Cliquez pour voter)'
                                                        : ''
                                            }
                                        </h3>
                                        {/* Compteur de votes */}
                                        {phase === 'vote' && voteProgress.total > 0 && (
                                            <div className="bg-blood-900/30 border-2 border-blood-600 rounded-lg px-3 py-1">
                                                <span className="text-blood-400 font-bold text-sm">
                                                    ⚖️ {voteProgress.voted}/{voteProgress.total} votes
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {players.map((player) => {
                                            // Déterminer si ce joueur peut être cliqué
                                            const isNightActive = phase === 'night' && ['loup', 'voyante', 'sorciere', 'livreur', 'cupidon'].includes(myRole)
                                            const isHunterActive = phase === 'hunter' && myRole === 'chasseur'
                                            const canClick = player.alive && (isNightActive || isHunterActive || phase === 'vote')

                                            return (
                                                <div
                                                    key={player.id}
                                                    onClick={() => {
                                                        if (canClick) {
                                                            setSelectedPlayer(player.id)
                                                        }
                                                    }}
                                                    className={`p-4 rounded-xl text-center transition-all relative
                                                ${!player.alive ? 'bg-gray-900 opacity-50' : 'bg-night-800'}
                                                ${canClick ? 'cursor-pointer hover:bg-blood-900/30' : 'cursor-default'}
                                                ${selectedPlayer === player.id ? 'border-2 border-blood-600 shadow-neon-red' : 'border-2 border-transparent hover:border-blood-600'}
                                            `}
                                                >
                                                    {/* Badge "A agi" pour la nuit */}
                                                    {phase === 'night' && player.hasActed && (
                                                        <div className="absolute top-1 right-1 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                                                            ✅ A agi
                                                        </div>
                                                    )}

                                                    <div className="text-3xl mb-2">{player.alive ? '😊' : '💀'}</div>
                                                    <p className="font-bold">{player.name}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {player.alive ? 'En vie' : 'Mort'}
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Bouton d'action */}
                                    {/* Sorcière : toujours afficher le bouton */}
                                    {myRole === 'sorciere' && phase === 'night' && (
                                        <button
                                            onClick={handleAction}
                                            className="btn-primary w-full mt-4"
                                        >
                                            🧙‍♀️ Ouvrir les potions
                                        </button>
                                    )}

                                    {/* Chasseur : tirer en vengeance */}
                                    {myRole === 'chasseur' && phase === 'hunter' && selectedPlayer && (
                                        <button
                                            onClick={handleHunterShoot}
                                            className="btn-primary w-full mt-4"
                                        >
                                            🏹 Tirer sur {players.find(p => p.id === selectedPlayer)?.name}
                                        </button>
                                    )}

                                    {/* Autres rôles : afficher si sélection */}
                                    {myRole !== 'sorciere' && myRole !== 'chasseur' && selectedPlayer && (
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
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-lg font-bold">💬 Chat</h3>
                                        {/* Badge chat loups */}
                                        {phase === 'night' && myRole === 'loup' && (
                                            <div className="bg-blood-900/30 border border-blood-600 rounded-lg px-2 py-1">
                                                <span className="text-blood-400 text-xs font-bold">
                                                    🐺 Loups uniquement
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Message de restriction */}
                                    {phase === 'night' && myRole !== 'loup' && (
                                        <div className="bg-yellow-900/30 border-2 border-yellow-600 rounded-lg p-3 mb-3">
                                            <p className="text-yellow-400 text-sm">
                                                🌙 Le chat est désactivé pendant la nuit (sauf pour les loups)
                                            </p>
                                        </div>
                                    )}

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
                                            placeholder={phase === 'night' && myRole !== 'loup' ? 'Chat désactivé la nuit' : 'Écrivez un message...'}
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                            disabled={phase === 'night' && myRole !== 'loup'}
                                            className="flex-1 bg-night-800 border-2 border-night-600 focus:border-blood-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <button
                                            onClick={sendMessage}
                                            disabled={phase === 'night' && myRole !== 'loup'}
                                            className="bg-blood-600 hover:bg-blood-700 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            📤
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </>
                )}

            </div>

            {/* Modal Sorcière */}
            {showWitchModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-night-800 rounded-2xl p-6 max-w-md w-full border-2 border-blood-600 shadow-neon-red">
                        <h2 className="text-2xl font-bold text-blood mb-4">🧙‍♀️ Sorcière - Choisissez votre action</h2>

                        {/* Info victime */}
                        {killedTonight && (
                            <div className="bg-red-900/30 border-2 border-red-600 rounded-lg p-3 mb-4">
                                <p className="text-red-400 text-sm font-bold">
                                    ⚠️ {players.find(p => p.id === killedTonight)?.name || 'Un joueur'} va mourir cette nuit
                                </p>
                            </div>
                        )}

                        <div className="space-y-3 mb-6">
                            <button
                                onClick={() => {
                                    setWitchAction('heal')
                                    handleWitchAction()
                                }}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
                            >
                                💊 Soigner {killedTonight ? '(sauver la victime)' : '(aucune victime)'}
                            </button>

                            <button
                                onClick={() => setWitchAction('poison')}
                                disabled={!selectedPlayer}
                                className={`w-full font-bold py-3 px-4 rounded-lg transition-all ${selectedPlayer
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                ☠️ Empoisonner {selectedPlayer ? '(joueur sélectionné)' : '(sélectionnez un joueur)'}
                            </button>

                            <button
                                onClick={() => {
                                    setShowWitchModal(false)
                                    setWitchAction(null)
                                    setSelectedPlayer(null)
                                }}
                                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
                            >
                                🚫 Ne rien faire
                            </button>
                        </div>

                        {witchAction === 'poison' && selectedPlayer && (
                            <button
                                onClick={handleWitchAction}
                                className="w-full bg-blood-600 hover:bg-blood-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
                            >
                                ✅ Confirmer l'empoisonnement
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Game
