# MakeMyWay Backend API

Backend Node.js/Express pour l'application MakeMyWay avec authentification utilisateur et proxy Google Maps.

## 🚀 Fonctionnalités

- **Authentification JWT** : Inscription, connexion et vérification des utilisateurs
- **Base de données MongoDB** : Gestion des utilisateurs avec Mongoose
- **Proxy Google Maps** : Sécurisation des appels à l'API Google Directions
- **Validation des données** : Sécurité et validation complètes
- **CORS configuré** : Compatible avec le frontend

## 📁 Structure

```
backend/
├── models/
│   └── User.js              # Modèle utilisateur Mongoose
├── routes/
│   ├── auth.js              # Routes d'authentification
│   └── maps.js              # Proxy Google Maps
├── .env                     # Variables d'environnement (non commité)
├── .env.example             # Exemple de configuration
├── server.js                # Serveur Express principal
└── package.json
```

## ⚙️ Installation

1. **Installer les dépendances**
```bash
cd backend
npm install
```

2. **Configuration**
```bash
cp .env.example .env
# Éditer .env avec vos vraies valeurs
```

3. **Variables d'environnement**
- `MONGO_URI` : URI de connexion MongoDB Atlas
- `JWT_SECRET` : Clé secrète pour les tokens JWT
- `MAPS_API_KEY` : Clé API Google Maps
- `PORT` : Port du serveur (défaut: 3001)

## 🎯 Démarrage

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

Le serveur démarre sur `http://localhost:3001`

## 📡 API Endpoints

### Authentification

**POST** `/api/auth/register`
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "motdepasse123"
}
```

**POST** `/api/auth/login`
```json
{
  "email": "john@example.com",
  "password": "motdepasse123"
}
```

**GET** `/api/auth/verify`
```
Headers: Authorization: Bearer <token>
```

### Google Maps Proxy

**POST** `/api/maps/directions`
```json
{
  "points": [
    {"lat": 48.8566, "lng": 2.3522},
    {"lat": 48.8606, "lng": 2.3376}
  ],
  "mode": "walking"
}
```

### Test

**GET** `/api/health` - Vérification du statut du serveur

## 🔐 Sécurité

- Mots de passe hashés avec bcryptjs
- Tokens JWT avec expiration
- Validation des entrées
- Protection CORS
- Variables sensibles dans .env

## 🗄️ Base de données

Le modèle User contient :
- `name` : Nom de l'utilisateur
- `email` : Email unique
- `password` : Mot de passe hashé
- `timestamps` : Dates de création/modification

## 🔧 Développement

Pour tester l'API :
```bash
# Test de santé
curl http://localhost:3001/api/health

# Test inscription
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"password123"}'
```

## 🚀 Déploiement

1. Configurer MongoDB Atlas
2. Définir les variables d'environnement
3. Déployer sur votre plateforme (Heroku, Railway, etc.)

---

Développé pour **MakeMyWay** - Générateur de parcours sportifs