@echo off
echo ==========================================
echo   MakeMyWay - Lancement Complet
echo ==========================================
echo.

echo 🚀 Demarrage du backend...
start "Backend API" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak > nul

echo 🌐 Demarrage du frontend...
start "Frontend" cmd /k "python -m http.server 8000"

timeout /t 2 /nobreak > nul

echo 📱 Ouverture dans le navigateur...
start "" http://localhost:8000

echo.
echo ✅ MakeMyWay est maintenant accessible sur:
echo 🌐 Frontend: http://localhost:8000
echo 🔧 Backend:  http://localhost:3001/api
echo.
echo ⏹️  Pour arreter: Fermer les fenetres de terminal
pause