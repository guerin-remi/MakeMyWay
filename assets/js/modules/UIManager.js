import { CONFIG, ConfigUtils } from '../config.js';
import { POIManager } from './ui/POIManager.js';
import { PanelManager } from './ui/PanelManager.js';
import { ResultsManager } from './ui/ResultsManager.js';
import { FormManager } from './ui/FormManager.js';

/**
 * Gestionnaire de l'interface utilisateur et des interactions DOM
 */
export class UIManager {
    constructor(apiService, mapManager, routeGenerator) {
        this.apiService = apiService;
        this.mapManager = mapManager;
        this.routeGenerator = routeGenerator;
        this.elements = {};
        this.state = {
            startPoint: null,
            endPoint: null,
            currentMode: 'walking',
            targetDistance: 5,
            returnToStart: false,
            isLoading: false
        };
        
        // Gestionnaires seront initialisés après le cache des éléments
        this.poiManager = null;
        this.panelManager = null;
        this.resultsManager = null;
        this.formManager = null;
    }

    /**
     * Initialise l'interface utilisateur
     */
    async initialize() {
        try {
            this.cacheElements();
            this.initializeManagers();
            this.setupEventListeners();
            this.formManager.setupAutocomplete();
            this.initializeControls();
            this.setupResponsiveHandlers();
            
            console.log('🎨 Interface utilisateur initialisée');
            
        } catch (error) {
            console.error('Erreur initialisation UI:', error);
            throw error;
        }
    }

