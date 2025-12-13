# 🔥 Migration Redis - Résoudre "Partie introuvable"

## ❌ Problème actuel
- **Stockage en RAM** : `const rooms = new Map()` → perdu au redémarrage serveur
- **Railway/Vercel** redémarre aléatoirement → parties perdues
- **Aucune persistance** → impossible de récupérer après un crash

## ✅ Solution : Redis (Upstash)

### 1️⃣ Créer un compte Upstash (gratuit)
1. Aller sur https://upstash.com
2. Créer un compte (GitHub login)
3. Créer une base Redis (région proche de votre serveur)
4. Copier **UPSTASH_REDIS_REST_URL** et **UPSTASH_REDIS_REST_TOKEN**

### 2️⃣ Installer les dépendances
```bash
cd backend
npm install @upstash/redis ioredis
```

### 3️⃣ Configuration Railway/Vercel
Ajouter dans les variables d'environnement :
```
UPSTASH_REDIS_REST_URL=https://your-redis-xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXxxxxx
```

### 4️⃣ Avantages Redis
- ✅ **Survit aux redémarrages** : Les parties restent actives
- ✅ **TTL automatique** : Nettoyage auto après X heures
- ✅ **Scalable** : Fonctionne avec plusieurs instances serveur
- ✅ **Gratuit** : 10,000 commandes/jour (largement suffisant)

### 5️⃣ Fonctionnalités ajoutées
- 🔒 **Sauvegarde automatique** toutes les 5 secondes
- ⏰ **TTL de 24h** sur les parties inactives
- 🔄 **Reconnexion automatique** après redémarrage serveur
- 📊 **Logs de debug** pour tracer les erreurs

---

## 📝 Fichiers créés
- `backend/server-redis.js` : Nouvelle version avec Redis
- `backend/redis-client.js` : Client Redis configuré
- `.env.example` : Template des variables d'environnement

---

## 🚀 Déploiement
1. Tester en local avec `.env`
2. Configurer Upstash sur Railway/Vercel
3. Remplacer `server.js` par `server-redis.js`
4. Redéployer

**Fini les "partie introuvable" !** 🎉
