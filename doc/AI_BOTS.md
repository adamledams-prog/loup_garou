# 🤖 Bots IA Intelligents - Guide Complet

## 🎯 Objectif

Rendre les bots **vivants** et **immersifs** en leur permettant de :
- 💬 **Parler dans le chat** (réactions contextuelles selon leur rôle)
- 📢 **Apparaître dans les narrations** (mentionner leurs actions)
- 🎭 **Avoir une personnalité** (chaque bot a un style unique)
- 🧠 **Prendre des décisions intelligentes** (stratégie basée sur l'historique)

---

## 🏗️ Architecture

### 1. Variables d'Environnement

Ajouter dans `.env` (backend) :

```bash
# API IA (choisir une ou plusieurs)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxx

# Modèle à utiliser (optionnel, défaut: gpt-4o-mini)
AI_MODEL=gpt-4o-mini
# OU pour OpenRouter
AI_MODEL=openai/gpt-4o-mini
AI_MODEL=anthropic/claude-3.5-sonnet

# Activation des bots IA (true/false)
AI_BOTS_ENABLED=true
AI_BOTS_CHAT=true
AI_BOTS_NARRATION=true
```

### 2. Structure du Code

```
backend/
├── server.js           # Serveur principal
├── ai-bot-manager.js   # 🆕 Gestionnaire IA des bots
├── ai-prompts.js       # 🆕 Prompts système pour chaque rôle
└── package.json        # Ajouter dependencies IA
```

---

## 📦 Installation

### Étape 1 : Installer les dépendances

```bash
cd backend
npm install openai@latest dotenv
```

### Étape 2 : Créer le fichier `.env`

```bash
# backend/.env
OPENAI_API_KEY=sk-proj-votre-cle-ici
AI_BOTS_ENABLED=true
AI_BOTS_CHAT=true
AI_BOTS_NARRATION=true
AI_MODEL=gpt-4o-mini
```

---

## 🧠 Fonctionnalités des Bots IA

### 1. Chat Contextuel

Les bots parlent dans le chat selon :
- **Leur rôle** (Loup = menaçant, Voyante = mystérieux, Villageois = paniqué)
- **La phase** (nuit = silence ou complots, jour = accusations)
- **L'historique** (réagir aux morts, aux votes précédents)
- **Leur personnalité** (chaque bot a un style : drôle, sérieux, paranoïaque, etc.)

**Exemples** :
```
🤖 Robo (Loup) : "Quelle nuit paisible... j'espère que tout le monde a bien dormi 😏"
🤖 Beep (Voyante) : "J'ai eu une vision troublante cette nuit..."
🤖 Chip (Villageois) : "MAIS QUI A TUÉ WALL-E ?! 😱"
```

### 2. Narration Enrichie

Les bots apparaissent dans les narrations automatiques :

**Avant** :
```
💔 Un amoureux meurt de chagrin d'amour...
```

**Après** :
```
💔 Robo meurt de chagrin après la perte de son âme-sœur Beep...
```

### 3. Décisions Stratégiques

Les bots utilisent l'IA pour :
- **Voter intelligemment** (analyser qui est suspect)
- **Choisir leurs cibles** (loups coordonnés, voyante stratégique)
- **Défendre ou accuser** (arguments basés sur l'historique)

---

## 💻 Implémentation Technique

### Fichier 1 : `backend/ai-prompts.js`

```javascript
// Prompts système pour chaque rôle
module.exports = {
    systemPrompts: {
        loup: `Tu es un Loup-Garou rusé et manipulateur dans une partie de Loup-Garou.
Ton but : éliminer les villageois sans te faire démasquer.
Style : Calme, sournois, parfois ironique. Ne révèle JAMAIS que tu es un loup.
Longueur : 15-30 mots maximum par message.
Contexte : {{context}}`,

        voyante: `Tu es la Voyante mystérieuse, tu peux voir les rôles.
Ton but : aider le village discrètement sans te faire tuer par les loups.
Style : Mystique, énigmatique, utilise des métaphores.
Longueur : 15-30 mots maximum.
Contexte : {{context}}`,

        sorciere: `Tu es la Sorcière avec tes potions heal/poison.
Ton but : protéger le village avec tes potions limitées.
Style : Sage, réfléchie, parfois acide.
Longueur : 15-30 mots maximum.
Contexte : {{context}}`,

        villageois: `Tu es un Villageois innocent et paniqué.
Ton but : survivre et trouver les loups.
Style : Émotionnel, paranoïaque, parfois drôle.
Longueur : 15-30 mots maximum.
Contexte : {{context}}`,

        chasseur: `Tu es le Chasseur vengeur.
Ton but : protéger le village et emporter un loup si tu meurs.
Style : Courageux, direct, protecteur.
Longueur : 15-30 mots maximum.
Contexte : {{context}}`,

        cupidon: `Tu es Cupidon, créateur de couples amoureux.
Ton but : utiliser l'amour pour influencer le jeu.
Style : Romantique, taquin, joueur.
Longueur : 15-30 mots maximum.
Contexte : {{context}}`,

        riche: `Tu es le Riche influent (2 votes).
Ton but : utiliser ton pouvoir pour diriger le village.
Style : Arrogant, stratégique, confiant.
Longueur : 15-30 mots maximum.
Contexte : {{context}}`,

        livreur: `Tu es le Livreur de Pizza protecteur.
Ton but : protéger les joueurs chaque nuit.
Style : Dévoué, attentionné, parfois fatigué.
Longueur : 15-30 mots maximum.
Contexte : {{context}}`
    },

    // Contextes possibles pour les messages
    generateContext(room, bot, phase, recentEvents) {
        const alivePlayers = Array.from(room.players.values()).filter(p => p.alive);
        const deadPlayers = room.gameState.deadPlayers.map(id =>
            room.players.get(id)?.name
        ).filter(Boolean);

        let context = `Phase actuelle : ${phase === 'night' ? 'Nuit' : 'Jour'} ${room.nightNumber}.\n`;
        context += `Joueurs vivants : ${alivePlayers.length}.\n`;

        if (deadPlayers.length > 0) {
            context += `Morts récents : ${deadPlayers.join(', ')}.\n`;
        }

        if (recentEvents && recentEvents.length > 0) {
            context += `Événements récents : ${recentEvents.join(', ')}.\n`;
        }

        context += `Tu es ${bot.name} (${bot.role}). Réagis naturellement selon ta personnalité.`;

        return context;
    }
};
```

### Fichier 2 : `backend/ai-bot-manager.js`

```javascript
const OpenAI = require('openai');
const { systemPrompts, generateContext } = require('./ai-prompts');

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
                    ? { 'HTTP-Referer': 'https://loup-garou.vercel.app' }
                    : {}
            });
            console.log('✅ IA Bots activés avec', baseURL);
        } else {
            console.log('⚠️ IA Bots désactivés (pas de clé API ou ENABLED=false)');
        }

        // Historique des messages pour chaque bot (mémoire courte)
        this.chatHistory = new Map(); // botId -> [{role, content}]
    }

    // Générer un message de chat pour un bot
    async generateChatMessage(room, bot, phase, recentEvents = []) {
        if (!this.enabled || !this.chatEnabled || !this.client) {
            return this.getFallbackMessage(bot, phase);
        }

        try {
            const context = generateContext(room, bot, phase, recentEvents);
            const systemPrompt = systemPrompts[bot.role] || systemPrompts.villageois;
            const prompt = systemPrompt.replace('{{context}}', context);

            // Récupérer l'historique du bot (garder 5 derniers messages max)
            let history = this.chatHistory.get(bot.id) || [];
            history = history.slice(-5);

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: prompt },
                    ...history,
                    { role: 'user', content: 'Dis quelque chose maintenant (court et naturel).' }
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

            return message;
        } catch (error) {
            console.error('❌ Erreur génération message IA:', error.message);
            return this.getFallbackMessage(bot, phase);
        }
    }

    // Message de secours si l'IA échoue
    getFallbackMessage(bot, phase) {
        const messages = {
            night: [
                "Bonne nuit à tous... 🌙",
                "J'espère que tout ira bien...",
                "Faisons attention cette nuit.",
                "Qui sera le prochain ? 😰"
            ],
            day: [
                "Quelqu'un a des indices ?",
                "Je ne sais pas qui voter...",
                "C'est suspect tout ça 🤔",
                "Il faut trouver les loups !",
                "Je trouve ça bizarre...",
                "Qui a vu quelque chose ?"
            ]
        };

        const pool = phase === 'night' ? messages.night : messages.day;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // Décider si le bot doit parler (probabilité selon phase)
    shouldBotSpeak(phase) {
        if (!this.chatEnabled) return false;

        // Probabilités : plus actif en journée
        const probability = {
            night: 0.2,  // 20% de chance de parler la nuit
            day: 0.6,    // 60% de chance de parler le jour
            vote: 0.8    // 80% pendant les votes
        };

        return Math.random() < (probability[phase] || 0.3);
    }

    // Générer une narration personnalisée
    generateNarration(type, context) {
        if (!this.narrationEnabled) return null;

        const narrations = {
            loverDeath: (name) => `💔 ${name} meurt de chagrin après la perte tragique de son âme-sœur...`,
            witchHeal: () => `✨ La Sorcière a utilisé sa potion pour sauver une âme cette nuit...`,
            witchPoison: () => `☠️ La Sorcière a empoisonné quelqu'un dans l'ombre...`,
            voteEquality: (names) => `⚖️ Égalité parfaite entre ${names} ! Le village est divisé...`,
            finale: (count) => `🔥 FINALE ! Plus que ${count} survivants ! Le temps s'accélère...`
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
                .filter(p => p.alive && p.id !== bot.id && !p.isBot)
                .map(p => ({ id: p.id, name: p.name }));

            if (alivePlayers.length === 0) {
                return this.getFallbackVote(room, bot);
            }

            const context = `Tu dois voter pour éliminer quelqu'un.
Joueurs disponibles : ${alivePlayers.map(p => p.name).join(', ')}.
Ton rôle : ${bot.role}.
Phase jour ${room.nightNumber}.
Réponds UNIQUEMENT avec le NOM exact du joueur (rien d'autre).`;

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompts[bot.role] || systemPrompts.villageois },
                    { role: 'user', content: context }
                ],
                temperature: 0.7,
                max_tokens: 20
            });

            const voteName = response.choices[0].message.content.trim();
            const target = alivePlayers.find(p =>
                p.name.toLowerCase() === voteName.toLowerCase()
            );

            return target ? target.id : this.getFallbackVote(room, bot);
        } catch (error) {
            console.error('❌ Erreur décision vote IA:', error.message);
            return this.getFallbackVote(room, bot);
        }
    }

    // Vote aléatoire de secours
    getFallbackVote(room, bot) {
        const alivePlayers = Array.from(room.players.values())
            .filter(p => p.alive && p.id !== bot.id);

        if (alivePlayers.length === 0) return null;

        return alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
    }

    // Nettoyer l'historique d'un bot (quand il meurt)
    clearBotHistory(botId) {
        this.chatHistory.delete(botId);
    }
}

