const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
// Redis retiré (causait des timeouts et crashes 502)

// Charger les variables d'environnement (optionnel en production)
try {
    require('dotenv').config();
} catch (e) {
    console.log('⚠️ dotenv non disponible, utilisation des variables d\'environnement système');
}

const app = express();
const server = http.createServer(app);

// Configurer CORS depuis les variables d'environnement (FR ou EN)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.ORIGINES_AUTORIS)
    ? (process.env.ALLOWED_ORIGINS || process.env.ORIGINES_AUTORIS).split(',')
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://loup-garou-38saxttvx-boulahias-projects-9f2abc0a.vercel.app',
        'https://loup-garou-xi.vercel.app'
    ];

// 🔧 CORS plus permissif pour éviter les erreurs de reconnexion
const io = socketIo(server, {
    cors: {
        origin: '*', // ✅ AUTORISER TOUS pour éviter CORS sur polling fallback
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['*']
    },
    // 🎮 Timeouts mode famille (détente, tolérants pour jeu en famille)
    pingTimeout: 60000,   // 60 secondes - Quelqu'un peut aller aux toilettes 🚽
    pingInterval: 25000,  // 25 secondes - Ping espacé pour stabilité
    connectTimeout: 45000, // 45 secondes - Connexion initiale confortable
    transports: ['websocket', 'polling'], // ✅ AUTORISER POLLING + WEBSOCKET
    allowUpgrades: true, // ✅ Permettre upgrade vers WebSocket
    perMessageDeflate: false // Désactiver compression pour éviter timeouts
});

// Route de santé pour Railway
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: '🎮 Serveur Loup-Garou en ligne',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Route pour vérifier si une salle existe
app.get('/api/room/:code', (req, res) => {
    const { code } = req.params;
    const room = rooms.get(code.toUpperCase());

    if (!room) {
        return res.status(404).json({
            exists: false,
            message: 'Salle introuvable'
        });
    }

    res.json({
        exists: true,
        code: room.code,
        playerCount: room.players.size,
        gameStarted: room.gameStarted,
        phase: room.phase
    });
});

// Route pour lister toutes les salles actives (debug)
app.get('/api/rooms', (req, res) => {
    const roomsList = Array.from(rooms.values()).map(room => ({
        code: room.code,
        players: room.players.size,
        gameStarted: room.gameStarted,
        phase: room.phase
    }));

    res.json({
        total: rooms.size,
        rooms: roomsList
    });
});


// Structure des salles de jeu
const rooms = new Map();

// 🔄 Fonction pour récupérer une room (mémoire uniquement, Redis retiré)
function getRoom(roomCode) {
    return rooms.get(roomCode) || null;
}

// 💾 Sauvegarde Redis désactivée temporairement (peut causer des timeouts)
// setInterval(() => {
//     for (const [code, room] of rooms.entries()) {
//         saveRoom(code, room).catch(err =>
//             console.error(`❌ Erreur sauvegarde ${code}:`, err)
//         );
//     }
// }, 5000);

// 🤖 Classe Bot pour joueurs IA
class BotPlayer {
    constructor(room) {
        this.room = room;
        this.botNames = ['🤖 Robo', '🤖 Beep', '🤖 Chip', '🤖 Data', '🤖 Wall-E', '🤖 R2D2'];
    }

    // Obtenir un nom aléatoire non utilisé
    getRandomName() {
        const usedNames = Array.from(this.room.players.values()).map(p => p.name);
        const availableNames = this.botNames.filter(name => !usedNames.includes(name));
        return availableNames.length > 0
            ? availableNames[Math.floor(Math.random() * availableNames.length)]
            : `🤖 Bot${Math.floor(Math.random() * 1000)}`;
    }

    // Ajouter un bot à la room
    addBot() {
        if (this.room.players.size >= 10) {
            return { success: false, error: 'La salle est pleine' };
        }

        const botId = `bot_${uuidv4()}`;
        const botName = this.getRandomName();

        this.room.players.set(botId, {
            id: botId,
            name: botName,
            isHost: false,
            ready: true, // Les bots sont toujours prêts
            role: null,
            alive: true,
            socketId: 'bot', // Identifier comme bot
            isBot: true,
            stats: {
                messagesCount: 0,
                votesReceived: 0,
                votesGiven: 0,
                nightsAlive: 0
            }
        });

        return { success: true, botId, botName };
    }

    // Action automatique du bot pendant la nuit
    async performNightAction(botId, delay = 2000) {
        const bot = this.room.players.get(botId);
        if (!bot || !bot.alive || !bot.isBot) return;

        // Attendre un délai aléatoire (1-4s) pour simuler réflexion
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 2000));

        const role = bot.role;
        const alivePlayers = Array.from(this.room.players.values()).filter(p => p.alive && p.id !== botId);

        if (alivePlayers.length === 0) return;

        // Choisir une cible aléatoire
        const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];

        // Actions selon le rôle
        if (role === 'loup') {
            this.room.gameState.nightActions[botId] = { action: 'kill', targetId: target.id };
        } else if (role === 'voyante') {
            this.room.gameState.nightActions[botId] = { action: 'see', targetId: target.id };
        } else if (role === 'livreur') {
            this.room.gameState.nightActions[botId] = { action: 'protect', targetId: target.id };
        } else if (role === 'cupidon' && this.room.nightNumber === 1) {
            // Choisir 2 joueurs au hasard pour le couple
            const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);
            if (shuffled.length >= 2) {
                // ✅ IMPORTANT : Envoyer 2 actions séparées pour Cupidon (comme un vrai joueur)
                this.room.gameState.nightActions[botId] = [
                    { action: 'couple', targetId: shuffled[0].id },
                    { action: 'couple', targetId: shuffled[1].id }
                ];
            }
        }
        // Sorcière : logique simple (50% chance de heal/poison)
        else if (role === 'sorciere') {
            // ✅ SEULEMENT heal si quelqu'un EST VRAIMENT TUÉ
            if (this.room.gameState.killedTonight && !this.room.gameState.witchHealUsed && Math.random() > 0.5) {
                this.room.gameState.nightActions[botId] = { action: 'heal' };
            }
            // ✅ Poison sur une cible vivante
            else if (!this.room.gameState.witchPoisonUsed && Math.random() > 0.7) {
                this.room.gameState.nightActions[botId] = { action: 'poison', targetId: target.id };
            }
        }

        console.log(`🤖 Bot ${bot.name} (${role}) a agi`);
    }

    // Vote automatique du bot
    async performVote(botId, delay = 2000) {
        const bot = this.room.players.get(botId);
        if (!bot || !bot.alive || !bot.isBot) return;

        // Attendre un délai aléatoire
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 2000));

        const alivePlayers = Array.from(this.room.players.values())
            .filter(p => p.alive && p.id !== botId);

        if (alivePlayers.length === 0) return;

        // Stratégie simple : voter aléatoirement
        const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];

        this.room.gameState.votes[botId] = target.id;
        console.log(`🤖 Bot ${bot.name} a voté pour ${target.name}`);
    }
}

// 🧹 NETTOYAGE AUTOMATIQUE DES PARTIES TERMINÉES
// ✅ Chaque partie est nouvelle et différente - on nettoie les anciennes
const AUTO_CLEANUP_ENABLED = true; // ✅ Activé pour libérer la mémoire

