# 🐺 Loup-Garou React - Version Multijoueur

Jeu de Loup-Garou multijoueur en temps réel avec React + Socket.io

## � Fonctionnalités

- ✅ Créer et rejoindre des parties avec un code
- ✅ 8 rôles : Loup-Garou, Voyante, Sorcière, Chasseur, Cupidon, Riche, Livreur, Villageois
- ✅ Phases de nuit, jour et vote
- ✅ Chat en temps réel (loups uniquement la nuit)
- ✅ Timer automatique pour chaque phase
- ✅ Design responsive (mobile + desktop)
- ✅ Système de reconnexion

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

## 📚 Documentation complète

- 📖 **Développement local ?** → [DEVELOPPEMENT.md](./DEVELOPPEMENT.md)
- 🚀 **Déployer en production ?** → [DEPLOIEMENT.md](./DEPLOIEMENT.md)
- 🔧 **Voir les corrections** → [CORRECTIONS.md](./CORRECTIONS.md)

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
