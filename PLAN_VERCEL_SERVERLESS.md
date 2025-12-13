# 🚀 PLAN MIGRATION : Vercel Serverless + Redis (SANS Railway)

**Date:** 13 Décembre 2025
**Branche stable:** `stable-avant-redis` (commit d1d7d40)
**Objectif:** Backend sur Vercel Serverless + Redis Upstash = 0€/mois

---

## 📊 ÉTAT ACTUEL

### ✅ Branche `stable-avant-redis` créée et pushée !
```bash
git checkout stable-avant-redis
# Commit: d1d7d40 🔊 Ajout sons: prénoms neveux
```

**Fonctionnalités :**
- ✅ Jeu complet fonctionnel
- ✅ Map mémoire (simple)
- ✅ Railway backend
- ✅ Pas de Redis (pas de bugs)
- ✅ **Prêt pour jouer avec neveux/nièces** 🎉

---

## 🎯 OBJECTIF : Vercel UNIQUEMENT (Backend + Frontend)

### Architecture Cible :
```
┌─────────────────────────────────────┐
│         VERCEL (Gratuit)            │
├─────────────────────────────────────┤
│  Frontend (React/Vite)              │  ← dist/
│  Backend Serverless (/api/socket)   │  ← api/socket.js
└─────────────────────────────────────┘
         ↓ REST API
┌─────────────────────────────────────┐
│    Redis Upstash (Gratuit)          │  ← Persistence
└─────────────────────────────────────┘
```

**Avantages :**
- ✅ **0€/mois** (vs 5€ Railway)
- ✅ **1 seul service** (Vercel)
- ✅ **1 seul deploy** (`vercel --prod`)
- ✅ **Redis garde les parties** (reconnexion OK)
- ✅ **Pas de gestion serveur**

---

## 📋 ÉTAPES DE MIGRATION (3-4 heures)

### Phase 1 : Créer branche `vercel-serverless` (5 min)

```bash
# Partir de la branche stable
git checkout stable-avant-redis
git checkout -b vercel-serverless
```

---

### Phase 2 : Restructurer projet (30 min)

#### 2.1 Réorganiser dossiers

```bash
# Créer structure Vercel
mkdir -p api

# Déplacer backend → api (Vercel utilise /api pour Serverless)
# MAIS on va recréer api/socket.js spécifique Vercel
```

#### 2.2 Structure finale :
```
/root/projects/loup_garou/
├── src/              # Frontend React (inchangé)
├── public/           # Assets (inchangé)
├── api/              # ✨ NOUVEAU : Serverless Functions
│   ├── socket.js     # Point d'entrée Socket.io Serverless
│   └── redis.js      # Helper Redis (copie de backend/redis-client.js)
├── backend/          # ⚠️ GARDER pour référence, mais pas utilisé
├── dist/             # Build frontend (généré)
├── vercel.json       # Config Vercel
└── package.json      # Dépendances
```

---

### Phase 3 : Créer `api/socket.js` (Serverless Socket.io) (1h)

**Contrainte Vercel Serverless :**
- ⚠️ Pas de serveur Node.js persistant
- ⚠️ Timeout 10s par fonction (Hobby) / 60s (Pro)
- ✅ MAIS Redis garde l'état entre appels !

**Solution : Serverless Socket.io avec Redis**

```javascript
// api/socket.js
import { Server } from 'socket.io';
import { createServer } from 'http';

// Redis client
import { saveRoom, loadRoom, deleteRoom, listAllRooms } from './redis.js';

let io;

export default async function handler(req, res) {
    if (!res.socket.server.io) {
        console.log('🚀 Initialisation Socket.io Serverless');

        const httpServer = createServer();
        io = new Server(httpServer, {
            path: '/api/socket',
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
                credentials: true
            },
            transports: ['websocket', 'polling'],
            allowUpgrades: true,
            pingTimeout: 30000,
            pingInterval: 10000
        });

        // ✅ TOUS LES HANDLERS SOCKET.IO (copier depuis backend/server.js)
        io.on('connection', (socket) => {
            console.log('👤 Connexion:', socket.id);

            // createRoom
            socket.on('createRoom', async (data) => {
                const room = await createRoomLogic(data, socket);
                await saveRoom(room.code, room); // ← Redis
                socket.emit('roomCreated', { /* ... */ });
            });

            // joinRoom
            socket.on('joinRoom', async (data) => {
                const room = await loadRoom(data.roomCode); // ← Redis
                if (!room) {
                    socket.emit('error', { message: 'Salle introuvable' });
                    return;
                }
                // ... logique join
                await saveRoom(room.code, room); // ← Re-save après modif
            });

            // nightAction, vote, etc.
            // ✅ COPIER TOUS LES HANDLERS de backend/server.js
            // ✅ Remplacer rooms.get() par await loadRoom()
            // ✅ Remplacer rooms.set() par await saveRoom()
        });

        res.socket.server.io = io;
        httpServer.listen(); // Pas de port spécifique, Vercel gère
    }

    res.end();
}
```

---

### Phase 4 : Créer `api/redis.js` (1h)

**Intégrer Redis Upstash REST API**