if (AUTO_CLEANUP_ENABLED) {
    setInterval(() => {
        let cleaned = 0;

        for (const [code, room] of rooms.entries()) {
            const now = Date.now();

            // ✅ Nettoyer les parties TERMINÉES après 10 minutes
            if (room.gameEnded) {
                if (!room.endTime) {
                    room.endTime = now;
                }

                const timeSinceEnd = now - room.endTime;
                if (timeSinceEnd > 10 * 60 * 1000) { // 10 minutes après la fin
                    if (room.phaseTimer) {
                        clearInterval(room.phaseTimer);
                        room.phaseTimer = null;
                    }
                    console.log(`🗑️ SUPPRESSION ROOM ${code} (partie terminée depuis 10min)`);
                    rooms.delete(code);
                    cleaned++;
                }
            }
            // ✅ Nettoyer les lobbies ABANDONNÉS (vides depuis > 30 minutes)
            else if (!room.gameStarted && room.players.size === 0) {
                const timeSinceCreation = now - (room.createdAt || now);
                if (timeSinceCreation > 30 * 60 * 1000) { // 30 minutes d'abandon
                    console.log(`🗑️ SUPPRESSION LOBBY ${code} (abandonné depuis 30min)`);
                    rooms.delete(code);
                    cleaned++;
                }
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Nettoyage: ${cleaned} salle(s) supprimée(s). Total: ${rooms.size} room(s) actives`);
        }
    }, 5 * 60 * 1000); // Vérification toutes les 5 minutes
    console.log('✅ NETTOYAGE AUTOMATIQUE ACTIVÉ - Les anciennes parties sont supprimées');
} else {
    console.log('⚠️ NETTOYAGE AUTOMATIQUE DÉSACTIVÉ - Les rooms restent en mémoire');
}

// Classe pour gérer une salle
class GameRoom {
    constructor(code, hostId, hostName, hostAvatar = '😊', rapidMode = false) {
        this.code = code;
        this.hostId = hostId;
        this.rapidMode = rapidMode; // ⚡ Mode Rapide
        this.createdAt = Date.now(); // 🕐 Timestamp de création (pour nettoyage lobbies abandonnés)
        this.players = new Map();
        this.players.set(hostId, {
            id: hostId,
            name: hostName,
            avatar: hostAvatar,
            isHost: true,
            ready: false,
            role: null,
            alive: true,
            socketId: null,
            stats: {
                messagesCount: 0,
                votesReceived: 0,
                votesGiven: 0,
                nightsAlive: 0
            }
        });
        this.gameStarted = false;
        this.gameEnded = false; // 🎮 Flag pour savoir si le game over a été atteint
        this.endTime = null; // 🕐 Timestamp de fin de partie (pour nettoyage)
        this.phase = 'lobby'; // lobby, night, day, vote
        this.nightNumber = 1;
        this.currentPlayerTurn = null;
        this.phaseTimer = null; // Timer pour progression automatique
        this.phaseTimeRemaining = 60; // Temps restant en secondes
        this.customRoles = []; // Rôles personnalisés choisis par l'hôte
        this.processingPhase = false; // 🔒 Flag pour éviter la race condition
        this.processingVotes = false; // 🔒 Flag pour éviter double traitement des votes
        this.gameState = {
            deadPlayers: [],
            killedTonight: null,
            witchHealUsed: false,
            witchPoisonUsed: false,
            livreurProtection: null, // Qui est protégé par le livreur cette nuit
            couple: [], // Les deux amoureux [id1, id2]
            votes: {},
            nightActions: {}
        };
    }

    addPlayer(playerId, playerName, socketId, avatar = '😊') {
        if (this.players.size >= 10) {
            return { success: false, error: 'La salle est pleine' };
        }

        if (this.gameStarted) {
            return { success: false, error: 'La partie a déjà commencé' };
        }

        this.players.set(playerId, {
            id: playerId,
            name: playerName,
            avatar: avatar,
            isHost: false,
            ready: false,
            role: null,
            alive: true,
            socketId: socketId,
            stats: {
                messagesCount: 0,
                votesReceived: 0,
                votesGiven: 0,
                nightsAlive: 0
            }
        });

        return { success: true };
    }

    removePlayer(playerId) {
        this.players.delete(playerId);

        // Si c'était l'hôte, transférer à quelqu'un d'autre
        if (playerId === this.hostId && this.players.size > 0) {
            const newHost = Array.from(this.players.values())[0];
            newHost.isHost = true;
            this.hostId = newHost.id;
        }
    }

    setPlayerReady(playerId, ready) {
        const player = this.players.get(playerId);
        if (player) {
            player.ready = ready;
        }
    }

    canStartGame() {
        if (this.players.size < 2) {
            return { canStart: false, error: 'Il faut au moins 2 joueurs' };
        }

        const allReady = Array.from(this.players.values()).every(p => p.ready || p.isHost);
        if (!allReady) {
            return { canStart: false, error: 'Tous les joueurs doivent être prêts' };
        }

        return { canStart: true };
    }

    startGame() {
        this.gameStarted = true;
        this.assignRoles();
        this.phase = 'night';
        this.nightNumber = 1;
        this.processingPhase = false; // ✅ Reset du flag de traitement
        this.processingVotes = false; // ✅ Reset du flag de votes

        // ✅ Réinitialiser l'état du jeu pour une nouvelle partie
        this.gameState.witchHealUsed = false;
        this.gameState.witchPoisonUsed = false;
        this.gameState.couple = [];
        this.gameState.deadPlayers = [];
        this.gameState.killedTonight = null;
        this.gameState.livreurProtection = null;
        this.gameState.nightActions = {};
        this.gameState.votes = {};
    }

    assignRoles() {
        const playerCount = this.players.size;
        const roles = [];

        // Ajouter les loups (selon loupCount ou 1 par défaut)
        const numLoups = this.loupCount || 1;
        for (let i = 0; i < numLoups && roles.length < playerCount; i++) {
            roles.push('loup');
        }

        // Si des rôles personnalisés sont définis, les ajouter
        if (this.customRoles && this.customRoles.length > 0) {
            this.customRoles.forEach(role => {
                if (roles.length < playerCount) {
                    roles.push(role);
                }
            });
        } else {
            // Rôles par défaut selon le nombre de joueurs (si aucun rôle choisi)
            if (playerCount >= 4 && roles.length < playerCount) roles.push('voyante');
            if (playerCount >= 5 && roles.length < playerCount) roles.push('sorciere');
            if (playerCount >= 6 && roles.length < playerCount) roles.push('riche');
            if (playerCount >= 7 && roles.length < playerCount) roles.push('livreur');
        }

        // Compléter avec des villageois
        while (roles.length < playerCount) {
            roles.push('villageois');
        }

        // Mélanger les rôles
        roles.sort(() => Math.random() - 0.5);

        // Assigner aux joueurs
        let index = 0;
        for (const player of this.players.values()) {
            player.role = roles[index];
            player.alive = true;
            index++;
        }
    }

    getPlayersList() {
        return Array.from(this.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost,
            ready: p.ready,
            alive: p.alive,
            avatar: p.avatar
        }));
    }

    getPlayersForClient(requesterId) {
        // Vérifier qui a déjà agi cette nuit
        const hasActed = this.gameState && this.gameState.nightActions
            ? Object.keys(this.gameState.nightActions)
            : [];

        return Array.from(this.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost,
            ready: p.ready,
            alive: p.alive,
            avatar: p.avatar,
            role: p.id === requesterId ? p.role : null, // Seulement son propre rôle
            hasActed: hasActed.includes(p.id) // Indicateur d'action nocturne
        }));
    }
}

// Générer un code de salle unique
function generateRoomCode() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return rooms.has(code) ? generateRoomCode() : code;
}

// 🔄 Keep-alive automatique toutes les 10 secondes (pour éviter timeouts Railway)
setInterval(() => {
    io.emit('ping', { timestamp: Date.now() });
}, 10000);

// WebSocket - Gestion des connexions
io.on('connection', (socket) => {
    console.log('Nouveau joueur connecté:', socket.id);

    // ✅ Envoyer immédiatement un message de bienvenue pour confirmer la connexion
    socket.emit('connected', {
        message: 'Connexion établie au serveur',
        timestamp: Date.now()
    });

    // Créer une salle
    socket.on('createRoom', (data) => {
        const { playerName, avatar, rapidMode } = data;
        const playerId = uuidv4();
        const roomCode = generateRoomCode();

        const room = new GameRoom(roomCode, playerId, playerName, avatar || '😊', rapidMode || false);
        room.players.get(playerId).socketId = socket.id;
        rooms.set(roomCode, room);

        socket.join(roomCode);
        socket.playerId = playerId;
        socket.roomCode = roomCode;

        socket.emit('roomCreated', {
            roomCode: roomCode,
            playerId: playerId,
            players: room.getPlayersList()
        });

        console.log(`Salle créée: ${roomCode} par ${playerName}`);
    });

    // Rejoindre une salle
    socket.on('joinRoom', (data) => {
        const { roomCode, playerName, avatar } = data;
        const room = getRoom(roomCode);

        if (!room) {
            socket.emit('error', { message: 'Salle introuvable' });
            return;
        }

        const playerId = uuidv4();
        const result = room.addPlayer(playerId, playerName, socket.id, avatar || '😊');

        if (!result.success) {
            socket.emit('error', { message: result.error });
            return;
        }

        socket.join(roomCode);
        socket.playerId = playerId;
        socket.roomCode = roomCode;

        socket.emit('roomJoined', {
            roomCode: roomCode,
            playerId: playerId,
            players: room.getPlayersList()
        });

        // Notifier tous les joueurs de la salle
        io.to(roomCode).emit('playerJoined', {
            players: room.getPlayersList()
        });

        console.log(`${playerName} a rejoint la salle ${roomCode}`);
    });

    // 👢 Expulser un joueur (kick)
    socket.on('kickPlayer', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) {
            socket.emit('error', { message: 'Salle introuvable' });
            return;
        }

        const player = room.players.get(socket.playerId);
        // Vérifier que c'est l'hôte qui demande
        if (!player || !player.isHost) {
            socket.emit('error', { message: 'Seul l\'hôte peut expulser un joueur' });
            return;
        }

        const { targetId } = data;
        const targetPlayer = room.players.get(targetId);
        if (!targetPlayer) {
            socket.emit('error', { message: 'Joueur introuvable' });
            return;
        }

        // Empêcher l'hôte de s'expulser lui-même
        if (targetId === socket.playerId) {
            socket.emit('error', { message: 'Vous ne pouvez pas vous expulser vous-même' });
            return;
        }

        // Notifier le joueur expulsé
        if (targetPlayer.socketId) {
            io.to(targetPlayer.socketId).emit('kicked', {
                message: 'Vous avez été expulsé de la partie par l\'hôte'
            });
        }

        // Retirer le joueur
        room.removePlayer(targetId);

        // Notifier tous les autres joueurs
        io.to(socket.roomCode).emit('playerKicked', {
            kickedName: targetPlayer.name,
            players: room.getPlayersList()
        });

        console.log(`${targetPlayer.name} a été expulsé de ${socket.roomCode} par l'hôte`);
    });

    // Toggle ready status
    socket.on('toggleReady', () => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;

        const player = room.players.get(socket.playerId);
        if (!player) return;

        // Toggle le statut prêt
        player.ready = !player.ready;

        // Notifier tous les joueurs de la salle
        io.to(socket.roomCode).emit('playerReady', {
            playerId: player.id,
            ready: player.ready,
            players: room.getPlayersList()
        });

        console.log(`${player.name} est ${player.ready ? '✅ prêt' : '⏳ pas prêt'}`);
    });

    // 👍 Envoyer une réaction rapide
    socket.on('sendReaction', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;

        const player = room.players.get(socket.playerId);
        if (!player) return;

        // Broadcast la réaction à tous les joueurs de la salle
        io.to(socket.roomCode).emit('playerReaction', {
            playerId: player.id,
            playerName: player.name,
            emoji: data.emoji
        });

        console.log(`${player.name} réagit avec ${data.emoji}`);
    });

    // 🤖 Ajouter un bot à la salle
    socket.on('addBot', () => {
        const room = rooms.get(socket.roomCode);
        if (!room) {
            socket.emit('error', { message: 'Salle introuvable' });
            return;
        }

        // Vérifier que c'est l'hôte
        const player = room.players.get(socket.playerId);
        if (!player || !player.isHost) {
            socket.emit('error', { message: 'Seul l\'hôte peut ajouter des bots' });
            return;
        }

        // Vérifier que le jeu n'a pas démarré
        if (room.gameStarted) {
            socket.emit('error', { message: 'La partie a déjà commencé' });
            return;
        }

        // Ajouter le bot
        const botManager = new BotPlayer(room);
        const result = botManager.addBot();

        if (!result.success) {
            socket.emit('error', { message: result.error });
            return;
        }

        // Notifier tous les joueurs
        io.to(socket.roomCode).emit('playerJoined', {
            players: room.getPlayersList()
        });

        console.log(`🤖 Bot ${result.botName} ajouté à la salle ${socket.roomCode}`);
    });

    // Démarrer la partie
    socket.on('startGame', (data) => {
        const room = rooms.get(socket.roomCode);

        if (!room) return;

        // Vérifier que c'est l'hôte
        const player = room.players.get(socket.playerId);
        if (!player || !player.isHost) {
            socket.emit('error', { message: 'Seul l\'hôte peut démarrer' });
            return;
        }

        const canStart = room.canStartGame();
        if (!canStart.canStart) {
            socket.emit('error', { message: canStart.error });
            return;
        }

        // Enregistrer les rôles personnalisés et le nombre de loups si fournis
        if (data && data.customRoles && data.customRoles.length > 0) {
            room.customRoles = data.customRoles;
        }
        if (data && data.loupCount) {
            room.loupCount = data.loupCount;
        }

        // 🎲 Validation nombre minimum de joueurs selon les rôles
        const playerCount = room.players.size;
        const roles = room.customRoles || [];

        // Règles minimales
        if (roles.includes('cupidon') && playerCount < 4) {
            socket.emit('error', { message: 'Il faut au moins 4 joueurs pour jouer avec Cupidon' });
            return;
        }
        if (roles.includes('chasseur') && playerCount < 5) {
            socket.emit('error', { message: 'Il faut au moins 5 joueurs pour jouer avec le Chasseur' });
            return;
        }
        if ((room.loupCount || 1) >= playerCount) {
            socket.emit('error', { message: 'Il y a trop de loups ! Il faut au moins 1 villageois.' });
            return;
        }

        room.startGame();

        // Envoyer les rôles à chaque joueur
        for (const p of room.players.values()) {
            io.to(p.socketId).emit('gameStarted', {
                roomCode: room.code,
                role: p.role,
                players: room.getPlayersForClient(p.id),
                phase: 'night',
                nightNumber: 1,
                playWolfHowl: true // 🐺 Déclencher le hurlement de loup pour la 1ère nuit
            });
        }

        // Démarrer le timer de la première nuit
        startPhaseTimer(room, getPhaseDuration(room, 'night'));

        console.log(`Partie démarrée dans la salle ${socket.roomCode}`);
    });

    // Reconnexion unifiée à une partie (lobby ou game)
    socket.on('reconnectToGame', (data) => {
        const { roomCode, playerId } = data;
        const room = getRoom(roomCode);

        // CAS 1 : La room n'existe plus (redémarrage serveur, suppression auto, etc.)
        if (!room) {
            console.error(`❌ Room ${roomCode} introuvable (probablement supprimée ou serveur redémarré)`);
            socket.emit('roomNotFound', {
                message: 'Cette partie n\'existe plus sur le serveur',
                reason: 'room_deleted_or_server_restarted'
            });
            return;
        }

        // CAS 2 : La room existe, mais le joueur n'est plus reconnu
        const player = room.players.get(playerId);
        if (!player) {
            console.error(`⚠️ Player ${playerId} introuvable dans ${roomCode} (peut-être supprimé lors d'une déconnexion)`);

            // Renvoyer des infos pour permettre au client de recréer son joueur
            socket.emit('playerNotFoundInRoom', {
                message: 'Votre joueur n\'est plus dans cette partie',
                roomCode: roomCode,
                roomExists: true,
                gameStarted: room.gameStarted,
                canRejoin: !room.gameStarted, // On peut rejoindre seulement si la partie n'a pas démarré
                players: room.getPlayersList()
            });
            return;
        }

        // CAS 3 : Tout est OK, reconnexion réussie
        // Mettre à jour le socketId du joueur
        player.socketId = socket.id;
        socket.join(roomCode);
        socket.playerId = playerId;
        socket.roomCode = roomCode;

        // Si le jeu a démarré, renvoyer l'état complet
        if (room.gameStarted) {
            socket.emit('gameState', {
                role: player.role,
                phase: room.phase,
                nightNumber: room.nightNumber,
                players: room.getPlayersForClient(playerId),
                phaseTimeRemaining: room.phaseTimeRemaining,
                killedTonight: room.gameState.killedTonight,
                deadPlayers: room.gameState.deadPlayers || [], // ✅ Envoyer la liste des morts
                couple: room.gameState.couple || [], // ✅ Envoyer le couple si formé
                witchHealUsed: room.gameState.witchHealUsed || false,
                witchPoisonUsed: room.gameState.witchPoisonUsed || false
            });
            console.log(`✅ ${player.name} reconnecté à la partie ${roomCode}`);
        } else {
            // Sinon, renvoyer l'état du lobby
            socket.emit('roomJoined', {
                roomCode: roomCode,
                playerId: playerId,
                players: room.getPlayersList()
            });
            console.log(`✅ ${player.name} reconnecté au lobby ${roomCode}`);
        }

        // Notifier les autres joueurs de la reconnexion
        socket.to(roomCode).emit('playerReconnected', {
            playerId: player.id,
            playerName: player.name
        });

        // ✅ RESYNCHRONISER tout le monde sur la phase actuelle
        // (au cas où le timer a changé la phase pendant la reconnexion)
        setTimeout(() => {
            if (room.gameStarted && !room.gameEnded) {
                io.to(roomCode).emit('phaseSync', {
                    phase: room.phase,
                    phaseTimeRemaining: room.phaseTimeRemaining,
                    nightNumber: room.nightNumber
                });
                console.log(`🔄 Resync phase ${room.phase} pour tous les clients de ${roomCode}`);
            }
        }, 500); // Attendre 500ms pour que le client ait traité gameState
    });


    // Action de nuit
    socket.on('nightAction', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) {
            socket.emit('error', { message: 'Partie introuvable' });
            return;
        }

        const { action, targetId } = data;
        const player = room.players.get(socket.playerId);

        // Validation basique
        if (!player || !player.alive) {
            socket.emit('error', { message: 'Vous ne pouvez pas agir' });
            return;
        }

        if (room.phase !== 'night') {
            socket.emit('error', { message: 'Ce n\'est pas la nuit' });
            return;
        }

        // ⏳ Empêcher actions pendant le traitement de la nuit
        if (room.processingPhase) {
            socket.emit('error', { message: 'La nuit est en cours de traitement, veuillez patienter' });
            return;
        }

        // Vérifier que l'action correspond au rôle
        const validActions = {
            'loup': ['kill'],
            'voyante': ['see'],
            'sorciere': ['heal', 'poison'],
            'livreur': ['protect'],
            'cupidon': ['couple'],
            'chasseur': ['shoot']
        };

        if (!validActions[player.role] || !validActions[player.role].includes(action)) {
            socket.emit('error', { message: 'Action invalide pour votre rôle' });
            return;
        }

        // Vérifier que la cible existe et est valide
        if (targetId) {
            const target = room.players.get(targetId);
            if (!target) {
                socket.emit('error', { message: 'Cible invalide' });
                return;
            }
            // Ne peut pas cibler un joueur mort (sauf pour sorcière heal)
            if (!target.alive && action !== 'heal') {
                socket.emit('error', { message: 'Ne peut pas cibler un joueur mort' });
                return;
            }

            // 💘 Validation spéciale pour Cupidon
            if (action === 'couple' && room.nightNumber === 1) {
                // Vérifier si le couple est déjà formé
                if (room.gameState.couple.length >= 2) {
                    socket.emit('error', { message: 'Le couple est déjà formé !' });
                    return;
                }
                // Vérifier si cette personne est déjà choisie
                if (room.gameState.couple.includes(targetId)) {
                    socket.emit('error', { message: 'Vous ne pouvez pas choisir la même personne deux fois !' });
                    return;
                }
            }

            // 🐺 Les loups ne peuvent pas se cibler entre eux
            if (action === 'kill' && player.role === 'loup' && target.role === 'loup') {
                socket.emit('error', { message: 'Vous ne pouvez pas cibler un autre loup !' });
                return;
            }
        }

        // Enregistrer l'action
        // 💘 Cupidon peut agir plusieurs fois la nuit 1, stocker dans un array TOUJOURS
        if (action === 'couple' && room.nightNumber === 1) {
            if (!room.gameState.nightActions[socket.playerId]) {
                room.gameState.nightActions[socket.playerId] = [];
            }
            // Vérifier qu'on n'ajoute pas plus de 2 cibles
            if (Array.isArray(room.gameState.nightActions[socket.playerId])) {
                if (room.gameState.nightActions[socket.playerId].length < 2) {
                    // 💘 Vérifier que la cible n'a pas déjà été choisie (pas de doublon)
                    const alreadyChosen = room.gameState.nightActions[socket.playerId]
                        .some(a => a.targetId === targetId);

                    if (alreadyChosen) {
                        socket.emit('error', { message: 'Vous avez déjà choisi cette personne pour le couple' });
                        return;
                    }

                    room.gameState.nightActions[socket.playerId].push({ action, targetId });

                    // ✅ Ajouter immédiatement au couple pour validation cohérente
                    room.gameState.couple.push(targetId);
                } else {
                    socket.emit('error', { message: 'Vous avez déjà choisi 2 personnes pour le couple' });
                    return;
                }
            }
        } else {
            room.gameState.nightActions[socket.playerId] = { action, targetId };
        }

        // Notifier le joueur que son action est enregistrée
        socket.emit('actionConfirmed');

        // ✅ Vérifier si tous les joueurs avec des actions nocturnes ont agi
        const rolesWithNightActions = ['loup', 'voyante', 'sorciere', 'livreur', 'cupidon', 'chasseur'];
        const playersWithActions = Array.from(room.players.values()).filter(p =>
            p.alive && rolesWithNightActions.includes(p.role)
        );

        // ✅ Vérifier PROPREMENT chaque rôle
        let allActed = true;
        for (const player of playersWithActions) {
            const playerAction = room.gameState.nightActions[player.id];

            if (!playerAction) {
                allActed = false;
                break;
            }

            // 💘 Cupidon nuit 1 : doit avoir un array de 2 actions
            if (player.role === 'cupidon' && room.nightNumber === 1) {
                if (!Array.isArray(playerAction) || playerAction.length < 2) {
                    allActed = false;
                    break;
                }
            }
        }

        const actedPlayers = Object.keys(room.gameState.nightActions).length;
        console.log(`🌙 Actions: ${actedPlayers}/${playersWithActions.length} joueurs ont agi`);

        if (allActed && !room.processingPhase) {
            // Tous les joueurs avec actions ont agi, passer au jour
            room.processingPhase = true; // 🔒 Verrouiller pour éviter double traitement
            // Notifier les clients que le serveur est en phase de traitement
            io.to(room.code).emit('processingPhase', { processing: true });
            console.log('✅ Tous les rôles actifs ont agi, passage au jour');
            clearInterval(room.phaseTimer); // Arrêter le timer
            processNightActions(room);
        }
    });

    // Vote du jour
    socket.on('vote', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) {
            socket.emit('error', { message: 'Partie introuvable' });
            return;
        }

        const { targetId } = data;
        const player = room.players.get(socket.playerId);

        if (!player || !player.alive) {
            socket.emit('error', { message: 'Vous ne pouvez pas voter' });
            return;
        }

        if (room.phase !== 'vote') {
            socket.emit('error', { message: 'Ce n\'est pas l\'heure de voter' });
            return;
        }

        // ✅ Empêcher double vote
        if (room.gameState.votes[socket.playerId]) {
            socket.emit('error', { message: 'Vous avez déjà voté !' });
            return;
        }

        // ❌ Empêcher de voter pour soi-même
        if (targetId === socket.playerId) {
            socket.emit('error', { message: 'Vous ne pouvez pas voter pour vous-même !' });
            return;
        }

        // Vérifier que la cible existe et est vivante
        const target = room.players.get(targetId);
        if (!target || !target.alive) {
            socket.emit('error', { message: 'Cible invalide' });
            return;
        }

        // 📊 Incrémenter les stats de votes (avec protection si stats n'existe pas)
        if (player.stats) {
            player.stats.votesGiven++;
        }
        if (target.stats) {
            target.stats.votesReceived++;
        }

        room.gameState.votes[socket.playerId] = targetId;
        socket.emit('voteConfirmed');

        // Notifier tous les joueurs du nombre de votes
        const voteCount = Object.keys(room.gameState.votes).length;
        const aliveCount = Array.from(room.players.values()).filter(p => p.alive).length;

        io.to(socket.roomCode).emit('voteProgress', {
            voted: voteCount,
            total: aliveCount
        });

        // Si tous ont voté, traiter les votes (avec verrou pour éviter double traitement)
        if (voteCount >= aliveCount && !room.processingVotes) {
            room.processingVotes = true; // 🔒 Verrouiller
            processVotes(room);
        }
    });

    // Tir du chasseur
    socket.on('hunterShoot', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;

        const { targetId } = data;
        const player = room.players.get(socket.playerId);

        // Vérifier que c'est bien le chasseur et qu'on est en phase hunter
        if (!player || player.role !== 'chasseur' || room.phase !== 'hunter') {
            socket.emit('error', { message: 'Action non autorisée' });
            return;
        }

        // Vérifier la cible
        const target = room.players.get(targetId);
        if (!target || !target.alive) {
            socket.emit('error', { message: 'Cible invalide' });
            return;
        }

        // Tuer la cible
        target.alive = false;
        if (!room.gameState.deadPlayers.includes(targetId)) {
            room.gameState.deadPlayers.push(targetId);
        }

        // 💔 Vérifier si c'est un amoureux → tuer l'autre aussi
        if (room.gameState.couple.length === 2) {
            const [lover1Id, lover2Id] = room.gameState.couple;

            if (targetId === lover1Id) {
                const lover2 = room.players.get(lover2Id);
                if (lover2 && lover2.alive) {
                    lover2.alive = false;
                    if (!room.gameState.deadPlayers.includes(lover2Id)) {
                        room.gameState.deadPlayers.push(lover2Id);
                    }
                    console.log(`💔 ${lover2.name} meurt de chagrin (chasseur)`);
                }
            } else if (targetId === lover2Id) {
                const lover1 = room.players.get(lover1Id);
                if (lover1 && lover1.alive) {
                    lover1.alive = false;
                    if (!room.gameState.deadPlayers.includes(lover1Id)) {
                        room.gameState.deadPlayers.push(lover1Id);
                    }
                    console.log(`💔 ${lover1.name} meurt de chagrin (chasseur)`);
                }
            }
        }

        io.to(room.code).emit('hunterShot', {
            hunterId: player.id,
            hunterName: player.name,
            targetId: target.id,
            targetName: target.name
        });

        // ✅ Continuer le jeu avec vérification de victoire
        setTimeout(() => {
            room.processingVotes = false; // 🔓 Déverrouiller avant continueAfterVote
            continueAfterVote(room);
        }, 3000);
    });

    // Chat
    socket.on('chatMessage', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;

        const player = room.players.get(socket.playerId);
        if (!player) return;

        // 📊 Incrémenter le compteur de messages (avec protection)
        if (player.stats) {
            player.stats.messagesCount++;
        }

        // Broadcast le message à toute la salle
        io.to(socket.roomCode).emit('chatMessage', {
            playerId: player.id,
            playerName: player.name,
            message: data.message,
            timestamp: Date.now()
        });
    });

    // 🛑 Arrêter la partie (réservé à l'hôte)
    socket.on('stopGame', () => {
        const room = rooms.get(socket.roomCode);
        if (!room) {
            socket.emit('error', { message: 'Partie introuvable' });
            return;
        }

        const player = room.players.get(socket.playerId);
        if (!player || !player.isHost) {
            socket.emit('error', { message: 'Seul l\'hôte peut arrêter la partie' });
            return;
        }

        // Nettoyer le timer
        if (room.phaseTimer) {
            clearInterval(room.phaseTimer);
            room.phaseTimer = null;
        }

        // 🔓 Réinitialiser les verrous
        room.processingPhase = false;
        room.processingVotes = false;

        // Marquer la partie comme terminée
        room.gameEnded = true;
        room.endTime = Date.now(); // 🕐 Marquer l'heure de fin

        // Notifier tous les joueurs
        io.to(socket.roomCode).emit('gameForceEnded', {
            message: 'La partie a été arrêtée par l\'hôte',
            hostName: player.name
        });

        console.log(`🛑 Partie ${socket.roomCode} arrêtée par l'hôte ${player.name}`);

        // ⚠️ NE PAS SUPPRIMER IMMÉDIATEMENT - Garder pour consultation résultats
        // La suppression automatique s'occupera du nettoyage après 10min (si activée)
        if (!AUTO_CLEANUP_ENABLED) {
            console.log(`� Room ${socket.roomCode} conservée en mémoire (nettoyage auto désactivé)`);
        }
    });

    // Déconnexion
    socket.on('disconnect', () => {
        console.log('Joueur déconnecté:', socket.id);

        if (socket.roomCode) {
            const room = rooms.get(socket.roomCode);
            if (room) {
                // Si la partie n'a pas commencé, on GARDE le joueur pour permettre reconnexion
                if (!room.gameStarted) {
                    const player = room.players.get(socket.playerId);
                    if (player) {
                        player.socketId = null; // Marquer comme déconnecté
                        console.log(`⚠️ ${player.name} déconnecté du lobby ${socket.roomCode} (peut se reconnecter)`);

                        // Notifier les autres joueurs de la déconnexion
                        io.to(socket.roomCode).emit('playerDisconnected', {
                            playerId: player.id,
                            playerName: player.name
                        });
                    }

                    // ⚠️ NETTOYAGE DÉSACTIVÉ : On garde les rooms vides pour permettre reconnexion
                    // En production avec base de données, réactiver ce nettoyage
                    if (AUTO_CLEANUP_ENABLED && room.players.size === 0) {
                        if (room.phaseTimer) {
                            clearInterval(room.phaseTimer);
                            room.phaseTimer = null;
                        }
                        console.log(`🗑️ SUPPRESSION ROOM ${socket.roomCode} (vide, lobby)`);
                        rooms.delete(socket.roomCode);
                    }
                } else {
                    // Partie en cours : garder le joueur mais marquer socketId comme null
                    const player = room.players.get(socket.playerId);
                    if (player) {
                        player.socketId = null; // Déconnecté mais toujours dans la partie
                        console.log(`⚠️ ${player.name} déconnecté de ${socket.roomCode} (peut se reconnecter)`);

                        // 📡 Notifier les autres joueurs de la déconnexion
                        io.to(socket.roomCode).emit('playerDisconnected', {
                            playerId: player.id,
                            playerName: player.name
                        });
                    }

                    // ✅ SIMPLIFICATION : Pas de suppression automatique pendant le jeu
                    // Seul l'hôte peut arrêter via le bouton "Arrêter"
                }
            }
        }
    });
});

