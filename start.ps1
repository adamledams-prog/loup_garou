# Script de démarrage du jeu Loup-Garou Online
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   LOUP-GAROU ONLINE - DEMARRAGE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Demarrage du serveur..." -ForegroundColor Yellow
Write-Host ""

# Ouvrir le navigateur après 2 secondes
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

# Démarrer le serveur
npm start
