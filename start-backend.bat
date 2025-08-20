@echo off
echo ==========================================
echo   MakeMyWay - Demarrage Backend API
echo ==========================================
echo.

cd backend
echo 📦 Verification des dependances...
if not exist node_modules (
    echo Installation des dependances...
    npm install
)

echo.
echo 🚀 Demarrage du serveur sur le port 3001...
echo 📍 API disponible sur: http://localhost:3001/api
echo 🔍 Test: http://localhost:3001/api/health
echo.
echo ⏹️  Pour arreter: Ctrl+C
echo.

npm run dev