/**
 * MakeMyWay - Point d'entrée principal de l'application
 * Architecture modulaire avec séparation des responsabilités
 */

import { CONFIG } from './config.js';
import { ApiService } from './modules/ApiService.js';
import { MapManager } from './modules/MapManager.js';
import { RouteGenerator } from './modules/RouteGenerator.js';
import { UIManager } from './modules/UIManager.js';
import { FloatingSearchManager } from './modules/FloatingSearchManager.js';
import { CityMapperBottomSheet } from './modules/CityMapperBottomSheet.js';
import { AuthUI } from './modules/AuthUI.js';

/**
 * Classe principale de l'application MakeMyWay
 * Orchestre tous les modules et gère le cycle de vie de l'application
 */
class MakeMyWayApp {
    constructor() {
        this.version = '2.0.0';
        this.modules = {};
        this.isInitialized = false;
        this.initializationPromise = null;
    }

    /**
     * Initialise l'application complète
     * @returns {Promise<void>}
     */
    async init() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }

    /**
     * Effectue l'initialisation complète
     * @private
     */
    async _performInitialization() {
        console.log(`🚀 Initialisation de MakeMyWay v${this.version}...`);
        
        try {
            // Vérification des prérequis
            this._checkPrerequisites();
            
            // 1. Initialiser les services de base
            await this._initializeServices();
            
            // 2. Initialiser la carte
            await this._initializeMap();
            
            // 3. Initialiser le générateur de parcours
            this._initializeRouteGenerator();
            
            // 4. Initialiser l'authentification
            await this._initializeAuth();
            
            // 5. Initialiser l'interface utilisateur
            await this._initializeUI();
            
            // 6. Connecter les modules
            this._connectModules();
            
            // 7. Configuration finale
            this._finalizeSetup();
            
            this.isInitialized = true;
            console.log(`✅ MakeMyWay v${this.version} initialisé avec succès`);
            
            // Rendre l'app accessible globalement pour compatibilité
            window.makeMyWayApp = this;
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this._handleInitializationError(error);
            throw error;
        }
    }

    /**
     * Vérifie que tous les prérequis sont disponibles
     * @private
     */
    _checkPrerequisites() {
        console.log('🔍 Vérification des prérequis...');
        
        // Vérifier Google Maps (sera chargé dynamiquement)
        // Les APIs Google Maps seront vérifiées lors de l'initialisation des services
        
        // Vérifier le conteneur de carte
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            throw new Error('Conteneur de carte (#map) non trouvé dans le DOM.');
        }
        
        // Vérifier les APIs
        if (!window.fetch) {
            throw new Error('L\'API Fetch n\'est pas supportée par ce navigateur.');
        }
        
        console.log('✅ Prérequis vérifiés');
    }

    /**
     * Initialise les services API
     * @private
     */
    async _initializeServices() {
        console.log('🔧 Initialisation des services...');
        
        // Service API Google Maps
        this.modules.apiService = new ApiService();
        console.log('✅ ApiService Google Maps initialisé');
        
        // Vérifier que les services Google Maps sont disponibles
        const servicesStatus = this.modules.apiService.getServicesStatus();
        if (servicesStatus.googleMapsLoaded) {
            console.log('✅ Services Google Maps disponibles');
        } else {
            console.warn('⚠️ Services Google Maps non disponibles');
        }
    }

    /**
     * Initialise le gestionnaire de carte
     * @private
     */
    async _initializeMap() {
        console.log('🗺️ Initialisation de la carte...');
        
        this.modules.mapManager = new MapManager(this.modules.apiService);
        await this.modules.mapManager.initialize('map');
        
        console.log('✅ MapManager initialisé');
    }

    /**
     * Initialise le générateur de parcours
     * @private
     */
    _initializeRouteGenerator() {
        console.log('🛣️ Initialisation du générateur de parcours...');
        
        this.modules.routeGenerator = new RouteGenerator(this.modules.apiService);
        
        console.log('✅ RouteGenerator initialisé');
    }

    /**
     * Initialise l'authentification utilisateur
     * @private
     */
    async _initializeAuth() {
        console.log('🔐 Initialisation de l\'authentification...');
        
        this.modules.authUI = new AuthUI();
        await this.modules.authUI.initialize();
        
        console.log('✅ AuthUI initialisé');
    }

    /**
     * Initialise l'interface utilisateur hybride
     * @private
     */
    async _initializeUI() {
        console.log('🎨 Initialisation de l\'interface hybride...');
        
        // 1. Initialiser l'UIManager pour les fonctionnalités de base
        this.modules.uiManager = new UIManager(
            this.modules.apiService,
            this.modules.mapManager,
            this.modules.routeGenerator,
            this.modules.authUI
        );
        
        await this.modules.uiManager.initialize();
        
        // 2. NOUVEAU: Initialiser le Bottom Sheet CityMapper (priorité mobile)
        this.modules.cityMapperSheet = new CityMapperBottomSheet(
            this.modules.apiService,
            this.modules.mapManager,
            this.modules.uiManager
        );
        
        await this.modules.cityMapperSheet.initialize();
        
        // 3. Initialiser le système de recherche flottant (désactivé si CityMapper actif)
        // Commenté pour donner la priorité au nouveau bottom sheet
        /*
        this.modules.floatingSearchManager = new FloatingSearchManager(
            this.modules.apiService,
            this.modules.mapManager
        );
        
        await this.modules.floatingSearchManager.initialize();
        */
        
        // Rendre les managers disponibles globalement
        window.uiManager = this.modules.uiManager;
        window.cityMapperSheet = this.modules.cityMapperSheet;
        // window.floatingSearchManager = this.modules.floatingSearchManager;
        
        console.log('✅ Interface hybride avec Bottom Sheet CityMapper initialisée');
    }

    /**
     * Connecte les modules entre eux
     * @private
     */
    _connectModules() {
        console.log('🔗 Connexion des modules...');
        
        // Connecter l'UI Manager avec le Map Manager pour les callbacks
        this.modules.uiManager.setupMapCallbacks();
        
        console.log('✅ Modules connectés (architecture hybride)');
    }

    /**
     * Configuration finale de l'application
     * @private
     */
    _finalizeSetup() {
        console.log('⚙️ Configuration finale...');
        
        // Gestion des erreurs globales
        window.addEventListener('error', (event) => {
            console.error('Erreur globale:', event.error);
            this._handleGlobalError(event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Promise non gérée:', event.reason);
            this._handleGlobalError(event.reason);
        });
        
        // Gestion du redimensionnement
        window.addEventListener('resize', () => {
            if (this.modules.mapManager) {
                this.modules.mapManager.invalidateSize();
            }
        });
        
        // Logging de performance
        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark('makeMyWayApp-initialized');
            console.log('🏁 Performance mark: makeMyWayApp-initialized');
        }
        
        console.log('✅ Configuration finale terminée');
    }

    /**
     * Gère les erreurs d'initialisation
     * @param {Error} error - Erreur survenue
     * @private
     */
    _handleInitializationError(error) {
        console.error('💥 Erreur d\'initialisation:', error);
        
        // Afficher une erreur à l'utilisateur
        const errorMessage = `
            Erreur d'initialisation de MakeMyWay:<br>
            ${error.message}<br><br>
            Veuillez recharger la page ou contacter le support.
        `;
        
        // Créer et afficher un message d'erreur
        this._showCriticalError(errorMessage);
        
        // Analytics/logging si disponible
        this._logError('initialization', error);
    }

    /**
     * Gère les erreurs globales
     * @param {Error} error - Erreur survenue
     * @private
     */
    _handleGlobalError(error) {
        console.error('💥 Erreur globale:', error);
        
        // Log pour debugging
        this._logError('global', error);
        
        // Ne pas afficher d'erreur critique pour toutes les erreurs
        // Laisser l'application continuer si possible
    }

    /**
     * Affiche une erreur critique à l'utilisateur
     * @param {string} message - Message d'erreur
     * @private
     */
    _showCriticalError(message) {
        // Créer un overlay d'erreur simple
        const errorOverlay = document.createElement('div');
        errorOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 2rem;
        `;
        
        const errorContent = document.createElement('div');
        errorContent.style.cssText = `
            background: #1f2937;
            padding: 2rem;
            border-radius: 1rem;
            text-align: center;
            max-width: 500px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        `;
        
        errorContent.innerHTML = `
            <h2 style="color: #ef4444; margin-bottom: 1rem;">❌ Erreur d'Application</h2>
            <p style="line-height: 1.6; margin-bottom: 2rem;">${message}</p>
            <button class="error-reload-btn" onclick="window.location.reload()">
                Recharger la page
            </button>
        `;
        
        errorOverlay.appendChild(errorContent);
        document.body.appendChild(errorOverlay);
    }

    /**
     * Log une erreur (peut être étendu pour analytics)
     * @param {string} type - Type d'erreur
     * @param {Error} error - Erreur
     * @private
     */
    _logError(type, error) {
        const errorInfo = {
            type,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Log local
        console.error('Error Log:', errorInfo);
        
        // Ici on pourrait envoyer les erreurs à un service d'analytics
        // Exemple: sendErrorToAnalytics(errorInfo);
    }

    /**
     * API publique pour les fonctionnalités courantes
     */

    /**
     * Génère un nouveau parcours
     * @param {Object} options - Options de génération
     * @returns {Promise<Object>} Données du parcours généré
     */
    async generateRoute(options = {}) {
        if (!this.isInitialized) {
            throw new Error('Application non initialisée');
        }
        
        return this.modules.uiManager.generateRoute(options);
    }

    /**
     * Remet l'application à zéro
     */
    reset() {
        if (!this.isInitialized) return;
        
        this.modules.uiManager.resetAll();
    }

    /**
     * Exporte le parcours actuel en GPX
     */
    exportGPX() {
        if (!this.isInitialized) return;
        
        this.modules.uiManager.exportGPX();
    }

    /**
     * Définit un point de départ
     * @param {Object} latlng - Position {lat, lng}
     */
    setStartPoint(latlng) {
        if (!this.isInitialized) return;
        
        this.modules.uiManager.setStartPoint(latlng);
    }

    /**
     * Définit un point d'arrivée
     * @param {Object} latlng - Position {lat, lng}
     */
    setEndPoint(latlng) {
        if (!this.isInitialized) return;
        
        this.modules.uiManager.setEndPoint(latlng);
    }

    /**
     * Obtient l'état actuel de l'application
     * @returns {Object} État de l'application
     */
    getState() {
        if (!this.isInitialized) {
            return { initialized: false };
        }
        
        return {
            initialized: true,
            version: this.version,
            ui: this.modules.uiManager.getState(),
            map: this.modules.mapManager.getMarkerPositions(),
            lastRoute: this.modules.routeGenerator.getLastRouteMetadata(),
            apiCache: this.modules.apiService.getCacheStats(),
            user: this.modules.authUI?.getAuthService()?.getCurrentUser() || null,
            isLoggedIn: this.modules.authUI?.getAuthService()?.isLoggedIn() || false
        };
    }

    /**
     * Obtient l'utilisateur actuellement connecté
     * @returns {Object|null} Données utilisateur ou null
     */
    getCurrentUser() {
        return this.modules.authUI?.getAuthService()?.getCurrentUser() || null;
    }

    /**
     * Vérifie si un utilisateur est connecté
     * @returns {boolean} True si connecté
     */
    isUserLoggedIn() {
        return this.modules.authUI?.getAuthService()?.isLoggedIn() || false;
    }

    /**
     * Obtient le service d'authentification
     * @returns {AuthService|null} Service d'authentification
     */
    getAuthService() {
        return this.modules.authUI?.getAuthService() || null;
    }

    /**
     * Méthodes pour compatibilité avec l'ancienne API
     * (pour faciliter la transition)
     */

    // Getters pour accès direct aux modules (déprécié, à éviter)
    get map() {
        return this.modules.mapManager?.map;
    }

    get routePolyline() {
        return this.modules.mapManager?.routePolyline;
    }

    get startPoint() {
        return this.modules.uiManager?.getState().startPoint;
    }

    get endPoint() {
        return this.modules.uiManager?.getState().endPoint;
    }

    // Méthodes de compatibilité
    showResults(route, targetDistance, mode) {
        console.warn('showResults() est déprécié. Les résultats sont affichés automatiquement.');
    }

    showLoading() {
        if (this.modules.uiManager) {
            this.modules.uiManager.showLoading();
        }
    }

    hideLoading() {
        if (this.modules.uiManager) {
            this.modules.uiManager.hideLoading();
        }
    }

    resetRoute() {
        this.reset();
    }
}

/**
 * Fonction d'initialisation globale de l'application
 */
async function initializeMakeMyWay() {
    try {
        console.log('📦 Démarrage de MakeMyWay...');
        
        // Créer l'instance de l'application
        const app = new MakeMyWayApp();
        
        // Initialiser l'application
        await app.init();
        
        // Rendre l'app accessible globalement pour compatibilité
        window.runMyWayApp = app; // Compatibilité avec l'ancienne version
        window.makeMyWayApp = app; // Nouvelle référence
        
        console.log('🎉 MakeMyWay est prêt à l\'usage !');
        
        return app;
        
    } catch (error) {
        console.error('❌ Échec de l\'initialisation de MakeMyWay:', error);
        throw error;
    }
}

// Cette ligne a été supprimée car initMap sera défini dans index.html

/**
 * Démarrage automatique quand le DOM est prêt (fallback si Google Maps ne charge pas)
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Attendre un peu pour voir si Google Maps se charge
        setTimeout(() => {
            if (!window.google || !window.google.maps) {
                console.warn('⚠️ Google Maps non détecté, tentative d\'initialisation sans Google Maps');
                initializeMakeMyWay().catch(error => {
                    console.error('Erreur de démarrage:', error);
                });
            }
        }, 2000);
    });
} else {
    // Le DOM est déjà chargé, attendre Google Maps
    setTimeout(() => {
        if (!window.google || !window.google.maps) {
            console.warn('⚠️ Google Maps non détecté, tentative d\'initialisation sans Google Maps');
            initializeMakeMyWay().catch(error => {
                console.error('Erreur de démarrage:', error);
            });
        }
    }, 2000);
}

// Export pour utilisation en tant que module
export { MakeMyWayApp, initializeMakeMyWay };

// Enregistrement du Service Worker pour la PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/MakeMyWay/service-worker.js')
      .then(registration => {
        console.log('PWA: ServiceWorker enregistré avec succès. Scope:', registration.scope);
      })
      .catch(err => {
        console.error('PWA: Echec de l\'enregistrement du ServiceWorker:', err);
      });
  });
}

// Log de chargement du script
console.log('📦 Module principal MakeMyWay chargé');