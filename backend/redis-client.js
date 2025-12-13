const { Redis } = require('@upstash/redis');

// Charger les variables d'environnement
try {
    require('dotenv').config();
} catch (e) {
    console.log('⚠️ dotenv non disponible');
}

// 🔧 Validation des variables d'environnement
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('❌ ERREUR: Variables Redis manquantes!');
    console.error('UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ Définie' : '❌ MANQUANTE');
    console.error('UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Définie' : '❌ MANQUANTE');
    throw new Error('Variables d\'environnement Redis manquantes - vérifiez Railway');
}

// 🔧 Configuration Redis (Upstash)
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

console.log('✅ Redis client initialisé avec succès');
console.log('📡 URL Redis:', process.env.UPSTASH_REDIS_REST_URL.substring(0, 30) + '...');

// 🔄 Helper pour sauvegarder une room
async function saveRoom(roomCode, room) {
    try {
        // Convertir la Map en objet sérialisable
        const roomData = {
            code: room.code,
            hostId: room.hostId,
            rapidMode: room.rapidMode,
            gameStarted: room.gameStarted,
            gameEnded: room.gameEnded,
            endTime: room.endTime,
            phase: room.phase,
            nightNumber: room.nightNumber,
            currentPlayerTurn: room.currentPlayerTurn,
            phaseTimeRemaining: room.phaseTimeRemaining,
            customRoles: room.customRoles,
            loupCount: room.loupCount,
            processingPhase: room.processingPhase,
            gameState: room.gameState,
            players: Array.from(room.players.entries()).map(([id, player]) => ({
                id,
                name: player.name,
                avatar: player.avatar,
                isHost: player.isHost,
                ready: player.ready,
                role: player.role,
                alive: player.alive,
                socketId: player.socketId,
                isBot: player.isBot,
                stats: player.stats || {
                    messagesCount: 0,
                    votesReceived: 0,
                    votesGiven: 0,
                    nightsAlive: 0
                }
            }))
        };

        // Sauvegarder avec TTL de 24h (86400 secondes)
        await redis.setex(`room:${roomCode}`, 86400, JSON.stringify(roomData));
        console.log(`💾 Room ${roomCode} sauvegardée dans Redis`);
    } catch (error) {
        console.error(`❌ Erreur sauvegarde Redis room ${roomCode}:`, error);
    }
}

// 🔄 Helper pour charger une room
async function loadRoom(roomCode) {
    try {
        const data = await redis.get(`room:${roomCode}`);
        if (!data) return null;

        const roomData = typeof data === 'string' ? JSON.parse(data) : data;

        // Reconstruire la Map des joueurs
        const players = new Map();
        roomData.players.forEach(p => {
            players.set(p.id, p);
        });

        return {
            ...roomData,
            players,
            phaseTimer: null // Les timers ne sont pas sérialisables
        };
    } catch (error) {
        console.error(`❌ Erreur chargement Redis room ${roomCode}:`, error);
        return null;
    }
}

// 🗑️ Supprimer une room
async function deleteRoom(roomCode) {
    try {
        await redis.del(`room:${roomCode}`);
        console.log(`🗑️ Room ${roomCode} supprimée de Redis`);
    } catch (error) {
        console.error(`❌ Erreur suppression Redis room ${roomCode}:`, error);
    }
}

// 📋 Lister toutes les rooms actives
async function listAllRooms() {
    try {
        const keys = await redis.keys('room:*');
        const rooms = [];

        for (const key of keys) {
            const data = await redis.get(key);
            if (data) {
                const roomData = typeof data === 'string' ? JSON.parse(data) : data;
                rooms.push({
                    code: roomData.code,
                    players: roomData.players.length,
                    gameStarted: roomData.gameStarted,
                    phase: roomData.phase
                });
            }
        }

        return rooms;
    } catch (error) {
        console.error('❌ Erreur listing Redis:', error);
        return [];
    }
}

// 🔍 Vérifier si une room existe
async function roomExists(roomCode) {
    try {
        const exists = await redis.exists(`room:${roomCode}`);
        return exists === 1;
    } catch (error) {
        console.error(`❌ Erreur vérification existence room ${roomCode}:`, error);
        return false;
    }
}

module.exports = {
    redis,
    saveRoom,
    loadRoom,
    deleteRoom,
    listAllRooms,
    roomExists
};
