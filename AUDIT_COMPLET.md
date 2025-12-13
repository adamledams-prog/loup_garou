# 🔍 AUDIT COMPLET - Infrastructure Loup-Garou

**Date:** 13 Décembre 2025
**Objectif:** Analyser cohérence Redis + Railway + Server.js

---

## 📊 1. ÉTAT DES LIEUX

### ✅ REDIS (Upstash)
- **Statut:** ✅ Fonctionnel localement
- **URL:** `https://exact-skink-12525.upstash.io`
- **Token:** Défini (63 caractères)
- **Test local:** ✅ PONG, sauvegarde/lecture OK
- **TTL:** 24h (86400 secondes)

### ✅ VARIABLES D'ENVIRONNEMENT
**Local (.env):**
```
UPSTASH_REDIS_REST_URL=https://exact-skink-12525.upstash.io
UPSTASH_REDIS_REST_TOKEN=ATDtAAIncDE5OWQ0OGE5YjM3MzQ0NDgyOWM3NDRjY2ViNGYyMjY1Y3AxMTI1MjU
```

**Railway (à vérifier):**
- Doivent être identiques aux variables locales
- Configurées dans les Settings > Variables

### ✅ PACKAGES
```json
{
  "@upstash/redis": "^1.35.8",
  "dotenv": "^16.4.5",
  "express": "^5.2.1",
  "socket.io": "^4.8.1",
  "uuid": "^11.0.5"
}
```

---

## ⚠️ 2. PROBLÈMES DÉTECTÉS

### 🚨 CRITIQUE: Incohérence Redis/Mémoire

**PROBLÈME MAJEUR:** Le serveur utilise **2 systèmes de stockage simultanés** qui ne sont PAS synchronisés :

#### A. Map en mémoire (`const rooms = new Map()`)
```javascript
// Ligne 93 - server.js
const rooms = new Map();
```

#### B. Redis (sauvegarde périodique)
```javascript
// Lignes 113-119 - Auto-save toutes les 5 secondes
setInterval(() => {
    for (const [code, room] of rooms.entries()) {
        saveRoom(code, room).catch(err =>
            console.error(`❌ Erreur sauvegarde ${code}:`, err)
        );
    }
}, 5000);
```

### 🐛 BUGS RÉSULTANTS:

#### 1. **Données dupliquées**
- Room créée → ajoutée à `rooms` Map
- Room sauvée → copiée dans Redis
- **Résultat:** 2 copies qui peuvent diverger

#### 2. **Charge inutile sur Redis**
```javascript
// Toutes les 5 secondes, TOUTES les rooms sont re-sauvées
// Même si aucun changement !
setInterval(() => {
    for (const [code, room] of rooms.entries()) {
        saveRoom(code, room); // ⚠️ 100% des rooms à chaque cycle
    }
}, 5000);
```

**Impact:**
- Si 10 rooms actives → **120 écritures Redis/minute**
- Consommation inutile du quota Upstash
- Risque de rate limiting

#### 3. **Rooms "fantômes" après crash**
Scénario:
1. Serveur démarre → `rooms = new Map()` (vide)
2. Redis contient 5 rooms existantes
3. Joueur rejoint room `ABC123` qui existe dans Redis
4. `getRoom()` charge depuis Redis → OK
5. `rooms.set('ABC123', room)` → ajoutée à Map
6. Auto-save écrase Redis avec version Map
7. **Mais:** les 4 autres rooms Redis ne sont PAS dans la Map
8. Après 24h TTL → **4 rooms perdues silencieusement**

#### 4. **Race conditions sur les saves**
```javascript
// socket.on('createRoom')
rooms.set(roomCode, room);        // 1. Ajout Map
await saveRoom(roomCode, room);   // 2. Save Redis

// Pendant ce temps, auto-save peut s'exécuter !
setInterval(() => {
    saveRoom(code, room); // 3. Save concurrent ⚠️
}, 5000);
```

#### 5. **Déconnexions ne sont PAS sauvées dans Redis**
```javascript
// Ligne 1137 - disconnect handler
player.socketId = null; // ✅ Modifie Map
// ❌ Mais save Redis arrive 0-5s plus tard
// Pendant ce délai, Redis a l'ancien socketId
```

---

## ⚠️ 3. INCOHÉRENCES LOGIQUES

### A. Nettoyage automatique DÉSACTIVÉ
```javascript
const AUTO_CLEANUP_ENABLED = false; // Ligne 234
```

**Conséquence:**
- Rooms jamais supprimées de la Map mémoire
- Mais Redis TTL = 24h → suppression automatique
- **Incohérence:** Map garde rooms que Redis a supprimé

