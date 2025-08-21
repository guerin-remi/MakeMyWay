# 🤖 Guide Frontend JavaScript pour Agents IA - MakeMyWay

Ce fichier définit l'architecture et les conventions pour le code JavaScript frontend de MakeMyWay.

## 📁 Structure des Modules

### Organisation par Responsabilités

```
assets/js/
├── main.js                    # Point d'entrée principal (orchestrateur)
├── config.js                  # Configuration centralisée (constantes globales)
└── modules/                   # Modules spécialisés
    ├── ApiService.js          # Gestion APIs externes (Google Maps, OSRM) [541 lignes]
    ├── AuthService.js         # Service d'authentification [304 lignes]  
    ├── AuthUI.js              # Interface d'authentification [424 lignes]
    ├── MapManager.js          # Gestionnaire carte Google Maps [648 lignes] ⚠️
    ├── RouteGenerator.js      # Génération de parcours [511 lignes] ⚠️
    ├── UIManager.js           # Orchestrateur interface utilisateur [639 lignes] ⚠️
    └── ui/                    # Composants d'interface spécialisés
        ├── FormManager.js     # Gestion formulaires et autocomplétion [493 lignes] ⚠️
        ├── POIManager.js      # Gestion points d'intérêt [222 lignes]
        ├── PanelManager.js    # Gestion panneaux flottants [158 lignes]
        └── ResultsManager.js  # Affichage résultats [87 lignes]
```

### Responsabilités par Module

#### Services de Base
- **`ApiService.js`** - Communication avec APIs externes, cache, géocodage
- **`AuthService.js`** - Authentification JWT, gestion session utilisateur  
- **`MapManager.js`** - Carte Google Maps, marqueurs, interactions cartographiques
- **`RouteGenerator.js`** - Algorithmes de génération de parcours intelligents

#### Interface Utilisateur
- **`UIManager.js`** - Orchestrateur principal, coordination entre modules
- **`AuthUI.js`** - Composants d'authentification (login, register)

#### Composants UI Spécialisés (`ui/`)
- **`FormManager.js`** - Formulaires, autocomplétion Google Places
- **`POIManager.js`** - Points d'intérêt, catégories, recherche
- **`PanelManager.js`** - Panneaux flottants, gestes tactiles
- **`ResultsManager.js`** - Affichage statistiques de parcours

## ⚠️ Règle de Taille des Fichiers

### Limite de ~300 lignes
**OBLIGATOIRE** : Si un fichier dépasse ~300 lignes, créer des sous-modules.

#### Fichiers Actuellement Problématiques
- `MapManager.js` (648 lignes) - À diviser en sous-modules
- `UIManager.js` (639 lignes) - Partiellement refactorisé, continuer
- `ApiService.js` (541 lignes) - À diviser par service (Google, OSRM)
- `RouteGenerator.js` (511 lignes) - À diviser par algorithme
- `FormManager.js` (493 lignes) - À diviser par responsabilité

### Stratégie de Division
```javascript
// Au lieu de gros fichiers monolithiques :
modules/
├── MapManager.js              # [648 lignes] ❌
└── RouteGenerator.js          # [511 lignes] ❌

// Créer des sous-modules :
modules/
├── map/
│   ├── MapManager.js          # Orchestrateur [<300 lignes]
│   ├── MarkerManager.js       # Gestion marqueurs [<300 lignes]
│   └── MapRenderer.js         # Rendu carte [<300 lignes]
└── routing/
    ├── RouteGenerator.js      # Orchestrateur [<300 lignes]
    ├── RouteAlgorithms.js     # Algorithmes [<300 lignes]
    └── RouteOptimizer.js      # Optimisation [<300 lignes]
```

## 📦 Conventions ES Modules

### Import/Export Standards
```javascript
// ✅ Imports corrects
import { CONFIG } from '../config.js';
import { ApiService } from './ApiService.js';
import { MapManager } from './MapManager.js';

// ✅ Export de classe
export class MyModule {
  constructor() {
    // Initialisation
  }
}

// ✅ Export de constantes/fonctions
export const CONSTANT_VALUE = 'value';
export function utilityFunction() {
  // Logique
}

// ❌ Éviter les imports CommonJS
const module = require('./module'); // Ne pas utiliser

// ❌ Éviter les exports par défaut multiples
export default class MyClass {}
export const OTHER_EXPORT = 'value'; // Confusing
```

### Structure de Module Type
```javascript
// modules/ExampleModule.js
import { CONFIG, ConfigUtils } from '../config.js';
import { ApiService } from './ApiService.js';

/**
 * Description du module
 * Responsabilité spécifique
 */
export class ExampleModule {
  constructor(dependencies) {
    // Injection de dépendances
    this.apiService = dependencies.apiService;
    this.config = CONFIG.EXAMPLE;
  }

  /**
   * Méthode publique documentée
   * @param {Object} params - Paramètres
   * @returns {Promise<Object>} Résultat
   */
  async publicMethod(params) {
    try {
      // Logique métier
      return this._processData(params);
    } catch (error) {
      console.error('Erreur ExampleModule:', error);
      throw error;
    }
  }

  /**
   * Méthode privée (préfixe _)
   */
  _processData(data) {
    // Implémentation
  }
}
```

## ⚙️ Configuration Centralisée

