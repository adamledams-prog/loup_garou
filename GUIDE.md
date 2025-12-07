# 🎮 COMMENT JOUER - GUIDE RAPIDE

## ⚠️ IMPORTANT - Erreur Socket.io

Si vous voyez cette erreur :
```
Failed to load resource: net::ERR_FILE_NOT_FOUND
io is not defined
```

**C'est parce que vous ouvrez le fichier HTML directement !**

### ❌ NE FAITES PAS ÇA :
- Double-cliquer sur `lobby.html`
- Ouvrir depuis l'explorateur de fichiers
- URL qui commence par `file:///C:/Users/...`

### ✅ FAITES ÇA :

#### **Méthode 1 - Double-clic sur start.bat (LA PLUS SIMPLE)**
1. Double-cliquez sur `start.bat`
2. Le serveur démarre et le navigateur s'ouvre automatiquement
3. Jouez !

#### **Méthode 2 - Ligne de commande**
1. Ouvrez PowerShell ou CMD dans ce dossier
2. Tapez : `npm start`
3. Ouvrez votre navigateur sur : `http://localhost:3000`

#### **Méthode 3 - VS Code**
1. Ouvrez le terminal intégré (Ctrl+`)
2. Tapez : `npm start`
3. Cliquez sur le lien `http://localhost:3000`

---

## 🌐 Mode Multijoueur Online

### Créer une partie :
1. Démarrer le serveur (voir ci-dessus)
2. Aller sur `http://localhost:3000`
3. Cliquer sur "Mode Multijoueur"
4. Entrer votre pseudo
5. Cliquer sur "Créer une partie"
6. **Partager le code avec vos amis !**

### Rejoindre une partie :
1. Aller sur `http://localhost:3000`
2. Cliquer sur "Mode Multijoueur"
3. Entrer votre pseudo
4. Entrer le code de la salle
5. Cliquer sur "Rejoindre"

### Jouer avec des amis sur Internet :
Pour jouer avec des amis qui ne sont pas sur votre réseau local, utilisez **ngrok** :

```bash
npm install -g ngrok
ngrok http 3000
```

Partagez l'URL ngrok (ex: `https://abc123.ngrok.io`) avec vos amis !

---

## 📱 Mode Local (sans serveur)

Si vous voulez jouer en mode local (5 joueurs, 1 appareil) :

1. Allez sur `http://localhost:3000`
2. Cliquez sur "Mode Local"
3. Entrez les 5 prénoms
4. Jouez !

Ou ouvrez directement `game-local.html` dans votre navigateur (sans serveur).

---

## 🐛 Dépannage

### Le serveur ne démarre pas
```bash
# Vérifier que Node.js est installé
node --version

# Réinstaller les dépendances
npm install
```

### Port 3000 déjà utilisé
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Ou utiliser un autre port
set PORT=8080
npm start
```

### Socket.io ne charge pas
**→ Vous ouvrez le fichier directement au lieu du serveur !**
Utilisez `start.bat` ou `http://localhost:3000`

---

## 📞 Besoin d'aide ?

1. Vérifiez que le serveur tourne (vous devez voir "🎮 Serveur Loup-Garou démarré")
2. Ouvrez `http://localhost:3000` (pas file:///)
3. Vérifiez la console du navigateur (F12)

---

**Amusez-vous bien ! 🐺🌙**
