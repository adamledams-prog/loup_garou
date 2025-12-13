# 🔧 Comment intégrer Redis dans server.js

## 📦 Étapes d'intégration

### 1️⃣ Installer Redis
```bash
cd backend
npm install @upstash/redis
```

### 2️⃣ Ajouter l'import Redis en haut de server.js

**Ajouter après les autres imports :**
```javascript
const { saveRoom, loadRoom, deleteRoom, roomExists } = require('./redis-client');
```

### 3️⃣ Modifier la gestion des rooms

**❌ AVANT (stockage en RAM) :**
```javascript
const rooms = new Map();
```

**✅ APRÈS (avec Redis) :**
```javascript
const rooms = new Map(); // Cache local pour performance

// Fonction pour obtenir une room (charge depuis Redis si nécessaire)
async function getRoom(roomCode) {
    if (rooms.has(roomCode)) {
        return rooms.get(roomCode);
    }

    // Charger depuis Redis
    const roomData = await loadRoom(roomCode);
    if (roomData) {
        rooms.set(roomCode, roomData);
        return roomData;
    }

    return null;
}

// Sauvegarder automatiquement toutes les 5 secondes
setInterval(() => {
    for (const [code, room] of rooms.entries()) {
        saveRoom(code, room).catch(err =>
            console.error(`Erreur sauvegarde ${code}:`, err)
        );
    }
}, 5000);
```

### 4️⃣ Modifier les événements Socket.io

**Exemple pour `createRoom` :**

**❌ AVANT :**
```javascript
socket.on('createRoom', (data) => {
    const room = new GameRoom(...);
    rooms.set(roomCode, room);
    // ...
});
```

**✅ APRÈS :**
```javascript
socket.on('createRoom', async (data) => {
    const room = new GameRoom(...);
    rooms.set(roomCode, room);
    await saveRoom(roomCode, room); // ✅ Sauvegarder dans Redis
    // ...
});
```

**Exemple pour `joinRoom` :**

**❌ AVANT :**
```javascript
socket.on('joinRoom', (data) => {
    const room = rooms.get(roomCode);
    // ...
});
```

**✅ APRÈS :**
```javascript
socket.on('joinRoom', async (data) => {
    let room = await getRoom(roomCode); // ✅ Charger depuis Redis si nécessaire
    // ...
});
```

### 5️⃣ Modifier la reconnexion

**Dans `reconnectToGame` :**

**❌ AVANT :**
```javascript
socket.on('reconnectToGame', (data) => {
    const room = rooms.get(roomCode);
    if (!room) {
        socket.emit('roomNotFound', { ... });
        return;
    }
    // ...
});
```

**✅ APRÈS :**
```javascript
socket.on('reconnectToGame', async (data) => {
    let room = await getRoom(roomCode); // ✅ Charge depuis Redis
    if (!room) {
        socket.emit('roomNotFound', { ... });
        return;
    }
    // ...
});
```

---

## 🎯 Points clés

1. **Ajouter `async/await`** à tous les événements qui lisent/écrivent des rooms
2. **Remplacer `rooms.get()` par `await getRoom()`** partout
3. **Appeler `await saveRoom()`** après chaque modification importante
4. **Garder le cache local** (`rooms Map`) pour la performance

---

## ⚡ Alternative : Version automatique

Si vous voulez que je modifie automatiquement votre `server.js` :
1. J'ai créé tous les fichiers nécessaires (`redis-client.js`, etc.)
2. Il suffit de remplacer quelques lignes dans `server.js`
3. Cela prendra 5-10 minutes

**Voulez-vous que je fasse ces modifications automatiquement ?** 🤖

---

## 🧪 Test avant déploiement

```bash
# 1. Tester la connexion Redis
node backend/test-redis.js

# 2. Si OK, démarrer le serveur
cd backend
npm start

# 3. Créer une partie de test
# 4. Redémarrer le serveur (Ctrl+C puis npm start)
# 5. Essayer de rejoindre la partie → ça devrait marcher !
```

---

## 🆘 Besoin d'aide ?

Si vous bloquez, je peux :
- ✅ Modifier automatiquement server.js pour vous
- ✅ Créer une version complète `server-redis.js`
- ✅ Vous guider étape par étape

**Dites-moi ce que vous préférez !** 😊