// ⚡ Obtenir la durée selon le mode rapide
function getPhaseDuration(room, phase) {
    if (!room.rapidMode) {
        // Mode normal - ⚡ Timers optimisés pour gameplay fluide
        if (phase === 'night') return 30; // ✅ Réduit de 60s à 30s
        if (phase === 'day') return 30;
        if (phase === 'vote') return 30;
    } else {
        // Mode rapide
        if (phase === 'night') return 20; // ✅ Réduit de 30s à 20s
        if (phase === 'day') return 15;
        if (phase === 'vote') return 15; // ✅ Réduit de 20s à 15s
    }
    return 30; // Défaut réduit aussi
}

// Démarrer le timer pour une phase
function startPhaseTimer(room, phaseDuration = 60) {
    // Nettoyer l'ancien timer s'il existe
    if (room.phaseTimer) {
        clearInterval(room.phaseTimer);
    }

    room.phaseTimeRemaining = phaseDuration;

    // 🤖 Déclencher les actions des bots après 2-5 secondes
    if (room.phase === 'night') {
        const botManager = new BotPlayer(room);
        const bots = Array.from(room.players.values()).filter(p => p.isBot && p.alive);

        bots.forEach((bot, index) => {
            // Délai progressif pour chaque bot (2s, 3s, 4s...)
            const delay = 2000 + (index * 1000);
            setTimeout(() => {
                // ✅ Vérifier que le jeu n'est pas terminé avant d'agir
                if (!room.gameEnded && room.phase === 'night') {
                    botManager.performNightAction(bot.id, 0);
                }
            }, delay);
        });
    } else if (room.phase === 'vote') {
        const botManager = new BotPlayer(room);
        const bots = Array.from(room.players.values()).filter(p => p.isBot && p.alive);

        bots.forEach((bot, index) => {
            const delay = 2000 + (index * 1000);
            setTimeout(() => {
                // ✅ Vérifier que le jeu n'est pas terminé avant de voter
                if (!room.gameEnded && room.phase === 'vote') {
                    botManager.performVote(bot.id, 0);
                }
            }, delay);
        });
    }

    // Broadcast le temps restant toutes les secondes
    room.phaseTimer = setInterval(() => {
        room.phaseTimeRemaining--;

        // Envoyer le temps à tous les joueurs
        io.to(room.code).emit('phaseTimer', {
            timeRemaining: room.phaseTimeRemaining
        });

        // Quand le timer atteint 0, passer à la phase suivante
        if (room.phaseTimeRemaining <= 0) {
            clearInterval(room.phaseTimer);

            // ✅ Vérifier que le jeu n'est pas terminé avant toute action
            if (room.gameEnded) {
                console.log(`⚠️ Timer expiré mais jeu déjà terminé (room ${room.code})`);
                return;
            }

            if (room.phase === 'night' && !room.processingPhase) {
                room.processingPhase = true; // 🔒 Verrouiller
                io.to(room.code).emit('processingPhase', { processing: true });
                processNightActions(room);
            } else if (room.phase === 'day') {
                // Passer au vote après discussion
                room.phase = 'vote';
                room.gameState.votes = {}; // ✅ Réinitialiser les votes au début de la phase
                io.to(room.code).emit('votePhase', {
                    players: Array.from(room.players.values()).map(p => ({
                        id: p.id,
                        name: p.name,
                        alive: p.alive
                    }))
                });
                startPhaseTimer(room, getPhaseDuration(room, 'vote'));
            } else if (room.phase === 'vote' && !room.processingVotes) {
                room.processingVotes = true; // 🔒 Verrouiller avant traitement
                processVotes(room);
            }
        }
    }, 1000);
}

