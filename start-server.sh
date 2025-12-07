#!/bin/bash

echo "🎮 Démarrage du serveur backend..."
echo ""

cd "$(dirname "$0")"

echo "📂 Dossier actuel: $(pwd)"
echo ""
echo "🚀 Lancement du serveur Node.js..."
echo "   Backend: http://localhost:3000"
echo ""

npm run server
