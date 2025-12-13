# 🐺 Loup-Garou Online - Jeu Multijoueur en Famille

Jeu de Loup-Garou multijoueur en temps réel avec React + Socket.io + **Bots IA intelligents** 🤖

## ✨ Fonctionnalités

- ✅ Créer et rejoindre des parties avec un code (ou QR code)
- ✅ 8 rôles : Loup-Garou, Voyante, Sorcière, Chasseur, Cupidon, Riche, Livreur, Villageois
- ✅ Phases de nuit, jour et vote avec timer automatique
- ✅ **Timer accéléré en finale** (15s quand ≤3 joueurs vivants)
- ✅ **Narrations dramatiques** avec sons et vibrations
- ✅ Chat en temps réel (loups la nuit, tous le jour)
- ✅ **Bots IA** qui parlent et agissent naturellement (OpenAI/OpenRouter)
- ✅ Design responsive PWA (mobile + desktop)
- ✅ Système de reconnexion automatique
- ✅ Statistiques de partie (MVP, plus bavard, etc.)

## 🏗️ Architecture

- **Frontend** : React + Vite + TailwindCSS → Déployé sur Vercel
- **Backend** : Node.js + Express + Socket.io → Déployé sur Railway

## 🚀 Installation et démarrage

### Option 1 : Script automatique (recommandé)

```bash
./install.sh
```

Ce script va :
- ✅ Installer toutes les dépendances (frontend + backend)
- ✅ Créer les fichiers `.env` automatiquement
- ✅ Tout configurer en une commande

### Option 2 : Manuel

```bash
# 1. Installer
npm install
cd backend && npm install && cd ..

# 2. Configurer
cp .env.example .env
cp backend/.env.example backend/.env

# 3. Lancer (2 terminaux)
npm run server  # Terminal 1
npm run dev     # Terminal 2
```

Puis ouvrez **http://localhost:5173**

## 🤖 Bots IA (NOUVEAU !)

Les bots peuvent maintenant **parler dans le chat** et **agir intelligemment** grâce à l'IA !

### ⚡ Démarrage Rapide

1. **Obtenir une clé API** :
   - OpenAI : https://platform.openai.com/api-keys
   - Ou OpenRouter : https://openrouter.ai/keys (gratuit avec Llama)

2. **Configurer** :
```bash
cd backend
cp .env.example .env
# Éditer .env et ajouter :
# OPENAI_API_KEY=sk-proj-xxxxx
# AI_BOTS_ENABLED=true
# AI_BOTS_CHAT=true
```

3. **Redémarrer le serveur** :
```bash
node server.js
```

Les bots vont maintenant :
- 💬 Parler dans le chat selon leur rôle et la situation
- 🎭 Avoir une personnalité unique (Robo = sarcastique, Beep = timide, etc.)
- 🧠 Voter intelligemment en analysant le contexte
- 📢 Apparaître dans les narrations personnalisées

**Coût** : ~$0.002-0.005 par partie (négligeable) avec `gpt-4o-mini`

📖 **Guide complet** : [doc/AI_BOTS.md](./doc/AI_BOTS.md)

---

## 📚 Documentation complète

Toute la documentation est dans le dossier **`/doc`** :

- 🤖 **[AI_BOTS.md](./doc/AI_BOTS.md)** - Bots IA intelligents ⭐ NOUVEAU
- 🎮 **[FEATURES_DEPLOYED.md](./doc/FEATURES_DEPLOYED.md)** - Timer accéléré + Narrations
- 📖 **[DEVELOPPEMENT.md](./doc/DEVELOPPEMENT.md)** - Guide de développement
- 🚀 **[DEPLOIEMENT.md](./doc/DEPLOIEMENT.md)** - Déploiement production
- 🔧 **[CORRECTIONS.md](./doc/CORRECTIONS.md)** - Historique des corrections
- 📑 **[Voir tous les docs](./doc/README.md)** - Index complet

## 🎯 Technologies

### Frontend
- React 19
- Vite
- TailwindCSS
- React Router
- Socket.io Client

### Backend
- Node.js
- Express
- Socket.io
- UUID

## 📦 Structure du projet

```
loup_garou/
├── backend/              # Backend Node.js
│   ├── server.js
│   └── package.json
├── src/                 # Frontend React
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Lobby.jsx
│   │   └── Game.jsx
│   └── config.js
├── package.json
└── README.md
```

## 🎲 Comment jouer

1. **Créer une partie** : Entrez votre nom et créez une salle
2. **Inviter des amis** : Partagez le code de 6 lettres
3. **Prêts ?** : L'hôte lance la partie quand tout le monde est prêt
4. **Phase de nuit** : Les rôles spéciaux agissent
5. **Phase de jour** : Discutez et trouvez les loups
6. **Phase de vote** : Éliminez un suspect
7. **Répétez** jusqu'à la victoire des Villageois ou des Loups !

## 🐛 Problèmes courants

### Socket.io ne se connecte pas
- Vérifiez que le backend tourne sur le port 3000
- Vérifiez le fichier `.env`

### CORS error
- Vérifiez `backend/.env` et les `ALLOWED_ORIGINS`

Consultez [DEVELOPPEMENT.md](./DEVELOPPEMENT.md) pour plus de détails.

## 🤝 Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 License

Ce projet est sous licence MIT.

---

🐺 Fait avec ❤️ par Adam | Design noir/rouge 🌙
