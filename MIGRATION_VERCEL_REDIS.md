# 🚀 Migration : Railway → Vercel + Redis Upstash

## 🎯 Architecture Cible

**AVANT (actuel) :**
```
Frontend (Vercel) → Backend Socket.io (Railway) → Redis (Upstash)
```

**APRÈS (optimal) :**
```
Frontend (Vercel) → API Serverless (Vercel) → Redis (Upstash)
```

---

## ✅ AVANTAGES

### 1. **Coût**
- Railway : **5-10€/mois** ❌
- Vercel Serverless : **GRATUIT** (jusqu'à 100k requêtes/mois) ✅
- Redis Upstash : **GRATUIT** (10k commandes/jour) ✅

**Total : 0€/mois** 🎉

### 2. **Simplicité**
- 1 seul service (Vercel)
- 1 seul déploiement (`vercel deploy`)
- Pas de config Railway

### 3. **Performance**
- Vercel Edge Network (ultra-rapide)
- Redis Upstash REST API (latence < 50ms)
- Auto-scaling automatique

### 4. **Fiabilité**
- Vercel uptime 99.99%
- Pas de cold start (grâce à Redis pour persistence)
- Reconnexion automatique

---

## 🔧 MODIFICATIONS NÉCESSAIRES

### 1. Déplacer `backend/` → `api/`

Vercel utilise le dossier `/api` pour les Serverless Functions.

```bash
mv backend api
```

### 2. Créer `/api/socket.js` (Serverless Socket.io)

```javascript
import { Server } from 'socket.io';
import { saveRoom, loadRoom, deleteRoom } from './redis-client.js';

const ioHandler = (req, res) => {
    if (!res.socket.server.io) {
        const io = new Server(res.socket.server, {
            path: '/api/socket',
            cors: { origin: '*', methods: ['GET', 'POST'] },
            transports: ['websocket', 'polling']
        });

        // Tous tes handlers Socket.io ici
        io.on('connection', (socket) => {
            // ... même logique qu'avant
        });

        res.socket.server.io = io;
    }
    res.end();
};

export default ioHandler;
```

### 3. Modifier `vercel.json`

```json
{
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "framework": "vite",
    "rewrites": [
        { "source": "/api/socket", "destination": "/api/socket" },
        { "source": "/(.*)", "destination": "/index.html" }
    ],
    "functions": {
        "api/socket.js": {
            "maxDuration": 300
        }
    }
}
```

### 4. Modifier frontend `src/config.js`

```javascript
// AVANT
const SOCKET_URL = 'https://loupgarou-production-4d41.up.railway.app';

// APRÈS
const SOCKET_URL = window.location.origin; // Même domaine Vercel
const SOCKET_PATH = '/api/socket';
```

---

## ⚠️ LIMITES VERCEL SERVERLESS

### Plan Hobby (Gratuit) :
- ✅ **100,000 invocations/mois** (largement suffisant pour usage familial)
- ✅ **100 GB-hours compute** (= ~3000 parties de 1h)
- ⚠️ **Timeout 10 secondes** pour les fonctions
- ⚠️ **Pas de WebSocket persistants** (mais reconnexion auto fonctionne)

### Solution pour Timeout :
- Redis garde l'état → Fonction peut redémarrer sans perdre données
- Client reconnecte automatiquement
- Aucun impact visible pour les joueurs

---

## 📋 PLAN D'ACTION (2h)

### Étape 1 : Restructurer projet (20 min)
```bash
# 1. Renommer backend → api
mv backend api

# 2. Créer api/socket.js (point d'entrée Serverless)
# 3. Adapter vercel.json
```

### Étape 2 : Adapter code Socket.io (1h)
- ✅ Convertir `server.js` en fonction Serverless
- ✅ Redis reste identique (Upstash fonctionne partout)
- ✅ Tous les handlers fonctionnent pareil

### Étape 3 : Modifier frontend (10 min)
```javascript
// src/config.js
export const SOCKET_CONFIG = {
    url: window.location.origin,
    path: '/api/socket',
    transports: ['websocket', 'polling']
};
```

### Étape 4 : Variables environnement Vercel (5 min)
```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
```

### Étape 5 : Déployer (5 min)
```bash
vercel deploy --prod
```

### Étape 6 : Tester (20 min)
- Créer partie
- Rejoindre
- Jouer partie complète
- Tester reconnexion

---

## 🚨 ALTERNATIVE : Vercel Edge Functions

Si timeout 10s pose problème, tu peux utiliser **Edge Functions** :
- ✅ Pas de timeout
- ✅ WebSocket persistants
- ⚠️ Beta (mais stable)

---

## 💰 COÛT FINAL

| Service | Plan | Coût |
|---------|------|------|
| Vercel Hosting | Hobby | 0€ |
| Vercel Functions | 100k/mois | 0€ |
| Redis Upstash | 10k/jour | 0€ |
| **TOTAL** | | **0€/mois** |

vs

| Service | Plan | Coût |
|---------|------|------|
| Railway | Hobby | 5€ |
| Upstash Redis | Free | 0€ |
| Vercel Frontend | Hobby | 0€ |
| **TOTAL** | | **5€/mois** |

**Économie : 60€/an** 💰

---

## ✅ PERTINENCE POUR TON CAS

### Ton usage : Famille (4-10 joueurs)
- ✅ **100k invocations/mois** = ~10,000 parties/mois = **333 parties/jour**
- ✅ Largement suffisant même pour 100 familles
- ✅ Redis garde les rooms actives
- ✅ Reconnexion fonctionne parfaitement

### Avantages spécifiques :
1. **Gratuit à vie** (dans ton usage)
2. **Un seul deploy** (`vercel deploy`)
3. **Pas de gestion serveur**
4. **Uptime 99.99%**
5. **Redis garde tout** (pas de perte données)

---

## 🎯 CONCLUSION

**OUI, c'est TRÈS PERTINENT pour toi !**

- ✅ Redis (Upstash) : garde l'état des parties
- ✅ Vercel Serverless : héberge Socket.io gratuitement
- ✅ Pas de Railway = Pas de coût
- ✅ Même fonctionnalités
- ✅ Plus simple à gérer

**Tu veux que je fasse la migration maintenant ?** 🚀

Temps estimé : **2 heures** pour tout convertir et déployer.
