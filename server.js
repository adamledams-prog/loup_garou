const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir les fichiers statiques
app.use(express.static(__dirname));

// Structure des salles de jeu
const rooms = new Map();

// Classe pour gérer une salle
class GameRoom {
    constructor(code, hostId, hostName) {
        this.code = code;
        this.hostId = hostId;
        this.players = new Map();
        this.players.set(hostId, {
            id: hostId,
            name: hostName,
            isHost: true,
            ready: false,
            role: null,
            alive: true,
            socketId: null
        });
        this.gameStarted = false;
        this.phase = 'lobby'; // lobby, night, day, vote
        this.nightNumber = 1;
        this.currentPlayerTurn = null;
        this.gameState = {
            deadPlayers: [],
            killedTonight: null,
            witchHealUsed: false,
            witchPoisonUsed: false,
            shieldUsed: false,
            voyanteSeen: false,
            votes: {},
            nightActions: {}
        };
    }

    addPlayer(playerId, playerName, socketId) {
        if (this.players.size >= 10) {
            return { success: false, error: 'La salle est pleine' };
        }
        
        if (this.gameStarted) {
            return { success: false, error: 'La partie a déjà commencé' };
        }

        this.players.set(playerId, {
            id: playerId,
            name: playerName,
            isHost: false,
            ready: false,
            role: null,
            alive: true,
            socketId: socketId
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
        if (this.players.size < 4) {
            return { canStart: false, error: 'Il faut au moins 4 joueurs' };
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
    }

    assignRoles() {
        const playerCount = this.players.size;
        const roles = [];

        // 1 loup-garou obligatoire
        roles.push('loup');

        // Rôles spéciaux selon le nombre de joueurs
        if (playerCount >= 4) roles.push('voyante');
        if (playerCount >= 5) roles.push('sorciere');
        if (playerCount >= 6) roles.push('bouclier');
        if (playerCount >= 7) roles.push('renvoyeur');
        if (playerCount >= 8) roles.push('loup'); // 2ème loup
        if (playerCount >= 9) roles.push('chasseur');
        if (playerCount >= 10) roles.push('cupidon');

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
            alive: p.alive
        }));
    }

    getPlayersForClient(requesterId) {
        return Array.from(this.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost,
            ready: p.ready,
            alive: p.alive,
            role: p.id === requesterId ? p.role : null // Seulement son propre rôle
        }));
    }
}

// Générer un code de salle unique
function generateRoomCode() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return rooms.has(code) ? generateRoomCode() : code;
}

// WebSocket - Gestion des connexions
io.on('connection', (socket) => {
    console.log('Nouveau joueur connecté:', socket.id);

    // Créer une salle
    socket.on('createRoom', (data) => {
        const { playerName } = data;
        const playerId = uuidv4();
        const roomCode = generateRoomCode();
        
        const room = new GameRoom(roomCode, playerId, playerName);
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
        const { roomCode, playerName } = data;
        const room = rooms.get(roomCode);

        if (!room) {
            socket.emit('error', { message: 'Salle introuvable' });
            return;
        }

        const playerId = uuidv4();
        const result = room.addPlayer(playerId, playerName, socket.id);

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

    // Joueur prêt
    socket.on('playerReady', (data) => {
        const { playerId, ready } = data;
        const room = rooms.get(socket.roomCode);

        if (room) {
            room.setPlayerReady(playerId, ready);
            io.to(socket.roomCode).emit('playersUpdate', {
                players: room.getPlayersList()
            });
        }
    });

    // Démarrer la partie
    socket.on('startGame', () => {
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

        room.startGame();

        // Envoyer les rôles à chaque joueur
        for (const player of room.players.values()) {
            io.to(player.socketId).emit('gameStarted', {
                role: player.role,
                players: room.getPlayersForClient(player.id),
                phase: 'night',
                nightNumber: 1
            });
        }

        console.log(`Partie démarrée dans la salle ${socket.roomCode}`);
    });

    // Action de nuit
    socket.on('nightAction', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;

        const { action, targetId } = data;
        const player = room.players.get(socket.playerId);

        if (!player || !player.alive) return;

        // Enregistrer l'action
        room.gameState.nightActions[socket.playerId] = { action, targetId };

        // Notifier le joueur que son action est enregistrée
        socket.emit('actionConfirmed');

        // Vérifier si tous les joueurs vivants ont agi
        const alivePlayers = Array.from(room.players.values()).filter(p => p.alive);
        const actedPlayers = Object.keys(room.gameState.nightActions).length;

        if (actedPlayers >= alivePlayers.length) {
            // Tous les joueurs ont agi, passer au jour
            processNightActions(room);
        }
    });

    // Vote du jour
    socket.on('vote', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;

        const { targetId } = data;
        const player = room.players.get(socket.playerId);

        if (!player || !player.alive) return;

        room.gameState.votes[socket.playerId] = targetId;
        socket.emit('voteConfirmed');

        // Notifier tous les joueurs du nombre de votes
        const voteCount = Object.keys(room.gameState.votes).length;
        const aliveCount = Array.from(room.players.values()).filter(p => p.alive).length;

        io.to(socket.roomCode).emit('voteProgress', {
            voted: voteCount,
            total: aliveCount
        });

        // Si tous ont voté, traiter les votes
        if (voteCount >= aliveCount) {
            processVotes(room);
        }
    });

    // Chat
    socket.on('chatMessage', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;

        const player = room.players.get(socket.playerId);
        if (!player) return;

        // Broadcast le message à toute la salle
        io.to(socket.roomCode).emit('chatMessage', {
            playerId: player.id,
            playerName: player.name,
            message: data.message,
            timestamp: Date.now()
        });
    });

    // Déconnexion
    socket.on('disconnect', () => {
        console.log('Joueur déconnecté:', socket.id);

        if (socket.roomCode) {
            const room = rooms.get(socket.roomCode);
            if (room) {
                room.removePlayer(socket.playerId);

                if (room.players.size === 0) {
                    // Supprimer la salle si vide
                    rooms.delete(socket.roomCode);
                    console.log(`Salle ${socket.roomCode} supprimée (vide)`);
                } else {
                    // Notifier les autres joueurs
                    io.to(socket.roomCode).emit('playerLeft', {
                        players: room.getPlayersList()
                    });
                }
            }
        }
    });
});

