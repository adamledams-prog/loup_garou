import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import io from 'socket.io-client'
import config from '../config'
import { useParticleSystem } from '../utils/particles'
import { audioManager } from '../utils/audioManager'
import { ttsManager } from '../utils/ttsManager'
import { vibrate, requestWakeLock, releaseWakeLock } from '../utils/mobile'
import DeathAnimation from '../components/DeathAnimation'
import CircularTimer from '../components/CircularTimer'
import RoleCard from '../components/RoleCard'
import ChatBubble from '../components/ChatBubble'

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
    const [wolfMessages, setWolfMessages] = useState([]) // 🐺 Messages du chat loup
    const [activeChat, setActiveChat] = useState('village') // 'village' ou 'wolf'
    const activeChatRef = useRef('village') // 🔄 Ref pour éviter stale closure dans listeners
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
    const [deathToShow, setDeathToShow] = useState(null) // { player, cause } pour l'animation spectaculaire

    // 🔔 Système de notifications stylées
    const [notification, setNotification] = useState(null) // { type, icon, title, message }

    // 🎭 Processing avec narration
    const [isProcessing, setIsProcessing] = useState(false)

    // 👍 Système de réactions rapides
    const [reactions, setReactions] = useState({}) // { playerId: { emoji, timestamp } }
    const [showReactionPicker, setShowReactionPicker] = useState(false)
    const reactionEmojis = ['👍', '👎', '🤔', '😱', '😂', '❤️']

    // 🔄 Synchroniser activeChat avec la ref pour les listeners
    useEffect(() => {
        activeChatRef.current = activeChat
    }, [activeChat])

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

    // 🔔 Afficher une notification stylée (défini AVANT useEffect pour éviter hoisting error)
    const showNotification = (type, icon, title, message, duration = 5000) => {
        setNotification({ type, icon, title, message })
        setTimeout(() => setNotification(null), duration)
    }

    // 📜 Fonction pour ajouter un événement à l'historique (défini AVANT useEffect)
    const addEvent = (type, message, icon = '📌') => {
        const newEvent = {
            id: Date.now(),
            type, // 'night', 'day', 'vote', 'death', 'action'
            message,
            icon,
            timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }
        setEventHistory(prev => [newEvent, ...prev].slice(0, 50)) // Garder max 50 événements
    }

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

        // 🎯 Flag pour savoir si c'est la première connexion
        let isInitialConnection = true

        // Attendre que le socket soit connecté avant d'émettre
        newSocket.on('connect', () => {
            console.log('✅ Socket Game connecté')

            // Connexion initiale : toujours se connecter
            if (isInitialConnection) {
                console.log('� Connexion initiale à la partie...')
                isInitialConnection = false
                newSocket.emit('reconnectToGame', {
                    roomCode: storedRoomCode,
                    playerId: storedPlayerId
                })
            } else {
                // Vraie reconnexion (après déconnexion)
                console.log('🔄 Reconnexion après déconnexion...')
                setIsConnected(true)
                setReconnecting(false)
                newSocket.emit('reconnectToGame', {
                    roomCode: storedRoomCode,
                    playerId: storedPlayerId
                })
            }
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

            // � Hurlement de loup au démarrage de la 1ère nuit
            if (data.playWolfHowl) {
                audioManager.playWolfHowl()
            }

            // �🔆 Activer Wake Lock pour garder l'écran allumé
            requestWakeLock()
        })

        // 🛑 Partie arrêtée par l'hôte
        newSocket.on('gameForceEnded', (data) => {
            console.log('🛑 Partie arrêtée par l\'hôte:', data)
            showNotification('warning', '🛑', 'Partie Arrêtée',
                `${data.hostName} a arrêté la partie`, 5000)

            // Rediriger vers le lobby après 3 secondes
            setTimeout(() => {
                localStorage.removeItem('playerId')
                localStorage.removeItem('roomCode')
                navigate('/lobby')
            }, 3000)
        })

        // Phase de nuit
        newSocket.on('nightPhase', (data) => {
            if (import.meta.env.DEV) console.log('Phase de nuit:', data)

            // 🎬 Afficher la transition
            setPhaseTransition({ phase: 'night', nightNumber: data.nightNumber })
            setTimeout(() => setPhaseTransition(null), 3500) // 3.5s pour plus d'immersion

            setPhase('night')
            setNightNumber(data.nightNumber)
            setPlayers(data.players)
            setHasActed(false) // ✅ Réinitialiser à chaque nouvelle nuit
            setActionSuccess(null)
            setSelectedPlayer(null) // ✅ Désélectionner le joueur
            setUnreadWolfMessages(0) // 💬 Réinitialiser messages non lus

            // 📜 Log événement
            addEvent('night', `Nuit ${data.nightNumber}`, '🌙')

            // � Hurlement de loup au début de chaque nuit
            if (data.playWolfHowl) {
                audioManager.playWolfHowl()
            }

            // �🔊 Son transition nuit
            audioManager.beep(220, 0.3, 0.5) // Low beep for night

            // 🌲 Ambiance forêt nocturne en boucle
            setTimeout(() => {
                audioManager.playForestAmbience()
            }, 1000)

            // 🦇 Sons aléatoires de chauve-souris
            setTimeout(() => {
                audioManager.startRandomBatSounds()
            }, 3000)

            // 👶 Prénoms GARANTIS à la nuit 2 (100% de chance)
            if (data.nightNumber === 2) {
                setTimeout(() => {
                    if (import.meta.env.DEV) console.log('👶 NUIT 2 : Jouer un prénom garanti')
                    audioManager.playRandomKidsName()
                }, 5000)
            }

            // 👶 Prénoms aléatoires à partir de la nuit 2
            if (data.nightNumber >= 2) {
                setTimeout(() => {
                    if (import.meta.env.DEV) console.log('👶 Activation prénoms aléatoires (nuit 2+)')
                    audioManager.startRandomKidsNames()
                }, 8000) // 8s pour ne pas chevaucher le prénom garanti
            }

            // �🐺 Hurlement immédiat au début de la nuit
            setTimeout(() => {
                audioManager.playWolfHowl()
            }, 1500) // 1.5s après le début de la nuit

            // 🐺 Hurlements fréquents pendant la nuit (plus d'ambiance)
            const howlInterval = setInterval(() => {
                audioManager.playWolfHowl() // Toujours jouer, pas de random
            }, 15000) // Toutes les 15 secondes

            // Sauvegarder l'interval pour cleanup
            window.nightHowlInterval = howlInterval

            if (data.killedTonight) {
                setKilledTonight(data.killedTonight)
            }

            // 📊 Incrémenter le compteur de nuits
            setTotalNights(prev => prev + 1)
        })        // Phase de jour
        newSocket.on('dayPhase', (data) => {
            if (import.meta.env.DEV) console.log('Phase de jour:', data)

            // 🎬 Afficher la transition
            setPhaseTransition({ phase: 'day' })
            setTimeout(() => setPhaseTransition(null), 3500) // 3.5s pour plus d'immersion

            setPhase('day')
            setPlayers(data.players)
            setHasActed(false) // ✅ Réinitialiser (pas d'action le jour mais préparer pour vote)
            setActionSuccess(null)
            setSelectedPlayer(null)

            // 📜 Log événement
            addEvent('day', 'Le village se réveille', '☀️')

            // 🔊 Son transition jour
            audioManager.beep(440, 0.3, 0.5) // Higher beep for day

            // 🌅 Arrêter toutes les ambiances nocturnes
            audioManager.stopForestAmbience()
            audioManager.stopRandomBatSounds()
            audioManager.stopRandomKidsNames() // Arrêter les prénoms aussi

            if (window.nightHowlInterval) {
                clearInterval(window.nightHowlInterval)
                window.nightHowlInterval = null
            }            if (data.killedPlayer) {
                // Trouver le joueur mort avec toutes ses infos
                const deadPlayer = data.players.find(p => p.name === data.killedPlayer)

                if (deadPlayer) {
                    // 💀 Déclencher l'animation de mort spectaculaire
                    setDeathToShow({ player: deadPlayer, cause: 'wolf' })
                }

                addEvent('death', `💀 ${data.killedPlayer} est mort cette nuit`, '💀')
                // 📊 Incrémenter le compteur de morts
                setTotalDeaths(prev => prev + 1)

                // 🎊 Trigger particules de mort
                if (canvasRef.current) {
                    const x = Math.random() * window.innerWidth
                    const y = Math.random() * (window.innerHeight / 2) + 100
                    triggerDeath(x, y, 40)
                }
            }
        })

        // Phase de vote
        newSocket.on('votePhase', (data) => {
            // 🎬 Afficher la transition
            setPhaseTransition({ phase: 'vote' })
            setTimeout(() => setPhaseTransition(null), 3500) // 3.5s pour plus d'immersion

            setPhase('vote')
            setPlayers(data.players)
            setHasActed(false) // ✅ Réinitialiser pour le vote
            setActionSuccess(null)
            setSelectedPlayer(null)
            setVoteProgress({ voted: 0, total: data.players.filter(p => p.alive).length })

            // 📜 Log événement
            addEvent('vote', 'Phase de vote commence', '⚖️')
        })

        // Résultat du vote (joueur éliminé)
        newSocket.on('voteResult', (data) => {
            if (data.eliminated) {
                // 💀 Déclencher l'animation de mort spectaculaire
                const deadPlayer = players.find(p => p.id === data.eliminated.id)
                if (deadPlayer) {
                    setDeathToShow({
                        player: { ...deadPlayer, role: data.eliminated.role },
                        cause: 'vote'
                    })
                }

                addEvent('death', `⚖️ ${data.eliminated.name} a été éliminé par le village`, '⚖️')
                setTotalDeaths(prev => prev + 1)
            }
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
                audioManager.beep(660, 0.2, 0.6) // Victory beep
                setTimeout(() => audioManager.beep(880, 0.3, 0.6), 150)
            } else {
                audioManager.beep(220, 0.5, 0.6) // Defeat beep
                setTimeout(() => audioManager.beep(165, 0.5, 0.6), 200)
            }
        })

        // Timer de phase
        newSocket.on('phaseTimer', (data) => {
            setTimeRemaining(data.timeRemaining)

            // 🔊 Son timer critique + 📳 Vibration
            if (data.timeRemaining === 10) {
                audioManager.beep(880, 0.1, 0.5) // Critical timer beep
                vibrate.critical()
            } else if (data.timeRemaining === 0) {
                audioManager.beep(440, 0.2, 0.5) // Timer end beep
            }
        })

        // Messages chat village
        newSocket.on('chatMessage', (data) => {
            setMessages(prev => [...prev, data])

            // 🔊 Son message
            audioManager.beep(660, 0.05, 0.3)

            // 🎙️ Si c'est un bot IA, lire le message à voix haute
            if (data.isBot && data.message) {
                ttsManager.speak(data.message, data.playerName)
            }
        })

        // 🐺 Messages chat loup (PRIVÉ)
        newSocket.on('wolfChatMessage', (data) => {
            setWolfMessages(prev => [...prev, data])

            // 🔊 Son message loup (plus grave)
            audioManager.beep(440, 0.05, 0.3)

            // 🎙️ Si c'est un bot loup, lire aussi
            if (data.isBot && data.message) {
                ttsManager.speak(data.message, data.playerName)
            }

            // 💬 Si chat loup pas visible, incrémenter badge non lus (utiliser ref au lieu de state)
            if (activeChatRef.current !== 'wolf' && data.playerId !== localStorage.getItem('playerId')) {
                setUnreadWolfMessages(prev => prev + 1)
            }
        })

        // 👍 Réactions reçues
        newSocket.on('playerReaction', (data) => {
            setReactions(prev => ({
                ...prev,
                [data.playerId]: {
                    emoji: data.emoji,
                    timestamp: Date.now()
                }
            }))

            // Nettoyer après 3 secondes
            setTimeout(() => {
                setReactions(prev => {
                    const newReactions = { ...prev }
                    delete newReactions[data.playerId]
                    return newReactions
                })
            }, 3000)
        })

        // 🔄 Compteur de tentatives de reconnexion
        let reconnectAttempts = 0
        const MAX_RECONNECT_ATTEMPTS = 3

        // Erreurs
        newSocket.on('error', (data) => {
            console.error('❌ Erreur:', data.message)

            // Si partie introuvable ou joueur introuvable, essayer de se reconnecter
            if (data.message.includes('introuvable')) {
                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++
                    console.log(`🔄 Tentative reconnexion ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`)

                    showNotification('warning', '⚠️', 'Reconnexion...',
                        `Tentative ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} en cours...`, 2000)

                    // Retry avec backoff exponentiel (1s, 2s, 3s)
                    setTimeout(() => {
                        console.log(`🔄 Émission reconnectToGame (tentative ${reconnectAttempts})`)
                        newSocket.emit('reconnectToGame', {
                            roomCode: localStorage.getItem('roomCode'),
                            playerId: localStorage.getItem('playerId')
                        })
                    }, 1000 * reconnectAttempts)
                    return
                }

                // Après 3 tentatives, vraiment abandonner
                console.error('❌ Reconnexion échouée après 3 tentatives')
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

        // 📢 Narration dramatique
        newSocket.on('narration', (data) => {
            const { message, type, duration } = data

            // 🔔 Notification visuelle selon le type
            const notificationConfig = {
                'love': { icon: '💔', title: 'Tragédie', sound: () => audioManager.beep(200, 0.4, 0.8) },
                'danger': { icon: '☠️', title: 'Danger', sound: () => audioManager.beep(150, 0.5, 0.6) },
                'success': { icon: '✨', title: 'Événement', sound: () => audioManager.beep(500, 0.3, 0.4) },
                'dramatic': { icon: '🔥', title: 'Alerte', sound: () => audioManager.beep(300, 0.6, 0.9) },
                'info': { icon: '⚖️', title: 'Info', sound: () => audioManager.beep(400, 0.2, 0.3) }
            }

            const config = notificationConfig[type] || notificationConfig.info

            // 🔊 Son + vibration
            config.sound()
            vibrate(type === 'dramatic' ? [100, 50, 100, 50, 100] : [100, 50, 100])

            // 🔔 Notification
            showNotification(type, config.icon, config.title, message, duration)

            // 📜 Ajouter à l'historique
            addEvent(type, message, config.icon)
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

        // Note: Le handler 'connect' est déjà défini au début (ligne 122)
        // Il gère automatiquement la reconnexion

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

        // 🧙‍♀️ Décision de la sorcière (après que les loups ont choisi)
        newSocket.on('witchDecision', (data) => {
            console.log('🧙‍♀️ Sorcière : victime détectée', data)
            setKilledTonight(data.victimId)
            setShowWitchModal(true)
            // Notification urgente
            showNotification('warning', '🧙‍♀️', 'Sorcière : Une victime !',
                `${data.victimName} va mourir ! Voulez-vous le/la sauver ?`, 15000)
        })

        return () => {
            newSocket.close()
            // 💤 Libérer le Wake Lock quand on quitte
            releaseWakeLock()
            // Arrêter les hurlements
            if (window.nightHowlInterval) {
                clearInterval(window.nightHowlInterval)
                window.nightHowlInterval = null
            }
        }
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

    // 👍 Envoyer une réaction
    const sendReaction = (emoji) => {
        if (!socket) return

        socket.emit('sendReaction', { emoji })
        setShowReactionPicker(false)
        vibrate.tap()
        audioManager.beep(440, 0.05, 0.3)

        // Afficher ma propre réaction localement aussi
        const myId = localStorage.getItem('playerId')
        setReactions(prev => ({
            ...prev,
            [myId]: {
                emoji,
                timestamp: Date.now()
            }
        }))

        // Nettoyer après 3 secondes
        setTimeout(() => {
            setReactions(prev => {
                const newReactions = { ...prev }
                delete newReactions[myId]
                return newReactions
            })
        }, 3000)
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

        // 🔊 Son vote + 📳 Vibration
        audioManager.beep(550, 0.15, 0.4)
        vibrate.vote()
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

        // 🐺 Envoyer au chat loup si actif ET si je suis loup
        if (activeChat === 'wolf' && myRole === 'loup') {
            socket.emit('wolfChatMessage', { message: messageInput })
        } else {
            socket.emit('chatMessage', { message: messageInput })
        }

        setMessageInput('')
    }

    const insertEmoji = (emoji) => {
        setMessageInput(prev => prev + emoji)
        setShowEmojiPicker(false)
    }

    const handleReplay = () => {
        // Retourner au lobby pour créer une nouvelle partie
        navigate('/lobby')
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

    // ✨ Obtenir l'action possible pour chaque carte joueur
    const getPlayerActionHint = (player, currentPhase, currentRole, currentHasActed) => {
        if (!player.alive) return null
        if (currentHasActed) return null

        if (currentPhase === 'vote') {
            return { icon: '⚖️', text: 'Voter', color: 'bg-orange-500/20 text-orange-300 border-orange-500' }
        }

        if (currentPhase === 'night') {
            if (currentRole === 'loup') {
                return { icon: '🐺', text: 'Tuer', color: 'bg-red-500/20 text-red-300 border-red-500' }
            }
            if (currentRole === 'voyante') {
                return { icon: '🔮', text: 'Voir', color: 'bg-purple-500/20 text-purple-300 border-purple-500' }
            }
            if (currentRole === 'livreur') {
                return { icon: '🍕', text: 'Protéger', color: 'bg-blue-500/20 text-blue-300 border-blue-500' }
            }
            if (currentRole === 'sorciere') {
                return { icon: '🧙‍♀️', text: 'Potion', color: 'bg-green-500/20 text-green-300 border-green-500' }
            }
            if (currentRole === 'cupidon' && nightNumber === 1) {
                return { icon: '💘', text: 'Lier', color: 'bg-pink-500/20 text-pink-300 border-pink-500' }
            }
        }

        if (currentPhase === 'hunter' && currentRole === 'chasseur') {
            return { icon: '🏹', text: 'Tirer', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500' }
        }

        return null
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

            {/* � Animation de mort spectaculaire */}
            {deathToShow && (
                <DeathAnimation
                    player={deathToShow.player}
                    cause={deathToShow.cause}
                    onComplete={() => setDeathToShow(null)}
                />
            )}

            {/* �🔔 Notification Popup Stylée */}
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

            {/* 🎬 Overlay de transition de phase CINÉMATIQUE */}
            {phaseTransition && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center animate-fadeIn ${
                    phaseTransition.phase === 'night'
                        ? 'bg-gradient-to-br from-blue-950 via-indigo-950 to-black'
                        : phaseTransition.phase === 'day'
                        ? 'bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500'
                        : 'bg-gradient-to-br from-gray-900 via-gray-800 to-black'
                }`}>
                    {/* Effets de particules selon la phase */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {phaseTransition.phase === 'night' && (
                            // Étoiles tombantes
                            <>
                                {[...Array(20)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute w-1 h-1 bg-white rounded-full animate-float"
                                        style={{
                                            left: `${Math.random() * 100}%`,
                                            top: `${Math.random() * 100}%`,
                                            animationDelay: `${Math.random() * 2}s`,
                                            animationDuration: `${2 + Math.random() * 2}s`,
                                            opacity: Math.random()
                                        }}
                                    />
                                ))}
                            </>
                        )}
                        {phaseTransition.phase === 'day' && (
                            // Rayons du soleil
                            <>
                                {[...Array(8)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute h-full w-32 bg-gradient-to-b from-yellow-200/30 to-transparent blur-xl"
                                        style={{
                                            left: '50%',
                                            top: 0,
                                            transform: `rotate(${i * 45}deg)`,
                                            transformOrigin: 'top center',
                                            animation: 'pulse 2s infinite'
                                        }}
                                    />
                                ))}
                            </>
                        )}
                    </div>

                    <div className="text-center animate-slideUp max-w-3xl px-8 relative z-10">
                        {/* Icône animée + effet phase */}
                        <div className={`text-9xl mb-6 ${
                            phaseTransition.phase === 'vote' ? 'animate-bounce' : ''
                        }`} style={{
                            animation: phaseTransition.phase === 'day' ? 'pulse 1s infinite' : undefined
                        }}>
                            {phaseTransition.phase === 'night' ? '🌙' :
                             phaseTransition.phase === 'day' ? '☀️' : '⚖️'}
                        </div>

                        {/* Titre de phase */}
                        <h2 className={`text-6xl font-black mb-6 drop-shadow-2xl ${
                            phaseTransition.phase === 'night' ? 'text-blue-300' :
                            phaseTransition.phase === 'day' ? 'text-white' :
                            'text-blood'
                        }`}>
                            {phaseTransition.phase === 'night' ? `Nuit ${phaseTransition.nightNumber}` :
                             phaseTransition.phase === 'day' ? 'Lever du Jour' : 'Jugement du Village'}
                        </h2>

                        {/* 🎭 Narration */}
                        <div className={`backdrop-blur-sm rounded-xl p-6 border-2 mb-4 ${
                            phaseTransition.phase === 'night' ? 'bg-blue-900/30 border-blue-500/30' :
                            phaseTransition.phase === 'day' ? 'bg-white/20 border-yellow-400/30' :
                            'bg-night-800/50 border-blood-600/30'
                        }`}>
                            <p className={`text-2xl italic leading-relaxed ${
                                phaseTransition.phase === 'day' ? 'text-white font-bold' : 'text-gray-300'
                            }`}>
                                "{getNarration(phaseTransition.phase, phaseTransition.nightNumber)}"
                            </p>
                        </div>

                        {/* Points de chargement animés */}
                        <div className="flex justify-center gap-2 mt-6">
                            {[0, 150, 300].map((delay) => (
                                <div
                                    key={delay}
                                    className={`w-3 h-3 rounded-full animate-bounce ${
                                        phaseTransition.phase === 'day' ? 'bg-white' : 'bg-blood-600'
                                    }`}
                                    style={{animationDelay: `${delay}ms`}}
                                />
                            ))}
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
                <div className="flex justify-between items-center mb-4 md:mb-6 gap-2">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-blood truncate">
                            🐺 Partie en cours
                        </h1>
                        <p className="text-gray-500 text-xs md:text-sm truncate">Salle: {roomCode}</p>
                    </div>

                    {/* Boutons selon si on est l'hôte ou non */}
                    <div className="flex gap-2">
                        {/* 🛑 Bouton Arrêter (uniquement pour l'hôte) */}
                        {players.find(p => p.id === localStorage.getItem('playerId'))?.isHost && (
                            <button
                                onClick={() => {
                                    if (window.confirm('⚠️ Voulez-vous vraiment arrêter la partie pour tous les joueurs ?')) {
                                        socket?.emit('stopGame')
                                    }
                                }}
                                className="btn-danger text-xs md:text-sm px-3 md:px-4 flex-shrink-0"
                                title="Arrêter la partie (réservé à l'hôte)"
                            >
                                🛑 Arrêter
                            </button>
                        )}

                        <button
                            onClick={() => navigate('/')}
                            className="btn-secondary text-xs md:text-sm px-3 md:px-4 flex-shrink-0"
                        >
                            ❌ Quitter
                        </button>
                    </div>
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

                                {/* Rôle du joueur - Carte à collectionner */}
                                {myRole && (
                                    <RoleCard
                                        role={myRole}
                                        description={getRoleDescription(myRole)}
                                    />
                                )}

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

                                    {/* Timer circulaire avec composant */}
                                    <div className="mt-6 flex justify-center">
                                        <CircularTimer timeRemaining={timeRemaining} maxTime={60} />
                                    </div>
                                </div>

                                {/* Grille de joueurs - Zone bleue calme */}
                                <div className="card border-l-4 border-blue-500/50 bg-gradient-to-br from-blue-900/10 to-transparent">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-bold text-blue-300">
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
                                    {/* 📱 Grille optimisée mobile: 2 colonnes sur mobile, 3 sur tablet+ */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
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

                                                        {/* ✨ Indice d'action possible */}
                                                        {(() => {
                                                            const hint = getPlayerActionHint(player, phase, myRole, hasActed)
                                                            return hint && canClick && (
                                                                <div className={`absolute -top-2 -left-2 ${hint.color} text-xs px-2 py-1 rounded-full font-bold shadow-lg border animate-bounce`}>
                                                                    {hint.icon} {hint.text}
                                                                </div>
                                                            )
                                                        })()}

                                                        {/* 👍 Réaction flottante */}
                                                        {reactions[player.id] && (
                                                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-4xl animate-bounce z-20">
                                                                {reactions[player.id].emoji}
                                                            </div>
                                                        )}

                                                        {/* Avatar avec effet premium + style mort amélioré */}
                                                        <div className={`relative text-5xl mb-3 transform transition-all duration-300 hover:scale-110 ${
                                                            !player.alive ? 'grayscale opacity-60 -rotate-6' : ''
                                                        }`}>
                                                            {player.alive ? (player.avatar || '😊') : (
                                                                <>
                                                                    <span className="relative z-10">{player.avatar || '�'}</span>
                                                                    <div className="absolute inset-0 flex items-center justify-center z-20">
                                                                        <span className="text-6xl text-red-600 font-black drop-shadow-lg">❌</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Nom du joueur */}
                                                        <p className={`font-black text-lg mb-1 ${
                                                            player.alive
                                                                ? 'bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent'
                                                                : 'text-gray-600 line-through'
                                                        }`}>
                                                            {player.name}
                                                        </p>

                                                        {/* Statut */}
                                                        <div className={`text-xs font-bold px-3 py-1 rounded-full inline-block ${
                                                            player.alive
                                                                ? 'bg-green-900/50 text-green-400 border border-green-700/50'
                                                                : 'bg-red-900/50 text-red-400 border border-red-700/50 animate-pulse'
                                                        }`}>
                                                            {player.alive ? '💚 En vie' : '🪦 Mort'}
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

                                    {/* Vote : tous les rôles peuvent voter (sauf pendant phase hunter) */}
                                    {phase === 'vote' && selectedPlayer && !hasActed && (
                                        <button
                                            onClick={handleVote}
                                            className="btn-primary w-full mt-4"
                                        >
                                            ⚖️ Voter pour {players.find(p => p.id === selectedPlayer)?.name}
                                        </button>
                                    )}

                                    {/* Actions nocturnes : uniquement pour les rôles spéciaux (sauf sorcière qui a sa modal) */}
                                    {phase === 'night' && myRole !== 'sorciere' && selectedPlayer && !hasActed && (
                                        <button
                                            onClick={handleAction}
                                            className="btn-primary w-full mt-4"
                                        >
                                            ✅ Confirmer l'action
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

                                    {/* 👍 Bouton réactions rapides (visible pendant le jour et le vote) */}
                                    {(phase === 'day' || phase === 'vote') && (
                                        <div className="mt-4">
                                            <button
                                                onClick={() => setShowReactionPicker(!showReactionPicker)}
                                                className="btn-secondary w-full flex items-center justify-center gap-2"
                                            >
                                                😊 Réagir rapidement
                                            </button>

                                            {/* Picker de réactions */}
                                            {showReactionPicker && (
                                                <div className="mt-3 grid grid-cols-6 gap-2 p-3 bg-night-800 rounded-lg border-2 border-blood-600 animate-slideUp">
                                                    {reactionEmojis.map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => sendReaction(emoji)}
                                                            className="text-2xl md:text-3xl hover:scale-125 transition-transform active:scale-95 p-2 hover:bg-night-700 rounded-lg"
                                                            style={{ minHeight: '48px', minWidth: '48px' }}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
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

                                {/* Chat - Zone violette mystérieuse */}
                                <div className="card h-96 flex flex-col border-l-4 border-purple-500/50 bg-gradient-to-br from-purple-900/10 to-transparent" onFocus={() => setUnreadWolfMessages(0)} onClick={() => setUnreadWolfMessages(0)}>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-purple-300">💬 Chat</h3>
                                        </div>
                                    </div>

                                    {/* 🐺 Onglets Village / Loups (si je suis loup) */}
                                    {myRole === 'loup' && (
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                onClick={() => {
                                                    setActiveChat('village')
                                                    audioManager.beep(550, 0.05, 0.3)
                                                }}
                                                className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all ${
                                                    activeChat === 'village'
                                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                                                        : 'bg-night-800 text-gray-400 hover:bg-night-700'
                                                }`}
                                            >
                                                💬 Village ({messages.length})
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setActiveChat('wolf')
                                                    setUnreadWolfMessages(0) // Reset badge
                                                    audioManager.beep(440, 0.05, 0.3)
                                                }}
                                                className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all relative ${
                                                    activeChat === 'wolf'
                                                        ? 'bg-gradient-to-r from-blood-600 to-blood-700 text-white shadow-lg'
                                                        : 'bg-night-800 text-gray-400 hover:bg-night-700'
                                                }`}
                                            >
                                                🐺 Loups ({wolfMessages.length})
                                                {unreadWolfMessages > 0 && activeChat !== 'wolf' && (
                                                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                                                        {unreadWolfMessages}
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex-1 bg-gradient-to-b from-night-900/50 to-night-900/80 backdrop-blur-sm rounded-lg p-3 mb-3 overflow-y-auto chat-scroll-smooth">
                                        {/* Afficher les messages selon l'onglet actif */}
                                        {(activeChat === 'village' ? messages : wolfMessages).length === 0 ? (
                                            <div className="flex items-center justify-center h-full">
                                                <p className="text-gray-500 text-sm italic fade-in">
                                                    {activeChat === 'wolf' ? '🐺 Aucun message loup' : '💬 Aucun message'}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {(activeChat === 'village' ? messages : wolfMessages).map((msg, index) => {
                                                    const isMyMessage = msg.playerId === localStorage.getItem('playerId')
                                                    const player = players.find(p => p.id === msg.playerId)
                                                    const playerAvatar = player?.avatar || msg.playerAvatar || '😊'
                                                    const playerRole = player?.role || 'villageois'

                                                    return (
                                                        <ChatBubble
                                                            key={index}
                                                            message={msg.message}
                                                            isMyMessage={isMyMessage}
                                                            playerAvatar={playerAvatar}
                                                            playerName={msg.playerName}
                                                            playerRole={playerRole}
                                                            timestamp={msg.timestamp || Date.now()}
                                                        />
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 relative emoji-picker-container">
                                        <input
                                            type="text"
                                            placeholder={
                                                myRole === 'loup' && activeChat === 'wolf'
                                                    ? '🐺 Message aux loups...'
                                                    : '💬 Message au village...'
                                            }
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                            className={`flex-1 bg-gradient-to-r from-night-800 to-night-900 border-2 ${
                                                myRole === 'loup' && activeChat === 'wolf'
                                                    ? 'border-blood-600 focus:border-blood-500'
                                                    : 'border-night-600 focus:border-blood-600'
                                            } focus:ring-2 focus:ring-blood-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 transition-all outline-none shadow-lg hover:shadow-xl transform focus:scale-102`}
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
