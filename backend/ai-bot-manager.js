const OpenAI = require('openai');
const { systemPrompts, generateContext, fallbackMessages } = require('./ai-prompts');

class AIBotManager {
    constructor() {
        // Choisir le provider selon les clés disponibles
        const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
        const baseURL = process.env.OPENROUTER_API_KEY
            ? 'https://openrouter.ai/api/v1'
            : 'https://api.openai.com/v1';

        this.enabled = process.env.AI_BOTS_ENABLED === 'true';
        this.chatEnabled = process.env.AI_BOTS_CHAT === 'true';
        this.narrationEnabled = process.env.AI_BOTS_NARRATION === 'true';
        this.model = process.env.AI_MODEL || 'gpt-4o-mini';

        if (this.enabled && apiKey) {
            this.client = new OpenAI({
                apiKey: apiKey,
                baseURL: baseURL,
                defaultHeaders: process.env.OPENROUTER_API_KEY
                    ? {
                        'HTTP-Referer': process.env.HTTP_REFERER || 'https://loup-garou.vercel.app',
                        'X-Title': 'Loup-Garou Online'
                    }
                    : {}
            });
            console.log('✅ IA Bots activés avec', baseURL.includes('openrouter') ? 'OpenRouter' : 'OpenAI');
        } else {
            console.log('⚠️ IA Bots désactivés (pas de clé API ou AI_BOTS_ENABLED=false)');
        }

        // Historique des messages pour chaque bot (mémoire courte)
        this.chatHistory = new Map(); // botId -> [{role, content}]

        // Événements récents pour contexte
        this.recentEvents = [];
    }

    // Ajouter un événement au contexte
    addEvent(event) {
        this.recentEvents.push(event);
        // Garder seulement les 5 derniers événements
        if (this.recentEvents.length > 5) {
            this.recentEvents.shift();
        }
    }

