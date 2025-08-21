# 🤖 Guide pour Agents IA - MakeMyWay

Ce fichier contient les informations essentielles pour les agents IA travaillant sur le projet MakeMyWay.

## 🏗️ Architecture Globale

### Backend (`backend/`)
- **Technologie** : Node.js + Express
- **Structure** :
  - `server.js` - Point d'entrée du serveur
  - `routes/` - Routes API (auth, maps)
  - `models/` - Modèles de données
  - `package.json` - Dépendances Node.js

### Frontend (`assets/js/`)
- **Technologie** : JavaScript ES6+ modulaire
- **Structure** :
  - `main.js` - Point d'entrée principal
  - `config.js` - Configuration centralisée
  - `modules/` - Modules spécialisés (ApiService, MapManager, etc.)
  - `modules/ui/` - Composants d'interface (FormManager, POIManager, etc.)

## 📋 Conventions de Code

### Structure Modulaire
- **Modules ES6** : Utiliser `import`/`export` uniquement
- **Classes** : Une classe par fichier, nommage PascalCase
- **Fonctions** : Nommage camelCase avec documentation JSDoc

### Style de Code
- **Indentation** : 2 espaces (pas de tabulations)
- **Taille des fichiers** : Maximum 300 lignes par fichier
- **Longueur des lignes** : Maximum 100 caractères
- **Point-virgules** : Obligatoires à la fin des instructions

### Commentaires
- Documentation JSDoc pour toutes les méthodes publiques
- Commentaires en français pour la logique métier
- Éviter les commentaires évidents

## ⚡ Commandes Pré-Commit

### Tests Backend
```bash
cd backend && npm test
```

### Linting Frontend
```bash
npm run lint
```

### Vérification Complète
```bash
# 1. Tests backend
cd backend && npm test

# 2. Retour à la racine et lint frontend
cd .. && npm run lint

# 3. Vérifier que tout compile
# (Tester l'application manuellement si nécessaire)
```

## 🌳 Gestion Git

### Bonnes Pratiques
- **Commits atomiques** : Un commit = une fonctionnalité/correction
- **Messages clairs** : Format `type: description courte`
  - `feat:` nouvelle fonctionnalité
  - `fix:` correction de bug  
  - `refactor:` refactorisation sans changement fonctionnel
  - `docs:` mise à jour documentation
  - `style:` corrections de style/format

### Arbre Git Propre
- Éviter les commits "WIP" ou temporaires
- Utiliser `git rebase -i` pour nettoyer l'historique si nécessaire
- Tester avant chaque push
- Ne jamais commiter de fichiers de debug ou temporaires

### Exemple de Messages de Commit
```
feat: ajouter autocomplétion Google Places pour les adresses
fix: corriger erreur de géolocalisation sur mobile
refactor: extraire POIManager de UIManager pour modularité
docs: mettre à jour README avec nouvelles APIs
```

## 🔧 Structure des Modules Frontend

### Services de Base
- **ApiService** : Gestion des APIs externes (Google Maps, OSRM)
- **MapManager** : Gestion de la carte Google Maps
- **RouteGenerator** : Génération intelligente de parcours

### Interface Utilisateur
- **UIManager** : Orchestrateur principal de l'UI
- **FormManager** : Gestion des formulaires et autocomplétion
- **POIManager** : Gestion des points d'intérêt
- **PanelManager** : Gestion des panneaux flottants
- **ResultsManager** : Affichage des résultats

## 🚀 Points d'Attention

### Performance
- Éviter les requêtes API inutiles (utiliser le cache)
- Optimiser les gros fichiers (> 200 lignes)
- Minimiser les dépendances

### Sécurité
- Ne jamais exposer les clés API côté client
- Valider toutes les entrées utilisateur
- Utiliser HTTPS pour toutes les communications

### Maintenance
- Respecter les principes SOLID
- Séparer la logique métier de l'interface
- Documenter les choix architecturaux importants

## 🔍 Debug et Développement

### Outils Disponibles
- Dossier `debug/` contient les outils de développement
- Scripts de démarrage automatisés (`start-*.bat`)
- Interfaces de test des APIs (`debug-api.html`)

### Logging
- Utiliser `console.log` avec emojis pour les étapes importantes
- `console.warn` pour les avertissements
- `console.error` pour les erreurs avec context

---

**Note** : Ce guide est maintenu à jour avec l'évolution du projet. Se référer toujours à la dernière version avant de commencer le travail.