```javascript
// api/redis.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
});

// Sauvegarder room (24h TTL)
export async function saveRoom(roomCode, room) {
    const roomData = {
        code: room.code,
        hostId: room.hostId,
        players: Array.from(room.players.entries()),
        gameStarted: room.gameStarted,
        phase: room.phase,
        gameState: room.gameState,
        // ... tous les champs
    };

    await redis.setex(`room:${roomCode}`, 86400, JSON.stringify(roomData));
    console.log(`💾 Room ${roomCode} → Redis`);
}

// Charger room
export async function loadRoom(roomCode) {
    const data = await redis.get(`room:${roomCode}`);
    if (!data) return null;

    const roomData = JSON.parse(data);

    // Reconstruire Map
    const room = {
        ...roomData,
        players: new Map(roomData.players)
    };

    return room;
}

// Supprimer room
export async function deleteRoom(roomCode) {
    await redis.del(`room:${roomCode}`);
    console.log(`🗑️ Room ${roomCode} supprimée`);
}

// Lister toutes les rooms
export async function listAllRooms() {
    const keys = await redis.keys('room:*');
    const rooms = [];

    for (const key of keys) {
        const data = await redis.get(key);
        if (data) rooms.push(JSON.parse(data));
    }

    return rooms;
}
```

---

### Phase 5 : Modifier `vercel.json` (15 min)

```json
{
    "version": 2,
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "framework": "vite",
    "rewrites": [
        {
            "source": "/api/socket",
            "destination": "/api/socket"
        },
        {
            "source": "/(.*)",
            "destination": "/index.html"
        }
    ],
    "functions": {
        "api/socket.js": {
            "maxDuration": 60,
            "memory": 1024
        }
    },
    "env": {
        "UPSTASH_REDIS_REST_URL": "@upstash_redis_rest_url",
        "UPSTASH_REDIS_REST_TOKEN": "@upstash_redis_rest_token"
    }
}
```

---

### Phase 6 : Modifier Frontend `src/config.js` (10 min)

```javascript
// AVANT (Railway)
export const SOCKET_URL = 'https://loupgarou-production-4d41.up.railway.app';

// APRÈS (Vercel Serverless)
export const SOCKET_CONFIG = {
    url: typeof window !== 'undefined' ? window.location.origin : '',
    path: '/api/socket',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
};
```

```javascript
// src/App.jsx ou main.jsx
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from './config';

const socket = io(SOCKET_CONFIG.url, {
    path: SOCKET_CONFIG.path,
    transports: SOCKET_CONFIG.transports,
    reconnection: SOCKET_CONFIG.reconnection
});
```

---

### Phase 7 : Configurer Vercel Env Variables (5 min)

```bash
# Dans le dashboard Vercel ou en CLI
vercel env add UPSTASH_REDIS_REST_URL production
# Coller: https://exact-skink-12525.upstash.io

vercel env add UPSTASH_REDIS_REST_TOKEN production
# Coller: ATDtAAIncDE5OWQ0OGE5YjM3MzQ0NDgyOWM3NDRjY2ViNGYyMjY1Y3AxMTI1MjU
```

---

### Phase 8 : Installer dépendances (5 min)

```bash
# Root package.json
npm install @upstash/redis socket.io

# Vérifier package.json
{
  "dependencies": {
    "@upstash/redis": "^1.35.8",
    "socket.io": "^4.8.1",
    "socket.io-client": "^4.8.1",
    "react": "^19.2.0",
    // ...
  }
}
```

---

### Phase 9 : Tester localement (30 min)

```bash
# 1. Build frontend
npm run build

# 2. Tester avec Vercel CLI
vercel dev

# 3. Ouvrir http://localhost:3000
# 4. Créer partie, jouer, vérifier Redis
```

---

### Phase 10 : Déployer sur Vercel (10 min)

```bash
# 1. Build
npm run build

# 2. Deploy production
vercel --prod

# 3. Vérifier logs
vercel logs

# 4. Tester en prod
# Ouvrir https://loup-garou-xi.vercel.app
```

---

## 🎯 RÉSULTAT FINAL

### ✅ Ce qui marche :
- Frontend React (Vercel)
- Backend Socket.io Serverless (Vercel /api/socket)
- Redis Upstash (persistence)
- Reconnexion automatique
- 0€/mois

### ⚠️ Limites Vercel Serverless :
- Timeout 60s (mais Redis garde l'état)
- Pas de WebSocket ultra-longue durée (mais reconnexion auto)
- **100% OK pour usage familial**

---

## 📊 COMPARAISON

| Composant | Avant | Après |
|-----------|-------|-------|
| Frontend | Vercel (gratuit) | Vercel (gratuit) |
| Backend | Railway (5€/mois) | Vercel Serverless (gratuit) |
| Database | - | Redis Upstash (gratuit) |
| **Coût** | **5€/mois** | **0€/mois** |
| Deploy | 2 services | 1 service |
| Complexité | Moyenne | Simple |

---

## 🚀 PROCHAINE ÉTAPE

**Veux-tu que je commence la migration maintenant ?**

1. ✅ Créer branche `vercel-serverless`
2. ✅ Créer `api/socket.js` (Serverless Socket.io)
3. ✅ Créer `api/redis.js` (Redis helpers)
4. ✅ Modifier `vercel.json`
5. ✅ Adapter frontend
6. ✅ Tester et déployer

**Temps estimé : 3-4 heures**
**Résultat : Jeu 100% fonctionnel, 0€/mois, 1 seul service** 🎉

**On lance ?** 🚀
