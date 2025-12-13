/**
 * 🐺 Gestion du chat automatique des loups bots
 */

class WolfChatManager {
    constructor() {
        // Stocke les cibles suggérées et leur poids
        this.targetSuggestions = new Map(); // roomCode -> { playerName: weight }
        // Historique des messages envoyés pour éviter les répétitions
        this.sentMessages = new Map(); // botId -> Set<messageType>
    }

    // 👋 Message de salutation au début de la nuit 1
    sendGreetingMessages(io, room) {
        if (room.nightNumber !== 1) return;

        const wolfBots = Array.from(room.players.values()).filter(
            p => p.role === 'loup' && p.isBot && p.alive
        );

        wolfBots.forEach((bot, index) => {
            setTimeout(() => {
                const greetings = [
                    `Salut la meute ! 🐺`,
                    `Hé les loups ! On fait équipe 💪`,
                    `Prêt à chasser ! 🌙`,
                    `Ouuhhhh ! On va gagner ça 🐺`,
                    `Bonsoir la meute 🌙`,
                ];
                
                const message = greetings[Math.floor(Math.random() * greetings.length)];
                this.sendWolfMessage(io, room, bot, message);
            }, (index + 1) * 2000); // Décalage de 2s entre chaque bot
        });
    }

    // 📊 Résumé de la situation (nouveaux nuits)
    sendSituationSummary(io, room) {
        if (room.nightNumber <= 1) return;

        const wolfBots = Array.from(room.players.values()).filter(
            p => p.role === 'loup' && p.isBot && p.alive
        );

        if (wolfBots.length === 0) return;

        // Choisir un bot pour faire le résumé
        const speaker = wolfBots[Math.floor(Math.random() * wolfBots.length)];

        // Calculer les stats
        const alivePlayers = Array.from(room.players.values()).filter(p => p.alive);
        const aliveVillagers = alivePlayers.filter(p => p.role !== 'loup');
        const aliveWolves = alivePlayers.filter(p => p.role === 'loup');

        // Compter les rôles spéciaux encore vivants
        const roles = {
            'voyante': '🔮 Voyante',
            'sorciere': '🧙‍♀️ Sorcière',
            'chasseur': '🏹 Chasseur',
            'riche': '💰 Riche',
            'livreur': '🍕 Livreur'
        };

        const aliveRoles = [];
        for (const [role, emoji] of Object.entries(roles)) {
            const count = aliveVillagers.filter(p => p.role === role).length;
            if (count > 0) {
                aliveRoles.push(emoji);
            }
        }

        setTimeout(() => {
            const message = `On est ${aliveWolves.length} loups 🐺 contre ${aliveVillagers.length} villageois. ` +
                (aliveRoles.length > 0 ? `Il reste : ${aliveRoles.join(' ')}` : `Plus de rôles spéciaux !`);
            
            this.sendWolfMessage(io, room, speaker, message);
        }, 3000);
    }

    // 🎯 Réagir à une suggestion de cible dans le chat
    processSuggestion(room, playerName, targetName, isKill = true) {
        const roomKey = room.code;
        
        if (!this.targetSuggestions.has(roomKey)) {
            this.targetSuggestions.set(roomKey, new Map());
        }

        const suggestions = this.targetSuggestions.get(roomKey);
        const currentWeight = suggestions.get(targetName) || 0;
        
        // Augmenter le poids de 15%
        suggestions.set(targetName, currentWeight + 0.15);

        console.log(`🎯 ${playerName} suggère ${targetName} ${isKill ? 'à tuer' : 'à voter'}. Poids: ${(currentWeight + 0.15) * 100}%`);
    }

    // 🤖 Les bots réagissent aux suggestions
    sendBotReactions(io, room, targetName, isKill = true) {
        const wolfBots = Array.from(room.players.values()).filter(
            p => p.role === 'loup' && p.isBot && p.alive
        );

        // 50% de chance qu'un bot réagisse
        if (Math.random() > 0.5 || wolfBots.length === 0) return;

        const reactor = wolfBots[Math.floor(Math.random() * wolfBots.length)];

        const reactions = [
            `OK pour ${targetName} 👍`,
            `${targetName} ? Pourquoi pas`,
            `Bonne idée !`,
            `Je suis d'accord`,
            `+1`,
            `On y va !`,
            `J'hésite mais ok`,
        ];

        setTimeout(() => {
            const message = reactions[Math.floor(Math.random() * reactions.length)];
            this.sendWolfMessage(io, room, reactor, message);
        }, 1000 + Math.random() * 2000);
    }

    // 📤 Envoyer un message au chat des loups
    sendWolfMessage(io, room, bot, message) {
        const wolves = Array.from(room.players.values()).filter(p => p.role === 'loup');

        wolves.forEach(wolf => {
            if (wolf.socketId) {
                io.to(wolf.socketId).emit('wolfChatMessage', {
                    playerId: bot.id,
                    playerName: bot.name,
                    message: message,
                    timestamp: Date.now(),
                    isBot: true
                });
            }
        });

        console.log(`🤖🐺 ${bot.name} (bot): "${message}"`);
    }

    // 🎲 Obtenir le poids d'influence pour une cible
    getTargetWeight(roomCode, targetName) {
        const suggestions = this.targetSuggestions.get(roomCode);
        if (!suggestions) return 0;
        return suggestions.get(targetName) || 0;
    }

    // 🧹 Nettoyer les suggestions d'une room
    clearSuggestions(roomCode) {
        this.targetSuggestions.delete(roomCode);
    }

    // 🔄 Reset pour une nouvelle nuit
    resetNight(roomCode) {
        // On garde les suggestions mais on les réduit de moitié
        const suggestions = this.targetSuggestions.get(roomCode);
        if (suggestions) {
            for (const [name, weight] of suggestions.entries()) {
                suggestions.set(name, weight * 0.5);
            }
        }
    }
}

module.exports = new WolfChatManager();