    /**
     * Cache les références aux éléments DOM
     */
    cacheElements() {
        const elementIds = [
            'settingsBtn', 'helpBtn', 'mainPanel', 'helpPanel', 'closePanel', 'closeHelp',
            'startAddress', 'endAddress', 'useLocationBtn', 'returnToStart',
            'targetDistance', 'distanceValue', 'maxLabel', 'generateBtn', 'resetBtn',
            'exportBtn', 'customPoi', 'addPoiBtn', 'poiChips',
            'resultsPanel', 'closeResults', 'distanceResult', 'durationResult', 'deviationResult',
            'loadingOverlay', 'zoomInBtn', 'zoomOutBtn', 'centerMapBtn', 'fullscreenBtn',
            'startAddressSuggestions', 'endAddressSuggestions', 'poiSuggestions'
        ];

        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });

        // Éléments par sélecteur
        this.elements.travelModeInputs = document.querySelectorAll('input[name="travelMode"]');
        this.elements.poiCategories = document.querySelectorAll('.poi-category');
        
        // Vérifier les éléments critiques
        const criticalElements = ['generateBtn', 'mainPanel', 'targetDistance'];
        const missingElements = criticalElements.filter(id => !this.elements[id]);
        
        if (missingElements.length > 0) {
            console.warn('Éléments DOM manquants:', missingElements);
        }
    }

    /**
     * Initialise tous les gestionnaires
     */
    initializeManagers() {
        // Gestionnaire POI
        const poiElements = {
            poiChips: this.elements.poiChips,
            poiCategories: this.elements.poiCategories,
            customPoi: this.elements.customPoi
        };
        this.poiManager = new POIManager(this.apiService, this.mapManager, poiElements);
        
        // Gestionnaire des panneaux
        const panelElements = {
            mainPanel: this.elements.mainPanel,
            helpPanel: this.elements.helpPanel,
            settingsBtn: this.elements.settingsBtn,
            helpBtn: this.elements.helpBtn
        };
        this.panelManager = new PanelManager(panelElements);
        
        // Gestionnaire des résultats
        const resultsElements = {
            resultsPanel: this.elements.resultsPanel,
            distanceResult: this.elements.distanceResult,
            durationResult: this.elements.durationResult,
            deviationResult: this.elements.deviationResult
        };
        this.resultsManager = new ResultsManager(resultsElements, this.routeGenerator);
        
        // Gestionnaire des formulaires
        const formElements = {
            startAddress: this.elements.startAddress,
            endAddress: this.elements.endAddress,
            returnToStart: this.elements.returnToStart,
            targetDistance: this.elements.targetDistance,
            distanceValue: this.elements.distanceValue,
            maxLabel: this.elements.maxLabel,
            travelModeInputs: this.elements.travelModeInputs,
            startAddressSuggestions: this.elements.startAddressSuggestions,
            endAddressSuggestions: this.elements.endAddressSuggestions,
            poiSuggestions: this.elements.poiSuggestions
        };
        this.formManager = new FormManager(this.apiService, this, formElements);
    }

    /**
     * Configure tous les écouteurs d'événements
     */
    setupEventListeners() {
        // Boutons de navigation
        this.addEventListenerSafe('settingsBtn', 'click', () => this.panelManager.toggleMainPanel());
        this.addEventListenerSafe('helpBtn', 'click', () => this.panelManager.toggleHelpPanel());
        this.addEventListenerSafe('closePanel', 'click', () => this.panelManager.closeMainPanel());
        this.addEventListenerSafe('closeHelp', 'click', () => this.panelManager.closeHelpPanel());

        // Actions principales
        this.addEventListenerSafe('generateBtn', 'click', () => this.generateRoute());
        this.addEventListenerSafe('resetBtn', 'click', () => this.resetAll());
        this.addEventListenerSafe('exportBtn', 'click', () => this.exportGPX());

        // Géolocalisation
        this.addEventListenerSafe('useLocationBtn', 'click', () => this.useCurrentLocation());

        // Contrôles de parcours
        this.addEventListenerSafe('returnToStart', 'change', (e) => this.formManager.handleReturnToStartToggle(e.target.checked));
        this.addEventListenerSafe('targetDistance', 'input', (e) => this.formManager.updateDistanceValue(e.target.value));

        // Modes de transport
        if (this.elements.travelModeInputs) {
            this.elements.travelModeInputs.forEach(input => {
                input.addEventListener('change', (e) => this.formManager.handleModeChange(e.target.value));
            });
        }

        // POI
        this.addEventListenerSafe('addPoiBtn', 'click', () => this.handleAddCustomPOI());
        this.addEventListenerSafe('customPoi', 'keypress', (e) => {
            if (e.key === 'Enter') this.handleAddCustomPOI();
        });

        // Catégories POI
        if (this.elements.poiCategories) {
            this.elements.poiCategories.forEach(category => {
                category.addEventListener('click', () => this.handleTogglePOICategory(category));
            });
        }

        // Contrôles de carte
        this.addEventListenerSafe('zoomInBtn', 'click', () => this.mapManager.zoomIn());
        this.addEventListenerSafe('zoomOutBtn', 'click', () => this.mapManager.zoomOut());
        this.addEventListenerSafe('centerMapBtn', 'click', () => this.centerMap());
        this.addEventListenerSafe('fullscreenBtn', 'click', () => this.mapManager.toggleFullscreen());

        // Résultats
        this.addEventListenerSafe('closeResults', 'click', () => this.resultsManager.hideResults());

        // Événements globaux
        this.setupGlobalEventListeners();
    }

    /**
     * Configure les écouteurs d'événements globaux
     */
    setupGlobalEventListeners() {
        // Déléguer la gestion des panneaux
        if (this.panelManager) {
            this.panelManager.setupGlobalEventListeners();
        }
    }




    /**
     * Initialise l'état des contrôles
     */
    initializeControls() {
        // Initialiser les limites du slider selon le mode par défaut
        this.formManager.updateDistanceLimits(this.state.currentMode);
        
        // Initialiser l'état du toggle "Retour au départ"
        this.formManager.handleReturnToStartToggle(false);
        
        // Mettre à jour l'affichage de la distance
        this.formManager.updateDistanceValue(this.state.targetDistance);
    }

    /**
     * Configure les gestionnaires responsive
     */
    setupResponsiveHandlers() {
        // Déléguer la gestion responsive des panneaux
        if (this.panelManager) {
            this.panelManager.setupResponsiveHandlers();
        }

        // Redimensionnement de fenêtre pour la carte
        window.addEventListener('resize', () => {
            this.mapManager.invalidateSize();
        });
    }



    /**
     * Ajoute un écouteur d'événement de manière sécurisée
     * @param {string} elementId - ID de l'élément
     * @param {string} event - Type d'événement
     * @param {Function} handler - Gestionnaire d'événement
     */
    addEventListenerSafe(elementId, event, handler) {
        const element = this.elements[elementId];
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Élément non trouvé pour l'événement ${event}: ${elementId}`);
        }
    }

    /**
     * Définit un point de départ
     * @param {Object} latlng - Position {lat, lng}
     */
    setStartPoint(latlng) {
        this.state.startPoint = latlng;
        this.mapManager.setStartMarker(latlng);
        this.updateAddressField(latlng, 'startAddress');
        this.updateRouteInfo();
        console.log('📍 Point de départ défini:', latlng);
    }

    /**
     * Définit un point d'arrivée
     * @param {Object} latlng - Position {lat, lng}
     */
    setEndPoint(latlng) {
        this.state.endPoint = latlng;
        this.mapManager.setEndMarker(latlng);
        this.updateAddressField(latlng, 'endAddress');
        this.updateRouteInfo();
        console.log('🏁 Point d\'arrivée défini:', latlng);
    }

    /**
     * Met à jour un champ d'adresse via géocodage inversé
     * @param {Object} latlng - Position
     * @param {string} fieldId - ID du champ à mettre à jour
     */
    async updateAddressField(latlng, fieldId) {
        const field = this.elements[fieldId];
        if (!field) return;

        try {
            const address = await this.apiService.reverseGeocode(latlng.lat, latlng.lng);
            if (address) {
                field.value = address;
            } else {
                field.value = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
            }
        } catch (error) {
            field.value = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
        }
    }

    /**
     * Met à jour les informations de statut du parcours
     */
    updateRouteInfo() {
        // Mise à jour dynamique du statut dans l'interface
        // Cette méthode peut être étendue selon les besoins de l'UI
        console.log('ℹ️ Informations de parcours mises à jour');
    }


    /**
     * Gère le toggle d'une catégorie POI
     * @param {HTMLElement} categoryElement - Élément de catégorie cliqué
     */
    async handleTogglePOICategory(categoryElement) {
        try {
            this.showLoading(CONFIG.MESSAGES.INFO.SEARCHING);
            
            await this.poiManager.togglePOICategory(categoryElement, this.state.startPoint);
            
        } catch (error) {
            console.error('Erreur toggle POI:', error);
            this.showError(error.message);
            
            // Annuler l'activation en cas d'erreur
            categoryElement.classList.remove('active');
            
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Gère l'ajout d'un POI personnalisé
     */
    async handleAddCustomPOI() {
        const input = this.elements.customPoi;
        if (!input) return;

        const query = input.value.trim();

        try {
            this.showLoading(CONFIG.MESSAGES.INFO.SEARCHING);
            
            const searchCenter = this.state.startPoint || this.mapManager.getMapCenter();
            
            const poi = await this.poiManager.addCustomPOI(query, searchCenter);
            input.value = '';
            
        } catch (error) {
            console.error('Erreur ajout POI personnalisé:', error);
            this.showError(error.message);
            
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Utilise la position actuelle de l'utilisateur
     */
    async useCurrentLocation() {
        try {
            this.showLoading('Obtention de votre position...');
            
            const position = await this.mapManager.getCurrentPosition();
            this.setStartPoint(position);
            this.mapManager.centerOn(position, 15);
            
            console.log('✅ Position obtenue:', position);
            
        } catch (error) {
            console.error('Erreur géolocalisation:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Génère un nouveau parcours
     */
    async generateRoute() {
        if (this.state.isLoading) return;

        if (!this.state.startPoint) {
            this.showError(CONFIG.MESSAGES.ERRORS.NO_START_POINT);
            return;
        }

        try {
            this.showLoading(CONFIG.MESSAGES.INFO.LOADING);
            this.state.isLoading = true;

            // Validation des paramètres
            this.routeGenerator.validateGenerationParams(
                this.state.startPoint,
                this.state.targetDistance,
                this.state.currentMode
            );

            console.log(`🎯 Génération: ${this.state.targetDistance}km en mode ${this.state.currentMode}`);

            // Options de génération
            const options = {
                endPoint: this.state.endPoint,
                returnToStart: this.state.returnToStart,
                pois: this.poiManager ? this.poiManager.getPOIs() : []
            };

            // Générer le parcours
            const routeData = await this.routeGenerator.generateRoute(
                this.state.startPoint,
                this.state.targetDistance,
                this.state.currentMode,
                options
            );

            // Afficher sur la carte
            this.mapManager.displayRoute(routeData.route, this.state.currentMode);

            // Afficher les résultats
            this.resultsManager.showResults(routeData);

            // Fermer automatiquement le panneau sur mobile
            if (window.innerWidth <= CONFIG.UI.BREAKPOINTS.MOBILE) {
                setTimeout(() => this.panelManager.closeMainPanel(), 500);
            }

            console.log('✅ Parcours généré et affiché');

        } catch (error) {
            console.error('Erreur génération:', error);
            this.showError(error.message || CONFIG.MESSAGES.ERRORS.NO_ROUTE);
        } finally {
            this.hideLoading();
            this.state.isLoading = false;
        }
    }

    /**
     * Centre la carte sur le parcours ou le point de départ
     */
    centerMap() {
        if (this.mapManager.routePolyline) {
            this.mapManager.fitRouteInView();
        } else if (this.state.startPoint) {
            this.mapManager.centerOn(this.state.startPoint, 15);
        }
    }

    /**
     * Exporte le parcours en GPX
     */
    exportGPX() {
        const routeData = this.routeGenerator.getLastRoute();
        if (!routeData || !routeData.route || routeData.route.length === 0) {
            this.showError('Aucun parcours à exporter');
            return;
        }

        try {
            const metadata = this.routeGenerator.getLastRouteMetadata();
            let gpxContent = this.generateGPXContent(routeData.route, metadata);
            
            const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${CONFIG.EXPORT.GPX.DEFAULT_NAME.toLowerCase().replace(/\s+/g, '-')}.gpx`;
            a.click();
            URL.revokeObjectURL(url);

            console.log('✅ GPX exporté');

        } catch (error) {
            console.error('Erreur export GPX:', error);
            this.showError('Erreur lors de l\'export GPX');
        }
    }

    /**
     * Génère le contenu GPX
     * @param {Array} routePoints - Points du parcours
     * @param {Object} metadata - Métadonnées du parcours
     * @returns {string} Contenu GPX
     */
    generateGPXContent(routePoints, metadata) {
        const now = new Date().toISOString();
        
        let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        gpx += `<gpx version="${CONFIG.EXPORT.GPX.VERSION}" creator="${CONFIG.EXPORT.GPX.CREATOR}">\n`;
        gpx += `  <metadata>\n`;
        gpx += `    <name>${CONFIG.EXPORT.GPX.DEFAULT_NAME}</name>\n`;
        gpx += `    <time>${now}</time>\n`;
        if (metadata) {
            gpx += `    <desc>Parcours ${metadata.mode} de ${metadata.actualDistance.toFixed(1)}km généré le ${now}</desc>\n`;
        }
        gpx += `  </metadata>\n`;
        gpx += `  <trk>\n`;
        gpx += `    <name>${CONFIG.EXPORT.GPX.DEFAULT_NAME}</name>\n`;
        gpx += `    <trkseg>\n`;
        
        routePoints.forEach(point => {
            gpx += `      <trkpt lat="${point.lat}" lon="${point.lng}"></trkpt>\n`;
        });
        
        gpx += `    </trkseg>\n`;
        gpx += `  </trk>\n`;
        gpx += `</gpx>`;

        return gpx;
    }

    /**
     * Remet tout à zéro
     */
    resetAll() {
        console.log('🔄 Remise à zéro complète...');
        
        // Reset de l'état
        this.state.startPoint = null;
        this.state.endPoint = null;
        
        // Reset de la carte
        this.mapManager.reset();
        
        // Reset de l'interface
        this.resetInterface();
        
        // Reset des formulaires
        if (this.formManager) {
            this.formManager.reset();
        }
        
        // Masquer les résultats
        this.resultsManager.hideResults();
        
        console.log('✅ Application remise à zéro');
    }

    /**
     * Remet l'interface à son état initial
     */
    resetInterface() {
        // Vider les champs de saisie
        ['startAddress', 'endAddress', 'customPoi'].forEach(fieldId => {
            if (this.elements[fieldId]) {
                this.elements[fieldId].value = '';
            }
        });


        // Reset des POI
        if (this.poiManager) {
            this.poiManager.reset();
        }

        // Reset du toggle retour au départ (géré par FormManager)
        if (this.elements.returnToStart) {
            this.elements.returnToStart.checked = false;
        }
    }


    /**
     * Affiche l'overlay de chargement
     * @param {string} message - Message à afficher
     */
    showLoading(message = CONFIG.MESSAGES.INFO.LOADING) {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('show');
            
            const loadingText = this.elements.loadingOverlay.querySelector('p');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    }

    /**
     * Masque l'overlay de chargement
     */
    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.remove('show');
        }
    }

    /**
     * Affiche un message d'erreur
     * @param {string} message - Message d'erreur
     */
    showError(message) {
        // Affichage simple via alert pour cette implémentation
        // Peut être amélioré avec un système de notifications plus sophistiqué
        alert(message);
        console.error('Erreur UI:', message);
    }



    /**
     * Obtient l'état actuel de l'interface
     * @returns {Object} État actuel
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Définit les callbacks pour les interactions avec la carte
     */
    setupMapCallbacks() {
        // Callback pour les clics sur la carte
        this.mapManager.setMapClickHandler((latlng) => {
            if (!this.state.startPoint) {
                this.setStartPoint(latlng);
            } else if (!this.state.endPoint && !this.state.returnToStart) {
                this.setEndPoint(latlng);
            } else {
                // Remplacer le point de départ
                this.setStartPoint(latlng);
            }
        });

        // Callback pour le déplacement des marqueurs
        this.mapManager.setMarkerMoveHandler((type, latlng) => {
            if (type === 'start') {
                if (latlng) {
                    this.state.startPoint = latlng;
                    this.updateAddressField(latlng, 'startAddress');
                } else {
                    this.state.startPoint = null;
                    if (this.elements.startAddress) {
                        this.elements.startAddress.value = '';
                    }
                }
            } else if (type === 'end') {
                if (latlng) {
                    this.state.endPoint = latlng;
                    this.updateAddressField(latlng, 'endAddress');
                } else {
                    this.state.endPoint = null;
                    if (this.elements.endAddress) {
                        this.elements.endAddress.value = '';
                    }
                }
            }
            this.updateRouteInfo();
        });
    }
}