module.exports = AIBotManager;
```

---

## 🔌 Intégration dans `server.js`

### 1. Import en haut du fichier

```javascript
// Après les autres imports
const AIBotManager = require('./ai-bot-manager');
const aiBotManager = new AIBotManager();
```

### 2. Messages de chat automatiques

```javascript
// Dans startPhaseTimer(), après déclenchement des bots
// Exemple : phase DAY
if (room.phase === 'day') {
    // Laisser les bots parler naturellement
    setTimeout(async () => {
        const bots = Array.from(room.players.values()).filter(p => p.isBot && p.alive);

        for (const bot of bots) {
            if (aiBotManager.shouldBotSpeak('day')) {
                const message = await aiBotManager.generateChatMessage(
                    room,
                    bot,
                    'day',
                    room.gameState.deadPlayers.map(id => room.players.get(id)?.name)
                );

                // Broadcast le message dans le chat
                io.to(room.code).emit('chatMessage', {
                    playerId: bot.id,
                    playerName: bot.name,
                    message: message,
                    timestamp: Date.now(),
                    isBot: true
                });

                // Attendre 2-5s entre chaque bot
                await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
            }
        }
    }, 3000); // Attendre 3s après le début du jour
}
```

### 3. Vote intelligent

```javascript
// Dans performVote() de la classe BotPlayer
async performVote(botId, delay = 2000) {
    const bot = this.room.players.get(botId);
    if (!bot || !bot.alive || !bot.isBot) return;

    await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 2000));

    // Utiliser l'IA pour décider
    const targetId = await aiBotManager.decideVote(this.room, bot);

    if (!targetId) return;

    this.room.gameState.votes[botId] = targetId;
    const target = this.room.players.get(targetId);
    console.log(`🤖 ${bot.name} (IA) a voté pour ${target?.name}`);
}
```

### 4. Narrations enrichies

```javascript
// Remplacer dans processNightActions() :
emitNarration(io, room.code, `💔 ${lover.name} meurt de chagrin d'amour...`, 'love', 5000);

