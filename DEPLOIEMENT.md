# 🚀 Guide de Déploiement Vercel - Loup-Garou

## 📋 Prérequis

1. **Compte Vercel** : [vercel.com](https://vercel.com) (gratuit)
2. **GitHub Desktop** ou Git CLI
3. **Repository GitHub** pour le projet

---

## 🎯 Étapes de Déploiement

### 1. Préparer Git (si pas déjà fait)

```bash
cd /Users/otmaneboulahia/Documents/Adam/loup_garou

# Vérifier le statut
git status

# Ajouter tous les fichiers
git add .

# Commit
git commit -m "🚀 Préparation pour déploiement Vercel"

# Push vers GitHub
git push origin main
```

### 2. Déployer sur Vercel

#### Option A : Interface Web (FACILE) 🖱️

1. **Aller sur [vercel.com](https://vercel.com)**
2. **Se connecter** avec GitHub
3. **Cliquer sur "Add New Project"**
4. **Importer** le repo `adamledams-prog/loup_garou`
5. **Configurer** :
   - Framework Preset: **Vite**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. **Cliquer sur "Deploy"** 🎉

#### Option B : CLI Vercel (TERMINAL) 💻

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Ou directement en production
vercel --prod
```

---

## ⚙️ Configuration Automatique

✅ Les fichiers suivants ont été créés :

- **`vercel.json`** : Configuration Vercel (frontend + backend)
- **`src/config.js`** : Gestion des URLs (dev/prod)
- **`.vercelignore`** : Fichiers à ignorer
- **`.env.example`** : Variables d'environnement

---

## 🌐 Après le Déploiement

### URLs générées :
```
Frontend: https://loup-garou-xxx.vercel.app
Backend:  https://loup-garou-xxx.vercel.app/api
Socket:   https://loup-garou-xxx.vercel.app/socket.io
```

### Tester le site :
1. Ouvrir l'URL Vercel
2. Créer une partie
3. Tester sur mobile et desktop

---

## 🔧 Variables d'Environnement Vercel

Si besoin, dans le dashboard Vercel :
1. **Settings** → **Environment Variables**
2. Ajouter :
   - `NODE_ENV` = `production`
   - `VITE_SERVER_URL` = (auto-détecté)

---

## 📱 Domaine Personnalisé (Optionnel)

### Ajouter un domaine :
1. **Settings** → **Domains**
2. Ajouter : `loup-garou.votredomaine.com`
3. Configurer DNS selon instructions Vercel

---

## 🔄 Mises à Jour Automatiques

✅ **Déploiement automatique** :
- Chaque `git push` sur `main` → redéploiement automatique
- Aperçu pour chaque Pull Request
- Rollback facile en 1 clic

---

## 🐛 Debug en Cas de Problème

### Vérifier les logs :
```bash
vercel logs
```

### Build en local :
```bash
npm run build
npm run preview
```

### Tester le serveur :
```bash
npm run server
```

---

## 📊 Statistiques Vercel

Dans le dashboard :
- **Analytics** : Visites, performances
- **Speed Insights** : Temps de chargement
- **Logs** : Erreurs backend

---

## 🎉 C'est Tout !

Votre jeu sera en ligne en **moins de 5 minutes** ! 🚀

**URL finale** : `https://loup-garou-[xxx].vercel.app`

Partagez le lien avec vos amis et jouez ! 🐺🌙