// Traiter les actions de nuit
function processNightActions(room) {
    try {
        const actions = room.gameState.nightActions;
        let killedPlayers = [];

        // ✅ Réinitialiser la protection du livreur (nouvelle nuit = nouvelle protection)
        room.gameState.livreurProtection = null;

    // D'abord, traiter le livreur de pizza (protection)
    for (const [playerId, action] of Object.entries(actions)) {
        const player = room.players.get(playerId);

        if (player.role === 'livreur' && action.action === 'protect') {
            room.gameState.livreurProtection = action.targetId;
        }
    }

    // Traiter les votes des loups (système de majorité)
    const wolfVotes = {};
    for (const [playerId, action] of Object.entries(actions)) {
        const player = room.players.get(playerId);

        if (player.role === 'loup' && action.action === 'kill') {
            const targetId = action.targetId;
            wolfVotes[targetId] = (wolfVotes[targetId] || 0) + 1;
        }
    }

    // Trouver la cible avec le plus de votes loups
    let maxWolfVotes = 0;
    let wolfTarget = null;
    let tiedWolfTargets = []; // 🎯 Gérer l'égalité

    for (const [targetId, votes] of Object.entries(wolfVotes)) {
        if (votes > maxWolfVotes) {
            maxWolfVotes = votes;
            wolfTarget = targetId;
            tiedWolfTargets = [targetId];
        } else if (votes === maxWolfVotes && votes > 0) {
            tiedWolfTargets.push(targetId);
        }
    }

    // 🎯 Si égalité entre loups, personne ne meurt
    if (tiedWolfTargets.length > 1) {
        console.log(`🐺 Égalité votes loups (${tiedWolfTargets.length} cibles), personne ne meurt`);
        wolfTarget = null;
    }

    // Si un joueur a été choisi par les loups
    if (wolfTarget) {
        // Vérifier si protégé par le livreur
        if (wolfTarget === room.gameState.livreurProtection) {
            // Protégé par la pizza ! Ne meurt pas
            room.gameState.livreurProtection = null;
        } else {
            killedPlayers.push(wolfTarget);
            room.gameState.killedTonight = wolfTarget;
        }
    }

    // Voyante - Révéler le rôle de la cible
    for (const [playerId, actionOrActions] of Object.entries(actions)) {
        const player = room.players.get(playerId);

        // 💘 Gérer le cas où Cupidon a un array d'actions
        const actionsArray = Array.isArray(actionOrActions) ? actionOrActions : [actionOrActions];

        for (const action of actionsArray) {
            if (player.role === 'voyante' && action.action === 'see') {
                const target = room.players.get(action.targetId);
                if (target && player.socketId) {
                    // Envoyer le rôle de la cible UNIQUEMENT à la voyante
                    io.to(player.socketId).emit('roleRevealed', {
                        targetId: target.id,
                        targetName: target.name,
                        targetRole: target.role
                    });
                }
            }

            // Cupidon - Créer un couple (seulement première nuit)
            if (player.role === 'cupidon' && action.action === 'couple' && room.nightNumber === 1) {
                // ✅ Ne pas re-ajouter si déjà dans le couple (éviter doublons)
                if (!room.gameState.couple.includes(action.targetId)) {
                    room.gameState.couple.push(action.targetId);
                    console.log(`💘 Cupidon a choisi ${action.targetId} pour le couple (${room.gameState.couple.length}/2)`);
                }
            }
        }
    }

    // 💘 Notifier les amoureux si le couple est complet
    if (room.gameState.couple.length === 2) {
        const lover1 = room.players.get(room.gameState.couple[0]);
        const lover2 = room.players.get(room.gameState.couple[1]);

        // Informer les amoureux
        if (lover1 && lover1.socketId) {
            io.to(lover1.socketId).emit('inLove', {
                partnerId: lover2.id,
                partnerName: lover2.name
            });
        }
        if (lover2 && lover2.socketId) {
            io.to(lover2.socketId).emit('inLove', {
                partnerId: lover1.id,
                partnerName: lover1.name
            });
        }
        console.log(`💘 Couple formé: ${lover1.name} ❤️ ${lover2.name}`);
    }

    // Sorcière
    for (const [playerId, actionOrActions] of Object.entries(actions)) {
        const player = room.players.get(playerId);
        const actionsArray = Array.isArray(actionOrActions) ? actionOrActions : [actionOrActions];

        for (const action of actionsArray) {
            if (player.role === 'sorciere') {
                // ✅ Heal UNIQUEMENT si quelqu'un a vraiment été tué
                if (action.action === 'heal' && !room.gameState.witchHealUsed && room.gameState.killedTonight) {
                    killedPlayers = killedPlayers.filter(id => id !== room.gameState.killedTonight);
                    room.gameState.witchHealUsed = true;
                    console.log(`🧪 Sorcière heal ${room.gameState.killedTonight}`);
                } else if (action.action === 'poison' && !room.gameState.witchPoisonUsed) {
                    killedPlayers.push(action.targetId);
                    room.gameState.witchPoisonUsed = true;
                    console.log(`🧪 Sorcière poison ${action.targetId}`);
                }
            }
        }
    }

    // Appliquer les morts
    killedPlayers.forEach(id => {
        const player = room.players.get(id);
        if (player) player.alive = false;
    });

    // Vérifier si un amoureux est mort → tuer l'autre aussi
    if (room.gameState.couple.length === 2) {
        const [lover1Id, lover2Id] = room.gameState.couple;

        if (killedPlayers.includes(lover1Id) && !killedPlayers.includes(lover2Id)) {
            // Amoureux 1 est mort → tuer amoureux 2
            const lover2 = room.players.get(lover2Id);
            if (lover2 && lover2.alive) {
                lover2.alive = false;
                killedPlayers.push(lover2Id);
                console.log(`💔 ${lover2.name} meurt de chagrin`);
            }
        } else if (killedPlayers.includes(lover2Id) && !killedPlayers.includes(lover1Id)) {
            // Amoureux 2 est mort → tuer amoureux 1
            const lover1 = room.players.get(lover1Id);
            if (lover1 && lover1.alive) {
                lover1.alive = false;
                killedPlayers.push(lover1Id);
                console.log(`💔 ${lover1.name} meurt de chagrin`);
            }
        }
    }

    // Ajouter les morts de la nuit en évitant les doublons
    for (const id of killedPlayers) {
        if (!room.gameState.deadPlayers.includes(id)) {
            room.gameState.deadPlayers.push(id);
        }
    }

    // Réinitialiser les actions
    room.gameState.nightActions = {};

        // Passer au jour
        room.phase = 'day';
        room.processingPhase = false; // 🔓 Déverrouiller pour la prochaine phase

        // ✅ Débloquer immédiatement l'UI client
        io.to(room.code).emit('processingPhase', { processing: false });

        // ⏳ Attendre 1 seconde avant d'émettre dayPhase (éviter saturation WebSocket)
        setTimeout(() => {
            // Notifier tous les joueurs
            io.to(room.code).emit('dayPhase', {
                deadPlayers: killedPlayers.map(id => ({
                    id,
                    name: room.players.get(id).name
                })),
                players: Array.from(room.players.values()).map(p => ({
                    id: p.id,
                    name: p.name,
                    alive: p.alive
                }))
            });

            // Démarrer le timer du jour
            startPhaseTimer(room, getPhaseDuration(room, 'day'));
        }, 1000);
    } catch (error) {
        console.error('❌ ERREUR processNightActions:', error);
        // 🔓 TOUJOURS déverrouiller en cas d'erreur pour éviter deadlock
        room.processingPhase = false;
        room.phase = 'day'; // Forcer passage au jour
        io.to(room.code).emit('error', { message: 'Erreur lors du traitement de la nuit' });
        io.to(room.code).emit('dayPhase', {
            deadPlayers: [],
            players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                alive: p.alive
            }))
        });
        startPhaseTimer(room, getPhaseDuration(room, 'day'));
    }
}