// Par :
const narration = aiBotManager.generateNarration('loverDeath', lover.name);
emitNarration(io, room.code, narration, 'love', 5000);
```

---

## 🎮 Utilisation

### 1. Activer les bots IA

```bash
# backend/.env
AI_BOTS_ENABLED=true
AI_BOTS_CHAT=true
AI_BOTS_NARRATION=true
```

### 2. Démarrer le serveur

```bash
cd backend
node server.js
```

Logs attendus :
```
✅ IA Bots activés avec https://api.openai.com/v1
🎮 Serveur Loup-Garou démarré sur le port 3000
```

### 3. Créer une partie avec bots

1. Créer une room
2. Ajouter des bots (bouton "+Bot")
3. Démarrer la partie
4. Observer les bots parler et agir naturellement ! 🤖💬

---

## 💰 Coûts Estimés

### OpenAI (gpt-4o-mini)
- **Prix** : $0.15 / 1M tokens input, $0.60 / 1M tokens output
- **Par partie** (10 bots, 10 messages chacun) : ~$0.001-0.003 (1-3 millièmes de dollar)
- **100 parties** : ~$0.10-0.30

### OpenRouter (plusieurs modèles)
- **gpt-4o-mini** : Même prix qu'OpenAI
- **claude-3.5-haiku** : $1 / 1M tokens (plus cher mais meilleur)
- **llama-3.1-8b** : Gratuit ! (mais moins naturel)

**Recommandation** : `gpt-4o-mini` pour usage familial (coût négligeable).

---

## 🎯 Personnalisations Avancées

### 1. Personnalités Uniques

Dans `ai-prompts.js`, ajouter des variantes :

```javascript
const personalities = {
    'Robo': 'Tu es Robo, un robot sarcastique et drôle. Utilise des emojis tech (🤖⚙️💾)',
    'Beep': 'Tu es Beep, timide mais brillant. Tu hésites souvent (euh... peut-être...)',
    'Chip': 'Tu es Chip, surexcité et bavard. TOUT EN MAJUSCULES parfois !!! 😱',
    // etc.
};
```

### 2. Mémoire Longue Terme

Sauvegarder l'historique complet de la partie dans une DB :

```javascript
// Utiliser une vraie DB (MongoDB, PostgreSQL)
chatHistory.set(botId, allMessages); // Au lieu de .slice(-5)
```

### 3. Coordination des Loups

Les loups peuvent se coordonner via l'IA :

```javascript
// Dans generateChatMessage, si bot.role === 'loup'
// Ajouter contexte : "Les autres loups sont : [noms]. Coordonnez-vous."
```

---

## 🐛 Troubleshooting

### Problème : Pas de messages de bots

**Cause** : `AI_BOTS_CHAT=false` ou clé API invalide

**Solution** :
```bash
# Vérifier .env
echo $OPENAI_API_KEY

