# 🚀 Guide d'installation Redis (Solution "Partie introuvable")

## ⚡ Installation rapide (5 minutes)

### 1️⃣ Installer la dépendance Redis
```bash
cd backend
npm install @upstash/redis
```

### 2️⃣ Créer un compte Upstash (GRATUIT)

1. Aller sur **https://upstash.com**
2. Se connecter avec GitHub
3. Créer une nouvelle base Redis :
   - Cliquer sur "Create Database"
   - Nom : `loup-garou-prod`
   - Région : Choisir la plus proche (Europe/US)
   - Type : **Regional** (gratuit)
4. Copier les credentials :
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 3️⃣ Configuration locale (.env)

Créer un fichier `backend/.env` :
```env
PORT=3000
UPSTASH_REDIS_REST_URL=https://xxxxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXxxxxxxxxxxx
```

### 4️⃣ Configuration Railway

Dans le dashboard Railway :
1. Aller dans votre service backend
2. Variables → Add Variable
3. Ajouter :
   - `UPSTASH_REDIS_REST_URL` = `https://xxxxxxx.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` = `AXXXXxxxxxxxxxxx`
4. Redéployer

### 5️⃣ Configuration Vercel (si besoin)

Dans le dashboard Vercel :
1. Settings → Environment Variables
2. Ajouter les mêmes variables
3. Redéployer

---

## ✅ Vérifier que Redis fonctionne

### Test local
```bash
cd backend
npm start
```

Regarder les logs, vous devriez voir :
```
✅ Redis connecté avec succès
🎮 Serveur Loup-Garou démarré sur le port 3000
```

### Test en production

1. Créer une partie
2. Copier le code de la salle
3. Aller sur : `https://votre-backend.up.railway.app/api/room/XXXX`
4. Vous devriez voir les infos de la salle en JSON

---

## 🎉 Résultat

- ✅ **Fini les "partie introuvable"** pendant le jeu
- ✅ **Parties persistantes** même après redémarrage serveur
- ✅ **Nettoyage automatique** après 24h d'inactivité
- ✅ **Gratuit** jusqu'à 10,000 commandes/jour

---

## 🆘 En cas de problème

### Erreur "Redis connection failed"
➡️ Vérifier que les variables d'environnement sont bien configurées

### Parties toujours perdues
➡️ Vérifier les logs Railway : `railway logs`

### Questions
➡️ Créer une issue GitHub ou me contacter