// Traiter les votes
function processVotes(room) {
    try {
        const votes = room.gameState.votes;
        const voteCounts = {};

        // Compter les votes (avec bonus pour le Riche)
        for (const [voterId, targetId] of Object.entries(votes)) {
            const voter = room.players.get(voterId);

        // Le Riche vote compte double
        if (voter && voter.role === 'riche') {
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 2;
        } else {
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        }
    }

    // Trouver le joueur avec le plus de votes
    let maxVotes = 0;
    let eliminatedId = null;
    let tiedPlayers = []; // Pour gérer l'égalité

    for (const [playerId, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
            maxVotes = count;
            eliminatedId = playerId;
            tiedPlayers = [playerId];
        } else if (count === maxVotes && count > 0) {
            tiedPlayers.push(playerId);
        }
    }

    // Si égalité, personne n'est éliminé
    if (tiedPlayers.length > 1) {
        io.to(room.code).emit('voteResult', {
            tie: true,
            tiedPlayers: tiedPlayers.map(id => ({
                id,
                name: room.players.get(id).name
            })),
            votes: voteCounts,
            message: 'Égalité ! Personne n\'est éliminé.'
        });
        eliminatedId = null;
    }

    if (eliminatedId) {
        const player = room.players.get(eliminatedId);

        player.alive = false;
        if (!room.gameState.deadPlayers.includes(eliminatedId)) {
            room.gameState.deadPlayers.push(eliminatedId);
        }

        io.to(room.code).emit('voteResult', {
            eliminated: {
                id: eliminatedId,
                name: player.name,
                role: player.role
            },
            votes: voteCounts
        });

        // Si le chasseur meurt, il peut tirer
        if (player.role === 'chasseur') {
            room.phase = 'hunter';
            // ⚠️ NE PAS déverrouiller processingVotes ici car on continue le traitement du vote

            // 🎯 Vérifier si le chasseur est connecté
            if (!player.socketId) {
                console.log('⚠️ Chasseur déconnecté, on skip sa vengeance');
                room.phase = 'ending_hunter';
                room.processingVotes = false; // 🔓 Déverrouiller avant continueAfterVote
                continueAfterVote(room);
                return;
            }

            io.to(player.socketId).emit('hunterRevenge', {
                message: 'Vous êtes mort ! Choisissez quelqu\'un à éliminer avec vous.',
                players: Array.from(room.players.values())
                    .filter(p => p.alive)
                    .map(p => ({ id: p.id, name: p.name }))
            });

            // Attendre 30s pour le tir du chasseur
            setTimeout(() => {
                // ✅ Vérifier que le jeu n'est pas terminé avant timeout
                if (!room.gameEnded && room.phase === 'hunter') {
                    console.log('⏰ Chasseur n\'a pas tiré, on continue');
                    room.phase = 'ending_hunter'; // Marquer pour éviter double traitement
                    room.processingVotes = false; // 🔓 Déverrouiller avant continueAfterVote
                    continueAfterVote(room);
                }
            }, 30000);
            return; // Ne pas continuer immédiatement
        }
    }

        // Réinitialiser les votes
        room.gameState.votes = {};

        // 🔓 Déverrouiller le traitement des votes
        room.processingVotes = false;

        // Vérifier les conditions de victoire
        continueAfterVote(room);
    } catch (error) {
        console.error('❌ ERREUR processVotes:', error);
        // 🔓 TOUJOURS déverrouiller en cas d'erreur
        room.processingVotes = false;
        room.gameState.votes = {};
        io.to(room.code).emit('error', { message: 'Erreur lors du traitement des votes' });
        // Continuer quand même pour ne pas bloquer la partie
        continueAfterVote(room);
    }
}

