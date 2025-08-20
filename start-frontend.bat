@echo off
echo ==========================================
echo   MakeMyWay - Demarrage Frontend
echo ==========================================
echo.

echo 🌐 Ouverture du frontend dans le navigateur...
echo 📍 URL: file:///%~dp0index.html
echo.
echo Alternative: Utiliser un serveur local comme:
echo - Live Server (VS Code extension)
echo - http-server: npm install -g http-server puis http-server
echo - python -m http.server 8000
echo.

start "" index.html

pause