### Usage du CONFIG
```javascript
// config.js - Source de vérité pour toutes les constantes
export const CONFIG = {
  MAP: {
    DEFAULT_CENTER: [48.8566, 2.3522],
    DEFAULT_ZOOM: 12,
    MIN_ZOOM: 5,
    MAX_ZOOM: 19
  },
  API: {
    TIMEOUT: 5000,
    RETRY_COUNT: 3
  },
  UI: {
    BREAKPOINTS: {
      MOBILE: 768,
      TABLET: 1024
    },
    ANIMATION_DURATION: 300
  }
};

// Utilisation dans les modules
import { CONFIG } from '../config.js';

class MapManager {
  constructor() {
    this.defaultZoom = CONFIG.MAP.DEFAULT_ZOOM; // ✅
    this.breakpoint = CONFIG.UI.BREAKPOINTS.MOBILE; // ✅
    
    // ❌ Éviter les constantes hardcodées
    this.zoom = 12; // Non, utiliser CONFIG.MAP.DEFAULT_ZOOM
  }
}
```

### Règles CONFIG
1. **Toutes les constantes** dans `config.js`
2. **Pas de valeurs hardcodées** dans les modules
3. **Import systématique** : `import { CONFIG } from '../config.js'`
4. **Pas de duplication** de valeurs entre modules

## ⚡ Règle Obligatoire : Linting

### Command Obligatoire
```bash
# OBLIGATOIRE avant tout commit modifiant assets/js/
npm run lint
```

**Important** : Aucune modification dans `assets/js/` ne peut être commitée sans avoir exécuté avec succès `npm run lint`.

### Standards de Code
- **Indentation** : 2 espaces
- **Point-virgules** : Obligatoires
- **Quotes** : Simple quotes `'string'`
- **Longueur de ligne** : Maximum 100 caractères
- **Naming** : camelCase pour variables/fonctions, PascalCase pour classes

## 🏗️ Architecture Modulaire

### Principe de Responsabilité Unique
Chaque module doit avoir **une seule responsabilité** :

```javascript
// ✅ Responsabilité claire
class POIManager {
  // Uniquement gestion des POI
  addPOI() {}
  removePOI() {}
  searchPOI() {}
}

// ❌ Responsabilités multiples  
class MegaManager {
  // Gestion POI + Carte + Authentification + UI
  addPOI() {}
  initMap() {}
  login() {}
  updateUI() {}
}
```

### Injection de Dépendances
```javascript
// ✅ Dépendances injectées
class UIManager {
  constructor(apiService, mapManager, routeGenerator) {
    this.apiService = apiService;
    this.mapManager = mapManager;
    this.routeGenerator = routeGenerator;
  }
}

// ❌ Dépendances hardcodées
class BadUIManager {
  constructor() {
    this.apiService = new ApiService(); // Couplage fort
  }
}
```

### Communication Inter-Modules
```javascript
// ✅ Via l'orchestrateur (UIManager)
class UIManager {
  async generateRoute() {
    const routeData = await this.routeGenerator.generate();
    this.mapManager.displayRoute(routeData);
    this.resultsManager.showResults(routeData);
  }
}

// ❌ Communication directe entre modules
class RouteGenerator {
  async generate() {
    // ...
    mapManager.displayRoute(route); // Éviter
  }
}
```

## 🔧 Bonnes Pratiques

### Gestion d'Erreurs
```javascript
// ✅ Gestion structurée
async method() {
  try {
    const result = await this.apiService.call();
    return this._processResult(result);
  } catch (error) {
    console.error('Erreur Module:', error);
    throw new Error(`Erreur spécifique: ${error.message}`);
  }
}
```

### Documentation JSDoc
```javascript
/**
 * Génère un parcours optimisé
 * @param {Object} startPoint - Point de départ {lat, lng}
 * @param {number} targetDistance - Distance cible en km
 * @param {string} mode - Mode de transport ('walking', 'running', 'cycling')
 * @param {Object} options - Options additionnelles
 * @param {Object} [options.endPoint] - Point d'arrivée optionnel
 * @param {boolean} [options.returnToStart=false] - Retour au départ
 * @param {Array} [options.pois=[]] - Points d'intérêt à intégrer
 * @returns {Promise<Object>} Données du parcours généré
 * @throws {Error} Si les paramètres sont invalides
 */
async generateRoute(startPoint, targetDistance, mode, options = {}) {
  // Implémentation
}
```

### Performance
```javascript
// ✅ Lazy loading des modules lourds
async loadHeavyModule() {
  if (!this.heavyModule) {
    const { HeavyModule } = await import('./heavy/HeavyModule.js');
    this.heavyModule = new HeavyModule();
  }
  return this.heavyModule;
}

// ✅ Éviter les fuites mémoire
destructor() {
  // Nettoyer les event listeners
  this.element.removeEventListener('click', this.handler);
  
  // Nettoyer les timers
  if (this.timer) clearTimeout(this.timer);
  
  // Nettoyer les références
  this.dependencies = null;
}
```

## 🚫 Anti-Patterns à Éviter

### Fichiers Monolithiques
```javascript
// ❌ Fichier de 800+ lignes avec tout
class MegaManager {
  // 100 méthodes différentes
  // Gestion de tout l'applicatif
}

// ✅ Modules spécialisés <300 lignes
class SpecializedManager {
  // 5-10 méthodes cohérentes
  // Une responsabilité claire
}
```

### Variables Globales
```javascript
// ❌ Variables globales
window.globalData = {};
let sharedState = {};

// ✅ État dans les modules ou CONFIG
import { CONFIG } from '../config.js';
class StateManager {
  constructor() {
    this.state = CONFIG.INITIAL_STATE;
  }
}
```

---

**Note** : Cette architecture modulaire garantit la maintenabilité, la testabilité et la scalabilité du frontend MakeMyWay. Tout écart à ces conventions doit être justifié et documenté.