// Traiter les actions de nuit
function processNightActions(room) {
    const actions = room.gameState.nightActions;
    let killedPlayers = [];

    // Traiter les actions dans l'ordre: loup -> sorcière -> autres
    for (const [playerId, action] of Object.entries(actions)) {
        const player = room.players.get(playerId);
        
        if (player.role === 'loup' && action.action === 'kill') {
            const target = room.players.get(action.targetId);
            
            // Vérifier le bouclier
            if (target.role === 'bouclier' && !room.gameState.shieldUsed) {
                room.gameState.shieldUsed = true;
            } else {
                killedPlayers.push(action.targetId);
                room.gameState.killedTonight = action.targetId;
            }
        }
    }

    // Sorcière
    for (const [playerId, action] of Object.entries(actions)) {
        const player = room.players.get(playerId);
        
        if (player.role === 'sorciere') {
            if (action.action === 'heal' && !room.gameState.witchHealUsed) {
                killedPlayers = killedPlayers.filter(id => id !== room.gameState.killedTonight);
                room.gameState.witchHealUsed = true;
            } else if (action.action === 'poison' && !room.gameState.witchPoisonUsed) {
                killedPlayers.push(action.targetId);
                room.gameState.witchPoisonUsed = true;
            }
        }
    }

    // Appliquer les morts
    killedPlayers.forEach(id => {
        const player = room.players.get(id);
        if (player) player.alive = false;
    });

    room.gameState.deadPlayers.push(...killedPlayers);

    // Réinitialiser les actions
    room.gameState.nightActions = {};

    // Passer au jour
    room.phase = 'day';

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

    // Vérifier les conditions de victoire
    checkWinCondition(room);
}

// Traiter les votes
function processVotes(room) {
    const votes = room.gameState.votes;
    const voteCounts = {};

    // Compter les votes
    for (const targetId of Object.values(votes)) {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    }

    // Trouver le joueur le plus voté
    let maxVotes = 0;
    let eliminatedId = null;

    for (const [playerId, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
            maxVotes = count;
            eliminatedId = playerId;
        }
    }

    if (eliminatedId) {
        const player = room.players.get(eliminatedId);
        
        // Vérifier le bouclier
        if (player.role === 'bouclier' && !room.gameState.shieldUsed) {
            room.gameState.shieldUsed = true;
            
            io.to(room.code).emit('voteResult', {
                eliminated: null,
                shieldUsed: true,
                playerName: player.name
            });
        } else {
            player.alive = false;
            room.gameState.deadPlayers.push(eliminatedId);

            io.to(room.code).emit('voteResult', {
                eliminated: {
                    id: eliminatedId,
                    name: player.name,
                    role: player.role
                },
                votes: voteCounts
            });
        }
    }

    // Réinitialiser les votes
    room.gameState.votes = {};

    // Vérifier les conditions de victoire
    if (!checkWinCondition(room)) {
        // Passer à la nuit suivante
        setTimeout(() => {
            room.phase = 'night';
            room.nightNumber++;
            
            io.to(room.code).emit('nightPhase', {
                nightNumber: room.nightNumber,
                players: Array.from(room.players.values()).map(p => ({
                    id: p.id,
                    name: p.name,
                    alive: p.alive
                }))
            });
        }, 5000);
    }
}

// Vérifier les conditions de victoire
function checkWinCondition(room) {
    const alivePlayers = Array.from(room.players.values()).filter(p => p.alive);
    const aliveWolves = alivePlayers.filter(p => p.role === 'loup');
    const aliveVillagers = alivePlayers.filter(p => p.role !== 'loup');

    if (aliveWolves.length === 0) {
        io.to(room.code).emit('gameOver', {
            winner: 'villageois',
            message: 'Les Villageois ont gagné ! 🎉',
            players: Array.from(room.players.values()).map(p => ({
                name: p.name,
                role: p.role,
                alive: p.alive
            }))
        });
        return true;
    }

    if (aliveWolves.length >= aliveVillagers.length) {
        io.to(room.code).emit('gameOver', {
            winner: 'loups',
            message: 'Les Loups-Garous ont gagné ! 🐺',
            players: Array.from(room.players.values()).map(p => ({
                name: p.name,
                role: p.role,
                alive: p.alive
            }))
        });
        return true;
    }

    return false;
}

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 Serveur Loup-Garou démarré sur le port ${PORT}`);
    console.log(`🌐 Accédez au jeu sur http://localhost:${PORT}`);
});
