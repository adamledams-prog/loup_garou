#!/bin/bash

# Script pour synchroniser le server.js depuis le projet d'Adam Jr

echo "🔄 Synchronisation du serveur depuis loup_garou vers loup-garou-react..."

# Copier le serveur
cp ../loup_garou/server.js ./server.js

echo "✅ Server.js synchronisé !"
echo ""
echo "📝 Vérifier les changements :"
git diff server.js