    // Générer un message de chat pour un bot
    async generateChatMessage(room, bot, phase) {
        if (!this.enabled || !this.chatEnabled || !this.client) {
            return this.getFallbackMessage(bot, phase);
        }

        try {
            const context = generateContext(room, bot, phase, this.recentEvents);
            let systemPrompt = systemPrompts[bot.role] || systemPrompts.villageois;

            // 🎭 Ajouter la personnalité au prompt si le bot en a une
            if (bot.personality) {
                const personalities = require('./bot-personalities');
                systemPrompt = personalities.getPersonalizedPrompt(systemPrompt, bot.personality);
            }

            const prompt = systemPrompt.replace('{{context}}', context);

            // Récupérer l'historique du bot (garder 5 derniers messages max)
            let history = this.chatHistory.get(bot.id) || [];
            history = history.slice(-5);

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: prompt },
                    ...history,
                    {
                        role: 'user',
                        content: 'Dis quelque chose maintenant (court, naturel, et EN FRANÇAIS).'
                    }
                ],
                temperature: 0.9, // Plus créatif
                max_tokens: 60,
                presence_penalty: 0.6, // Éviter répétitions
                frequency_penalty: 0.6
            });

            const message = response.choices[0].message.content.trim();

            // Sauvegarder dans l'historique
            history.push({ role: 'assistant', content: message });
            this.chatHistory.set(bot.id, history);

            console.log(`🤖💬 ${bot.name} (${bot.role}) dit: "${message}"`);
            return message;

        } catch (error) {
            console.error('❌ Erreur génération message IA:', error.message);
            return this.getFallbackMessage(bot, phase);
        }
    }

    // Message de secours si l'IA échoue
    getFallbackMessage(bot, phase) {
        const phaseMessages = fallbackMessages[phase] || fallbackMessages.day;
        const roleMessages = phaseMessages[bot.role] || phaseMessages.all || [];

        if (roleMessages.length === 0) {
            return "Je réfléchis... 🤔";
        }

        return roleMessages[Math.floor(Math.random() * roleMessages.length)];
    }

    // Décider si le bot doit parler (probabilité selon phase)
    shouldBotSpeak(phase) {
        if (!this.chatEnabled) return false;

        // 🎭 Bots TRÈS ACTIFS pour ambiance vivante !
        const probability = {
            night: 0.3,   // 30% la nuit (un peu plus actif)
            day: 0.95,    // 95% le jour (presque toujours !)
            vote: 0.85    // 85% pendant les votes (très bavards)
        };

        return Math.random() < (probability[phase] || 0.5);
    }

    // Générer une narration personnalisée
    generateNarration(type, context) {
        if (!this.narrationEnabled) return null;

        const narrations = {
            loverDeath: (name) => `💔 ${name} meurt de chagrin après la perte tragique de son âme-sœur...`,
            witchHeal: () => `✨ La Sorcière a utilisé sa potion magique pour sauver une âme cette nuit...`,
            witchPoison: (target) => `☠️ La Sorcière a empoisonné ${target || 'quelqu\'un'} dans l\'ombre de la nuit...`,
            voteEquality: (names) => `⚖️ Égalité parfaite entre ${names} ! Le village est divisé et hésite...`,
            finale: (count) => `🔥 FINALE ÉPIQUE ! Plus que ${count} survivants ! Le temps s'accélère dramatiquement...`,
            wolfKill: (victim) => `🐺 ${victim} a été dévoré par les loups-garous cette nuit...`,
            hunterRevenge: (hunter, target) => `🎯 ${hunter} emporte ${target} avec lui dans sa chute vengeresse...`
        };

        return narrations[type] ? narrations[type](context) : null;
    }

    // Décision de vote intelligente (avec IA)
    async decideVote(room, bot) {
        if (!this.enabled || !this.client) {
            return this.getFallbackVote(room, bot);
        }

        try {
            const alivePlayers = Array.from(room.players.values())
                .filter(p => p.alive && p.id !== bot.id)
                .map(p => ({ id: p.id, name: p.name, isBot: p.isBot }));

            if (alivePlayers.length === 0) {
                return null;
            }

            // Construire le contexte de vote
            const deadNames = room.gameState.deadPlayers
                .map(id => room.players.get(id)?.name)
                .filter(Boolean)
                .slice(-3);

            const context = `Tu dois voter pour éliminer quelqu'un.

Joueurs vivants disponibles : ${alivePlayers.map(p => p.name).join(', ')}.

Ton rôle : ${bot.role}.
Phase jour ${room.nightNumber}.
${deadNames.length > 0 ? `Dernières victimes : ${deadNames.join(', ')}.` : ''}

${bot.role === 'loup' ? 'Tu es un loup ! Vote stratégiquement pour éliminer un villageois influent.' : ''}
${bot.role === 'voyante' ? 'Tu es la voyante, tu connais peut-être des rôles suspects.' : ''}

Réponds UNIQUEMENT avec le NOM EXACT du joueur à éliminer (rien d'autre, juste le nom).`;

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompts[bot.role] || systemPrompts.villageois },
                    { role: 'user', content: context }
                ],
                temperature: 0.7,
                max_tokens: 20
            });

            const voteName = response.choices[0].message.content.trim()
                .replace(/['"]/g, '') // Enlever guillemets
                .replace(/\./g, '');   // Enlever points

            const target = alivePlayers.find(p =>
                p.name.toLowerCase().includes(voteName.toLowerCase()) ||
                voteName.toLowerCase().includes(p.name.toLowerCase())
            );

            if (target) {
                console.log(`🤖🗳️ ${bot.name} (IA) a décidé de voter pour ${target.name}`);
                return target.id;
            } else {
                console.log(`⚠️ ${bot.name} (IA) a voté pour "${voteName}" (non reconnu), vote aléatoire`);
                return this.getFallbackVote(room, bot);
            }

        } catch (error) {
            console.error('❌ Erreur décision vote IA:', error.message);
            return this.getFallbackVote(room, bot);
        }
    }

    // Vote intelligent basé sur le score de suspicion
    getFallbackVote(room, bot) {
        const alivePlayers = Array.from(room.players.values())
            .filter(p => p.alive && p.id !== bot.id);

        if (alivePlayers.length === 0) return null;

        // 📊 Voter selon le score de suspicion (avec un peu d'aléatoire)
        // 80% chance de voter pour le plus suspect, 20% chance aléatoire
        if (Math.random() < 0.8) {
            // Trier par score de suspicion décroissant
            const sortedBySuspicion = [...alivePlayers].sort((a, b) => {
                const scoreA = a.suspicionScore || 0;
                const scoreB = b.suspicionScore || 0;
                return scoreB - scoreA;
            });

            // 🛡️ Si bot est loup, éviter de voter pour l'humain sauf si très suspect
            if (bot.role === 'loup') {
                const humanTarget = sortedBySuspicion.find(p => !p.isBot);
                if (humanTarget && humanTarget.suspicionScore < 60) {
                    // Humain pas assez suspect, chercher un bot suspect
                    const botTarget = sortedBySuspicion.find(p => p.isBot);
                    if (botTarget) {
                        console.log(`🐺 ${bot.name} (loup) évite l'humain ${humanTarget.name} (score: ${humanTarget.suspicionScore}) et vote ${botTarget.name}`);
                        return botTarget.id;
                    }
                }
            }

            const target = sortedBySuspicion[0];
            console.log(`🤖📊 ${bot.name} vote pour ${target.name} (suspicion: ${target.suspicionScore || 0})`);
            return target.id;
        }

        // 20% vote aléatoire (pour l'imprévisibilité)
        const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        console.log(`🤖🎲 ${bot.name} vote aléatoirement pour ${target.name}`);
        return target.id;
    }

    // Décision d'action nocturne intelligente
    async decideNightAction(room, bot) {
        if (!this.enabled || !this.client) {
            return this.getFallbackNightAction(room, bot);
        }

        try {
            const alivePlayers = Array.from(room.players.values())
                .filter(p => p.alive && p.id !== bot.id)
                .map(p => ({ id: p.id, name: p.name }));

            if (alivePlayers.length === 0) return null;

            let actionType = '';
            if (bot.role === 'loup') actionType = 'tuer';
            else if (bot.role === 'voyante') actionType = 'voir le rôle de';
            else if (bot.role === 'livreur') actionType = 'protéger';
            else return this.getFallbackNightAction(room, bot);

            const context = `Tu es ${bot.role}. Cette nuit, tu dois ${actionType} quelqu'un.

Joueurs disponibles : ${alivePlayers.map(p => p.name).join(', ')}.

Choisis stratégiquement. Réponds UNIQUEMENT avec le NOM EXACT du joueur cible.`;

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompts[bot.role] },
                    { role: 'user', content: context }
                ],
                temperature: 0.7,
                max_tokens: 20
            });

            const targetName = response.choices[0].message.content.trim()
                .replace(/['"]/g, '')
                .replace(/\./g, '');

            const target = alivePlayers.find(p =>
                p.name.toLowerCase().includes(targetName.toLowerCase()) ||
                targetName.toLowerCase().includes(p.name.toLowerCase())
            );

            if (target) {
                console.log(`🤖🌙 ${bot.name} (IA) cible ${target.name} pour ${actionType}`);
                return target.id;
            } else {
                return this.getFallbackNightAction(room, bot);
            }

        } catch (error) {
            console.error('❌ Erreur action nuit IA:', error.message);
            return this.getFallbackNightAction(room, bot);
        }
    }

    // Action nocturne aléatoire de secours
    getFallbackNightAction(room, bot) {
        const alivePlayers = Array.from(room.players.values())
            .filter(p => p.alive && p.id !== bot.id);

        if (alivePlayers.length === 0) return null;

        return alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
    }

    // Nettoyer l'historique d'un bot (quand il meurt)
    clearBotHistory(botId) {
        this.chatHistory.delete(botId);
        console.log(`🧹 Historique du bot ${botId} nettoyé`);
    }

    // Nettoyer tous les historiques (nouvelle partie)
    clearAllHistory() {
        this.chatHistory.clear();
        this.recentEvents = [];
        console.log('🧹 Tous les historiques de bots IA nettoyés');
    }
}

module.exports = AIBotManager;
