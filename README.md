# MakeMyWay

## 📋 Description

**MakeMyWay** est une application web moderne de génération de parcours sportifs personnalisés. Elle permet aux utilisateurs de créer des itinéraires intelligents pour la marche, la course à pied et le vélo, avec des fonctionnalités avancées comme l'intégration de points d'intérêt et l'optimisation automatique des distances.

## ✨ Fonctionnalités

### 🗺️ Génération de Parcours
- **Parcours en boucle** : Retour automatique au point de départ
- **Parcours point à point** : Itinéraires personnalisés entre deux points
- **Optimisation intelligente** : Algorithmes avancés pour respecter la distance cible
- **Multi-modal** : Support pour marche, course à pied et vélo

### 🎯 Points d'Intérêt (POI)
- **Catégories prédéfinies** : Nature, Culture, Sport, Panorama, Points d'eau, Shopping
- **POI personnalisés** : Ajout de lieux spécifiques via recherche
- **Intégration automatique** : Incorporation des POI dans les parcours générés

### 🌐 Interface Moderne
- **Design responsive** : Optimisé pour mobile et desktop
- **Interface plein écran** : Carte interactive avec panneaux flottants
- **Glassmorphisme** : Effets visuels modernes avec transparence et flou
- **Autocomplétion** : Suggestions intelligentes pour adresses et POI

### 📊 Fonctionnalités Avancées
- **Export GPX** : Sauvegarde des parcours pour GPS et applications tierces
- **Cache intelligent** : Optimisation des performances avec mise en cache des requêtes
- **Géolocalisation** : Utilisation de la position actuelle de l'utilisateur
- **Progressive Web App (PWA)** : Installation sur mobile et bureau

## 🏗️ Architecture

### Structure Modulaire

Le projet suit une architecture modulaire moderne avec séparation claire des responsabilités :

```
/
├── README.md                    # Documentation du projet
├── index.html                   # Point d'entrée HTML
├── manifest.json               # Configuration PWA
├── favicon.svg                 # Icône de l'application
└── assets/
    ├── css/                    # Styles CSS modulaires
    │   ├── main.css           # Styles globaux et variables
    │   └── components/        # Styles par composant
    │       ├── panel.css      # Panneaux flottants et contrôles
    │       ├── map.css        # Carte et marqueurs
    │       └── results.css    # Panneaux de résultats
    └── js/                    # JavaScript modulaire
        ├── main.js            # Point d'entrée principal
        ├── config.js          # Configuration centralisée
        └── modules/           # Modules spécialisés
            ├── ApiService.js      # Gestion des APIs externes
            ├── MapManager.js      # Gestion de la carte Leaflet
            ├── UIManager.js       # Gestion de l'interface utilisateur
            └── RouteGenerator.js  # Génération de parcours
```

### Modules Principaux

#### 🔧 ApiService
- Gestion des appels aux APIs OSRM et Nominatim
- Cache intelligent pour optimiser les performances
- Géocodage et géocodage inversé
- Recherche de POI par catégorie

#### 🗺️ MapManager
- Initialisation et gestion de la carte Leaflet
- Gestion des marqueurs interactifs (drag & drop)
- Affichage des parcours avec couleurs par mode
- Contrôles de carte personnalisés

#### 🛣️ RouteGenerator
- Algorithmes de génération de parcours intelligents
- Optimisation pour respecter les distances cibles
- Génération de boucles et parcours point à point
- Intégration des POI dans les itinéraires

#### 🎨 UIManager
- Gestion de tous les éléments de l'interface
- Autocomplétion pour adresses et POI
- Gestion des événements utilisateur
- Interface responsive avec support tactile

#### ⚙️ Configuration
- Centralisation de toutes les constantes
- URLs d'API et paramètres par défaut
- Limites et tolérances par mode de transport
- Messages et textes de l'interface

## 🚀 Installation et Lancement

### Prérequis
- Un serveur web (local ou distant)
- Navigateur moderne supportant les modules ES6
- Connexion internet pour les APIs de cartographie

### Lancement Local

1. **Cloner le projet** :
   ```bash
   git clone [url-du-repository]
   cd MakeMyWay
   ```

