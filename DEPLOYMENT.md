# Guide de déploiement MakeMyWay

## 🌐 Architecture de déploiement recommandée

### Frontend (GitHub Pages)
- **URL** : `https://votre-username.github.io/MakeMyWay/`
- **Contenu** : HTML, CSS, JS, assets
- **Gratuit** et automatique via GitHub

### Backend (Railway/Render)
- **URL** : `https://makemyway-api.railway.app/`
- **Contenu** : API Node.js + MongoDB
- **Gratuit** avec limitations

## 🚀 Étapes de déploiement

### 1. Déployer le backend

#### Option A : Railway (recommandé)
```bash
1. Aller sur railway.app
2. Se connecter avec GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Sélectionner votre repo MakeMyWay
5. Définir le Root Directory: /backend
6. Ajouter les variables d'environnement :
   - MONGO_URI=votre_uri_mongodb
   - JWT_SECRET=votre_secret
   - MAPS_API_KEY=votre_cle_google
   - PORT=3001
```

#### Option B : Render
```bash
1. Aller sur render.com
2. "New" → "Web Service"
3. Connecter GitHub repo
4. Settings :
   - Root Directory: backend
   - Build Command: npm install
   - Start Command: npm start
5. Environment Variables : (mêmes que Railway)
```

### 2. Configurer le frontend pour la production

#### Modifier AuthService.js
```javascript
// Remplacer
this.baseURL = 'http://localhost:3001/api/auth';

// Par
this.baseURL = 'https://makemyway-api.railway.app/api/auth';
```

#### Activer CORS sur le backend
Le CORS est déjà configuré dans server.js pour accepter GitHub Pages.

### 3. Déployer sur GitHub Pages

#### Méthode automatique
```bash
1. Push le code sur GitHub
2. Repo Settings → Pages
3. Source: Deploy from a branch
4. Branch: main
5. Folder: / (root)
```

#### Structure finale
```
GitHub Pages:  https://username.github.io/MakeMyWay/
Backend API:   https://makemyway-api.railway.app/
MongoDB:       Hébergé sur Atlas
```

## 🔧 Configuration production

### Variables d'environnement backend
```env
# Production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/makemyway
JWT_SECRET=super_secret_production_key_très_complexe
MAPS_API_KEY=AIzaSyBcwdJoblZLraZRdEndCxe35RhtlQaY8gQ
PORT=3001
NODE_ENV=production
```

### CORS production (server.js)
```javascript
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:5500',
        'https://username.github.io'  // Votre GitHub Pages
    ],
    credentials: true
}));
```

## 💰 Coûts estimés

| Service | Plan gratuit | Limites |
|---------|--------------|---------|
| GitHub Pages | Gratuit | 1GB stockage, 100GB bande passante |
| Railway | Gratuit | 500h/mois, sleep après inactivité |
| MongoDB Atlas | Gratuit | 512MB stockage |
| Google Maps | Gratuit | 28,000 requêtes/mois |

**Total : GRATUIT** pour un usage modéré !

## ⚡ Alternative : Firebase (Full gratuit)

### Si vous préférez tout gratuit sans limitations
```bash
1. Remplacer le backend Node.js par Firebase
2. Auth: Firebase Auth
3. DB: Firebase Firestore
4. Maps: Direct Google Maps API
5. Hosting: Firebase Hosting (ou GitHub Pages)
```

## 🔍 Test de déploiement

### URLs de test
- Frontend: `https://username.github.io/MakeMyWay/`
- Backend health: `https://makemyway-api.railway.app/api/health`
- Test auth: `https://makemyway-api.railway.app/api/auth/verify`

### Checklist pré-déploiement
- [ ] MongoDB URI configurée
- [ ] CORS mis à jour avec l'URL GitHub Pages
- [ ] AuthService.js pointe vers l'API production
- [ ] Variables d'environnement backend définies
- [ ] Test local frontend + backend distant

---

**🎯 Résumé** : Séparer frontend (GitHub Pages) + backend (Railway) = Solution gratuite et fonctionnelle !