// Continuer après le vote (ou après le tir du chasseur)
function continueAfterVote(room) {
    // ✅ Vérifier les conditions de victoire AVANT de continuer
    if (!checkWinCondition(room)) {
        // Passer à la nuit suivante
        setTimeout(() => {
            // ✅ Double check que le jeu n'est pas terminé avant transition
            if (room.gameEnded) {
                console.log(`⚠️ Jeu terminé pendant le timeout, on annule la transition vers nuit`);
                return;
            }

            room.phase = 'night';
            room.nightNumber++;
            room.gameState.killedTonight = null; // Reset pour la nouvelle nuit
            room.gameState.nightActions = {}; // ✅ Reset actions de nuit
            room.processingVotes = false; // ✅ Reset verrou votes pour nouvelle nuit
            // ⚠️ NE JAMAIS réinitialiser couple (les amoureux restent amoureux toute la partie)

            // 📊 Incrémenter nightsAlive pour tous les joueurs vivants (avec protection)
            Array.from(room.players.values()).forEach(p => {
                if (p.alive && p.stats) {
                    p.stats.nightsAlive++;
                }
            });

            io.to(room.code).emit('nightPhase', {
                nightNumber: room.nightNumber,
                players: Array.from(room.players.values()).map(p => ({
                    id: p.id,
                    name: p.name,
                    alive: p.alive
                })),
                killedTonight: room.gameState.killedTonight,
                playWolfHowl: true // 🐺 Déclencher le hurlement de loup côté client
            });

            // Démarrer le timer pour la nuit
            startPhaseTimer(room, getPhaseDuration(room, 'night'));
        }, 5000);
    }
}

