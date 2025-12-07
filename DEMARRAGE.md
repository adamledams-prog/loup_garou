# 🚀 Guide de Démarrage - Loup-Garou React

## 📍 Où êtes-vous ?

```
Adam/
├── loup_garou/          ← Projet d'Adam Jr (Git)
└── loup-garou-react/    ← Votre projet React (Papa)
```

## 🎮 Démarrer le projet React

### Option 1 : Avec les scripts (FACILE)

**Terminal 1 - Frontend :**
```bash
/Users/otmaneboulahia/Documents/Adam/loup-garou-react/start.sh
```
Ou double-cliquez sur `start.sh`

**Terminal 2 - Backend :**
```bash
/Users/otmaneboulahia/Documents/Adam/loup-garou-react/start-server.sh
```
Ou double-cliquez sur `start-server.sh`

### Option 2 : Manuelle

```bash
# Aller dans le dossier
cd /Users/otmaneboulahia/Documents/Adam/loup-garou-react

# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend (dans un nouveau terminal)
npm run server
```

## 🌐 URLs

- **Frontend React** : http://localhost:5173
- **Backend Node.js** : http://localhost:3000

## 🔄 Synchroniser avec Adam Jr

Quand votre fils push du nouveau code :

```bash
# 1. Aller dans son repo et récupérer
cd /Users/otmaneboulahia/Documents/Adam/loup_garou
git pull

# 2. Copier son serveur dans votre projet
cd /Users/otmaneboulahia/Documents/Adam/loup-garou-react
./sync-server.sh
```

## 📤 Partager vos changements avec Adam Jr

Quand vous avez fini le design et voulez tout fusionner :

```bash
# 1. Copier votre projet React dans son repo
cd /Users/otmaneboulahia/Documents/Adam/loup_garou
mkdir react-app
cp -r ../loup-garou-react/src ./react-app/
cp ../loup-garou-react/tailwind.config.js ./react-app/

# 2. Commit et push
git add .
git commit -m "✨ Nouveau design React par Papa"
git push origin main
```

## 🐛 Problèmes courants

### Le serveur ne démarre pas
```bash
# Vérifier qu'on est dans le bon dossier
pwd
# Devrait afficher: /Users/otmaneboulahia/Documents/Adam/loup-garou-react

# Réinstaller les dépendances si besoin
npm install
```

### Port déjà utilisé
```bash
# Si le port 5173 ou 3000 est occupé
# Tuer le processus
lsof -ti:5173 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Tailwind ne fonctionne pas
```bash
# Vérifier l'installation
npm list tailwindcss
# Devrait montrer: tailwindcss@3.4.18
```

## ✨ Pages créées

- ✅ `/` - Page d'accueil (menu noir/rouge)
- ✅ `/lobby` - Créer/rejoindre une partie
- ✅ `/game/:roomCode` - Interface de jeu

## 🎨 Couleurs

- **`night`** : Noir (#000000 à #1e1e2e)
- **`blood`** : Rouge (#450a0a à #fee)

## 📝 Prochaines étapes

- [ ] Connecter Socket.io au serveur
- [ ] Implémenter la création de salle
- [ ] Ajouter le système de chat
- [ ] Intégrer les phases de jeu (nuit/jour)
- [ ] Afficher les rôles des joueurs
- [ ] Animations des transitions

---
🐺 **Design moderne pour une expérience immersive** 🌙
