# 🤖 Guide Backend pour Agents IA - MakeMyWay

Ce fichier contient les spécifications techniques du backend Node.js/Express pour les agents IA.

## 🔧 Prérequis Techniques

### Version Node.js
- **Node.js ≥ 18.0.0** (spécifié dans `package.json` engines)
- npm version compatible

### Scripts NPM Disponibles
```bash
npm run dev     # Démarrage en mode développement
npm test        # Exécution des tests (obligatoire avant commit)
npm start       # Démarrage en production
npm run build   # Pas de build requis (retourne message info)
```

## 🌍 Variables d'Environnement

### Variables Obligatoires
Créer un fichier `.env` à la racine du dossier `backend/` avec :

```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/makemyway
JWT_SECRET=your_jwt_secret_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Description des Variables
- **PORT** : Port d'écoute du serveur (défaut: 3001)
- **MONGO_URI** : URI de connexion MongoDB
- **JWT_SECRET** : Clé secrète pour les tokens JWT (authentification)
- **GOOGLE_MAPS_API_KEY** : Clé API Google Maps pour les services backend

### Variables Optionnelles
```env
NODE_ENV=development
FRONTEND_URL=https://your-frontend-domain.com
```

## 🏗️ Architecture Express

### Structure de Base (`server.js`)
```javascript
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import des routes
const authRoutes = require('./routes/auth');
const mapsRoutes = require('./routes/maps');

const app = express();
```

### Configuration CORS
- **Origines autorisées** : localhost, 127.0.0.1, domaines de production
- **Méthodes** : GET, POST, PUT, DELETE, OPTIONS
- **Headers** : Content-Type, Authorization, X-Requested-With
- **Credentials** : Activés pour l'authentification

### Middleware Standards
- `express.json({ limit: '10mb' })` - Parsing JSON
- `express.urlencoded({ extended: true })` - Parsing URL-encoded
- `cors()` - Configuration CORS personnalisée

## 📁 Structure des Routes

### Routes Existantes
- **`/api/auth`** → `routes/auth.js` - Authentification utilisateur
- **`/api/maps`** → `routes/maps.js` - Services cartographiques

### Convention de Routage
```javascript
// routes/[nom].js
const express = require('express');
const router = express.Router();

// Routes définies ici
router.get('/', (req, res) => {
  // Logique du contrôleur
});

module.exports = router;
```

### Intégration dans server.js
```javascript
const [nom]Routes = require('./routes/[nom]');
app.use('/api/[nom]', [nom]Routes);
```

## 🗄️ Modèles de Données

### Structure Mongoose
```javascript
// models/[Model].js
const mongoose = require('mongoose');

const [model]Schema = new mongoose.Schema({
  // Définition du schéma
}, {
  timestamps: true
});

module.exports = mongoose.model('[Model]', [model]Schema);
```

### Modèles Existants
- **User** (`models/User.js`) - Modèle utilisateur pour l'authentification

## ⚠️ Règles Obligatoires

### Tests Obligatoires
```bash
# OBLIGATOIRE avant tout commit modifiant backend/
cd backend && npm test
```

**Important** : Aucune modification dans le dossier `backend/` ne peut être commitée sans avoir exécuté avec succès `npm test`.

### Cohérence Architecturale
Chaque nouveau module backend DOIT :

1. **Respecter l'architecture Express** montrée dans `server.js`
2. **Suivre les conventions de routage** des routes existantes (`auth.js`, `maps.js`)
3. **Utiliser les mêmes middlewares** (CORS, JSON parsing, etc.)
4. **Implémenter une gestion d'erreurs** cohérente
5. **Documenter les endpoints** avec JSDoc

### Convention d'Erreurs
```javascript
// Gestion d'erreurs standard
try {
  // Logique métier
} catch (error) {
  console.error('Erreur [contexte]:', error);
  res.status(500).json({ 
    error: 'Message utilisateur',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}
```

## 🔐 Sécurité

### Authentification JWT
- Utiliser `jsonwebtoken` pour les tokens
- Middleware d'authentification pour les routes protégées
- Validation des tokens dans les headers Authorization

### Validation des Données
- Toujours valider les données d'entrée
- Utiliser Mongoose validators dans les schémas
- Nettoyer les données utilisateur (sanitization)

### Variables Sensibles
- Ne JAMAIS commiter le fichier `.env`
- Utiliser `process.env.*` pour toutes les variables sensibles
- Logs sans informations sensibles

## 🔧 Développement

### Structure de Fichier Type
```javascript
// routes/example.js
const express = require('express');
const router = express.Router();
const ExampleModel = require('../models/Example');

/**
 * @route GET /api/example
 * @desc Description de la route
 * @access Public/Private
 */
router.get('/', async (req, res) => {
  try {
    // Logique
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Erreur exemple:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
```

### Base de Données
- **MongoDB** avec Mongoose ODM
- Schémas avec validation
- Timestamps automatiques (`timestamps: true`)
- Index pour les performances

## 📝 Documentation

### JSDoc Obligatoire
Toutes les routes doivent être documentées :
```javascript
/**
 * @route POST /api/auth/login
 * @desc Authentification utilisateur
 * @access Public
 * @body {string} email - Email utilisateur
 * @body {string} password - Mot de passe
 * @returns {Object} Token JWT et données utilisateur
 */
```

### Logging
```javascript
console.log('✅ [SUCCESS]:', message);
console.warn('⚠️ [WARNING]:', message);
console.error('❌ [ERROR]:', message);
```

---

**Note Importante** : Ce backend est conçu pour supporter le frontend JavaScript modulaire de MakeMyWay. Toute modification doit maintenir la compatibilité avec l'API frontend existante.