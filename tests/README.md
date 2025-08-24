# Tests automatisés - MakeMyWay

## Structure des tests

```
tests/
├── setup.js              # Configuration globale (mocks Google Maps, localStorage, etc.)
├── modules/
│   ├── ApiService.test.js       # Tests du service API
│   └── RouteGenerator.test.js   # Tests du générateur de parcours
└── README.md
```

## Commandes disponibles

```bash
# Lancer tous les tests
npm test

# Mode watch (relance automatique)
npm run test:watch

# Avec couverture de code
npm run test:coverage

# Interface utilisateur Vitest
npm run test:ui
```

## Écriture de nouveaux tests

### Structure d'un test

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import MonModule from '../../assets/js/modules/MonModule.js';

describe('MonModule', () => {
  let module;

  beforeEach(() => {
    // Initialisation avant chaque test
    vi.clearAllMocks();
    module = new MonModule();
  });

  describe('maFonction', () => {
    it('devrait faire quelque chose', () => {
      const result = module.maFonction();
      expect(result).toBe('valeur attendue');
    });
  });
});
```

### Mocks disponibles

Le fichier `setup.js` configure automatiquement :
- **Google Maps API** : Tous les services (Maps, Directions, Places, Geocoder)
- **localStorage** : Stockage local mocké
- **fetch** : Requêtes HTTP mockées
- **navigator.geolocation** : Géolocalisation mockée

### Bonnes pratiques

1. **Un fichier de test par module** : `NomModule.test.js`
2. **Tests isolés** : Chaque test doit être indépendant
3. **Mocks réinitialisés** : Utiliser `beforeEach` avec `vi.clearAllMocks()`
4. **Noms descriptifs** : Décrire clairement ce qui est testé
5. **AAA Pattern** : Arrange, Act, Assert

## Couverture de code

Après `npm run test:coverage`, consultez :
- **Terminal** : Résumé de la couverture
- **coverage/index.html** : Rapport détaillé HTML

## Modules testés

### ApiService
- ✅ Calcul d'itinéraires
- ✅ Recherche de lieux
- ✅ Géocodage d'adresses
- ✅ Gestion du cache
- ✅ Gestion des erreurs

### RouteGenerator
- ✅ Génération de parcours simples
- ✅ Intégration de POIs
- ✅ Respect de la distance cible
- ✅ Optimisation des waypoints
- ✅ Parcours aller-retour
- ✅ Validation des paramètres

## Prochains modules à tester

- [ ] MapManager
- [ ] UIManager
- [ ] AuthService
- [ ] FloatingSearchManager
- [ ] FormManager

## Debugging des tests

Si un test échoue :
1. Lancer en mode watch : `npm run test:watch`
2. Ajouter `console.log` dans le test
3. Utiliser `it.only()` pour isoler un test
4. Vérifier les mocks avec `expect(mock).toHaveBeenCalledWith(...)`