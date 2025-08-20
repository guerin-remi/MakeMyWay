@echo off
echo ==========================================
echo   Test Connexion MongoDB Atlas
echo ==========================================
echo.
echo 🔍 Test de la connexion à la base de données...
echo.

cd backend
node test-db.js

echo.
echo 📝 Si la connexion échoue encore:
echo 1. Vérifiez que votre IP est autorisée dans MongoDB Atlas
echo 2. Attendez 2-3 minutes après avoir ajouté votre IP
echo 3. Vérifiez username/password
echo.
pause