# Tester la clé
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Problème : Messages trop longs

**Cause** : `max_tokens` trop élevé

**Solution** : Réduire à 40-60 tokens dans `generateChatMessage()`

### Problème : Coûts trop élevés

**Cause** : Modèle trop cher (gpt-4) ou trop de messages

**Solution** :
- Utiliser `gpt-4o-mini` (25x moins cher)
- Réduire `shouldBotSpeak()` probabilités
- Limiter à 1-2 messages par bot par phase

---

## 🚀 Déploiement Railway

### 1. Ajouter les variables d'environnement

Railway Dashboard → Variables :
```
OPENAI_API_KEY=sk-proj-xxxxx
AI_BOTS_ENABLED=true
AI_BOTS_CHAT=true
AI_MODEL=gpt-4o-mini
```

### 2. Commit et push

```bash
git add backend/ai-bot-manager.js backend/ai-prompts.js backend/server.js
git commit -m "feat: bots IA avec chat et narrations (OpenAI/OpenRouter)"
git push origin main
```

Railway va auto-deploy avec les bots IA activés ! 🎉

---

## 📊 Résumé

| Fonctionnalité | Status | Coût | Difficulté |
|----------------|--------|------|------------|
| Chat contextuel | ✅ | ~$0.001/partie | Moyenne |
| Narrations enrichies | ✅ | Gratuit | Facile |
| Vote intelligent | ✅ | ~$0.0005/partie | Moyenne |
| Personnalités uniques | ✅ | Gratuit | Facile |
| Mémoire longue | ⏳ | Variable | Difficile |
| Coordination loups | ⏳ | ~$0.002/partie | Difficile |

**Total estimé** : **~$0.002-0.005 par partie** (négligeable pour usage familial)

---

## 💡 Idées Futures

1. **Voix des bots** : Text-to-Speech avec ElevenLabs
2. **Avatars animés** : Génération d'images avec DALL-E
3. **Analyse émotionnelle** : Détecter le stress/mensonge dans les messages
4. **Apprentissage** : Les bots s'améliorent avec chaque partie
5. **Multi-langues** : Bots qui parlent en français, anglais, etc.

---

Fait avec ❤️ pour rendre le jeu encore plus fun ! 🎮🤖
