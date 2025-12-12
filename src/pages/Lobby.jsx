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
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    // ⚙️ Configuration de la partie (visible pour l'hôte)
    const [loupCount, setLoupCount] = useState(1)
    const [selectedRoles, setSelectedRoles] = useState(['voyante', 'sorciere']) // Rôles par défaut
    const [showConfig, setShowConfig] = useState(false) // Toggle configuration

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
            setIsLoading(false)
            setError(null)
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
            setIsLoading(false)
            setError(null)
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
            console.log('🎮 Jeu démarré !')
            const code = localStorage.getItem('roomCode')
            if (code) {
                console.log('✅ Navigation vers /game/' + code)
                // NE PAS fermer le socket ici, il sera réutilisé dans Game
                navigate(`/game/${code}`)
            } else {
                console.error('❌ Aucun roomCode dans localStorage !')
            }
        })

        // Écouter les erreurs
        newSocket.on('error', (data) => {
            console.error('❌ Erreur serveur:', data.message)
            setError(data.message)
            setIsLoading(false)
        })

        // 👢 Expulsion d'un joueur
        newSocket.on('playerKicked', (data) => {
            console.log('👢 Joueur expulsé:', data.kickedName)
            setPlayers(data.players)
            setError(`${data.kickedName} a été expulsé de la partie`)
            setTimeout(() => setError(null), 3000)
        })

        // Si je suis expulsé
        newSocket.on('kicked', (data) => {
            alert('⚠️ ' + data.message)
            localStorage.removeItem('playerId')
            localStorage.removeItem('roomCode')
            navigate('/lobby')
        })

        return () => newSocket.close()
    }, [navigate])

    // Fonction pour créer une salle
    const handleCreateRoom = () => {
        if (!playerName.trim()) {
            setError('Veuillez entrer un nom')
            return
        }
        if (!socket) {
            setError('Connexion au serveur en cours...')
            return
        }
        setIsLoading(true)
        setError(null)
        socket.emit('createRoom', { playerName })
    }

    // Fonction pour rejoindre une salle
    const handleJoinRoom = () => {
        if (!playerName.trim()) {
            setError('Veuillez entrer un nom')
            return
        }
        if (!roomCode.trim()) {
            setError('Veuillez entrer un code de salle')
            return
        }
        if (!socket) {
            setError('Connexion au serveur en cours...')
            return
        }
        setIsLoading(true)
        setError(null)
        socket.emit('joinRoom', { roomCode, playerName })
    }

    // 👢 Fonction pour expulser un joueur
    const handleKickPlayer = (playerId) => {
        if (!socket) return
        if (window.confirm('Voulez-vous vraiment expulser ce joueur ?')) {
            socket.emit('kickPlayer', { targetId: playerId })
        }
    }

    // Vérifier si je suis l'hôte
    const amIHost = () => {
        const myId = localStorage.getItem('playerId')
        return players.find(p => p.id === myId)?.isHost || false
    }

    // ⚙️ Toggle un rôle dans la sélection
    const toggleRole = (role) => {
        if (selectedRoles.includes(role)) {
            setSelectedRoles(selectedRoles.filter(r => r !== role))
        } else {
            setSelectedRoles([...selectedRoles, role])
        }
    }

    // ⚙️ Valider la configuration avant de lancer
    const validateConfig = () => {
        const playerCount = players.length

        // Vérifier qu'il y a assez de joueurs pour les rôles choisis
        if (selectedRoles.includes('cupidon') && playerCount < 4) {
            return 'Il faut au moins 4 joueurs pour jouer avec Cupidon'
        }
        if (selectedRoles.includes('chasseur') && playerCount < 5) {
            return 'Il faut au moins 5 joueurs pour jouer avec le Chasseur'
        }

        // Vérifier qu'il n'y a pas trop de loups
        const totalRoles = loupCount + selectedRoles.length
        if (loupCount >= playerCount) {
            return 'Il y a trop de loups ! Il faut au moins 1 villageois'
        }

        return null // Pas d'erreur
    }

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

                {/* Message d'erreur */}
                {error && (
                    <div className="mb-4 bg-red-900/30 border-2 border-red-600 rounded-lg p-4 animate-slideUp">
                        <p className="text-red-400 font-bold">❌ {error}</p>
                    </div>
                )}

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
                                onClick={handleCreateRoom}
                                disabled={isLoading}
                            >
                                {isLoading ? '⏳ Création...' : '🎮 Créer une salle'}
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
                                onClick={handleJoinRoom}
                                disabled={isLoading}
                            >
                                {isLoading ? '⏳ Connexion...' : '🚪 Rejoindre'}
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
                                        <div className="flex items-center gap-2">
                                            <span className={player.ready ? 'text-green-500' : 'text-gray-500'}>
                                                {player.isHost ? '👑' : player.ready ? '✅' : '⏳'}
                                            </span>
                                            {/* Bouton kick si je suis l'hôte et ce n'est pas moi */}
                                            {amIHost() && !player.isHost && (
                                                <button
                                                    onClick={() => handleKickPlayer(player.id)}
                                                    className="text-red-500 hover:text-red-400 text-lg"
                                                    title="Expulser ce joueur"
                                                >
                                                    👢
                                                </button>
                                            )}
                                        </div>
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
                            <>
                                {/* ⚙️ Bouton toggle configuration */}
                                <button
                                    onClick={() => setShowConfig(!showConfig)}
                                    className="w-full bg-night-800 hover:bg-night-700 text-gray-300 font-bold py-3 px-4 rounded-lg transition-all border-2 border-night-600 hover:border-blood-600 flex items-center justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="text-xl">⚙️</span>
                                        <span>Configuration de la partie</span>
                                    </span>
                                    <span className="text-2xl transform transition-transform duration-200" style={{ transform: showConfig ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                        ▼
                                    </span>
                                </button>

                                {/* ⚙️ Configuration de la partie (dépliable) */}
                                {showConfig && (
                                    <div className="card bg-night-900 border-2 border-blood-600 animate-slideUp">
                                        <h3 className="text-lg font-bold mb-4 text-blood flex items-center gap-2">
                                            ⚙️ Personnaliser les rôles
                                        </h3>

                                    {/* Nombre de loups */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-bold text-gray-300 mb-2">
                                            🐺 Nombre de loups
                                        </label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3].map(count => (
                                                <button
                                                    key={count}
                                                    onClick={() => setLoupCount(count)}
                                                    className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
                                                        loupCount === count
                                                            ? 'bg-blood-600 text-white border-2 border-blood-400 shadow-neon-red'
                                                            : 'bg-night-800 text-gray-400 border-2 border-night-600 hover:border-blood-600'
                                                    }`}
                                                >
                                                    {count} {count === 1 ? 'Loup' : 'Loups'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Rôles spéciaux */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-300 mb-2">
                                            ✨ Rôles spéciaux
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'voyante', emoji: '🔮', label: 'Voyante', minPlayers: 0 },
                                                { id: 'sorciere', emoji: '🧙‍♀️', label: 'Sorcière', minPlayers: 0 },
                                                { id: 'chasseur', emoji: '🏹', label: 'Chasseur', minPlayers: 5 },
                                                { id: 'cupidon', emoji: '💘', label: 'Cupidon', minPlayers: 4 },
                                                { id: 'riche', emoji: '💰', label: 'Riche', minPlayers: 0 },
                                                { id: 'livreur', emoji: '🍕', label: 'Livreur', minPlayers: 0 },
                                            ].map(role => {
                                                const isSelected = selectedRoles.includes(role.id)
                                                const isDisabled = role.minPlayers > 0 && players.length < role.minPlayers

                                                return (
                                                    <button
                                                        key={role.id}
                                                        onClick={() => !isDisabled && toggleRole(role.id)}
                                                        disabled={isDisabled}
                                                        className={`p-3 rounded-lg font-bold transition-all text-left ${
                                                            isDisabled
                                                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50'
                                                                : isSelected
                                                                    ? 'bg-green-600 text-white border-2 border-green-400'
                                                                    : 'bg-night-800 text-gray-300 border-2 border-night-600 hover:border-green-600'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span>
                                                                {role.emoji} {role.label}
                                                            </span>
                                                            {isSelected && <span className="text-xl">✓</span>}
                                                        </div>
                                                        {isDisabled && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                Min. {role.minPlayers} joueurs
                                                            </div>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {/* Info villageois */}
                                        <div className="mt-3 text-xs text-gray-500 bg-night-800 p-2 rounded">
                                            ℹ️ Les villageois seront ajoutés automatiquement pour compléter
                                        </div>
                                    </div>

                                    {/* Récapitulatif */}
                                    <div className="mt-4 p-3 bg-night-800 rounded-lg border border-blood-600/30">
                                        <div className="text-sm text-gray-400">
                                            <div className="font-bold text-white mb-2">📊 Récapitulatif :</div>
                                            <div>• {loupCount} {loupCount === 1 ? 'Loup' : 'Loups'} 🐺</div>
                                            {selectedRoles.length > 0 && (
                                                <div>• {selectedRoles.length} rôle{selectedRoles.length > 1 ? 's' : ''} spécial{selectedRoles.length > 1 ? 'aux' : ''}</div>
                                            )}
                                            <div>• {Math.max(0, players.length - loupCount - selectedRoles.length)} Villageois 👤</div>
                                            <div className="mt-2 pt-2 border-t border-blood-600/30 font-bold text-white">
                                                Total : {players.length} joueurs
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                )}

                                {/* Bouton lancer avec validation */}
                                <button
                                    className="btn-primary w-full text-xl py-4"
                                    onClick={() => {
                                        const error = validateConfig()
                                        if (error) {
                                            setError(error)
                                            setTimeout(() => setError(null), 5000)
                                            return
                                        }
                                        if (socket) {
                                            socket.emit('startGame', {
                                                customRoles: selectedRoles,
                                                loupCount: loupCount
                                            })
                                        }
                                    }}
                                >
                                    🎮 LANCER LA PARTIE
                                </button>
                            </>
                        )}
                    </div>
                )}

            </div>
        </div>
    )
}

export default Lobby
