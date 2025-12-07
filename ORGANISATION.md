# 🎮 Organisation du Projet Loup-Garou

## 📁 Structure ACTUELLE (Version React Unifiée)

```
loup_garou/                  ← UN SEUL PROJET (Git)
├── src/                     → Pages React (Home, Lobby, Game)
├── server.js                → Backend Node.js + Socket.io
├── old-version/             → Anciens fichiers HTML (sauvegardés)
├── start.sh                 → Lancer le frontend
├── start-server.sh          → Lancer le backend
└── package.json             → Dépendances React + Node.js
```

## 🎯 Un seul projet maintenant !

✅ **Version React avec design noir/rouge** (Papa)
✅ **Logique du jeu** (Adam Jr)
✅ **Tout fusionné dans un seul repo**

## � Pour démarrer

```bash
cd loup_garou

# Terminal 1
./start.sh              # Frontend React

# Terminal 2
./start-server.sh       # Backend Node.js
```

## 👨‍👦 Qui fait quoi maintenant ?

### Adam Jr (Fils)
- Continue d'améliorer **server.js** (logique, rôles, phases)
- Peut ajouter des composants React si il veut

### Papa
- Améliore le **design** (src/pages/, TailwindCSS)
- Connecte le frontend au backend (Socket.io)
- Animations et UX

## � Workflow Git

```bash
# Pull avant de bosser
git pull

# Bosser sur le code...

# Commit et push
git add .
git commit -m "Description"
git push origin main
```

✅ **Plus simple : un seul projet, un seul workflow !**