**Scénario problématique:**
1. Room créée hier à 10h
2. 24h plus tard (aujourd'hui 10h01) → Redis la supprime (TTL)
3. Map mémoire la GARDE (pas de nettoyage)
4. `rooms.get('ABC123')` → ✅ trouve
5. `loadRoom('ABC123')` → ❌ null (Redis l'a supprimé)
6. **Résultat:** État incohérent

### B. `getRoom()` charge depuis Redis mais ne vérifie pas fraîcheur
```javascript
async function getRoom(roomCode) {
    if (rooms.has(roomCode)) {
        return rooms.get(roomCode); // ⚠️ Version mémoire prioritaire
    }

    const roomData = await loadRoom(roomCode);
    if (roomData) {
        rooms.set(roomCode, room);
        return room;
    }

    return null;
}
```

**Problème:**
- Si room existe en mémoire → Redis JAMAIS consulté
- Version mémoire peut être obsolète (si autre instance serveur a modifié Redis)
- Railway peut avoir plusieurs instances → désynchronisation

### C. Socket.io utilise Map locale (pas Redis)
```javascript
// Ligne 541, 588, 609, 627, 665, 797, 947, 1003, 1068, 1088
const room = rooms.get(socket.roomCode); // ⚠️ 17 occurrences
```

**Problème:**
- Actions en temps réel utilisent Map mémoire
- Redis n'est consulté que pour `joinRoom`, `reconnect`, `startGame`
- **90% du code utilise Map, 10% utilise Redis**

---

## ⚠️ 4. CONFIGURATION SOCKET.IO

### Timeouts extrêmes
```javascript
pingTimeout: 300000,   // 5 minutes ⚠️
pingInterval: 15000,   // 15 secondes
connectTimeout: 60000, // 60 secondes
```

**Problème:**
- `pingTimeout: 300000` = 5 minutes avant de détecter une déconnexion
- Joueur peut être considéré "connecté" pendant 5 min après perte réseau
- Actions de nuit peuvent bloquer en attendant un joueur fantôme

### WebSocket ONLY (pas de fallback)
```javascript
transports: ['websocket'],
allowUpgrades: false,
```

**Conséquence:**
- Si WebSocket échoue → connexion impossible
- Pas de fallback vers long-polling
- Peut causer les erreurs 400 si Railway bloque WebSocket

---

## 🔧 5. SOLUTIONS RECOMMANDÉES

### 🚨 URGENCE 1: Choisir UNE source de vérité

**Option A: Redis UNIQUEMENT (recommandé)**
```javascript
// ❌ Supprimer la Map
// const rooms = new Map();

// ✅ Toujours lire/écrire dans Redis
async function getRoom(roomCode) {
    return await loadRoom(roomCode);
}

async function setRoom(roomCode, room) {
    await saveRoom(roomCode, room);
}

// Adapter TOUS les handlers
socket.on('vote', async (data) => {
    const room = await getRoom(socket.roomCode); // Redis
    // ... modifications
    await setRoom(socket.roomCode, room); // Redis
});
```

**Option B: Map avec cache Redis (complexe)**
```javascript
// Map = cache chaud
// Redis = backup froid

async function getRoom(roomCode) {
    let room = rooms.get(roomCode);
    if (!room) {
        room = await loadRoom(roomCode); // Fallback Redis
        if (room) rooms.set(roomCode, room);
    }
    return room;
}

// MAIS: nécessite invalidation cache, locks, etc.
```

### 🚨 URGENCE 2: Arrêter auto-save toutes les 5s

**Actuel:**
```javascript
setInterval(() => {
    for (const [code, room] of rooms.entries()) {
        saveRoom(code, room); // ⚠️ Toutes les rooms à chaque fois
    }
}, 5000);
```

**Solution: Save UNIQUEMENT quand modifiée**
```javascript
async function updateRoom(roomCode, updateFn) {
    const room = await getRoom(roomCode);
    if (!room) return null;

    await updateFn(room); // Modifications
    await saveRoom(roomCode, room); // Save immédiat

    return room;
}

// Usage
socket.on('vote', async (data) => {
    await updateRoom(socket.roomCode, (room) => {
        room.gameState.votes[socket.playerId] = data.targetId;
    });
});
```

### 🚨 URGENCE 3: Activer nettoyage Redis

**Ajouter cleanup Redis:**
```javascript
// Nettoyer rooms terminées dans Redis
setInterval(async () => {
    const allRooms = await listAllRooms();

    for (const room of allRooms) {
        if (room.gameEnded && room.endTime) {
            const timeSinceEnd = Date.now() - room.endTime;

            if (timeSinceEnd > 10 * 60 * 1000) { // 10 min
                await deleteRoom(room.code);
                console.log(`🗑️ Room ${room.code} supprimée de Redis`);
            }
        }
    }
}, 5 * 60 * 1000); // Toutes les 5 minutes
```

### ⚙️ URGENCE 4: Réduire timeouts Socket.io

```javascript
const io = socketIo(server, {
    cors: { /* ... */ },
    pingTimeout: 30000,   // 30s au lieu de 5min ✅
    pingInterval: 10000,  // 10s au lieu de 15s ✅
    connectTimeout: 20000, // 20s au lieu de 60s ✅
    transports: ['websocket', 'polling'], // ✅ Ajouter fallback
    allowUpgrades: true // ✅ Permettre upgrade WS
});
```

---

## 📋 6. CHECKLIST RAILWAY

### Variables à vérifier dans Railway Dashboard:
```
☐ UPSTASH_REDIS_REST_URL = https://exact-skink-12525.upstash.io
☐ UPSTASH_REDIS_REST_TOKEN = ATDtAAIncDE5OWQ0OGE5YjM3MzQ0NDgyOWM3NDRjY2ViNGYyMjY1Y3AxMTI1MjU
☐ NODE_ENV = production (optionnel)
☐ PORT = (laisser Railway le définir)
```

### Logs Railway à surveiller:
```bash
✅ "Redis client initialisé avec succès"
✅ "📡 URL Redis: https://exact-skink-12525..."
✅ "Serveur Loup-Garou démarré sur le port XXXX"
❌ "Variables Redis manquantes" → ERREUR CONFIG
❌ "Error: Redis connection failed" → PROBLÈME UPSTASH
❌ "400 Bad Request" → PROBLÈME CORS/WEBSOCKET
```

---

## 🎯 7. PLAN D'ACTION IMMÉDIAT

### Phase 1: Diagnostic Railway (5 min)
1. Vérifier variables Railway
2. Consulter logs déploiement
3. Confirmer que Redis init réussit

### Phase 2: Correction Architecture (30 min)
1. Choisir Option A (Redis only) ou Option B (Map+cache)
2. Modifier `getRoom()` / `setRoom()`
3. Remplacer tous les `rooms.get()` par `await getRoom()`
4. Supprimer auto-save 5s
5. Sauver après chaque modification

### Phase 3: Optimisation Socket.io (10 min)
1. Réduire timeouts (30s/10s/20s)
2. Ajouter fallback polling
3. Tester reconnexions

### Phase 4: Test complet (15 min)
1. Créer room → vérifier Redis
2. Crash serveur → redémarrer → reconnect
3. Jouer partie complète
4. Vérifier que rooms persistent

---

## 🔴 BUGS CRITIQUES À CORRIGER

### 1. **deleteRoom jamais appelé**
```javascript
const { saveRoom, loadRoom, deleteRoom, roomExists } = require('./redis-client');
// ⚠️ deleteRoom importé mais JAMAIS utilisé dans server.js
```

**Correction:**
```javascript
// Ligne 1107 - stopGame handler
room.gameEnded = true;
await deleteRoom(socket.roomCode); // ✅ Supprimer Redis
rooms.delete(socket.roomCode); // ✅ Supprimer Map
```

### 2. **roomExists jamais utilisé**
```javascript
// ⚠️ Fonction importée mais jamais appelée
```

**Correction:**
```javascript
socket.on('joinRoom', async (data) => {
    // ✅ Vérifier existence AVANT de charger
    const exists = await roomExists(roomCode);
    if (!exists) {
        socket.emit('error', { message: 'Salle introuvable' });
        return;
    }

    const room = await getRoom(roomCode);
    // ...
});
```

### 3. **GameRoom perd ses méthodes après Redis**
```javascript
// Ligne 105 - getRoom()
const room = Object.assign(new GameRoom(...), roomData);
// ⚠️ Mais GameRoom a 6 méthodes (addPlayer, removePlayer, etc.)
// Après désérialisation JSON → méthodes perdues !
```

**Correction:**
```javascript
async function loadRoom(roomCode) {
    const data = await redis.get(`room:${roomCode}`);
    if (!data) return null;

    const roomData = JSON.parse(data);

    // ✅ Recréer instance complète avec méthodes
    const room = new GameRoom(
        roomData.code,
        roomData.hostId,
        '', '', // On ne peut pas recréer hostName/avatar
        roomData.rapidMode
    );

    // Restaurer propriétés
    Object.assign(room, roomData);

    // Recréer Map
    room.players = new Map(roomData.players.map(p => [p.id, p]));

    return room;
}
```

---

## 📊 8. MÉTRIQUES À SURVEILLER

### Upstash Dashboard:
- **Commandes/jour:** Ne devrait pas dépasser 10,000 (plan gratuit)
- **Stockage:** < 10,000 rooms * 5KB = 50MB max
- **Latence:** < 100ms pour GET/SET

### Railway Logs:
```bash
# Compter les saves Redis
grep "Room .* sauvegardée" logs.txt | wc -l

# Vérifier erreurs Redis
grep "Erreur sauvegarde" logs.txt

# Tracer les reconnexions
grep "reconnecté" logs.txt
```

---

## ✅ 9. CONCLUSION

### État actuel: 🔴 CRITIQUE
- Redis fonctionne ✅
- Intégration server.js ❌ (architecture hybride incohérente)
- Risque perte données ⚠️ (race conditions, désynchronisation)

### Urgence absolue:
1. **Choisir UNE source de vérité** (Redis only recommandé)
2. **Supprimer auto-save 5s** (remplacer par save après modif)
3. **Activer nettoyage Redis** (rooms terminées)
4. **Réduire timeouts Socket.io** (30s/10s/20s)

### Estimation correctifs:
- **Temps:** 1-2 heures
- **Complexité:** Moyenne (refactoring handlers async)
- **Risque:** Faible (Redis testé et fonctionnel)

---

**Prochaine étape recommandée:**
Vérifier les logs Railway pour confirmer que le dernier déploiement (9d2e159) affiche bien "Redis client initialisé avec succès".
