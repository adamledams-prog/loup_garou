# 📚 Documentation Loup-Garou

Bienvenue dans la documentation complète du jeu **Loup-Garou Online**.

## 📑 Index des Documents

### 🎮 Fonctionnalités
- **[FEATURES_DEPLOYED.md](./FEATURES_DEPLOYED.md)** - Timer accéléré + Narrations dramatiques (13 déc 2024)
- **[EXPERIENCE_JEU.md](./EXPERIENCE_JEU.md)** - Améliorations de l'expérience de jeu
- **[MOBILE_PWA.md](./MOBILE_PWA.md)** - Progressive Web App et mobile
- **[NARRATEUR.md](./NARRATEUR.md)** - Système de narration du jeu
- **[AI_BOTS.md](./AI_BOTS.md)** - Bots intelligents avec OpenAI/OpenRouter ⭐ NOUVEAU

### 🔧 Développement
- **[DEVELOPPEMENT.md](./DEVELOPPEMENT.md)** - Guide de développement
- **[CONNECT.md](./CONNECT.md)** - Gestion des connexions
- **[CORRECTIONS.md](./CORRECTIONS.md)** - Historique des corrections

### 🚀 Déploiement
- **[DEPLOIEMENT.md](./DEPLOIEMENT.md)** - Guide de déploiement général
- **[BACKEND_DEPLOIEMENT.md](./BACKEND_DEPLOIEMENT.md)** - Déploiement backend (Railway)
- **[PLAN_VERCEL_SERVERLESS.md](./PLAN_VERCEL_SERVERLESS.md)** - Architecture Vercel serverless
- **[FIXES_DEPLOYED.md](./FIXES_DEPLOYED.md)** - Correctifs déployés

### 🔍 Audits & Analyses
- **[AUDIT_COMPLET.md](./AUDIT_COMPLET.md)** - Audit complet du code
- **[AUDIT_PARTIE_INTROUVABLE.md](./AUDIT_PARTIE_INTROUVABLE.md)** - Analyse problème "partie introuvable"

### 🗄️ Redis & Base de données (Retiré)
- **[REDIS_SETUP.md](./REDIS_SETUP.md)** - Configuration Redis (historique)
- **[REDIS_INTEGRATION.md](./REDIS_INTEGRATION.md)** - Intégration Redis (historique)
- **[REDIS_MIGRATION.md](./REDIS_MIGRATION.md)** - Migration Redis (historique)
- **[MIGRATION_VERCEL_REDIS.md](./MIGRATION_VERCEL_REDIS.md)** - Migration Vercel Redis (historique)
- **[DEPLOY_REDIS.md](./DEPLOY_REDIS.md)** - Déploiement Redis (historique)

> ⚠️ **Note** : Redis a été retiré du projet car il causait des timeouts et des crashes 502. Le jeu utilise maintenant uniquement la mémoire in-memory avec nettoyage automatique.

---

## 🚀 Démarrage Rapide

### Backend (Railway)
```bash
cd backend
node server.js
```

### Frontend (Vercel/Local)
```bash
npm run dev
```

### Variables d'environnement
Voir [DEPLOIEMENT.md](./DEPLOIEMENT.md) pour la liste complète.

---

## 📊 Architecture du Projet

```
loup_garou/
├── backend/          # Serveur Node.js + Socket.io
│   ├── server.js     # Logique de jeu principale
│   └── package.json
├── src/              # Frontend React
│   ├── pages/        # Game, Lobby, Home, Rules
│   ├── components/   # NetworkIndicator, etc.
│   ├── utils/        # audioManager, particles, mobile
│   └── hooks/        # useRipple, useEasterEggs
├── doc/              # 📚 Documentation (vous êtes ici)
└── public/           # Assets statiques
```

---

## 🎯 Dernières Mises à Jour

### 13 Décembre 2024
- ✅ Timer accéléré en finale (15s quand ≤3 joueurs)
- ✅ Narrations dramatiques (5 événements)
- ✅ Bots IA avec OpenAI/OpenRouter (interactions naturelles)

### Précédentes
- ✅ QR codes intelligents avec auto-join
- ✅ Sons de loup à chaque début de nuit
- ✅ Prévention auto-vote
- ✅ Statistiques de partie
- ✅ Système de particules et animations

---

## 🐛 Problèmes Connus

Voir [CORRECTIONS.md](./CORRECTIONS.md) pour l'historique complet des bugs résolus.

---

## 💡 Contribuer

1. Créer une branche feature
2. Développer et tester localement
3. Push et auto-deploy sur Railway + Vercel
4. Documenter dans `/doc`

---

## 📞 Support

- **Issues** : GitHub Issues
- **Questions** : Voir documentation dans `/doc`
