import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import io from 'socket.io-client'
import config from '../config'
import { useParticleSystem } from '../utils/particles'
import { soundManager } from '../utils/sound'

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
    const [hasActed, setHasActed] = useState(false) // ✅ Flag pour savoir si le joueur a déjà agi
    const [actionSuccess, setActionSuccess] = useState(null) // ✅ Message de confirmation
    const [gameOver, setGameOver] = useState(null) // 🏁 État game over avec infos
    const [isConnected, setIsConnected] = useState(true) // 📡 État de connexion
    const [reconnecting, setReconnecting] = useState(false) // 🔄 Tentative de reconnexion

    // 🎊 Système de particules
    const canvasRef = useRef(null)
    const { triggerDeath, triggerVote, stopAnimation } = useParticleSystem(canvasRef)

    // 📊 Statistiques de la partie
    const [gameStartTime, setGameStartTime] = useState(null)
    const [totalNights, setTotalNights] = useState(0)
    const [totalDeaths, setTotalDeaths] = useState(0)

    // 🎬 Overlay de transition de phase
    const [phaseTransition, setPhaseTransition] = useState(null) // { phase: 'night', nightNumber: 1 }

    // 💬 Messages non lus dans le chat loup
    const [unreadWolfMessages, setUnreadWolfMessages] = useState(0)
    const [chatVisible, setChatVisible] = useState(false) // Pour savoir si le chat est visible

    // 📜 Historique des événements
    const [eventHistory, setEventHistory] = useState([])
    const [showHistory, setShowHistory] = useState(false)

    // 😊 Picker emoji
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const quickEmojis = ['😂', '❤️', '😱', '🤔', '👍', '👎']

    // 💀 Animation de mort
    const [dyingPlayers, setDyingPlayers] = useState([]) // IDs des joueurs en train de mourir

    // 🔔 Système de notifications stylées
    const [notification, setNotification] = useState(null) // { type, icon, title, message }

    // 🎭 Processing avec narration
    const [isProcessing, setIsProcessing] = useState(false)

    // Fermer le picker emoji si on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showEmojiPicker && !e.target.closest('.emoji-picker-container')) {
                setShowEmojiPicker(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showEmojiPicker])

    // 💀 Détecter les joueurs qui meurent et déclencher l'animation
    useEffect(() => {
        if (players.length === 0) return

        const newDead = players.filter(p => !p.alive && !dyingPlayers.includes(p.id))
        if (newDead.length > 0) {
            // Ajouter à la liste des mourants
            setDyingPlayers(prev => [...prev, ...newDead.map(p => p.id)])

            // Retirer après l'animation (1.5s)
            setTimeout(() => {
                setDyingPlayers(prev => prev.filter(id => !newDead.map(p => p.id).includes(id)))
            }, 1500)
        }
    }, [players])

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
            setHasActed(false) // ✅ Réinitialiser au démarrage
            setActionSuccess(null)
            setIsLoading(false)
            setError(null)

            // 📊 Initialiser les stats
            setGameStartTime(Date.now())
            setTotalNights(0)
            setTotalDeaths(0)
            setEventHistory([]) // 📜 Réinitialiser l'historique
            addEvent('start', 'La partie commence !', '🎮')
        })

        // Phase de nuit
        newSocket.on('nightPhase', (data) => {
            console.log('Phase de nuit:', data)

            // 🎬 Afficher la transition
            setPhaseTransition({ phase: 'night', nightNumber: data.nightNumber })
            setTimeout(() => setPhaseTransition(null), 2500) // Masquer après 2.5s

            setPhase('night')
            setNightNumber(data.nightNumber)
            setPlayers(data.players)
            setHasActed(false) // ✅ Réinitialiser à chaque nouvelle nuit
            setActionSuccess(null)
            setSelectedPlayer(null) // ✅ Désélectionner le joueur
            setUnreadWolfMessages(0) // 💬 Réinitialiser messages non lus

            // 📜 Log événement
            addEvent('night', `Nuit ${data.nightNumber}`, '🌙')

            // 🔊 Son transition nuit
            soundManager.playPhaseChange('night')

            if (data.killedTonight) {
                setKilledTonight(data.killedTonight)
            }

            // 📊 Incrémenter le compteur de nuits
            setTotalNights(prev => prev + 1)
        })        // Phase de jour
        newSocket.on('dayPhase', (data) => {
            console.log('Phase de jour:', data)

            // 🎬 Afficher la transition
            setPhaseTransition({ phase: 'day' })
            setTimeout(() => setPhaseTransition(null), 2500)

            setPhase('day')
            setPlayers(data.players)
            setHasActed(false) // ✅ Réinitialiser (pas d'action le jour mais préparer pour vote)
            setActionSuccess(null)
            setSelectedPlayer(null)

            // 📜 Log événement
            addEvent('day', 'Le village se réveille', '☀️')

            // 🔊 Son transition jour
            soundManager.playPhaseChange('day')

            if (data.killedPlayer) {
                addEvent('death', `💀 ${data.killedPlayer} est mort cette nuit`, '💀')
                showNotification('death', '💀', 'Victime de la nuit', `${data.killedPlayer} est mort cette nuit...`)
                // 📊 Incrémenter le compteur de morts
                setTotalDeaths(prev => prev + 1)

                // 🎊 Trigger particules de mort
                if (canvasRef.current) {
                    const x = Math.random() * window.innerWidth
                    const y = Math.random() * (window.innerHeight / 2) + 100
                    triggerDeath(x, y, 40)
                }

                // 🔊 Son mort
                soundManager.playDeath()
            }
        })

        // Phase de vote
        newSocket.on('votePhase', (data) => {
            // 🎬 Afficher la transition
            setPhaseTransition({ phase: 'vote' })
            setTimeout(() => setPhaseTransition(null), 2500)

            setPhase('vote')
            setPlayers(data.players)
            setHasActed(false) // ✅ Réinitialiser pour le vote
            setActionSuccess(null)
            setSelectedPlayer(null)
            setVoteProgress({ voted: 0, total: data.players.filter(p => p.alive).length })

            // 📜 Log événement
            addEvent('vote', 'Phase de vote commence', '⚖️')
        })

        // Progression des votes
        newSocket.on('voteProgress', (data) => {
            setVoteProgress({ voted: data.voted, total: data.total })
        })

        // Fin de partie
        newSocket.on('gameOver', (data) => {
            console.log('🏁 Game Over:', data)
            setGameOver(data) // Stocker les infos de fin de partie
            setPhase('gameOver')
            setHasActed(false) // ✅ Réinitialiser
            setSelectedPlayer(null)

            // 🔊 Son victoire/défaite
            if (data.winner === 'villageois') {
                soundManager.playVictory()
            } else {
                soundManager.playDefeat()
            }
        })

        // Timer de phase
        newSocket.on('phaseTimer', (data) => {
            setTimeRemaining(data.timeRemaining)

            // 🔊 Son timer critique
            if (data.timeRemaining === 10) {
                soundManager.playTimerCritical()
            } else if (data.timeRemaining === 0) {
                soundManager.playTimerEnd()
            }
        })

        // Messages chat
        newSocket.on('chatMessage', (data) => {
            setMessages(prev => [...prev, data])

            // 🔊 Son message
            soundManager.playMessage()

            // Si c'est un message loup et que je suis loup et que le chat n'est pas visible, incrémenter
            if (phase === 'night' && myRole === 'loup' && data.playerId !== localStorage.getItem('playerId') && !chatVisible) {
                setUnreadWolfMessages(prev => prev + 1)
            }
        })

        // Erreurs
        newSocket.on('error', (data) => {
            console.error('❌ Erreur:', data.message)

            // Si partie introuvable ou joueur introuvable, rediriger vers lobby
            if (data.message.includes('introuvable')) {
                showNotification('error', '❌', 'Erreur', `${data.message}\n\nVous allez être redirigé vers le lobby.`, 3000)
                // Nettoyer le localStorage
                localStorage.removeItem('playerId')
                localStorage.removeItem('roomCode')
                // Rediriger après 2s
                setTimeout(() => {
                    navigate('/lobby')
                }, 2000)
                return
            }

            setError(data.message)
            setTimeout(() => setError(null), 5000) // Effacer après 5s
        })

        // ✅ Confirmation d'action
        newSocket.on('actionConfirmed', () => {
            setHasActed(true)
            setActionSuccess('✅ Action enregistrée !')
            setTimeout(() => setActionSuccess(null), 3000) // Effacer après 3s
        })

        // ✅ Confirmation de vote
        newSocket.on('voteConfirmed', () => {
            setHasActed(true)
            setActionSuccess('⚖️ Vote enregistré !')
            setTimeout(() => setActionSuccess(null), 3000)
        })

        // Voyante : rôle révélé
        newSocket.on('roleRevealed', (data) => {
            showNotification('info', '🔮', 'Vision de la Voyante', `${data.targetName} est ${data.targetRole}`)
        })

        // Cupidon : vous êtes amoureux
        newSocket.on('inLove', (data) => {
            showNotification('love', '💘', 'Cupidon vous a choisi !', `Vous êtes amoureux avec ${data.partnerName} !`, 8000)
        })

        // Chasseur : vengeance
        newSocket.on('hunterRevenge', (data) => {
            showNotification('hunter', '🏹', 'Vengeance du Chasseur', data.message, 7000)
            setPhase('hunter') // Passer en mode chasseur
            setHasActed(false) // ✅ Réinitialiser pour le tir du chasseur
            setActionSuccess(null)
            setSelectedPlayer(null)
        })

        // Chasseur a tiré
        newSocket.on('hunterShot', (data) => {
            showNotification('hunter', '🏹', 'Tir du Chasseur', `${data.hunterName} a tiré sur ${data.targetName} !`)
        })

        // 📡 Gestion des déconnexions/reconnexions
        newSocket.on('disconnect', (reason) => {
            console.warn('⚠️ Déconnecté:', reason)
            setIsConnected(false)
            setReconnecting(true)
        })

        newSocket.on('connect', () => {
            console.log('✅ Reconnecté !')
            setIsConnected(true)
            setReconnecting(false)

            // Si reconnexion, redemander l'état du jeu
            const storedPlayerId = localStorage.getItem('playerId')
            const storedRoomCode = localStorage.getItem('roomCode')
            if (storedPlayerId && storedRoomCode) {
                newSocket.emit('reconnectToGame', {
                    roomCode: storedRoomCode,
                    playerId: storedPlayerId
                })
            }
        })

        newSocket.io.on('reconnect_attempt', () => {
            console.log('🔄 Tentative de reconnexion...')
        })

        newSocket.io.on('reconnect_failed', () => {
            console.error('❌ Reconnexion échouée')
            setError('Impossible de se reconnecter au serveur')
            setReconnecting(false)
        })

        // 🔒 Gestion du processing phase (serveur en train de traiter)
        newSocket.on('processingPhase', (data) => {
            if (data.processing) {
                console.log('🔒 Serveur en phase de traitement, UI désactivée')
                setIsProcessing(true)
                // Désactiver après 3 secondes max (normalement le dayPhase arrive avant)
                setTimeout(() => setIsProcessing(false), 3000)
            } else {
                setIsProcessing(false)
            }
        })

        return () => newSocket.close()
    }, [navigate, roomCode])

    const handleAction = () => {
        // 🔒 Empêcher les actions multiples
        if (hasActed) return

        // Si sorcière, ouvrir la modal de choix (pas besoin de sélection pour soigner)
        if (myRole === 'sorciere') {
            setShowWitchModal(true)
            return
        }

        // Pour les autres rôles, vérifier qu'un joueur est sélectionné
        if (!selectedPlayer || !socket) return

        // 🔒 Bloquer immédiatement pour éviter double-clic
        setHasActed(true)

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

        // 🔒 Empêcher les actions multiples
        if (hasActed) return

        // 🔒 Bloquer immédiatement
        setHasActed(true)

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
            setHasActed(false) // ✅ Débloquer car erreur
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

        // 🔒 Empêcher les votes multiples
        if (hasActed) return

        // 🔒 Bloquer immédiatement
        setHasActed(true)

        socket.emit('vote', { targetId: selectedPlayer })
        setSelectedPlayer(null)

        // 🎊 Explosion de vote
        if (canvasRef.current) {
            const x = Math.random() * window.innerWidth
            const y = Math.random() * (window.innerHeight / 2) + 100
            triggerVote(x, y, 40)
        }

        // 🔊 Son vote
        soundManager.playVote()
    }

    const handleHunterShoot = () => {
        if (!selectedPlayer || !socket) return

        // 🔒 Empêcher les tirs multiples
        if (hasActed) return

        // 🔒 Bloquer immédiatement
        setHasActed(true)

        socket.emit('hunterShoot', { targetId: selectedPlayer })
        setSelectedPlayer(null)
    }

    const sendMessage = () => {
        if (!messageInput.trim() || !socket) return

        socket.emit('chatMessage', { message: messageInput })
        setMessageInput('')
    }

    const insertEmoji = (emoji) => {
        setMessageInput(prev => prev + emoji)
        setShowEmojiPicker(false)
    }

    // 🔔 Afficher une notification stylée
    const showNotification = (type, icon, title, message, duration = 5000) => {
        setNotification({ type, icon, title, message })
        setTimeout(() => setNotification(null), duration)
    }

    const handleReplay = () => {
        // Retourner au lobby pour créer une nouvelle partie
        navigate('/lobby')
    }

    // 📜 Fonction pour ajouter un événement à l'historique
    const addEvent = (type, message, icon = '📌') => {
        const newEvent = {
            id: Date.now(),
            type, // 'night', 'day', 'vote', 'death', 'action'
            message,
            icon,
            timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }
        setEventHistory(prev => [...prev, newEvent])
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

    // 🎭 Textes de narration
    const getNarration = (phase, nightNumber, context = {}) => {
        const narrations = {
            night: [
                `La nuit ${nightNumber} tombe sur le village... Les loups-garous ouvrent les yeux. 🐺`,
                `Le silence de la nuit ${nightNumber} est brisé par les hurlements lointains... 🌙`,
                `Nuit ${nightNumber}. Les créatures de l'ombre se réveillent... 🌑`,
                `Pendant que le village dort, les forces obscures s'activent... Nuit ${nightNumber}. 🦇`
            ],
            day: [
                `L'aube se lève sur le village... Que s'est-il passé cette nuit ? ☀️`,
                `Le coq chante, les villageois se rassemblent sur la place... 🐓`,
                `Un nouveau jour commence. Les habitants découvrent avec effroi... 🌅`,
                `Le soleil révèle les horreurs de la nuit... Le village est en émoi. 🌄`
            ],
            vote: [
                `Il est temps de voter ! Qui doit être éliminé du village ? ⚖️`,
                `Les villageois se réunissent pour désigner le coupable... 🗳️`,
                `L'heure du jugement a sonné. Qui mérite la sentence ? ⚖️`,
                `Le village doit choisir : qui sera banni aujourd'hui ? 👥`
            ],
            loading: [
                `Les esprits de la nuit délibèrent... 🌙`,
                `Le destin s'écrit dans l'ombre... 📜`,
                `Les forces mystiques opèrent... ✨`,
                `Le temps s'écoule lentement dans le village endormi... ⏳`
            ]
        }

        const texts = narrations[phase] || narrations.loading
        return texts[Math.floor(Math.random() * texts.length)]
    }

    return (
        <div className="min-h-screen p-4">
            {/* 🎊 Canvas pour particules */}
            <canvas
                ref={canvasRef}
                className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
                width={window.innerWidth}
                height={window.innerHeight}
            />

            {/* 🔔 Notification Popup Stylée */}
            {notification && (
                <div className="fixed top-4 right-4 z-[100] animate-fadeIn">
                    <div className={`max-w-md bg-gradient-to-br rounded-xl shadow-2xl border-2 p-6 ${
                        notification.type === 'death' ? 'from-gray-900 to-gray-800 border-gray-600' :
                        notification.type === 'love' ? 'from-pink-900 to-red-900 border-pink-500' :
                        notification.type === 'hunter' ? 'from-orange-900 to-red-900 border-orange-500' :
                        notification.type === 'info' ? 'from-blue-900 to-indigo-900 border-blue-500' :
                        'from-night-800 to-night-900 border-blood-600'
                    }`}>
                        <div className="flex items-start gap-4">
                            <div className="text-5xl flex-shrink-0">{notification.icon}</div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-1">{notification.title}</h3>
                                <p className="text-gray-300 whitespace-pre-line">{notification.message}</p>
                            </div>
                            <button
                                onClick={() => setNotification(null)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🎬 Overlay de transition de phase avec Narrateur */}
            {phaseTransition && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 animate-fadeIn">
                    <div className="text-center animate-slideUp max-w-3xl px-8">
                        {/* Icône animée */}
                        <div className="text-9xl mb-6 animate-bounce">
                            {phaseTransition.phase === 'night' ? '🌙' :
                             phaseTransition.phase === 'day' ? '☀️' : '⚖️'}
                        </div>

                        {/* Titre de phase */}
                        <h2 className="text-6xl font-black text-blood mb-6 drop-shadow-2xl">
                            {phaseTransition.phase === 'night' ? `Nuit ${phaseTransition.nightNumber}` :
                             phaseTransition.phase === 'day' ? 'Lever du Jour' : 'Jugement du Village'}
                        </h2>

                        {/* 🎭 Narration */}
                        <div className="bg-night-800/50 backdrop-blur-sm rounded-xl p-6 border-2 border-blood-600/30 mb-4">
                            <p className="text-2xl text-gray-300 italic leading-relaxed">
                                "{getNarration(phaseTransition.phase, phaseTransition.nightNumber)}"
                            </p>
                        </div>

                        {/* Points de chargement animés */}
                        <div className="flex justify-center gap-2 mt-6">
                            <div className="w-3 h-3 bg-blood-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-3 h-3 bg-blood-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-3 h-3 bg-blood-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🌙 Processing overlay - La nuit opère */}
            {isProcessing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fadeIn">
                    <div className="text-center max-w-2xl px-8">
                        {/* Lune tournante */}
                        <div className="text-9xl mb-6 animate-spin" style={{animationDuration: '3s'}}>
                            🌙
                        </div>

                        {/* Titre */}
                        <h2 className="text-5xl font-black text-blood mb-6 drop-shadow-2xl">
                            La Nuit Opère...
                        </h2>

                        {/* 🎭 Narration mystérieuse */}
                        <div className="bg-night-800/50 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-600/30 mb-4">
                            <p className="text-2xl text-gray-300 italic leading-relaxed">
                                "Les forces obscures accomplissent leurs sombres desseins..."
                            </p>
                        </div>

                        {/* Points de chargement */}
                        <div className="flex justify-center gap-2 mt-6">
                            <div className="w-4 h-4 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-4 h-4 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-4 h-4 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                    </div>
                </div>
            )}

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

                {/* Message de succès */}
                {actionSuccess && (
                    <div className="mb-4 bg-green-900/30 border-2 border-green-600 rounded-lg p-4 animate-slideUp">
                        <p className="text-green-400 font-bold">{actionSuccess}</p>
                    </div>
                )}

                {/* 📡 Bandeau de déconnexion/reconnexion */}
                {!isConnected && (
                    <div className="mb-4 bg-yellow-900/50 border-2 border-yellow-600 rounded-lg p-4 animate-pulse">
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-3xl">📡</span>
                            <div>
                                <p className="text-yellow-400 font-bold">
                                    {reconnecting ? '🔄 Tentative de reconnexion...' : '⚠️ Connexion perdue'}
                                </p>
                                <p className="text-yellow-300 text-sm">
                                    {reconnecting ? 'Veuillez patienter...' : 'Vérifiez votre connexion Internet'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 🎭 Loading state avec Narrateur */}
                {isLoading ? (
                    <div className="card-glow text-center py-16 max-w-2xl mx-auto">
                        {/* Icône pulsante */}
                        <div className="text-8xl mb-6 animate-pulse">🌙</div>

                        {/* Titre */}
                        <h2 className="text-4xl font-black text-blood mb-6">Connexion à la partie...</h2>

                        {/* 🎭 Narration de chargement */}
                        <div className="bg-night-900/50 rounded-xl p-6 border-2 border-blood-600/30 mb-6">
                            <p className="text-xl text-gray-300 italic leading-relaxed">
                                "{getNarration('loading')}"
                            </p>
                        </div>

                        {/* Barre de progression */}
                        <div className="w-full h-2 bg-night-700 rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-gradient-to-r from-blood-600 to-blood-400 animate-pulse"></div>
                        </div>

                        {/* Points de chargement */}
                        <div className="flex justify-center gap-2 mt-4">
                            <div className="w-3 h-3 bg-blood-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-3 h-3 bg-blood-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-3 h-3 bg-blood-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>

                        <p className="text-gray-500 text-sm mt-6">Récupération de l'état de la partie...</p>
                    </div>
                ) : gameOver ? (
                    /* 🏁 Écran de fin de partie avec Narration */
                    <div className="card-glow text-center py-12">
                        {/* Icône de victoire */}
                        <div className="text-9xl mb-6 animate-bounce">
                            {gameOver.winner === 'villageois' ? '🎉' : '🐺'}
                        </div>

                        {/* Titre dramatique */}
                        <h2 className="text-5xl font-black text-blood mb-4 drop-shadow-2xl">
                            {gameOver.winner === 'villageois' ? '🎉 Victoire des Villageois !' : '🐺 Victoire des Loups-Garous !'}
                        </h2>

                        {/* 🎭 Narration de fin */}
                        <div className="bg-night-900/50 rounded-xl p-6 border-2 border-blood-600/30 mb-8 max-w-2xl mx-auto">
                            <p className="text-2xl text-gray-300 italic leading-relaxed">
                                "{gameOver.winner === 'villageois'
                                    ? 'Le soleil se lève sur un village libéré. Les loups-garous ont été démasqués et vaincus. La paix est revenue...'
                                    : 'Les hurlements déchirent la nuit. Les loups-garous règnent désormais sur le village en ruines. L\'obscurité a triomphé...'}
                                "
                            </p>
                        </div>

                        {/* 📊 Statistiques de la partie */}
                        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
                            <div className="bg-night-800 border border-blood-600/30 rounded-lg p-4">
                                <div className="text-3xl mb-2">🌙</div>
                                <div className="text-2xl font-bold text-white">{totalNights}</div>
                                <div className="text-sm text-gray-400">Nuits</div>
                            </div>
                            <div className="bg-night-800 border border-blood-600/30 rounded-lg p-4">
                                <div className="text-3xl mb-2">💀</div>
                                <div className="text-2xl font-bold text-white">{totalDeaths}</div>
                                <div className="text-sm text-gray-400">Morts</div>
                            </div>
                            <div className="bg-night-800 border border-blood-600/30 rounded-lg p-4">
                                <div className="text-3xl mb-2">⏱️</div>
                                <div className="text-2xl font-bold text-white">
                                    {gameStartTime ? Math.floor((Date.now() - gameStartTime) / 60000) : 0}
                                </div>
                                <div className="text-sm text-gray-400">Minutes</div>
                            </div>
                        </div>

                        {/* 🏆 Stats enrichies */}
                        {gameOver.gameStats && (
                            <div className="bg-gradient-to-br from-yellow-900/20 to-amber-900/20 border-2 border-yellow-600/50 rounded-xl p-6 mb-8 max-w-2xl mx-auto">
                                <h3 className="text-2xl font-bold mb-6 text-center text-yellow-400">🏆 Récompenses</h3>
                                <div className="space-y-4">
                                    {gameOver.gameStats.mostTalkative && gameOver.gameStats.mostTalkative.count > 0 && (
                                        <div className="bg-night-800/50 rounded-lg p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-4xl">{gameOver.gameStats.mostTalkative.avatar || '😊'}</span>
                                                <div>
                                                    <div className="text-lg font-bold text-white">{gameOver.gameStats.mostTalkative.name}</div>
                                                    <div className="text-sm text-gray-400">Le plus bavard</div>
                                                </div>
                                            </div>
                                            <div className="text-2xl font-bold text-yellow-400">
                                                💬 {gameOver.gameStats.mostTalkative.count}
                                            </div>
                                        </div>
                                    )}

                                    {gameOver.gameStats.mvp && gameOver.gameStats.mvp.count > 0 && (
                                        <div className="bg-night-800/50 rounded-lg p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-4xl">{gameOver.gameStats.mvp.avatar || '😊'}</span>
                                                <div>
                                                    <div className="text-lg font-bold text-white">{gameOver.gameStats.mvp.name}</div>
                                                    <div className="text-sm text-gray-400">MVP - Plus actif aux votes</div>
                                                </div>
                                            </div>
                                            <div className="text-2xl font-bold text-yellow-400">
                                                🗳️ {gameOver.gameStats.mvp.count}
                                            </div>
                                        </div>
                                    )}

                                    {gameOver.gameStats.sneakiestWolf && gameOver.gameStats.sneakiestWolf.nights > 0 && (
                                        <div className="bg-night-800/50 rounded-lg p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-4xl">{gameOver.gameStats.sneakiestWolf.avatar || '🐺'}</span>
                                                <div>
                                                    <div className="text-lg font-bold text-white">{gameOver.gameStats.sneakiestWolf.name}</div>
                                                    <div className="text-sm text-gray-400">Loup le plus sournois</div>
                                                </div>
                                            </div>
                                            <div className="text-2xl font-bold text-yellow-400">
                                                🌙 {gameOver.gameStats.sneakiestWolf.nights} nuits
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tableau des joueurs */}
                        <div className="bg-night-900 rounded-xl p-6 mb-8 max-w-2xl mx-auto">
                            <h3 className="text-xl font-bold mb-4 text-blood">📋 Récapitulatif</h3>
                            <div className="space-y-2">
                                {gameOver.players && gameOver.players.map((player) => (
                                    <div key={player.name} className="flex justify-between items-center bg-night-800 p-3 rounded-lg">
                                        <span className={player.alive ? 'text-white' : 'text-gray-500'}>
                                            {player.alive ? (player.avatar || '😊') : '💀'} {player.name}
                                        </span>
                                        <span className="text-blood-400 font-bold">
                                            {getRoleEmoji(player.role)} {player.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Boutons */}
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={handleReplay}
                                className="btn-primary text-lg px-8 py-4"
                            >
                                🔄 Rejouer
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="btn-secondary text-lg px-8 py-4"
                            >
                                🏠 Menu principal
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Banner pour joueur mort (mode spectateur) */}
                        {players.find(p => p.id === localStorage.getItem('playerId'))?.alive === false && phase !== 'gameOver' && (
                            <div className="mb-4 bg-gray-900/80 border-2 border-gray-600 rounded-lg p-4">
                                <p className="text-gray-300 text-center font-bold">
                                    💀 Vous êtes mort ! Vous pouvez continuer à regarder la partie en mode spectateur.
                                </p>
                            </div>
                        )}

                        {/* Zone de jeu principale */}
                        <div className="grid lg:grid-cols-3 gap-6">

                            {/* Jeu principal */}
                            <div className="lg:col-span-2 space-y-6">

                                {/* Rôle du joueur */}
                                <div className="card-glow text-center">
                                    <div className="text-6xl mb-3 relative group">
                                        {getRoleEmoji(myRole)}
                                        {/* Tooltip */}
                                        {myRole && (
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-night-900 border border-blood-600 rounded-lg text-sm text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                                💡 {getRoleDescription(myRole)}
                                            </div>
                                        )}
                                    </div>
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

                                    {/* Timer circulaire PREMIUM */}
                                    <div className="mt-6 flex justify-center">
                                        <div className={`timer-container relative inline-block ${timeRemaining <= 5 ? 'critical' : timeRemaining <= 10 ? 'warning' : ''}`}>

                                            {/* Glow effect rotatif */}
                                            {timeRemaining <= 10 && (
                                                <div className="timer-glow"></div>
                                            )}

                                            {/* SVG Cercle PREMIUM */}
                                            <svg className="transform -rotate-90 relative z-10" width="140" height="140">
                                                {/* Cercle de fond avec effet glassmorphism */}
                                                <circle
                                                    cx="70"
                                                    cy="70"
                                                    r="60"
                                                    fill="rgba(30, 30, 30, 0.6)"
                                                    stroke="rgba(255, 255, 255, 0.1)"
                                                    strokeWidth="2"
                                                />
                                                {/* Cercle de fond track */}
                                                <circle
                                                    cx="70"
                                                    cy="70"
                                                    r="55"
                                                    fill="none"
                                                    stroke="rgba(100, 100, 100, 0.2)"
                                                    strokeWidth="10"
                                                />
                                                {/* Cercle de progression avec gradient */}
                                                <defs>
                                                    <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor={timeRemaining > 30 ? '#10b981' : timeRemaining > 10 ? '#f59e0b' : '#ef4444'} />
                                                        <stop offset="100%" stopColor={timeRemaining > 30 ? '#059669' : timeRemaining > 10 ? '#d97706' : '#dc2626'} />
                                                    </linearGradient>
                                                </defs>
                                                <circle
                                                    cx="70"
                                                    cy="70"
                                                    r="55"
                                                    fill="none"
                                                    stroke="url(#timerGradient)"
                                                    strokeWidth="10"
                                                    strokeLinecap="round"
                                                    strokeDasharray={`${2 * Math.PI * 55}`}
                                                    strokeDashoffset={`${2 * Math.PI * 55 * (1 - timeRemaining / 60)}`}
                                                    className="transition-all duration-1000 ease-linear"
                                                    style={{
                                                        filter: timeRemaining <= 10 ? 'drop-shadow(0 0 8px currentColor)' : 'none'
                                                    }}
                                                />
                                            </svg>

                                            {/* Temps restant au centre avec style premium */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                                                <span className={`
                                                    text-5xl font-black mb-1
                                                    ${timeRemaining <= 5 ? 'text-red-500 animate-pulse' : timeRemaining <= 10 ? 'text-orange-400' : 'text-white'}
                                                    ${timeRemaining === 0 ? 'timer-flash' : ''}
                                                    bg-gradient-to-br ${timeRemaining > 30 ? 'from-green-400 to-green-600' : timeRemaining > 10 ? 'from-orange-400 to-orange-600' : 'from-red-400 to-red-600'}
                                                    bg-clip-text text-transparent
                                                    drop-shadow-lg
                                                `}>
                                                    {timeRemaining}
                                                </span>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                    {timeRemaining <= 5 ? '⚠️ Urgent' : timeRemaining <= 10 ? '⏰ Dépêchez-vous' : 'secondes'}
                                                </span>
                                            </div>

                                            {/* Particules d'alerte pour temps critique */}
                                            {timeRemaining <= 5 && (
                                                <div className="absolute inset-0 pointer-events-none">
                                                    {[...Array(4)].map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className="absolute w-2 h-2 bg-red-500 rounded-full animate-ping"
                                                            style={{
                                                                top: '50%',
                                                                left: '50%',
                                                                animationDelay: `${i * 0.2}s`,
                                                                transform: `translate(-50%, -50%) translate(${Math.cos(i * Math.PI / 2) * 40}px, ${Math.sin(i * Math.PI / 2) * 40}px)`
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
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
                                            // Vérifier si le joueur actuel est vivant
                                            const currentPlayer = players.find(p => p.id === localStorage.getItem('playerId'))
                                            const amAlive = currentPlayer?.alive !== false

                                            // Déterminer si ce joueur peut être cliqué
                                            const isNightActive = phase === 'night' && ['loup', 'voyante', 'sorciere', 'livreur', 'cupidon'].includes(myRole) && amAlive
                                            const isHunterActive = phase === 'hunter' && myRole === 'chasseur'
                                            const canClick = player.alive && (isNightActive || isHunterActive || (phase === 'vote' && amAlive))

                                            return (
                                                <div
                                                    key={player.id}
                                                    onClick={() => {
                                                        if (canClick && !hasActed) {
                                                            setSelectedPlayer(player.id)
                                                            // 📱 Feedback tactile sur mobile (si supporté)
                                                            if (navigator.vibrate) {
                                                                navigator.vibrate(50) // Vibration courte
                                                            }
                                                        }
                                                    }}
                                                    className={`
                                                        player-card-premium
                                                        relative p-6 rounded-xl text-center transition-all duration-400
                                                        ${!player.alive ? 'dead' : ''}
                                                        ${dyingPlayers.includes(player.id) ? 'player-dying' : ''}
                                                        ${canClick && !hasActed ? 'cursor-pointer hover:cursor-pointer' : 'cursor-default opacity-70'}
                                                        ${selectedPlayer === player.id ? 'selected' : ''}
                                                    `}
                                                >
                                                    {/* Effet holographique */}
                                                    <div className="player-card-holographic"></div>

                                                    {/* Contenu de la carte */}
                                                    <div className="relative z-10">
                                                        {/* Badges d'action pendant la nuit */}
                                                        {phase === 'night' && player.alive && (
                                                            <div className="absolute -top-2 -right-2">
                                                                {player.hasActed ? (
                                                                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white text-xs px-3 py-1.5 rounded-full font-black shadow-lg border border-green-400/50">
                                                                        ✅
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs px-3 py-1.5 rounded-full font-black shadow-lg animate-pulse border border-orange-400/50">
                                                                        ⏳
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Avatar avec effet premium */}
                                                        <div className="text-5xl mb-3 transform transition-transform duration-300 hover:scale-110">
                                                            {player.alive ? (player.avatar || '😊') : '💀'}
                                                        </div>

                                                        {/* Nom du joueur */}
                                                        <p className="font-black text-lg mb-1 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                                                            {player.name}
                                                        </p>

                                                        {/* Statut */}
                                                        <div className={`text-xs font-bold px-3 py-1 rounded-full inline-block ${player.alive ? 'bg-green-900/50 text-green-400 border border-green-700/50' : 'bg-gray-900/50 text-gray-500 border border-gray-700/50'}`}>
                                                            {player.alive ? '💚 En vie' : '💀 Mort'}
                                                        </div>
                                                    </div>

                                                    {/* Indicateur de sélection */}
                                                    {selectedPlayer === player.id && (
                                                        <div className="absolute inset-0 border-4 border-blood-500 rounded-xl pointer-events-none animate-pulse"></div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Bouton d'action */}
                                    {/* Sorcière : toujours afficher le bouton */}
                                    {myRole === 'sorciere' && phase === 'night' && !hasActed && (
                                        <button
                                            onClick={handleAction}
                                            className="btn-primary w-full mt-4"
                                        >
                                            🧙‍♀️ Ouvrir les potions
                                        </button>
                                    )}

                                    {/* Chasseur : tirer en vengeance */}
                                    {myRole === 'chasseur' && phase === 'hunter' && selectedPlayer && !hasActed && (
                                        <button
                                            onClick={handleHunterShoot}
                                            className="btn-primary w-full mt-4"
                                        >
                                            🏹 Tirer sur {players.find(p => p.id === selectedPlayer)?.name}
                                        </button>
                                    )}

                                    {/* Autres rôles : afficher si sélection */}
                                    {myRole !== 'sorciere' && myRole !== 'chasseur' && selectedPlayer && !hasActed && (
                                        <button
                                            onClick={phase === 'vote' ? handleVote : handleAction}
                                            className="btn-primary w-full mt-4"
                                        >
                                            {phase === 'vote' ? '⚖️ Voter' : '✅ Confirmer l\'action'}
                                        </button>
                                    )}

                                    {/* Message "Vous avez déjà agi" */}
                                    {hasActed && (phase === 'night' || phase === 'vote') && (
                                        <div className="bg-green-900/30 border-2 border-green-600 rounded-lg p-4 mt-4">
                                            <p className="text-green-400 text-center font-bold">
                                                ✅ {phase === 'vote' ? 'Vous avez voté !' : 'Vous avez déjà agi cette nuit'}
                                            </p>
                                            <p className="text-gray-400 text-center text-sm mt-1">
                                                En attente des autres joueurs...
                                            </p>
                                        </div>
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

                                {/* 📜 Historique des événements */}
                                <div className="card">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-lg font-bold">📜 Historique</h3>
                                        <button
                                            onClick={() => setShowHistory(!showHistory)}
                                            className="text-sm px-3 py-1 bg-night-700 hover:bg-night-600 rounded-lg transition-colors"
                                        >
                                            {showHistory ? '👁️ Masquer' : '👁️ Voir tout'}
                                        </button>
                                    </div>

                                    <div className={`space-y-2 overflow-y-auto transition-all duration-300 ${showHistory ? 'max-h-96' : 'max-h-32'}`}>
                                        {eventHistory.length === 0 ? (
                                            <p className="text-gray-500 text-sm italic">Aucun événement pour le moment</p>
                                        ) : (
                                            eventHistory.map((event) => (
                                                <div
                                                    key={event.id}
                                                    className={`p-2 rounded-lg text-sm ${
                                                        event.type === 'night' ? 'bg-blue-900/30 border-l-4 border-blue-600' :
                                                        event.type === 'day' ? 'bg-yellow-900/30 border-l-4 border-yellow-600' :
                                                        event.type === 'vote' ? 'bg-red-900/30 border-l-4 border-red-600' :
                                                        event.type === 'death' ? 'bg-gray-900/50 border-l-4 border-gray-600' :
                                                        'bg-night-800 border-l-4 border-blood-600'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{event.icon}</span>
                                                        <div className="flex-1">
                                                            <p className="text-white font-medium">{event.message}</p>
                                                            <p className="text-gray-500 text-xs">{event.timestamp}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Chat */}
                                <div className="card h-96 flex flex-col" onFocus={() => setUnreadWolfMessages(0)} onClick={() => setUnreadWolfMessages(0)}>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold">💬 Chat</h3>
                                            {/* Badge de messages non lus */}
                                            {unreadWolfMessages > 0 && phase === 'night' && myRole === 'loup' && (
                                                <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                                    {unreadWolfMessages} nouveau{unreadWolfMessages > 1 ? 'x' : ''}
                                                </div>
                                            )}
                                        </div>
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

                                    <div className="flex-1 bg-gradient-to-b from-night-900/50 to-night-900/80 backdrop-blur-sm rounded-lg p-3 mb-3 overflow-y-auto chat-scroll-smooth">
                                        {messages.length === 0 ? (
                                            <div className="flex items-center justify-center h-full">
                                                <p className="text-gray-500 text-sm italic fade-in">💬 Aucun message</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {messages.map((msg, index) => {
                                                    const isMyMessage = msg.playerId === localStorage.getItem('playerId')
                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                                                            style={{ animationDelay: `${index * 0.05}s` }}
                                                        >
                                                            <div className={`chat-bubble ${isMyMessage ? 'chat-bubble-right' : 'chat-bubble-left'}`}>
                                                                {!isMyMessage && (
                                                                    <div className="text-xs font-bold text-blood-400 mb-1">
                                                                        {msg.playerName}
                                                                    </div>
                                                                )}
                                                                <div className={`text-sm ${isMyMessage ? 'text-gray-200' : 'text-gray-300'}`}>
                                                                    {msg.message}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 relative emoji-picker-container">
                                        <input
                                            type="text"
                                            placeholder="Écrivez un message..."
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                            className="flex-1 bg-gradient-to-r from-night-800 to-night-900 border-2 border-night-600 focus:border-blood-600 focus:ring-2 focus:ring-blood-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 transition-all outline-none shadow-lg hover:shadow-xl transform focus:scale-102"
                                        />

                                        {/* Bouton Emoji Picker */}
                                        <button
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className="bg-gradient-to-br from-night-700 to-night-800 hover:from-night-600 hover:to-night-700 px-4 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                                            title="Ajouter un emoji"
                                        >
                                            <span className="text-xl">😊</span>
                                        </button>

                                        {/* Popup Emoji Picker - Stylisé */}
                                        {showEmojiPicker && (
                                            <div className="absolute bottom-full mb-2 right-0 bg-gradient-to-br from-night-800 to-night-900 border-2 border-blood-500 rounded-xl p-4 shadow-2xl shadow-blood-900/50 z-50 animate-fadeIn backdrop-blur-md">
                                                <div className="flex gap-2">
                                                    {quickEmojis.map((emoji, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => insertEmoji(emoji)}
                                                            className="text-3xl hover:scale-125 transition-transform hover:bg-blood-900/30 rounded-lg p-2 hover:shadow-lg bounce-in"
                                                            style={{ animationDelay: `${index * 0.05}s` }}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={sendMessage}
                                            className="bg-gradient-to-br from-blood-600 to-blood-700 hover:from-blood-500 hover:to-blood-600 px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ripple-container"
                                        >
                                            <span className="text-xl">📤</span>
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
