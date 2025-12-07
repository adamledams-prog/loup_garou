# 🐺 Loup-Garou - Guide de Déploiement

## 📦 Architecture

- **Frontend** : React + Vite → Déployé sur **Vercel**
- **Backend** : Node.js + Socket.io → Déployé sur **Railway**

---

## 🚀 Déploiement Backend (Railway)

### 1. Préparer le projet

Assurez-vous que le dossier `/backend` contient :
- `server.js`
- `package.json`
- `.env.example`

### 2. Créer un compte Railway

- Allez sur [railway.app](https://railway.app)
- Connectez-vous avec GitHub

### 3. Déployer

1. Cliquez sur **"New Project"**
2. Choisissez **"Deploy from GitHub repo"**
3. Sélectionnez votre repository `loup_garou`
4. Railway détectera automatiquement Node.js

### 4. Configurer les variables d'environnement

Dans Railway, allez dans **Variables** et ajoutez :

```
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://votre-app.vercel.app
```

⚠️ **Important** : Remplacez `https://votre-app.vercel.app` par votre vraie URL Vercel.

### 5. Configurer le Root Directory

Si Railway ne trouve pas le backend automatiquement :

1. Allez dans **Settings**
2. Trouvez **Root Directory**
3. Mettez : `backend`
4. Redéployez

### 6. Obtenir l'URL

Une fois déployé, Railway vous donnera une URL comme :
```
https://votre-app.up.railway.app
```

Copiez cette URL pour l'étape suivante.

---

## 🌐 Déploiement Frontend (Vercel)

### 1. Préparer le projet

Créez un fichier `.env.production` à la racine :

```bash
VITE_SERVER_URL=https://votre-app.up.railway.app
```

⚠️ Remplacez par votre vraie URL Railway.

### 2. Créer un compte Vercel

- Allez sur [vercel.com](https://vercel.com)
- Connectez-vous avec GitHub

### 3. Déployer

1. Cliquez sur **"Add New Project"**
2. Importez votre repository `loup_garou`
3. Vercel détectera automatiquement Vite

### 4. Configurer les variables d'environnement

Dans Vercel, allez dans **Settings → Environment Variables** et ajoutez :

```
VITE_SERVER_URL=https://votre-app.up.railway.app
```

### 5. Déployer

Cliquez sur **Deploy** !

---

## 🔄 Mettre à jour CORS sur Railway

Une fois que Vercel vous donne votre URL de production (ex: `https://loup-garou-xyz.vercel.app`), retournez sur Railway et mettez à jour :

```
ALLOWED_ORIGINS=https://loup-garou-xyz.vercel.app
```

Puis redéployez le backend.

---

## ✅ Vérification

1. Ouvrez votre app Vercel : `https://votre-app.vercel.app`
2. Vérifiez les logs du navigateur (F12)
3. Vous devriez voir : `✅ Socket.io connecté !`

Si ça ne marche pas, vérifiez :
- Les URLs dans les variables d'environnement
- Les CORS dans Railway
- Les logs dans Railway et Vercel

---

## 🐛 Debugging

### Backend (Railway)

Allez dans **Deployments → View Logs** pour voir les erreurs.

### Frontend (Vercel)

Ouvrez la console du navigateur (F12) et regardez l'onglet **Console**.

---

## 📝 Commandes utiles

### Déployer manuellement depuis le terminal

#### Backend (Railway)
```bash
cd backend
npm install
npm start
```

#### Frontend (Vercel)
```bash
npm run build
vercel --prod
```

---

## 🎯 URLs importantes

- **Railway Dashboard** : https://railway.app/dashboard
- **Vercel Dashboard** : https://vercel.com/dashboard
- **Documentation Railway** : https://docs.railway.app
- **Documentation Vercel** : https://vercel.com/docs

---

Bon déploiement ! 🚀
