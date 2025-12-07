#!/bin/bash

echo "🐺 Démarrage de Loup-Garou React..."
echo ""

cd "$(dirname "$0")"

echo "📂 Dossier actuel: $(pwd)"
echo ""
echo "🚀 Lancement du serveur de développement..."
echo "   Frontend: http://localhost:5173"
echo ""

npm run dev
