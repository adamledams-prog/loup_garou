import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import io from 'socket.io-client'
import { QRCodeSVG } from 'qrcode.react'
import config from '../config'
import { useParticleSystem } from '../utils/particles'
import { audioManager } from '../utils/audioManager'
import { vibrate, shareRoomCode } from '../utils/mobile'

function Lobby() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [socket, setSocket] = useState(null)
    const [view, setView] = useState('menu') // menu, create, join, waiting
    const [playerName, setPlayerName] = useState('')
    const [roomCode, setRoomCode] = useState('')
    const [room, setRoom] = useState(null)
    const [players, setPlayers] = useState([])
    const [isReady, setIsReady] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    // 🎨 Avatars
    const [selectedAvatar, setSelectedAvatar] = useState('😊')
    const avatarList = ['😊', '🦊', '🐱', '🐻', '🦁', '🐼', '🦝', '🦉', '🐸', '🐰', '🐯', '🐨', '🐵', '🐷', '🐮', '🐔', '🐺', '🦆', '🦄', '🐉']

    // 🎊 Système de particules
    const canvasRef = useRef(null)
    const { triggerConfetti, stopAnimation } = useParticleSystem(canvasRef)

    // 🎠 Carousel 3D
    const [currentSlide, setCurrentSlide] = useState(0)
    const [touchStart, setTouchStart] = useState(null)
    const [touchEnd, setTouchEnd] = useState(null)

    // 📲 QR Code modal
    const [showQRCode, setShowQRCode] = useState(false)

    // 🔍 Modal prévisualisation des rôles
    const [showRolesModal, setShowRolesModal] = useState(false)

    // Minimum swipe distance (en px)
    const minSwipeDistance = 50

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % players.length)
    }

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + players.length) % players.length)
    }

    // Touch handlers pour mobile
    const onTouchStart = (e) => {
        setTouchEnd(null)
        setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX)
    }

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return

        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance

        if (isLeftSwipe) {
            nextSlide()
        } else if (isRightSwipe) {
            prevSlide()
        }
    }

    // Keyboard navigation pour le carousel
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (view !== 'waiting' || players.length <= 1) return

            if (e.key === 'ArrowLeft') {
                prevSlide()
            } else if (e.key === 'ArrowRight') {
                nextSlide()
            }
        }

        window.addEventListener('keydown', handleKeyPress)
        return () => window.removeEventListener('keydown', handleKeyPress)
    }, [view, players.length, currentSlide])

    const getCarouselTransform = (index) => {
        const total = players.length
        const angle = (360 / total) * (index - currentSlide)
        const radius = 280 // Distance du centre

        return {
            transform: `
                translate(-50%, -50%)
                rotateY(${angle}deg)
                translateZ(${radius}px)
                rotateY(${-angle}deg)
            `,
            opacity: Math.abs(index - currentSlide) === 0 ? 1 :
                     Math.abs(index - currentSlide) === 1 ? 0.6 :
                     Math.abs(index - currentSlide) === total - 1 ? 0.6 : 0.3,
            pointerEvents: Math.abs(index - currentSlide) === 0 ? 'auto' : 'none'
        }
    }

    // ⚙️ Configuration de la partie (visible pour l'hôte)
    const [loupCount, setLoupCount] = useState(1)
    const [selectedRoles, setSelectedRoles] = useState(['voyante', 'sorciere']) // Rôles par défaut
    const [showConfig, setShowConfig] = useState(false) // Toggle configuration
    const [copySuccess, setCopySuccess] = useState(false) // Toast "Copié !"
    const [rapidMode, setRapidMode] = useState(false) // ⚡ Mode Rapide

    // Helper pour obtenir l'emoji d'un rôle
    const getRoleEmoji = (role) => {
        const emojiMap = {
            'loup': '🐺',
            'voyante': '🔮',
            'sorciere': '🧪',
            'chasseur': '🎯',
            'cupidon': '💘',
            'riche': '💰',
            'livreur': '📦',
            'villageois': '👤'
        }
        return emojiMap[role] || '❓'
    }

    // 📖 Base de données complète des rôles avec descriptions
    const rolesDatabase = {
        'loup': {
            name: 'Loup-Garou',
            emoji: '🐺',
            team: 'Loups',
            description: 'Éliminez les villageois chaque nuit sans vous faire démasquer.',
            powers: [
                'Se réveille chaque nuit avec les autres loups',
                'Vote pour tuer un villageois',
                'Peut communiquer avec les autres loups via le chat'
            ],
            tips: 'Coordonnez-vous avec votre meute et mentez le jour !',
            difficulty: 'Moyen'
        },
        'voyante': {
            name: 'Voyante',
            emoji: '🔮',
            team: 'Village',
            description: 'Voyez le rôle d\'un joueur chaque nuit pour guider le village.',
            powers: [
                'Découvre le rôle d\'un joueur chaque nuit',
                'Information cruciale pour le village',
                'Doit rester discrète pour ne pas être ciblée'
            ],
            tips: 'Ne révélez pas votre identité trop tôt !',
            difficulty: 'Facile'
        },
        'sorciere': {
            name: 'Sorcière',
            emoji: '🧙‍♀️',
            team: 'Village',
            description: 'Une potion de vie pour ressusciter, une potion de mort pour éliminer.',
            powers: [
                'Potion de vie : ressuscite la victime de la nuit (1x)',
                'Potion de mort : élimine un joueur (1x)',
                'Peut utiliser les deux la même nuit',
                'Connaît la victime des loups'
            ],
            tips: 'Gardez vos potions pour les moments critiques !',
            difficulty: 'Difficile'
        },
        'chasseur': {
            name: 'Chasseur',
            emoji: '🏹',
            team: 'Village',
            description: 'Si vous mourez, emportez quelqu\'un avec vous !',
            powers: [
                'Quand il meurt, il tire sur un joueur de son choix',
                'Peut changer le cours de la partie',
                'Fonctionne même éliminé par le village'
            ],
            tips: 'Visez bien, c\'est votre unique tir !',
            difficulty: 'Facile'
        },
        'cupidon': {
            name: 'Cupidon',
            emoji: '💘',
            team: 'Village',
            description: 'Créez un couple amoureux la première nuit.',
            powers: [
                'Première nuit : désigne deux joueurs amoureux',
                'Si l\'un meurt, l\'autre meurt de chagrin',
                'Les amoureux peuvent être de camps différents'
            ],
            tips: 'Un couple mixte (loup + villageois) peut tout changer !',
            difficulty: 'Moyen'
        },
        'riche': {
            name: 'Riche',
            emoji: '💰',
            team: 'Village',
            description: 'Votre fortune vous donne une voix plus forte !',
            powers: [
                'Son vote compte double lors des votes du village',
                'Peut influencer fortement les décisions',
                'Simple villageois la nuit'
            ],
            tips: 'Utilisez votre influence avec sagesse !',
            difficulty: 'Facile'
        },
        'livreur': {
            name: 'Livreur',
            emoji: '🍕',
            team: 'Village',
            description: 'Protégez un joueur chaque nuit de votre livraison !',
            powers: [
                'Protège un joueur chaque nuit (sauf lui-même)',
                'Le joueur protégé survit aux loups',
                'Ne peut pas protéger 2x de suite la même personne'
            ],
            tips: 'Protégez les rôles importants révélés !',
            difficulty: 'Moyen'
        },
        'villageois': {
            name: 'Villageois',
            emoji: '👤',
            team: 'Village',
            description: 'Pas de pouvoir spécial, mais votre vote compte !',
            powers: [
                'Participe aux votes du jour',
                'Doit analyser et démasquer les loups',
                'Force dans le nombre'
            ],
            tips: 'Écoutez, observez, votez intelligemment !',
            difficulty: 'Facile'
        }
    }

    // 📲 Détecter le paramètre ?join= dans l'URL (pour QR code)
    useEffect(() => {
        const joinCode = searchParams.get('join')
        if (joinCode) {
            console.log('📲 Code détecté dans QR:', joinCode)
            setRoomCode(joinCode.toUpperCase())
            setView('join') // Afficher directement le formulaire de join
        }
    }, [searchParams])

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

            // 🎊 Trigger confetti si un joueur devient ready
            if (canvasRef.current) {
                const newReadyPlayer = data.players.find(p => p.ready && !players.find(old => old.id === p.id && old.ready))
                if (newReadyPlayer) {
                    // Position aléatoire dans l'écran
                    const x = Math.random() * window.innerWidth
                    const y = Math.random() * (window.innerHeight / 2) + 100
                    triggerConfetti(x, y, 50)
                    // 🔊 Son ready
                    audioManager.beep(660, 0.15, 0.5)
                    // 📳 Vibration ready
                    vibrate.ready()
                }
            }
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
        socket.emit('createRoom', {
            playerName,
            avatar: selectedAvatar,
            rapidMode: rapidMode
        })
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
        socket.emit('joinRoom', { roomCode, playerName, avatar: selectedAvatar })
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
            {/* 🎊 Canvas pour particules */}
            <canvas
                ref={canvasRef}
                className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
                width={window.innerWidth}
                height={window.innerHeight}
            />

            <div className="w-full max-w-2xl">

                {/* En-tête */}
                <div className="text-center mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="btn-secondary mb-6 text-sm"
                    >
                        ← Retour au menu
                    </button>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-2">
                        <span className="text-blood">🐺 Lobby</span>
                    </h1>
                    <p className="text-sm md:text-base text-gray-400">Rejoignez ou créez une partie</p>
                    <button
                        onClick={() => navigate('/regles')}
                        className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        📖 Voir les règles
                    </button>
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

                            {/* Sélecteur d'avatar */}
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-300 mb-2">
                                    🎨 Choisis ton avatar
                                </label>
                                <div className="grid grid-cols-8 md:grid-cols-10 gap-2">
                                    {avatarList.map((avatar, index) => (
                                        <button
                                            key={avatar}
                                            type="button"
                                            onClick={() => {
                                                setSelectedAvatar(avatar)
                                                audioManager.playAvatarChoice()
                                                vibrate.tap()
                                            }}
                                            className={`text-2xl md:text-3xl p-2 rounded-lg transition-all hover:scale-110 scale-hover bounce-in ${
                                                selectedAvatar === avatar
                                                    ? 'bg-blood-600 ring-4 ring-blood-400 scale-110'
                                                    : 'bg-night-800 hover:bg-night-700'
                                            }`}
                                            style={{
                                                animationDelay: `${index * 0.03}s`,
                                                minHeight: '48px',
                                                minWidth: '48px'
                                            }}
                                        >
                                            {avatar}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                className="btn-primary w-full ripple-container"
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

                            {/* Sélecteur d'avatar */}
                            <div className="mb-3">
                                <label className="block text-sm font-bold text-gray-300 mb-2">
                                    🎨 Choisis ton avatar
                                </label>
                                <div className="grid grid-cols-10 gap-2">
                                    {avatarList.map((avatar, index) => (
                                        <button
                                            key={avatar}
                                            type="button"
                                            onClick={() => {
                                                setSelectedAvatar(avatar)
                                                audioManager.playAvatarChoice()
                                                vibrate.tap()
                                            }}
                                            className={`text-3xl p-2 rounded-lg transition-all hover:scale-110 scale-hover bounce-in ${
                                                selectedAvatar === avatar
                                                    ? 'bg-blood-600 ring-4 ring-blood-400 scale-110'
                                                    : 'bg-night-800 hover:bg-night-700'
                                            }`}
                                            style={{ animationDelay: `${index * 0.03}s` }}
                                        >
                                            {avatar}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <input
                                type="text"
                                placeholder="ABC123"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                className="input-code mb-4 input-glow"
                                maxLength={6}
                            />
                            <button
                                className="btn-secondary w-full ripple-container"
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
                            <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
                                <div className="text-5xl font-black tracking-widest text-blood">
                                    {roomCode || 'ABC123'}
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(roomCode)
                                        setCopySuccess(true)
                                        vibrate.tap()
                                        setTimeout(() => setCopySuccess(false), 2000)
                                    }}
                                    className="btn-secondary text-sm px-4 py-2 hover:scale-110 transition-transform"
                                >
                                    {copySuccess ? '✅ Copié !' : '📋 Copier'}
                                </button>
                                <button
                                    onClick={async () => {
                                        const result = await shareRoomCode(roomCode)
                                        if (result.success) {
                                            vibrate.success()
                                            if (result.fallback === 'clipboard') {
                                                setCopySuccess(true)
                                                setTimeout(() => setCopySuccess(false), 2000)
                                            }
                                        } else {
                                            vibrate.error()
                                        }
                                    }}
                                    className="btn-primary text-sm px-4 py-2 hover:scale-110 transition-transform"
                                >
                                    📤 Partager
                                </button>
                                {/* ✨ Nouveau bouton QR Code */}
                                <button
                                    onClick={() => {
                                        setShowQRCode(true)
                                        vibrate.tap()
                                        audioManager.beep(440, 0.05, 0.3)
                                    }}
                                    className="btn-secondary text-sm px-4 py-2 hover:scale-110 transition-transform flex items-center gap-2"
                                >
                                    📱 QR Code
                                </button>
                            </div>
                            <p className="text-sm text-gray-500">Partagez ce code avec vos amis</p>
                        </div>

                        <div className="card">
                            <h3 className="text-xl font-bold mb-4 text-gray-300 flex items-center justify-center gap-3">
                                <span>
                                    👥 Joueurs ({players.filter(p => p.ready || p.isHost).length}/{players.length})
                                </span>
                                {players.length > 1 && players.filter(p => p.ready || p.isHost).length === players.length && (
                                    <span className="text-green-500 text-sm font-bold animate-pulse">
                                        ✅ Tous prêts !
                                    </span>
                                )}
                            </h3>

                            {/* 🎠 Carousel 3D */}
                            {players.length > 0 && (
                                <div
                                    className="carousel-3d"
                                    onTouchStart={onTouchStart}
                                    onTouchMove={onTouchMove}
                                    onTouchEnd={onTouchEnd}
                                >
                                    <div className="carousel-track">
                                        {players.map((player, index) => (
                                            <div
                                                key={player.id}
                                                className={`carousel-card ${index === currentSlide ? 'active' : ''}`}
                                                style={getCarouselTransform(index)}
                                            >
                                                <div className="carousel-card-content">
                                                    {/* Avatar */}
                                                    <div className="text-8xl mb-4 drop-shadow-2xl animate-bounce-in">
                                                        {player.avatar || '😊'}
                                                    </div>

                                                    {/* Nom */}
                                                    <h4 className="text-2xl font-black text-white mb-2 drop-shadow-lg">
                                                        {player.name}
                                                    </h4>

                                                    {/* Badges */}
                                                    <div className="flex items-center gap-2 mb-4">
                                                        {player.isHost && (
                                                            <span className="text-xs bg-yellow-900/50 text-yellow-400 px-3 py-1 rounded-full border border-yellow-700/50 font-bold">
                                                                👑 Hôte
                                                            </span>
                                                        )}
                                                        <span className={`text-xs px-3 py-1 rounded-full border font-bold ${
                                                            player.ready
                                                                ? 'bg-green-900/50 text-green-400 border-green-700/50'
                                                                : 'bg-gray-800/50 text-gray-400 border-gray-700/50'
                                                        }`}>
                                                            {player.isHost ? '👑 Organisateur' : player.ready ? '✅ Prêt' : '⏳ En attente'}
                                                        </span>
                                                    </div>

                                                    {/* Actions */}
                                                    {amIHost() && !player.isHost && index === currentSlide && (
                                                        <button
                                                            onClick={() => handleKickPlayer(player.id)}
                                                            className="mt-4 btn-secondary text-sm px-4 py-2 hover:bg-red-900/50 hover:border-red-600 hover:text-red-400 transition-all"
                                                        >
                                                            👢 Expulser
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Navigation buttons */}
                                    {players.length > 1 && (
                                        <>
                                            <button
                                                onClick={prevSlide}
                                                className="carousel-nav-btn prev"
                                                aria-label="Joueur précédent"
                                            >
                                                <span className="text-2xl text-white font-bold">‹</span>
                                            </button>
                                            <button
                                                onClick={nextSlide}
                                                className="carousel-nav-btn next"
                                                aria-label="Joueur suivant"
                                            >
                                                <span className="text-2xl text-white font-bold">›</span>
                                            </button>
                                        </>
                                    )}

                                    {/* Indicators */}
                                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-2">
                                        {players.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentSlide(index)}
                                                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                                    index === currentSlide
                                                        ? 'bg-blood-600 w-8'
                                                        : 'bg-gray-600 hover:bg-gray-500'
                                                }`}
                                                aria-label={`Aller au joueur ${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Bouton Ajouter Bot (visible uniquement pour l'hôte) */}
                            {amIHost() && players.length < 10 && (
                                <button
                                    onClick={() => {
                                        if (socket) {
                                            socket.emit('addBot')
                                        }
                                    }}
                                    className="w-full mt-3 bg-blue-900/40 hover:bg-blue-800/60 border-2 border-blue-600 text-blue-300 font-bold py-3 px-4 rounded-lg transition-all hover:scale-105"
                                >
                                    🤖 Ajouter un Bot
                                </button>
                            )}
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
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-blood flex items-center gap-2">
                                                ⚙️ Personnaliser les rôles
                                            </h3>
                                            <button
                                                onClick={() => {
                                                    setShowRolesModal(true)
                                                    vibrate.tap()
                                                    audioManager.beep(440, 0.05, 0.3)
                                                }}
                                                className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                                            >
                                                📖 Guide des rôles
                                            </button>
                                        </div>

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

                                    {/* ⚡ Mode Rapide */}
                                    <div className="mt-4 p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-2 border-yellow-600/50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-yellow-400 flex items-center gap-2">
                                                    ⚡ Mode Rapide
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    Nuit: 30s • Jour: 15s • Vote: 30s
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setRapidMode(!rapidMode)}
                                                className={`relative w-16 h-8 rounded-full transition-all ${
                                                    rapidMode ? 'bg-yellow-600' : 'bg-gray-600'
                                                }`}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                                                    rapidMode ? 'translate-x-9' : 'translate-x-1'
                                                }`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Récapitulatif visuel */}
                                    <div className="mt-4 p-4 bg-night-800 rounded-lg border border-blood-600/30">
                                        <div className="font-bold text-white mb-3 text-center">📊 Composition de la partie</div>

                                        {/* Grille des rôles */}
                                        <div className="flex flex-wrap gap-2 justify-center mb-3">
                                            {/* Loups */}
                                            {Array.from({ length: loupCount }).map((_, i) => (
                                                <div key={`loup-${i}`}
                                                     className="w-12 h-12 bg-blood-900/40 border border-blood-600 rounded-lg flex items-center justify-center text-2xl hover:scale-110 transition-transform"
                                                     title="Loup-Garou">
                                                    🐺
                                                </div>
                                            ))}

                                            {/* Rôles spéciaux */}
                                            {selectedRoles.map((role, i) => (
                                                <div key={`role-${i}`}
                                                     className="w-12 h-12 bg-blue-900/40 border border-blue-600 rounded-lg flex items-center justify-center text-2xl hover:scale-110 transition-transform"
                                                     title={role.charAt(0).toUpperCase() + role.slice(1)}>
                                                    {getRoleEmoji(role)}
                                                </div>
                                            ))}

                                            {/* Villageois */}
                                            {Array.from({ length: Math.max(0, players.length - loupCount - selectedRoles.length) }).map((_, i) => (
                                                <div key={`villageois-${i}`}
                                                     className="w-12 h-12 bg-gray-800/40 border border-gray-600 rounded-lg flex items-center justify-center text-2xl hover:scale-110 transition-transform"
                                                     title="Villageois">
                                                    👤
                                                </div>
                                            ))}
                                        </div>

                                        {/* Total */}
                                        <div className="text-center pt-3 border-t border-blood-600/30">
                                            <span className="text-white font-bold text-lg">
                                                {players.length} joueurs
                                            </span>
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

            {/* 📱 Modal QR Code */}
            {showQRCode && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
                    onClick={() => setShowQRCode(false)}
                >
                    <div
                        className="card max-w-md w-full space-y-6 animate-slideUp"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            <h2 className="text-3xl font-black mb-2">
                                📱 Scanner pour rejoindre
                            </h2>
                            <p className="text-gray-400 text-sm">
                                Vos amis peuvent scanner ce QR code pour rejoindre automatiquement
                            </p>
                        </div>

                        {/* QR Code */}
                        <div className="bg-white p-6 rounded-2xl flex items-center justify-center">
                            <QRCodeSVG
                                value={`${window.location.origin}/lobby?join=${roomCode}`}
                                size={250}
                                level="H"
                                includeMargin={true}
                                imageSettings={{
                                    src: '/icon-192.svg',
                                    height: 40,
                                    width: 40,
                                    excavate: true,
                                }}
                            />
                        </div>

                        {/* Message explicatif */}
                        <div className="text-center text-sm text-gray-400 mt-2">
                            <p>🎯 Scannez ce QR code pour</p>
                            <p className="font-bold text-white">rejoindre directement la partie !</p>
                        </div>

                        {/* Code en grand */}
                        <div className="text-center">
                            <p className="text-gray-400 text-sm mb-2">Ou entrer le code :</p>
                            <div className="text-5xl font-black tracking-widest text-blood">
                                {roomCode}
                            </div>
                        </div>

                        {/* Boutons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/lobby?join=${roomCode}`)
                                    vibrate.success()
                                    audioManager.beep(440, 0.05, 0.3)
                                }}
                                className="btn-secondary flex-1"
                            >
                                📋 Copier le lien
                            </button>
                            <button
                                onClick={() => {
                                    setShowQRCode(false)
                                    vibrate.tap()
                                }}
                                className="btn-primary flex-1"
                            >
                                ✅ Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 📖 Modal Guide des rôles */}
            {showRolesModal && (
                <div
                    className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto"
                    onClick={() => setShowRolesModal(false)}
                >
                    <div
                        className="card max-w-4xl w-full my-8 animate-slideUp max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-night-900 pb-4 border-b border-blood-600 mb-6 z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-3xl font-black">
                                    📖 Guide des Rôles
                                </h2>
                                <button
                                    onClick={() => setShowRolesModal(false)}
                                    className="text-4xl text-gray-400 hover:text-white transition-colors"
                                >
                                    ×
                                </button>
                            </div>
                            <p className="text-gray-400 text-sm mt-2">
                                Découvrez tous les rôles et leurs pouvoirs
                            </p>
                        </div>

                        {/* Grille des rôles */}
                        <div className="space-y-4">
                            {Object.entries(rolesDatabase).map(([roleId, role]) => (
                                <div
                                    key={roleId}
                                    className="bg-gradient-to-br from-night-800/90 to-night-900/90 rounded-xl p-6 border-2 border-night-700 hover:border-blood-600 transition-all duration-300"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Emoji et info de base */}
                                        <div className="text-center">
                                            <div className="text-6xl mb-2">{role.emoji}</div>
                                            <div className={`text-xs px-2 py-1 rounded-full font-bold ${
                                                role.team === 'Loups'
                                                    ? 'bg-red-900/50 text-red-300 border border-red-700'
                                                    : 'bg-green-900/50 text-green-300 border border-green-700'
                                            }`}>
                                                {role.team}
                                            </div>
                                        </div>

                                        {/* Contenu */}
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-2xl font-black text-white">
                                                    {role.name}
                                                </h3>
                                                <div className="text-xs px-3 py-1 rounded-full bg-purple-900/50 text-purple-300 border border-purple-700 font-bold">
                                                    {role.difficulty}
                                                </div>
                                            </div>

                                            <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                                                {role.description}
                                            </p>

                                            {/* Pouvoirs */}
                                            <div className="mb-3">
                                                <div className="text-sm font-bold text-blood mb-2">
                                                    ✨ Pouvoirs :
                                                </div>
                                                <ul className="space-y-1">
                                                    {role.powers.map((power, idx) => (
                                                        <li key={idx} className="text-xs text-gray-400 flex items-start gap-2">
                                                            <span className="text-blood mt-0.5">•</span>
                                                            <span>{power}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Conseils */}
                                            <div className="bg-blood-900/20 border border-blood-800/50 rounded-lg p-3">
                                                <div className="text-xs font-bold text-blood mb-1">
                                                    💡 Conseil :
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {role.tips}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bouton fermer en bas */}
                        <div className="sticky bottom-0 bg-night-900 pt-6 border-t border-blood-600 mt-6">
                            <button
                                onClick={() => setShowRolesModal(false)}
                                className="btn-primary w-full"
                            >
                                ✅ Compris, fermer le guide
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Lobby
