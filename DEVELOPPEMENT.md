# 🐺 Loup-Garou - Guide de Développement Local

> ⚠️ **Ce guide est pour développer en LOCAL sur votre machine.**
> Pour déployer sur Internet (Vercel + Railway), consultez [DEPLOIEMENT.md](./DEPLOIEMENT.md)

---

## 🚀 Installation rapide

### Méthode 1 : Script automatique ⚡ (RECOMMANDÉ)

```bash
./install.sh
```

Tout est fait automatiquement ! Passez directement à la section **"Lancer le projet"**.

### Méthode 2 : Manuel

#### 1. Cloner le projet

```bash
git clone https://github.com/adamledams-prog/loup_garou.git
cd loup_garou
```

##### 2. Installer les dépendances

##### Frontend
```bash
npm install
```

##### Backend
```bash
cd backend
npm install
cd ..
```

#### 3. Configurer les variables d'environnement

#### Créer `.env` à la racine
```bash
cp .env.example .env
```

Contenu de `.env` :
```
VITE_SERVER_URL=http://localhost:3000
```

#### Créer `backend/.env`
```bash
cp backend/.env.example backend/.env
```

Contenu de `backend/.env` :
```
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 🎮 Lancer le projet

Vous avez besoin de **2 terminaux** :

### Terminal 1 : Backend
```bash
npm run server
# ou
cd backend && npm start
```

Devrait afficher :
```
🎮 Serveur Loup-Garou démarré sur le port 3000
```

### Terminal 2 : Frontend
```bash
npm run dev
```

Devrait afficher :
```
VITE v5.x.x ready in xxx ms
➜ Local: http://localhost:5173/
```

---

## 🌐 Ouvrir dans le navigateur

Allez sur : **http://localhost:5173**

Vous devriez voir :
- Le menu principal
- Dans la console (F12) : `✅ Socket.io connecté !`

---

## 📁 Structure du projet

```
loup_garou/
├── backend/              # 🔙 Serveur Node.js + Socket.io
│   ├── server.js        # Logique du jeu
│   ├── package.json
│   └── .env
├── src/                 # ⚛️ Frontend React
│   ├── pages/
│   │   ├── Home.jsx    # Menu principal
│   │   ├── Lobby.jsx   # Créer/rejoindre partie
│   │   └── Game.jsx    # Jeu en cours
│   ├── config.js       # Configuration
│   └── main.jsx
├── package.json         # Dépendances frontend
├── .env                # Variables d'environnement
└── README.md
```

---

## 🐛 Debugging

### Problème : "Socket.io ne se connecte pas"

**Solution :**
1. Vérifiez que le backend tourne sur le port 3000
2. Vérifiez `.env` : `VITE_SERVER_URL=http://localhost:3000`
3. Redémarrez le frontend

### Problème : "CORS error"

**Solution :**
1. Vérifiez `backend/.env` : `ALLOWED_ORIGINS=http://localhost:5173`
2. Redémarrez le backend

### Problème : "Port déjà utilisé"

**Solution :**
```bash
# Tuer le processus sur le port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Tuer le processus sur le port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

---

## 🧪 Tester avec plusieurs joueurs

1. Ouvrez **http://localhost:5173** dans Chrome
2. Créez une partie et notez le code
3. Ouvrez **http://localhost:5173** dans un onglet privé (ou autre navigateur)
4. Rejoignez avec le code

---

## 📦 Scripts disponibles

### Frontend
```bash
npm run dev       # Lancer le dev server
npm run build     # Build pour production
npm run preview   # Preview du build
npm run lint      # Linter le code
```

### Backend
```bash
npm start         # Lancer le serveur
```

### Raccourci (depuis la racine)
```bash
npm run server    # Lance le backend
```

---

## 🔧 Technologies utilisées

### Frontend
- **React 19** - Framework UI
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **Socket.io Client** - WebSocket

### Backend
- **Node.js** - Runtime
- **Express** - Serveur HTTP
- **Socket.io** - WebSocket temps réel
- **UUID** - Génération d'IDs

---

## 📚 Ressources utiles

- [Documentation React](https://react.dev)
- [Documentation Socket.io](https://socket.io/docs/v4/)
- [Documentation TailwindCSS](https://tailwindcss.com/docs)
- [Documentation Vite](https://vitejs.dev)

---

Bon développement ! 💻
