import { CONFIG, ConfigUtils } from '../config.js';
import { POIManager } from './ui/POIManager.js';
import { PanelManager } from './ui/PanelManager.js';
import { ResultsManager } from './ui/ResultsManager.js';
import { FormManager } from './ui/FormManager.js';
import RouteFeedback from './ui/RouteFeedback.js';

/**
 * Gestionnaire de l'interface utilisateur et des interactions DOM
 */
export class UIManager {
    constructor(apiService, mapManager, routeGenerator, authUI = null) {
        this.apiService = apiService;
        this.mapManager = mapManager;
        this.routeGenerator = routeGenerator;
        this.authUI = authUI;
        this.elements = {};
        this.state = {
            destinationPoint: null,
            startPoint: null, // Par défaut: géolocalisation
            endPoint: null,
            currentMode: 'walking',
            targetDistance: 5,
            returnToStart: false,
            isLoading: false,
            routeType: 'loop', // 'loop' ou 'oneway'
            destinationSelected: false
        };
        
        // Gestionnaires seront initialisés après le cache des éléments
        this.poiManager = null;
        this.panelManager = null;
        this.resultsManager = null;
        this.formManager = null;
        this.routeFeedback = RouteFeedback;
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
            'settingsBtn', 'mainPanel', 'helpPanel', 'closePanel', 'closeHelp',
            'destinationAddress', 'endAddress', 'returnToStart',
            'routeTypeSelector', 'routeTypeLoop', 'routeTypeOneWay',
            'targetDistance', 'distanceValue', 'maxLabel', 'generateBtn', 'resetBtn',
            'exportBtn', 'customPoi', 'addPoiBtn', 'poiChips',
            'resultsPanel', 'closeResults', 'distanceResult', 'durationResult', 'deviationResult',
            'loadingOverlay', 'geoLocationBtn',
            'startAddressSuggestions', 'endAddressSuggestions', 'poiSuggestions'
        ];

        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });

        // Éléments par sélecteur (mis à jour pour la nouvelle structure)
        this.elements.travelModeInputs = document.querySelectorAll('input[name="travelMode"]');
        this.elements.poiCategories = document.querySelectorAll('.poi-category');
        
        // Vérifier les éléments critiques
        const criticalElements = ['generateBtn', 'mainPanel', 'targetDistance'];
        const missingElements = criticalElements.filter(id => !this.elements[id]);
        
        console.log('🔧 Debug éléments UI:', {
            settingsBtn: !!this.elements.settingsBtn,
            mainPanel: !!this.elements.mainPanel,
            targetDistance: !!this.elements.targetDistance
        });
        
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
            settingsBtn: this.elements.settingsBtn  // Bouton settings
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
            destinationAddress: this.elements.destinationAddress,
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
        // Bouton Reset
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetApplication();
            });
        }

        // Plus besoin de bouton configure - panneau visible par défaut
        
        // Nouveau bouton settings pour les paramètres d'affichage
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            // Supprimer d'abord tous les événements existants
            settingsBtn.replaceWith(settingsBtn.cloneNode(true));
            const newSettingsBtn = document.getElementById('settingsBtn');
            
            newSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎨 Settings btn cliqué - Gestion du compte');
                if (this.authUI && this.authUI.showAccountModal) {
                    this.authUI.showAccountModal();
                } else {
                    console.warn('⚠️ AuthUI non disponible, fallback sur panneau d\'aide');
                    this.panelManager.toggleHelpPanel();
                }
            });
            
            // Mettre à jour la référence
            this.elements.settingsBtn = newSettingsBtn;
            console.log('✅ Événement settings configuré pour paramètres d\'affichage');
        }
        // Help panel fermé - plus de bouton help
        this.addEventListenerSafe('closeHelp', 'click', () => this.panelManager.closeHelpPanel());

        // Actions principales
        this.addEventListenerSafe('generateBtn', 'click', () => this.generateRoute());
        this.addEventListenerSafe('resetBtn', 'click', () => this.resetAll());
        this.addEventListenerSafe('exportBtn', 'click', () => this.exportGPX());

        // Nouveau flux de destination
        this.setupDestinationFlow();

        // Contrôles de parcours
        this.addEventListenerSafe('returnToStart', 'change', (e) => this.formManager.handleReturnToStartToggle(e.target.checked));
        this.addEventListenerSafe('targetDistance', 'input', (e) => this.formManager.updateDistanceValue(e.target.value));

        // Modes de transport (nouveaux sélecteurs)
        const travelModeInputs = document.querySelectorAll('input[name="travelMode"]');
        if (travelModeInputs) {
            travelModeInputs.forEach(input => {
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

        // Sélecteur de thématique
        this.setupThemeSelector();

        // Sélecteurs avec le nouveau design
        this.setupModeSelector();
        this.setupThemeSelector();
        this.setupDistanceSelector();
        this.setupAdvancedOptions();

        // Boutons de géolocalisation (principal et dans le panneau collapsed)
        this.addEventListenerSafe('geoLocationBtn', 'click', () => this.handleGeolocation());
        this.addEventListenerSafe('geoLocationBtnCollapsed', 'click', () => this.handleGeolocation());

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
        
        // Initialiser les catégories POI selon le mode par défaut
        if (this.poiManager) {
            this.poiManager.updateCategoriesForMode(this.state.currentMode);
        }

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

        // Gestion des accordéons mobile
        this.setupAccordionListeners();
    }

    /**
     * Configure l'accordéon unique (Options avancées)
     */
    setupAccordionListeners() {
        const accordionHeader = document.querySelector('.accordion-header');
        if (accordionHeader) {
            accordionHeader.addEventListener('click', (e) => {
                const section = accordionHeader.closest('.accordion-section');
                
                // Simple toggle pour l'accordéon unique
                section.classList.toggle('active');
                
                console.log('🔧 Options avancées:', section.classList.contains('active') ? 'ouvertes' : 'fermées');
            });
        }
    }
    
    /**
     * Configure le bloc Options avancées cliquable
     */
    setupAdvancedOptions() {
        const optionsBlock = document.getElementById('advancedOptionsBlock');
        if (!optionsBlock) return;
        
        optionsBlock.addEventListener('click', () => {
            // Pour l'instant, on peut afficher une notification ou ouvrir un panneau
            console.log('Navigation vers les options avancées');
            
            // Option 1: Ouvrir un modal
            // this.showAdvancedOptionsModal();
            
            // Option 2: Faire apparaître l'ancien accordéon temporairement
            const accordionSection = document.querySelector('.accordion-section');
            if (accordionSection) {
                accordionSection.style.display = 'block';
                accordionSection.classList.add('active');
                accordionSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    /**
     * Configure le sélecteur de thématique
     */
    setupThemeSelector() {
        const themeChips = document.querySelectorAll('.theme-chip');
        if (!themeChips.length) return;

        themeChips.forEach(chip => {
            chip.addEventListener('click', () => {
                // Retirer la classe active de tous les chips
                themeChips.forEach(c => c.classList.remove('active'));
                
                // Ajouter l'animation de sélection
                chip.classList.add('selecting');
                setTimeout(() => chip.classList.remove('selecting'), 300);
                
                // Activer le chip sélectionné
                chip.classList.add('active');
                
                // Obtenir le thème sélectionné
                const theme = chip.dataset.theme;
                
                // Mettre à jour les POI selon le thème
                this.updatePoisFromTheme(theme);
                
                console.log('🎨 Thème sélectionné:', theme);
            });
        });
    }

    /**
     * Met à jour la sélection des POI selon le thème choisi
     * @param {string} theme - Thème sélectionné (default, nature, culture, urban, sport)
     */
    updatePoisFromTheme(theme) {
        if (!this.poiManager || !this.elements.poiCategories) return;

        // Mapping des thèmes vers les types de POI
        const themeMapping = {
            default: [], // Aucune pré-sélection
            nature: ['park', 'tourism'],
            culture: ['historic', 'art', 'tourism'],
            urban: ['shop', 'restaurant', 'entertainment'],
            sport: ['sport', 'leisure']
        };

        const selectedTypes = themeMapping[theme] || [];
        
        // Désactiver tous les POI d'abord
        this.elements.poiCategories.forEach(category => {
            category.classList.remove('active');
        });

        // Activer les POI correspondant au thème
        if (selectedTypes.length > 0) {
            this.elements.poiCategories.forEach(category => {
                const poiType = category.dataset.poiType;
                if (selectedTypes.includes(poiType)) {
                    category.classList.add('active');
                }
            });
        }

        // Mettre à jour les POI dans le gestionnaire
        if (this.poiManager) {
            this.poiManager.updatePoisFromTheme(theme, selectedTypes);
        }

        console.log(`🎯 POI mis à jour pour le thème "${theme}":`, selectedTypes);
    }

    /**
     * Obtient le nom du mode en français
     * @param {string} mode - Mode de transport
     * @returns {string} Nom du mode
     */
    getModeName(mode) {
        const modeNames = {
            walking: 'marche',
            running: 'course',
            cycling: 'vélo'
        };
        return modeNames[mode] || mode;
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
        this.updateAddressField(latlng, 'destinationAddress');
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
     * Gère la géolocalisation via le bouton moderne
     */
    async handleGeolocation() {
        // Gérer les deux boutons potentiels
        const geoBtn = this.elements.geoLocationBtn || document.getElementById('geoLocationBtnCollapsed');
        
        try {
            console.log('🎯 Demande de géolocalisation...');
            
            // État de chargement du bouton
            if (geoBtn) {
                geoBtn.classList.add('loading');
                const icon = geoBtn.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-spinner fa-spin';
                }
            }
            
            // Vérifier le support de la géolocalisation
            if (!navigator.geolocation) {
                throw new Error('La géolocalisation n\'est pas supportée par votre navigateur');
            }
            
            const position = await this.mapManager.getCurrentPosition();
            this.setStartPoint(position);
            this.mapManager.centerOn(position, 16);
            
            // État de succès
            if (geoBtn) {
                geoBtn.classList.remove('loading');
                geoBtn.classList.add('success');
                const icon = geoBtn.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-check';
                }
                setTimeout(() => {
                    geoBtn.classList.remove('success');
                    if (icon) {
                        icon.className = 'fas fa-crosshairs';
                    }
                }, 2000);
            }
            
            // Feedback de succès
            if (this.routeFeedback) {
                this.routeFeedback.showToast(
                    'Position obtenue avec succès !',
                    'success'
                );
            }
            
            console.log('✅ Position obtenue via géolocalisation:', position);
            
        } catch (error) {
            console.error('❌ Erreur géolocalisation:', error);
            
            // Retirer l'état de chargement
            if (geoBtn) {
                geoBtn.classList.remove('loading');
                geoBtn.classList.add('error');
                const icon = geoBtn.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-exclamation-triangle';
                }
                setTimeout(() => {
                    geoBtn.classList.remove('error');
                    if (icon) {
                        icon.className = 'fas fa-crosshairs';
                    }
                }, 3000);
            }
            
            // Messages d'erreur personnalisés selon le code d'erreur
            let errorMessage = 'Impossible d\'obtenir votre position';
            if (error.code) {
                switch (error.code) {
                    case 1: // PERMISSION_DENIED
                        errorMessage = 'Accès à la localisation refusé. Veuillez autoriser la géolocalisation dans votre navigateur.';
                        break;
                    case 2: // POSITION_UNAVAILABLE
                        errorMessage = 'Position indisponible. Vérifiez votre connexion GPS.';
                        break;
                    case 3: // TIMEOUT
                        errorMessage = 'Délai de localisation dépassé. Réessayez.';
                        break;
                }
            }
            
            // Feedback d'erreur
            if (this.routeFeedback) {
                this.routeFeedback.showToast(errorMessage, 'error');
            } else {
                this.showError(errorMessage);
            }
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
            // État de chargement du FAB
            const generateBtn = document.getElementById('generateBtn');
            if (generateBtn) {
                generateBtn.classList.add('loading');
            }
            
            // Afficher le feedback visuel amélioré
            this.routeFeedback.show({
                title: 'Génération du parcours',
                message: `Préparation d'un parcours de ${this.state.targetDistance}km en ${this.getModeName(this.state.currentMode)}`,
                showProgress: true
            });
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

            // Générer le parcours avec feedback de progression
            let attemptCount = 0;
            const originalGenerateRoute = this.routeGenerator.generateRoute.bind(this.routeGenerator);
            
            // Wrapper pour capturer les tentatives
            this.routeGenerator.generateRoute = async (...args) => {
                attemptCount++;
                this.routeFeedback.updateProgress(attemptCount, {
                    distance: this.state.targetDistance,
                    tolerance: this.state.targetDistance <= 8 ? 0.05 : 
                              this.state.targetDistance <= 20 ? 0.08 :
                              this.state.targetDistance <= 50 ? 0.12 : 0.15
                });
                return originalGenerateRoute(...args);
            };
            
            const routeData = await this.routeGenerator.generateRoute(
                this.state.startPoint,
                this.state.targetDistance,
                this.state.currentMode,
                options
            );
            
            // Restaurer la méthode originale
            this.routeGenerator.generateRoute = originalGenerateRoute;

            // Afficher sur la carte
            this.mapManager.displayRoute(routeData.route, this.state.currentMode);

            // Afficher les résultats
            this.resultsManager.showResults(routeData);

            // Afficher le bouton reset
            this.showResetButton();


            // Feedback de succès
            this.routeFeedback.showSuccess(
                `Parcours de ${routeData.distance.toFixed(1)}km généré avec succès !`
            );

            // Fermer automatiquement le panneau sur mobile
            if (window.innerWidth <= CONFIG.UI.BREAKPOINTS.MOBILE) {
                setTimeout(() => this.panelManager.closeMainPanel(), 500);
            }

            console.log('✅ Parcours généré et affiché');

        } catch (error) {
            console.error('Erreur génération:', error);
            // Feedback d'erreur
            this.routeFeedback.showError(
                error.message || CONFIG.MESSAGES.ERRORS.NO_ROUTE
            );
        } finally {
            this.state.isLoading = false;
            
            // Retirer l'état de chargement du FAB
            const generateBtn = document.getElementById('generateBtn');
            if (generateBtn) {
                generateBtn.classList.remove('loading');
            }
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
            this.showError('Aucun parcours a exporter');
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
            this.showError('Erreur lors de l export GPX');
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
        
        // Masquer le bouton reset
        this.hideResetButton();
    }

    /**
     * Remet l'application à zéro complètement
     */
    resetApplication() {
        // Confirmation sur mobile
        if (window.innerWidth <= 768) {
            if (this.routeFeedback) {
                this.routeFeedback.showToast('Application remise à zéro', 'info');
            }
        } else {
            if (!confirm('Voulez-vous vraiment tout remettre à zéro ?')) {
                return;
            }
        }
        
        // Utiliser la méthode reset existante
        this.resetAll();
    }

    /**
     * Affiche le bouton de reset FAB
     */
    showResetButton() {
        const resetBtn = document.getElementById('resetBtn');
        const generateBtn = document.getElementById('generateBtn');
        
        if (resetBtn) {
            resetBtn.style.display = 'flex';
        }
        
        // Changer l'état du FAB générer en succès
        if (generateBtn) {
            generateBtn.classList.add('success');
            setTimeout(() => {
                generateBtn.classList.remove('success');
            }, 1000);
        }
    }

    /**
     * Masque le bouton de reset FAB
     */
    hideResetButton() {
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.style.display = 'none';
        }
    }

    /**
     * Remet l'interface à son état initial
     */
    resetInterface() {
        // Vider les champs de saisie
        ['destinationAddress', 'endAddress', 'customPoi'].forEach(fieldId => {
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
                    this.updateAddressField(latlng, 'destinationAddress');
                } else {
                    this.state.startPoint = null;
                    if (this.elements.destinationAddress) {
                        this.elements.destinationAddress.value = '';
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

    /**
     * Bascule entre les paramètres d'affichage (thème, etc.)
     */
    toggleDisplaySettings() {
        console.log('🎨 Paramètres d\'affichage cliqué');
        
        // Pour l'instant, simple basculement de thème
        const isDark = document.body.classList.toggle('dark-theme');
        
        // Animation du bouton
        const settingsBtn = this.elements.settingsBtn;
        if (settingsBtn) {
            settingsBtn.classList.toggle('active', isDark);
        }
        
        // Notification
        const theme = isDark ? 'sombre' : 'clair';
        this.showSuccess(`Thème ${theme} activé`);
    }

    /**
     * Configure le sélecteur de distance par boutons/chips
     */
    /**
     * Configure le sélecteur de mode avec les cartes tactiles
     */
    setupModeSelector() {
        const modeCards = document.querySelectorAll('.mode-card');
        const radioInputs = document.querySelectorAll('input[name="travelMode"]');
        
        if (!modeCards.length) return;
        
        modeCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Enlever l'active de toutes les cartes
                modeCards.forEach(c => c.classList.remove('active'));
                
                // Activer la carte cliquée
                card.classList.add('active');
                
                const mode = card.getAttribute('data-mode');
                
                // Synchroniser avec les radio inputs cachés
                const matchingInput = document.querySelector(`input[value="${mode}"]`);
                if (matchingInput) {
                    matchingInput.checked = true;
                    matchingInput.dispatchEvent(new Event('change'));
                }
                
                // Mettre à jour l'état via FormManager
                this.formManager.handleModeChange(mode);
                
                console.log(`Mode sélectionné: ${mode}`);
            });
        });
    }
    
    /**
     * Configure le sélecteur de thème avec les puces
     */
    setupThemeSelector() {
        const themeSelector = document.getElementById('theme-selector');
        if (!themeSelector) return;
        
        const themeChips = themeSelector.querySelectorAll('.chip-button');
        
        themeChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Enlever l'active de toutes les puces
                themeChips.forEach(c => c.classList.remove('active'));
                
                // Activer la puce cliquée
                chip.classList.add('active');
                
                const theme = chip.getAttribute('data-theme');
                this.state.selectedTheme = theme;
                
                console.log(`Thème sélectionné: ${theme}`);
            });
        });
    }
    
    setupDistanceSelector() {
        const distanceChips = document.querySelectorAll('.distance-selector .chip-button');
        const customSlider = document.getElementById('customDistanceSlider');
        const targetDistanceInput = document.getElementById('targetDistance');
        const distanceValueDisplay = document.getElementById('distanceValue');

        if (!distanceChips.length) return;

        distanceChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Enlever l'active de toutes les puces
                distanceChips.forEach(c => c.classList.remove('active'));
                
                // Activer le chip cliqué
                chip.classList.add('active');
                
                const distance = chip.getAttribute('data-distance');
                
                if (distance === 'custom') {
                    // Afficher le slider personnalisé
                    if (customSlider) {
                        customSlider.style.display = 'block';
                        customSlider.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                    
                    // Synchroniser avec l'état actuel du slider
                    if (targetDistanceInput && distanceValueDisplay) {
                        const currentValue = parseFloat(targetDistanceInput.value);
                        this.state.targetDistance = currentValue;
                        distanceValueDisplay.textContent = `${currentValue} km`;
                    }
                } else {
                    // Masquer le slider personnalisé
                    if (customSlider) {
                        customSlider.style.display = 'none';
                    }
                    
                    // Définir la distance prédéfinie
                    const numDistance = parseFloat(distance);
                    this.state.targetDistance = numDistance;
                    
                    // Mettre à jour le slider caché pour la cohérence
                    if (targetDistanceInput) {
                        targetDistanceInput.value = numDistance;
                    }
                    
                    // Déclencher l'événement de mise à jour si le FormManager l'attend
                    if (this.formManager && this.formManager.updateDistanceValue) {
                        this.formManager.updateDistanceValue(numDistance);
                    }
                    
                    console.log(`Distance sélectionnée: ${numDistance} km`);
                }
            });
        });

        // Gestion du slider personnalisé
        if (targetDistanceInput && distanceValueDisplay) {
            targetDistanceInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                distanceValueDisplay.textContent = `${value} km`;
                this.state.targetDistance = value;
                
                // S'assurer que le chip "Personnalisé" est actif
                const customChip = document.querySelector('.distance-selector .chip-button[data-distance="custom"]');
                if (customChip && !customChip.classList.contains('active')) {
                    distanceChips.forEach(c => c.classList.remove('active'));
                    customChip.classList.add('active');
                }
                
                // Déclencher l'événement de mise à jour
                if (this.formManager && this.formManager.updateDistanceValue) {
                    this.formManager.updateDistanceValue(value);
                }
            });
        }

        console.log('✅ Sélecteur de distance par boutons configuré');
    }

    /**
     * Configure le nouveau flux de destination mobile-first
     */
    setupDestinationFlow() {
        const destinationInput = this.elements.destinationAddress;
        const routeTypeSelector = this.elements.routeTypeSelector;
        const loopBtn = this.elements.routeTypeLoop;
        const onewayBtn = this.elements.routeTypeOneWay;

        if (!destinationInput || !routeTypeSelector) {
            console.warn('⚠️ Éléments de destination manquants');
            return;
        }

        // Écouteur sur le champ de destination
        destinationInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            
            if (value.length > 0 && !this.state.destinationSelected) {
                // Première saisie - afficher le sélecteur de type
                this.showRouteTypeSelector();
            } else if (value.length === 0) {
                // Champ vidé - masquer le sélecteur
                this.hideRouteTypeSelector();
                this.state.destinationSelected = false;
                this.state.destinationPoint = null;
            }
        });

        // Gestion de la sélection du type de parcours
        if (loopBtn) {
            loopBtn.addEventListener('click', () => this.selectRouteType('loop'));
        }
        if (onewayBtn) {
            onewayBtn.addEventListener('click', () => this.selectRouteType('oneway'));
        }

        console.log('✅ Flux de destination mobile-first configuré');
    }

    /**
     * Affiche le sélecteur de type de parcours avec animation
     */
    showRouteTypeSelector() {
        const selector = this.elements.routeTypeSelector;
        if (selector) {
            selector.style.display = 'block';
            // Force reflow pour l'animation
            selector.offsetHeight;
            selector.classList.add('show');
            
            console.log('🎯 Sélecteur de type de parcours affiché');
        }
    }

    /**
     * Masque le sélecteur de type de parcours
     */
    hideRouteTypeSelector() {
        const selector = this.elements.routeTypeSelector;
        if (selector) {
            selector.classList.remove('show');
            setTimeout(() => {
                if (!selector.classList.contains('show')) {
                    selector.style.display = 'none';
                }
            }, 300);
            
            console.log('🎯 Sélecteur de type de parcours masqué');
        }
    }

    /**
     * Sélectionne le type de parcours
     * @param {string} type - 'loop' ou 'oneway'
     */
    selectRouteType(type) {
        const loopBtn = this.elements.routeTypeLoop;
        const onewayBtn = this.elements.routeTypeOneWay;
        
        if (!loopBtn || !onewayBtn) return;

        // Mise à jour visuelle
        if (type === 'loop') {
            loopBtn.classList.add('active', 'selecting');
            onewayBtn.classList.remove('active');
        } else {
            onewayBtn.classList.add('active', 'selecting');
            loopBtn.classList.remove('active');
        }

        // Animation de sélection
        const activeBtn = type === 'loop' ? loopBtn : onewayBtn;
        setTimeout(() => {
            activeBtn.classList.remove('selecting');
        }, 400);

        // Mise à jour de l'état
        this.state.routeType = type;
        
        console.log(`🎯 Type de parcours sélectionné: ${type}`);
        
        // Configurer la logique selon le type choisi
        this.configureRouteLogic(type);
    }

    /**
     * Configure la logique de génération selon le type de parcours
     * @param {string} type - 'loop' ou 'oneway'
     */
    configureRouteLogic(type) {
        const destinationValue = this.elements.destinationAddress?.value?.trim();
        
        if (!destinationValue) return;

        if (type === 'loop') {
            // Mode boucle : destination = waypoint, départ = géolocation, retour au départ
            this.state.returnToStart = true;
            console.log('🔄 Mode boucle activé - retour au point de départ');
        } else {
            // Mode aller-simple : destination = point d'arrivée, départ = géolocation
            this.state.returnToStart = false;
            console.log('➡️ Mode aller-simple activé');
        }
        
        // Marquer la destination comme sélectionnée
        this.state.destinationSelected = true;
    }
}