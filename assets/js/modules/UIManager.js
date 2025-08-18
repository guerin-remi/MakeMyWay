import { CONFIG, ConfigUtils } from '../config.js';

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
            pois: [],
            isLoading: false
        };
        this.suggestions = {
            timeouts: new Map(),
            containers: new Map()
        };
    }

    /**
     * Initialise l'interface utilisateur
     */
    async initialize() {
        try {
            this.cacheElements();
            this.setupEventListeners();
            this.setupAutocomplete();
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
     * Configure tous les écouteurs d'événements
     */
    setupEventListeners() {
        // Boutons de navigation
        this.addEventListenerSafe('settingsBtn', 'click', () => this.toggleMainPanel());
        this.addEventListenerSafe('helpBtn', 'click', () => this.toggleHelpPanel());
        this.addEventListenerSafe('closePanel', 'click', () => this.closeMainPanel());
        this.addEventListenerSafe('closeHelp', 'click', () => this.closeHelpPanel());

        // Actions principales
        this.addEventListenerSafe('generateBtn', 'click', () => this.generateRoute());
        this.addEventListenerSafe('resetBtn', 'click', () => this.resetAll());
        this.addEventListenerSafe('exportBtn', 'click', () => this.exportGPX());

        // Géolocalisation
        this.addEventListenerSafe('useLocationBtn', 'click', () => this.useCurrentLocation());

        // Contrôles de parcours
        this.addEventListenerSafe('returnToStart', 'change', (e) => this.handleReturnToStartToggle(e.target.checked));
        this.addEventListenerSafe('targetDistance', 'input', (e) => this.updateDistanceValue(e.target.value));

        // Modes de transport
        if (this.elements.travelModeInputs) {
            this.elements.travelModeInputs.forEach(input => {
                input.addEventListener('change', (e) => this.handleModeChange(e.target.value));
            });
        }

        // POI
        this.addEventListenerSafe('addPoiBtn', 'click', () => this.addCustomPOI());
        this.addEventListenerSafe('customPoi', 'keypress', (e) => {
            if (e.key === 'Enter') this.addCustomPOI();
        });

        // Catégories POI
        if (this.elements.poiCategories) {
            this.elements.poiCategories.forEach(category => {
                category.addEventListener('click', () => this.togglePOICategory(category));
            });
        }

        // Contrôles de carte
        this.addEventListenerSafe('zoomInBtn', 'click', () => this.mapManager.zoomIn());
        this.addEventListenerSafe('zoomOutBtn', 'click', () => this.mapManager.zoomOut());
        this.addEventListenerSafe('centerMapBtn', 'click', () => this.centerMap());
        this.addEventListenerSafe('fullscreenBtn', 'click', () => this.mapManager.toggleFullscreen());

        // Résultats
        this.addEventListenerSafe('closeResults', 'click', () => this.hideResults());

        // Événements globaux
        this.setupGlobalEventListeners();
    }

    /**
     * Configure les écouteurs d'événements globaux
     */
    setupGlobalEventListeners() {
        // Fermeture avec Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllPanels();
            }
        });

        // Fermeture des panneaux en cliquant à l'extérieur (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= CONFIG.UI.BREAKPOINTS.MOBILE) {
                if (!this.elements.mainPanel?.contains(e.target) && 
                    !this.elements.settingsBtn?.contains(e.target) &&
                    !this.elements.mainPanel?.classList.contains('collapsed')) {
                    this.closeMainPanel();
                }
            }
        });
    }

    /**
     * Configure la saisie automatique pour les adresses et POI
     */
    setupAutocomplete() {
        // Autocomplétion des adresses
        this.setupAddressAutocomplete('startAddress', 'startAddressSuggestions', 'start');
        this.setupAddressAutocomplete('endAddress', 'endAddressSuggestions', 'end');
        
        // Autocomplétion des POI
        this.setupPOIAutocomplete('customPoi', 'poiSuggestions');
    }

    /**
     * Configure l'autocomplétion pour un champ d'adresse
     * @param {string} inputId - ID du champ de saisie
     * @param {string} suggestionsId - ID du conteneur de suggestions
     * @param {string} type - Type ('start' ou 'end')
     */
    setupAddressAutocomplete(inputId, suggestionsId, type) {
        const input = this.elements[inputId];
        const suggestionsContainer = this.elements[suggestionsId];
        
        if (!input) return;

        input.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            
            // Annuler la recherche précédente
            this.cancelSuggestionTimeout(inputId);
            
            if (query.length < 3) {
                this.hideSuggestions(suggestionsContainer);
                return;
            }

            // Délai pour éviter trop de requêtes
            const timeoutId = setTimeout(async () => {
                try {
                    const suggestions = await this.apiService.searchAddresses(query);
                    this.showAddressSuggestions(suggestions, suggestionsContainer, input, type);
                } catch (error) {
                    console.error('Erreur recherche adresses:', error);
                    this.hideSuggestions(suggestionsContainer);
                }
            }, CONFIG.POI.SEARCH_DELAY);

            this.suggestions.timeouts.set(inputId, timeoutId);
        });

        // Masquer les suggestions lors de la perte de focus
        input.addEventListener('blur', () => {
            setTimeout(() => this.hideSuggestions(suggestionsContainer), CONFIG.UI.SUGGESTION_DELAY);
        });

        input.addEventListener('focus', () => {
            if (input.value.length >= 3 && suggestionsContainer?.children.length > 0) {
                suggestionsContainer.style.display = 'block';
            }
        });
    }

    /**
     * Configure l'autocomplétion pour les POI
     * @param {string} inputId - ID du champ de saisie POI
     * @param {string} suggestionsId - ID du conteneur de suggestions POI
     */
    setupPOIAutocomplete(inputId, suggestionsId) {
        const input = this.elements[inputId];
        const suggestionsContainer = this.elements[suggestionsId];
        
        if (!input) return;

        input.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            
            this.cancelSuggestionTimeout(inputId);
            
            if (query.length < CONFIG.POI.MIN_QUERY_LENGTH) {
                this.hideSuggestions(suggestionsContainer);
                return;
            }

            const timeoutId = setTimeout(async () => {
                try {
                    const searchCenter = this.state.startPoint || this.mapManager.getMapCenter();
                    const suggestions = await this.apiService.searchPOIs(query, searchCenter);
                    this.showPOISuggestions(suggestions, suggestionsContainer, input);
                } catch (error) {
                    console.error('Erreur recherche POI:', error);
                    this.hideSuggestions(suggestionsContainer);
                }
            }, CONFIG.POI.SEARCH_DELAY);

            this.suggestions.timeouts.set(inputId, timeoutId);
        });

        input.addEventListener('blur', () => {
            setTimeout(() => this.hideSuggestions(suggestionsContainer), CONFIG.UI.SUGGESTION_DELAY);
        });
    }

    /**
     * Initialise l'état des contrôles
     */
    initializeControls() {
        // Initialiser les limites du slider selon le mode par défaut
        this.updateDistanceLimits(this.state.currentMode);
        
        // Initialiser l'état du toggle "Retour au départ"
        this.handleReturnToStartToggle(false);
        
        // Mettre à jour l'affichage de la distance
        this.updateDistanceValue(this.state.targetDistance);
    }

    /**
     * Configure les gestionnaires responsive
     */
    setupResponsiveHandlers() {
        // Support tactile pour le glissement du panneau (mobile)
        if (window.innerWidth <= CONFIG.UI.BREAKPOINTS.MOBILE) {
            this.setupMobilePanelGestures();
        }

        // Redimensionnement de fenêtre
        window.addEventListener('resize', () => {
            this.mapManager.invalidateSize();
            
            // Réinitialiser les gestes mobiles si nécessaire
            if (window.innerWidth <= CONFIG.UI.BREAKPOINTS.MOBILE) {
                this.setupMobilePanelGestures();
            }
        });
    }

    /**
     * Configure les gestes tactiles pour le panneau mobile
     */
    setupMobilePanelGestures() {
        const panel = this.elements.mainPanel;
        const panelHandle = panel?.querySelector('.panel-handle');
        const panelHeader = panel?.querySelector('.panel-header');
        
        if (!panel) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const elements = [panelHandle, panelHeader].filter(Boolean);
        
        elements.forEach(element => {
            element.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                isDragging = true;
                panel.style.transition = 'none';
            });
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            if (deltaY > 0) {
                panel.style.transform = `translateY(${deltaY}px)`;
            }
        });

        document.addEventListener('touchend', () => {
            if (!isDragging) return;
            
            const deltaY = currentY - startY;
            panel.style.transition = 'transform 0.3s ease-out';
            
            if (deltaY > 100) {
                this.closeMainPanel();
            } else {
                panel.style.transform = 'translateY(0)';
            }
            
            isDragging = false;
            startY = 0;
            currentY = 0;
        });
    }

    /**
     * Affiche les suggestions d'adresses
     * @param {Array} suggestions - Liste des suggestions
     * @param {HTMLElement} container - Conteneur des suggestions
     * @param {HTMLInputElement} input - Champ de saisie
     * @param {string} type - Type ('start' ou 'end')
     */
    showAddressSuggestions(suggestions, container, input, type) {
        if (!container) return;

        container.innerHTML = '';
        container.style.display = 'none';

        if (suggestions.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'suggestion-item';
            noResults.textContent = 'Aucune adresse trouvée';
            noResults.style.color = '#64748B';
            container.appendChild(noResults);
            container.style.display = 'block';
            return;
        }

        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div style="font-weight: 500;">${this.apiService.formatAddressName(suggestion.display_name)}</div>
                <div style="font-size: 0.8rem; color: #64748B; margin-top: 0.25rem;">
                    ${this.apiService.getAddressDetails(suggestion.display_name)}
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.selectAddress(suggestion, input, type);
                this.hideSuggestions(container);
            });
            
            container.appendChild(item);
        });

        container.style.display = 'block';
    }

    /**
     * Affiche les suggestions de POI
     * @param {Array} suggestions - Liste des suggestions POI
     * @param {HTMLElement} container - Conteneur des suggestions
     * @param {HTMLInputElement} input - Champ de saisie
     */
    showPOISuggestions(suggestions, container, input) {
        if (!container) return;

        container.innerHTML = '';
        container.style.display = 'none';

        if (suggestions.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'suggestion-item';
            noResults.textContent = 'Aucun POI trouvé';
            noResults.style.color = '#64748B';
            container.appendChild(noResults);
            container.style.display = 'block';
            return;
        }

        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div style="font-weight: 500;">${suggestion.name}</div>
                <div style="font-size: 0.8rem; color: #64748B; margin-top: 0.25rem;">
                    ${this.apiService.getPOITypeIcon(suggestion.type)} ${this.apiService.formatPOIType(suggestion.type, suggestion.class)}
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.selectPOI(suggestion, input);
                this.hideSuggestions(container);
            });
            
            container.appendChild(item);
        });

        container.style.display = 'block';
    }

    /**
     * Sélectionne une adresse depuis les suggestions
     * @param {Object} suggestion - Suggestion d'adresse
     * @param {HTMLInputElement} input - Champ de saisie
     * @param {string} type - Type ('start' ou 'end')
     */
    selectAddress(suggestion, input, type) {
        input.value = this.apiService.formatAddressName(suggestion.display_name);
        
        const latlng = { lat: suggestion.lat, lng: suggestion.lng };
        
        if (type === 'start') {
            this.setStartPoint(latlng);
        } else if (type === 'end') {
            this.setEndPoint(latlng);
        }
        
        console.log(`✅ ${type === 'start' ? 'Départ' : 'Arrivée'} défini:`, suggestion.display_name);
    }

    /**
     * Sélectionne un POI depuis les suggestions
     * @param {Object} poi - POI sélectionné
     * @param {HTMLInputElement} input - Champ de saisie
     */
    selectPOI(poi, input) {
        input.value = poi.name;
        this.addPOIToList(poi);
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
     * Gère le changement du toggle "Retour au départ"
     * @param {boolean} isChecked - État du toggle
     */
    handleReturnToStartToggle(isChecked) {
        this.state.returnToStart = isChecked;
        
        const endAddressGroup = this.elements.endAddress?.closest('.route-input-group');
        
        if (isChecked) {
            // Masquer et désactiver le champ d'arrivée
            if (endAddressGroup) {
                endAddressGroup.style.opacity = '0.5';
                endAddressGroup.style.pointerEvents = 'none';
            }
            
            // Supprimer le marqueur d'arrivée
            if (this.state.endPoint) {
                this.mapManager.removeEndMarker();
                this.state.endPoint = null;
            }
            
            // Vider et désactiver le champ
            if (this.elements.endAddress) {
                this.elements.endAddress.value = '';
                this.elements.endAddress.placeholder = 'Retour au départ activé';
            }
        } else {
            // Réactiver le champ d'arrivée
            if (endAddressGroup) {
                endAddressGroup.style.opacity = '1';
                endAddressGroup.style.pointerEvents = 'auto';
            }
            
            if (this.elements.endAddress) {
                this.elements.endAddress.placeholder = 'Point d\'arrivée (optionnel)';
            }
        }
        
        this.updateRouteInfo();
    }

    /**
     * Gère le changement de mode de transport
     * @param {string} mode - Nouveau mode ('walking', 'running', 'cycling')
     */
    handleModeChange(mode) {
        this.state.currentMode = mode;
        this.updateDistanceLimits(mode);
        console.log(`Mode de transport: ${mode}`);
    }

    /**
     * Met à jour les limites du slider de distance selon le mode
     * @param {string} mode - Mode de transport
     */
    updateDistanceLimits(mode) {
        const slider = this.elements.targetDistance;
        const maxLabel = this.elements.maxLabel;
        const distanceValue = this.elements.distanceValue;
        
        if (!slider || !maxLabel) return;

        const limits = ConfigUtils.getModeConfig(mode).limits;
        const newMax = limits.max;
        
        // Ajuster la valeur actuelle si elle dépasse le nouveau maximum
        if (parseFloat(slider.value) > newMax) {
            slider.value = limits.default;
            this.state.targetDistance = limits.default;
            if (distanceValue) {
                distanceValue.textContent = `${limits.default} km`;
            }
        }
        
        slider.max = newMax;
        maxLabel.textContent = `${newMax}km`;
        
        console.log(`Distance max ajustée: ${newMax}km pour le mode ${mode}`);
    }

    /**
     * Met à jour l'affichage de la valeur de distance
     * @param {number} value - Nouvelle valeur de distance
     */
    updateDistanceValue(value) {
        this.state.targetDistance = parseFloat(value);
        
        if (this.elements.distanceValue) {
            this.elements.distanceValue.textContent = `${value} km`;
        }
    }

    /**
     * Active/désactive une catégorie POI
     * @param {HTMLElement} categoryElement - Élément de catégorie cliqué
     */
    async togglePOICategory(categoryElement) {
        const category = categoryElement.dataset.preset;
        if (!category) return;

        const isActive = categoryElement.classList.contains('active');
        
        if (isActive) {
            // Désactiver la catégorie
            categoryElement.classList.remove('active');
            this.removePOIsByCategory(category);
        } else {
            // Vérifier qu'un point de départ est défini
            if (!this.state.startPoint) {
                this.showError('Veuillez d\'abord définir un point de départ');
                return;
            }
            
            // Activer la catégorie
            categoryElement.classList.add('active');
            await this.addPOIsByCategory(category);
        }
    }

    /**
     * Ajoute des POI par catégorie
     * @param {string} category - Catégorie de POI
     */
    async addPOIsByCategory(category) {
        try {
            this.showLoading(CONFIG.MESSAGES.INFO.SEARCHING);
            
            const pois = await this.apiService.searchPOIsByCategory(category, this.state.startPoint);
            
            pois.forEach(poi => this.addPOIToList(poi));
            
            if (pois.length === 0) {
                this.showError(`Aucun POI ${CONFIG.POI.CATEGORIES[category]?.name || category} trouvé dans cette zone`);
            } else {
                console.log(`✅ ${pois.length} POI ${category} ajoutés`);
            }
            
        } catch (error) {
            console.error(`Erreur ajout POI ${category}:`, error);
            this.showError(`Erreur lors de la recherche de POI ${CONFIG.POI.CATEGORIES[category]?.name || category}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Supprime les POI d'une catégorie
     * @param {string} category - Catégorie à supprimer
     */
    removePOIsByCategory(category) {
        const poisToRemove = this.state.pois.filter(poi => poi.category === category);
        
        poisToRemove.forEach(poi => {
            const index = this.state.pois.indexOf(poi);
            if (index > -1) {
                this.removePOI(index);
            }
        });
        
        console.log(`🗑️ POI ${category} supprimés`);
    }

    /**
     * Ajoute un POI personnalisé
     */
    async addCustomPOI() {
        const input = this.elements.customPoi;
        if (!input) return;

        const query = input.value.trim();
        if (query.length < 2) {
            this.showError(CONFIG.MESSAGES.ERRORS.INVALID_QUERY);
            return;
        }

        try {
            this.showLoading(CONFIG.MESSAGES.INFO.SEARCHING);
            
            const searchCenter = this.state.startPoint || this.mapManager.getMapCenter();
            const pois = await this.apiService.searchPOIs(query, searchCenter);
            
            if (pois.length > 0) {
                const poi = pois[0];
                this.addPOIToList(poi);
                input.value = '';
            } else {
                // Essayer avec recherche d'adresse
                const addresses = await this.apiService.searchAddresses(query);
                if (addresses.length > 0) {
                    const address = addresses[0];
                    const genericPOI = {
                        name: this.apiService.formatAddressName(address.display_name),
                        full_name: address.display_name,
                        lat: address.lat,
                        lng: address.lng,
                        type: 'custom',
                        class: 'custom'
                    };
                    this.addPOIToList(genericPOI);
                    input.value = '';
                } else {
                    this.showError('Aucun lieu trouvé pour cette recherche');
                }
            }
            
        } catch (error) {
            console.error('Erreur ajout POI:', error);
            this.showError('Erreur lors de l\'ajout du POI');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Ajoute un POI à la liste
     * @param {Object} poi - POI à ajouter
     */
    addPOIToList(poi) {
        // Éviter les doublons
        const exists = this.state.pois.find(p => 
            Math.abs(p.lat - poi.lat) < 0.001 && Math.abs(p.lng - poi.lng) < 0.001
        );
        
        if (exists) {
            this.showError('Ce POI est déjà dans votre liste');
            return;
        }
        
        // Ajouter à la liste
        this.state.pois.push(poi);
        this.updatePOIChips();
        
        // Ajouter le marqueur sur la carte
        poi._marker = this.mapManager.addPOIMarker(poi);
        
        console.log(`✅ POI ajouté: ${poi.name}`);
    }

    /**
     * Met à jour l'affichage des chips POI
     */
    updatePOIChips() {
        const container = this.elements.poiChips;
        if (!container) return;

        container.innerHTML = '';

        this.state.pois.forEach((poi, index) => {
            const chip = document.createElement('div');
            chip.className = 'poi-chip';
            chip.innerHTML = `
                <span>${this.apiService.getPOITypeIcon(poi.type)} ${poi.name}</span>
                <button class="chip-remove" data-index="${index}" title="Supprimer">×</button>
            `;
            
            // Événement de suppression
            const removeBtn = chip.querySelector('.chip-remove');
            removeBtn.addEventListener('click', () => this.removePOI(index));
            
            container.appendChild(chip);
        });
    }

    /**
     * Supprime un POI de la liste
     * @param {number} index - Index du POI à supprimer
     */
    removePOI(index) {
        if (index >= 0 && index < this.state.pois.length) {
            const poi = this.state.pois[index];
            
            // Supprimer de la carte
            if (poi._marker) {
                this.mapManager.removePOIMarker(poi._marker);
            }
            
            // Supprimer de la liste
            this.state.pois.splice(index, 1);
            this.updatePOIChips();
            
            console.log(`🗑️ POI supprimé: ${poi.name}`);
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
                pois: this.state.pois
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
            this.showResults(routeData);

            // Fermer automatiquement le panneau sur mobile
            if (window.innerWidth <= CONFIG.UI.BREAKPOINTS.MOBILE) {
                setTimeout(() => this.closeMainPanel(), 500);
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
        this.state.pois = [];
        
        // Reset de la carte
        this.mapManager.reset();
        
        // Reset de l'interface
        this.resetInterface();
        
        // Masquer les résultats
        this.hideResults();
        
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

        // Masquer les suggestions
        Object.values(this.suggestions.containers).forEach(container => {
            this.hideSuggestions(container);
        });

        // Reset des POI
        this.updatePOIChips();
        
        // Désactiver toutes les catégories POI
        if (this.elements.poiCategories) {
            this.elements.poiCategories.forEach(category => {
                category.classList.remove('active');
            });
        }

        // Reset du toggle retour au départ
        if (this.elements.returnToStart) {
            this.elements.returnToStart.checked = false;
            this.handleReturnToStartToggle(false);
        }
    }

    /**
     * Affiche les résultats du parcours
     * @param {Object} routeData - Données du parcours
     */
    showResults(routeData) {
        if (!this.elements.resultsPanel) return;

        const metadata = this.routeGenerator.getLastRouteMetadata();
        if (!metadata) return;

        // Calculer les statistiques
        const actualDistance = routeData.distance;
        const estimatedDuration = routeData.duration;
        const deviation = Math.abs(actualDistance - metadata.targetDistance);
        
        // Mettre à jour les éléments de résultat
        if (this.elements.distanceResult) {
            this.elements.distanceResult.textContent = `${actualDistance.toFixed(1)} km`;
        }
        
        if (this.elements.durationResult) {
            this.elements.durationResult.textContent = this.formatDuration(estimatedDuration);
        }
        
        if (this.elements.deviationResult) {
            const deviationPercent = (deviation / metadata.targetDistance) * 100;
            
            if (deviationPercent <= 5) {
                this.elements.deviationResult.textContent = '✓ Parfait';
                this.elements.deviationResult.style.color = 'var(--success)';
            } else if (deviationPercent <= 15) {
                this.elements.deviationResult.textContent = `±${deviation.toFixed(1)}km`;
                this.elements.deviationResult.style.color = 'var(--warning)';
            } else {
                this.elements.deviationResult.textContent = `±${deviation.toFixed(1)}km`;
                this.elements.deviationResult.style.color = 'var(--error)';
            }
        }

        // Afficher le panneau avec animation
        setTimeout(() => {
            this.elements.resultsPanel.classList.add('show');
        }, 500);

        console.log(`📊 Résultats: ${actualDistance.toFixed(1)}km en ${this.formatDuration(estimatedDuration)}`);
    }

    /**
     * Masque les résultats
     */
    hideResults() {
        if (this.elements.resultsPanel) {
            this.elements.resultsPanel.classList.remove('show');
        }
    }

    /**
     * Formate une durée en format lisible
     * @param {number} minutes - Durée en minutes
     * @returns {string} Durée formatée
     */
    formatDuration(minutes) {
        if (minutes < 60) {
            return `${Math.round(minutes)}min`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = Math.round(minutes % 60);
            return remainingMinutes > 0 ? `${hours}h${remainingMinutes.toString().padStart(2, '0')}` : `${hours}h`;
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
     * Toggle du panneau principal
     */
    toggleMainPanel() {
        if (this.elements.mainPanel && this.elements.settingsBtn) {
            this.elements.settingsBtn.classList.toggle('active');
            this.elements.mainPanel.classList.toggle('collapsed');
        }
    }

    /**
     * Ferme le panneau principal
     */
    closeMainPanel() {
        if (this.elements.mainPanel && this.elements.settingsBtn) {
            this.elements.settingsBtn.classList.remove('active');
            this.elements.mainPanel.classList.add('collapsed');
        }
    }

    /**
     * Toggle du panneau d'aide
     */
    toggleHelpPanel() {
        if (this.elements.helpPanel && this.elements.helpBtn) {
            this.elements.helpBtn.classList.toggle('active');
            this.elements.helpPanel.classList.toggle('show');
        }
    }

    /**
     * Ferme le panneau d'aide
     */
    closeHelpPanel() {
        if (this.elements.helpPanel && this.elements.helpBtn) {
            this.elements.helpBtn.classList.remove('active');
            this.elements.helpPanel.classList.remove('show');
        }
    }

    /**
     * Ferme tous les panneaux
     */
    closeAllPanels() {
        this.closeMainPanel();
        this.closeHelpPanel();
    }

    /**
     * Masque un conteneur de suggestions
     * @param {HTMLElement} container - Conteneur à masquer
     */
    hideSuggestions(container) {
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Annule le timeout de suggestion pour un champ
     * @param {string} inputId - ID du champ de saisie
     */
    cancelSuggestionTimeout(inputId) {
        if (this.suggestions.timeouts.has(inputId)) {
            clearTimeout(this.suggestions.timeouts.get(inputId));
            this.suggestions.timeouts.delete(inputId);
        }
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