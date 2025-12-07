#!/bin/bash

echo "🐺 Installation Loup-Garou..."
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    echo "Installez Node.js depuis https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) détecté${NC}"
echo ""

# Installer les dépendances frontend
echo "📦 Installation des dépendances frontend..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend installé${NC}"
else
    echo -e "${RED}❌ Erreur installation frontend${NC}"
    exit 1
fi
echo ""

# Installer les dépendances backend
echo "📦 Installation des dépendances backend..."
cd backend
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend installé${NC}"
else
    echo -e "${RED}❌ Erreur installation backend${NC}"
    exit 1
fi
cd ..
echo ""

# Créer .env si n'existe pas
if [ ! -f .env ]; then
    echo "📝 Création du fichier .env..."
    cp .env.example .env
    echo -e "${GREEN}✅ .env créé${NC}"
else
    echo -e "${YELLOW}⚠️  .env existe déjà${NC}"
fi

# Créer backend/.env si n'existe pas
if [ ! -f backend/.env ]; then
    echo "📝 Création du fichier backend/.env..."
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✅ backend/.env créé${NC}"
else
    echo -e "${YELLOW}⚠️  backend/.env existe déjà${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Installation terminée !${NC}"
echo ""
echo "Pour lancer le projet :"
echo -e "${YELLOW}Terminal 1:${NC} npm run server"
echo -e "${YELLOW}Terminal 2:${NC} npm run dev"
echo ""
echo "Puis ouvrez http://localhost:5173"
echo ""
echo "📚 Consultez README.md pour plus d'infos"