2. **Serveur local** :
   ```bash
   # Avec Python
   python -m http.server 8000
   
   # Avec Node.js
   npx http-server
   
   # Avec PHP
   php -S localhost:8000
   ```

3. **Accéder à l'application** :
   Ouvrir `http://localhost:8000` dans le navigateur

### Déploiement GitHub Pages

Le projet est optimisé pour GitHub Pages :
- Pousser les fichiers sur la branche `main`
- Activer GitHub Pages dans les paramètres du repository
- L'application sera accessible via `https://username.github.io/repository-name`

## 🎮 Utilisation

### Configuration d'un Parcours

1. **Définir le point de départ** :
   - Cliquer sur la carte OU
   - Saisir une adresse dans le champ "Point de départ" OU
   - Utiliser le bouton de géolocalisation

2. **Choisir le mode de transport** :
   - 🚶 **Marche** : 1-15 km, vitesse 4.5 km/h
   - 🏃 **Course** : 1-30 km, vitesse 8.5 km/h
   - 🚴 **Vélo** : 2-80 km, vitesse 18 km/h

3. **Définir la distance cible** :
   - Utiliser le slider pour choisir la distance
   - Les limites s'adaptent automatiquement au mode choisi

4. **Ajouter des POI (optionnel)** :
   - Sélectionner des catégories prédéfinies OU
   - Ajouter des lieux personnalisés

5. **Générer le parcours** :
   - Cliquer sur "Générer le parcours"
   - Visualiser le résultat sur la carte
   - Consulter les statistiques (distance, durée, écart)

### Options Avancées

- **Parcours en boucle** : Activer "Retour automatique au départ"
- **Point d'arrivée personnalisé** : Définir un point d'arrivée différent
- **Export GPX** : Sauvegarder le parcours pour applications GPS
- **Réinitialisation** : Bouton reset pour recommencer

## 🔧 Configuration Technique

### APIs Utilisées

- **OSRM** (Open Source Routing Machine) : Calcul d'itinéraires
- **Nominatim** : Géocodage et recherche d'adresses/POI
- **OpenStreetMap** : Données cartographiques

### Personnalisation

Le fichier `assets/js/config.js` permet de personnaliser :
- URLs des APIs
- Vitesses moyennes par mode de transport
- Limites de distance
- Paramètres d'optimisation
- Messages d'interface

### Performance

- **Cache intelligent** : Réduction des appels API redondants
- **Traitement par batch** : Optimisation des requêtes multiples
- **Délais adaptatifs** : Respect des limites des APIs
- **Nettoyage automatique** : Gestion de la mémoire

## 🛠️ Développement

### Structure du Code

L'architecture suit les principes SOLID avec :
- **Séparation des responsabilités** : Chaque module a un rôle spécifique
- **Inversion de dépendances** : Les modules communiquent via des interfaces
- **Extensibilité** : Ajout facile de nouvelles fonctionnalités
- **Testabilité** : Code modulaire facilement testable

### Ajout de Fonctionnalités

Pour ajouter une nouvelle fonctionnalité :

1. **Modifier la configuration** : Ajouter les constantes dans `config.js`
2. **Étendre le bon module** : Ajouter les méthodes nécessaires
3. **Mettre à jour l'interface** : Modifier `UIManager.js` si nécessaire
4. **Tester** : Vérifier le fonctionnement sur mobile et desktop

### Debugging

- Ouvrir les DevTools (F12)
- Consulter la console pour les logs détaillés
- Utiliser `window.makeMyWayApp.getState()` pour inspecter l'état
- Vérifier `window.makeMyWayApp.modules.apiService.getCacheStats()` pour le cache

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Remerciements

- **OpenStreetMap** pour les données cartographiques ouvertes
- **OSRM** pour l'API de routage performante
- **Leaflet** pour la bibliothèque de cartographie
- **Font Awesome** pour les icônes
- **Inter Font** pour la typographie moderne

## 📞 Support

Pour obtenir de l'aide ou signaler un bug :
- Ouvrir une issue sur GitHub
- Consulter la documentation dans le code
- Vérifier la console pour les messages d'erreur

---

**MakeMyWay v2.0.0** - Générateur de parcours sportifs intelligent 🏃‍♀️🚴‍♂️🚶‍♀️