// 📊 Calculer les statistiques de la partie
function calculateGameStats(room) {
    const players = Array.from(room.players.values());

    // Joueur le plus bavard
    const mostTalkative = players.reduce((max, p) =>
        p.stats.messagesCount > (max?.stats.messagesCount || 0) ? p : max
    , null);

    // MVP (joueur ayant le plus participé aux votes)
    const mvp = players.reduce((max, p) =>
        p.stats.votesGiven > (max?.stats.votesGiven || 0) ? p : max
    , null);

    // Loup le plus sournois (loup ayant survécu le plus de nuits)
    const wolves = players.filter(p => p.role === 'loup');
    const sneakiestWolf = wolves.reduce((max, p) =>
        p.stats.nightsAlive > (max?.stats.nightsAlive || 0) ? p : max
    , null);

    return {
        mostTalkative: mostTalkative ? {
            name: mostTalkative.name,
            avatar: mostTalkative.avatar,
            count: mostTalkative.stats.messagesCount
        } : null,
        mvp: mvp ? {
            name: mvp.name,
            avatar: mvp.avatar,
            count: mvp.stats.votesGiven
        } : null,
        sneakiestWolf: sneakiestWolf ? {
            name: sneakiestWolf.name,
            avatar: sneakiestWolf.avatar,
            nights: sneakiestWolf.stats.nightsAlive
        } : null
    };
}

