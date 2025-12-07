# 🐺 Loup-Garou Online - Multijoueur

Jeu du Loup-Garou en ligne avec salles privées, chat en temps réel et actions simultanées !

## 🎮 Fonctionnalités

### ✨ Mode Multijoueur
- **Salles privées** : Créez une salle avec un code unique à partager
- **4 à 10 joueurs** : Jouez avec vos amis de n'importe où
- **Actions simultanées** : Plus besoin d'attendre son tour la nuit !
- **Chat en temps réel** : Communiquez pendant la partie
- **Interface responsive** : Jouez sur PC, tablette ou mobile

### 🎭 Rôles disponibles
- 🐺 **Loup-Garou** : Élimine un joueur chaque nuit
- 🔮 **Voyante** : Peut voir le rôle d'un joueur (1 fois par partie)
- 🧙‍♀️ **Sorcière** : Possède une potion de vie et une de poison
- 🛡️ **Bouclier** : Survit à une attaque (1 fois)
- ↩️ **Renvoyeur** : Élimine quelqu'un s'il meurt
- 👨 **Villageois** : Vote pour éliminer les suspects

## 🚀 Installation

### Prérequis
- Node.js (version 14 ou supérieure)
- npm ou yarn

### Étapes

1. **Cloner le dépôt**
```bash
git clone https://github.com/adamledams-prog/loup_garou.git
cd loup_garou
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Démarrer le serveur**
```bash
npm start
```

4. **Ouvrir le jeu**
Ouvrez votre navigateur sur : `http://localhost:3000/lobby.html`

## 🎯 Comment jouer

### Créer une partie
1. Entrez votre pseudo
2. Cliquez sur "Créer une partie"
3. Partagez le code de la salle avec vos amis
4. Attendez que tous les joueurs soient prêts
5. Lancez la partie !

### Rejoindre une partie
1. Entrez votre pseudo
2. Cliquez sur "Rejoindre une partie"
3. Entrez le code de la salle
4. Cliquez sur "Je suis prêt !"

### Pendant la partie
- **Nuit** : Les rôles spéciaux agissent en même temps
- **Jour** : Discutez dans le chat et votez pour éliminer un suspect
- **Chat** : Communiquez avec les autres joueurs en temps réel

## 🛠️ Développement

### Mode développement
```bash
npm run dev
```
Utilise nodemon pour redémarrer automatiquement le serveur lors des modifications.

### Structure du projet
```
loup_garou/
├── server.js           # Serveur Node.js + WebSocket
├── lobby.html          # Interface de création/rejoindre salle
├── game-online.html    # Interface de jeu multijoueur
├── style.css           # Styles partagés
├── package.json        # Dépendances npm
└── README.md          # Documentation
```

## 🌐 Déploiement

### Heroku
```bash
heroku create loup-garou-online
git push heroku main
```

### Autres plateformes
Le jeu fonctionne sur toute plateforme supportant Node.js :
- Render
- Railway
- DigitalOcean
- AWS
- Azure

## 📝 Technologies utilisées

- **Backend** : Node.js + Express
- **WebSocket** : Socket.io pour la communication en temps réel
- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **UUID** : Génération d'identifiants uniques

## 🎨 Personnalisation

### Modifier le nombre de joueurs
Dans `server.js`, ligne 23 :
```javascript
if (this.players.size >= 10) {  // Changer 10 par le max souhaité
```

### Ajouter des rôles
Dans `server.js`, méthode `assignRoles()` :
```javascript
if (playerCount >= 11) roles.push('nouveau_role');
```

## 🐛 Dépannage

### Le serveur ne démarre pas
- Vérifiez que le port 3000 est disponible
- Essayez : `PORT=8080 npm start`

### Problèmes de connexion
- Vérifiez votre pare-feu
- Assurez-vous que Socket.io est bien installé : `npm install socket.io`

### Le chat ne fonctionne pas
- Ouvrez la console du navigateur (F12)
- Vérifiez les erreurs Socket.io

## 📄 Licence

MIT - Libre d'utilisation et de modification

## 👨‍💻 Auteur

Adam - [GitHub](https://github.com/adamledams-prog)

## 🙏 Contributions

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer de nouvelles fonctionnalités
- Améliorer le code

---

**Amusez-vous bien ! 🐺🌙**
