# 🚨 Important : Déploiement Backend Séparé

## Problème avec Vercel

⚠️ **Vercel ne supporte pas Socket.io en Serverless** car :
- Socket.io nécessite une connexion persistante (WebSocket)
- Vercel Serverless = fonctions sans état qui s'arrêtent après chaque requête
- Impossible de maintenir une connexion WebSocket active

## ✅ Solution : Déploiement Séparé

### Frontend (React) → Vercel ✅
- Déjà déployé sur : `loup-garou-xtv.vercel.app`
- Interface utilisateur, design, navigation

### Backend (Node.js + Socket.io) → Service alternatif 🔧

#### Options recommandées :

### 1. **Railway.app** (RECOMMANDÉ) 🚂
```bash
# Installation
npm install -g @railway/cli

# Déploiement
railway login
railway init
railway up
```
- ✅ Gratuit (500h/mois)
- ✅ Support Socket.io natif
- ✅ Déploiement en 2 minutes
- 🌐 URL : `votreapp.railway.app`

### 2. **Render.com** 🎨
- ✅ Gratuit (750h/mois)
- ✅ Interface simple
- ✅ Git auto-deploy
- 🌐 URL : `votreapp.onrender.com`

### 3. **Fly.io** 🪰
- ✅ Gratuit (3 apps)
- ✅ Serveur global
- ✅ WebSocket support

---

## 🛠️ Configuration Après Déploiement Backend

Une fois le backend déployé sur Railway/Render :

1. **Récupérer l'URL** (ex: `https://loup-garou-backend.railway.app`)

2. **Créer `.env.production`** :
```bash
VITE_SERVER_URL=https://loup-garou-backend.railway.app
```

3. **Configurer Vercel** :
```bash
vercel env add VITE_SERVER_URL
# Entrer : https://loup-garou-backend.railway.app
```

4. **Redéployer** :
```bash
git add .
git commit -m "✅ Backend URL configuré"
git push
```

---

## 🎯 Architecture Finale

```
Frontend (Vercel)
├── React + Vite
├── Interface utilisateur
└── https://loup-garou-xtv.vercel.app
         ↓
    WebSocket
         ↓
Backend (Railway)
├── Node.js + Express
├── Socket.io
├── Logique du jeu
└── https://loup-garou-backend.railway.app
```

---

## 🚀 Prochaines Étapes

Pour l'instant, **le frontend est déployé** sur Vercel ✅

Pour rendre le jeu **fonctionnel en ligne**, il faut :
1. Déployer `server.js` sur Railway
2. Configurer l'URL dans Vercel
3. C'est tout ! 🎉

---

## 💻 Développement Local (Continue de Fonctionner)

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run server
```

Localhost fonctionne toujours normalement ! 👍
