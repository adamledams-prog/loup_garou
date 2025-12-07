# 🐺 Loup-Garou React - Version Design

## 🎨 Projet Frontend (Papa) + Backend (Adam Jr)

Cette version combine :
- **Frontend** : Vite + React + TailwindCSS (design noir/rouge)
- **Backend** : Server.js d'Adam Jr (logique + Socket.io)

## 🚀 Démarrage rapide

### Terminal 1 : Frontend
```bash
npm run dev
```
→ Ouvre http://localhost:5173

### Terminal 2 : Backend
```bash
npm run server
```
→ Lance le serveur sur http://localhost:3000

## 🔄 Synchroniser avec Adam Jr

Quand il update la logique :
```bash
./sync-server.sh
```

Ou manuellement :
```bash
cp ../loup_garou/server.js ./server.js
```

## 📱 Design noir/rouge

- Palette `night` (noir) et `blood` (rouge)
- Responsive mobile-first
- Animations et effets glow
- TailwindCSS custom config

## 📦 Structure

```
src/
├── pages/
│   ├── Home.jsx    → Menu principal
│   ├── Lobby.jsx   → Créer/rejoindre partie
│   └── Game.jsx    → Interface de jeu
└── components/     → À créer
```

## 🎯 À faire

- [ ] Connecter Socket.io
- [ ] Implémenter lobby fonctionnel
- [ ] Phases de jeu (nuit, jour, vote)
- [ ] Chat temps réel
- [ ] Affichage des rôles

---
🐺 *Logique : Adam Jr | Design : Papa* 🌙