// Vérifier les conditions de victoire
function checkWinCondition(room) {
    const alivePlayers = Array.from(room.players.values()).filter(p => p.alive);
    const aliveWolves = alivePlayers.filter(p => p.role === 'loup');
    const aliveVillagers = alivePlayers.filter(p => p.role !== 'loup');

    if (aliveWolves.length === 0) {
        // ✅ Nettoyer le timer avant de terminer la partie
        if (room.phaseTimer) {
            clearInterval(room.phaseTimer);
            room.phaseTimer = null;
        }

        // � Réinitialiser les verrous
        room.processingPhase = false;
        room.processingVotes = false;

        // �📊 Calculer les stats
        const stats = calculateGameStats(room);

        io.to(room.code).emit('gameOver', {
            winner: 'villageois',
            message: 'Les Villageois ont gagné ! 🎉',
            players: Array.from(room.players.values()).map(p => ({
                name: p.name,
                role: p.role,
                alive: p.alive,
                avatar: p.avatar,
                stats: p.stats
            })),
            gameStats: stats
        });

        // 🎮 Marquer la partie comme terminée mais GARDER la room pour consulter les résultats
        room.gameEnded = true;
        room.endTime = Date.now(); // 🕐 Marquer l'heure de fin
        console.log(`🏁 GAME OVER - Room ${room.code} maintenue pour consultation résultats`);

        return true;
    }

    if (aliveWolves.length >= aliveVillagers.length) {
        // ✅ Nettoyer le timer avant de terminer la partie
        if (room.phaseTimer) {
            clearInterval(room.phaseTimer);
            room.phaseTimer = null;
        }

        // � Réinitialiser les verrous
        room.processingPhase = false;
        room.processingVotes = false;

        // �📊 Calculer les stats
        const stats = calculateGameStats(room);

        io.to(room.code).emit('gameOver', {
            winner: 'loups',
            message: 'Les Loups-Garous ont gagné ! 🐺',
            players: Array.from(room.players.values()).map(p => ({
                name: p.name,
                role: p.role,
                alive: p.alive,
                avatar: p.avatar,
                stats: p.stats
            })),
            gameStats: stats
        });

        // 🎮 Marquer la partie comme terminée mais GARDER la room pour consulter les résultats
        room.gameEnded = true;
        room.endTime = Date.now(); // 🕐 Marquer l'heure de fin
        console.log(`🏁 GAME OVER - Room ${room.code} maintenue pour consultation résultats`);

        return true;
    }

    return false;
}

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Serveur Loup-Garou démarré sur le port ${PORT}`);
    console.log(`🌐 Serveur accessible sur 0.0.0.0:${PORT}`);
});
