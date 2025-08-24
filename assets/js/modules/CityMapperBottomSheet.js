/**
 * CityMapperBottomSheet - Gestionnaire de bottom sheet mobile-first style CityMapper
 * Avec configuration complète du parcours intégrée
 * 
 * IMPORTANT: Ce module est conçu EXCLUSIVEMENT en mobile-first
 * Tous les événements utilisent touchstart pour une expérience mobile optimale
 */

import { CONFIG, ConfigUtils } from '../config.js';

export class CityMapperBottomSheet {
    constructor(apiService, mapManager, uiManager) {
        this.apiService = apiService;
        this.mapManager = mapManager;
        this.uiManager = uiManager;
        
        // États du bottom sheet
        this.state = {
            isOpen: false,
            currentHeight: 'closed',
            isDragging: false,
            startY: 0,
            currentY: 0,
            startHeight: 0,
            
            // Configuration du parcours
            destination: null,
            mode: 'walking',
            distance: 5,
            returnToStart: true,
            selectedPOIs: [],
            useCurrentLocation: false
        };
        
        // Éléments DOM
        this.elements = {};
        
        // Hauteurs prédéfinies (en vh)
        this.heights = {
            closed: 0,
            peek: 15,
            open: 70,
            full: 90
        };
        
        // Configuration des modes de transport
        this.transportModes = [
            { id: 'walking', icon: 'fa-walking', label: 'Marche' },
            { id: 'running', icon: 'fa-running', label: 'Course' },
            { id: 'cycling', icon: 'fa-bicycle', label: 'Vélo' }
        ];
        
        // Catégories de POI
        this.poiCategories = [
            { id: 'nature', icon: '🌳', label: 'Nature' },
            { id: 'culture', icon: '🏛️', label: 'Culture' },
            { id: 'sport', icon: '🏃', label: 'Sport' },
            { id: 'panorama', icon: '🏔️', label: 'Vue' },
            { id: 'eau', icon: '💧', label: 'Eau' },
            { id: 'shopping', icon: '🛍️', label: 'Shopping' }
        ];
        
        // Recherches récentes
        this.recentSearches = [];
    }
    
    async initialize() {
        console.log('🏙️ Initialisation CityMapper Bottom Sheet avec Config Parcours');
        
        // Créer la structure HTML
        this.createBottomSheetHTML();
        
        // Cacher les éléments DOM
        this.cacheElements();
        
        // Configurer les événements tactiles
        this.setupTouchEvents();
        
        // Configurer l'autocomplétion
        this.setupAutocomplete();
        
        // Charger les données sauvegardées
        this.loadSavedData();
    }
    
    createBottomSheetHTML() {
        // Créer l'overlay de la carte
        const mapOverlay = document.createElement('div');
        mapOverlay.className = 'map-overlay';
        mapOverlay.id = 'mapOverlay';
        document.body.appendChild(mapOverlay);
        
        // Créer le bottom sheet
        const bottomSheet = document.createElement('div');
        bottomSheet.className = 'bottom-sheet';
        bottomSheet.id = 'cityMapperSheet';
        
        bottomSheet.innerHTML = `
            <!-- Poignée de glissement -->
            <div class="sheet-handle" id="sheetHandle">
                <div class="sheet-handle-bar"></div>
            </div>
            
            <!-- Header avec champ de recherche -->
            <div class="sheet-header">
                <div class="sheet-search-bar">
                    <i class="fas fa-search sheet-search-icon"></i>
                    <input type="text" 
                           class="sheet-search-input" 
                           id="sheetSearchInput"
                           placeholder="Où souhaitez-vous aller ?"
                           autocomplete="off">
                    <div class="sheet-search-actions">
                        <button class="sheet-search-action" id="clearSearchBtn" style="display:none;">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="sheet-search-action" id="currentLocationBtn">
                            <i class="fas fa-location-arrow"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Suggestions d'autocomplétion -->
                <div class="search-suggestions" id="sheetSuggestions"></div>
            </div>
            
            <!-- Contenu scrollable -->
            <div class="sheet-content">
                <!-- Configuration du parcours -->
                <div class="route-config">
                    
                    <!-- Mode de transport -->
                    <div class="config-section">
                        <div class="config-title">MODE DE TRANSPORT</div>
                        <div class="transport-modes" id="transportModes">
                            ${this.transportModes.map(mode => `
                                <button class="mode-button ${mode.id === 'walking' ? 'active' : ''}" 
                                        data-mode="${mode.id}">
                                    <i class="fas ${mode.icon} mode-icon"></i>
                                    <span class="mode-label">${mode.label}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Distance -->
                    <div class="config-section">
                        <div class="distance-config">
                            <div class="distance-header">
                                <span class="distance-label">Distance du parcours</span>
                                <span class="distance-value" id="cityMapperDistanceValue">5 km</span>
                            </div>
                            <input type="range" 
                                   class="distance-slider" 
                                   id="distanceSlider"
                                   min="1" 
                                   max="15" 
                                   value="5" 
                                   step="0.5">
                            <div class="distance-limits">
                                <span id="minDistance">1 km</span>
                                <span id="maxDistance">15 km</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Options de parcours -->
                    <div class="config-section">
                        <div class="config-title">OPTIONS</div>
                        <div class="route-options">
                            <div class="option-card active" id="returnToStartOption">
                                <div class="option-info">
                                    <div class="option-icon">
                                        <i class="fas fa-sync-alt"></i>
                                    </div>
                                    <div class="option-text">
                                        <div class="option-label">Parcours en boucle</div>
                                        <div class="option-sublabel">Retour au point de départ</div>
                                    </div>
                                </div>
                                <div class="option-toggle"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Points d'intérêt -->
                    <div class="config-section poi-section">
                        <div class="config-title">POINTS D'INTÉRÊT</div>
                        <div class="poi-categories" id="poiCategories">
                            ${this.poiCategories.map(cat => `
                                <button class="poi-chip" data-poi="${cat.id}">
                                    <span class="poi-chip-icon">${cat.icon}</span>
                                    <span class="poi-chip-label">${cat.label}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                </div>
                
                <!-- Recherches récentes -->
                <div class="recent-searches" id="recentSearchesSection" style="display:none;">
                    <div class="recent-title">DESTINATIONS RÉCENTES</div>
                    <div class="recent-list" id="recentList"></div>
                </div>
            </div>
            
            <!-- Bouton de génération fixe en bas -->
            <div class="generate-button-container">
                <button class="generate-button" id="generateRouteBtn" disabled>
                    <i class="fas fa-route"></i>
                    <span>Générer le parcours</span>
                </button>
            </div>
        `;
        
        document.body.appendChild(bottomSheet);
        
        // Vérifier immédiatement après création que l'élément existe
        const checkElement = document.getElementById('cityMapperDistanceValue');
        console.log('🔍 Vérification après création DOM - cityMapperDistanceValue existe:', !!checkElement, checkElement);
    }
    
    cacheElements() {
        this.elements = {
            bottomSheet: document.getElementById('cityMapperSheet'),
            mapOverlay: document.getElementById('mapOverlay'),
            sheetHandle: document.getElementById('sheetHandle'),
            searchInput: document.getElementById('sheetSearchInput'),
            clearBtn: document.getElementById('clearSearchBtn'),
            currentLocationBtn: document.getElementById('currentLocationBtn'),
            suggestions: document.getElementById('sheetSuggestions'),
            
            // Configuration
            transportModes: document.getElementById('transportModes'),
            distanceSlider: document.getElementById('distanceSlider'),
            distanceValue: document.getElementById('cityMapperDistanceValue'),
            minDistance: document.getElementById('minDistance'),
            maxDistance: document.getElementById('maxDistance'),
            returnToStartOption: document.getElementById('returnToStartOption'),
            poiCategories: document.getElementById('poiCategories'),
            generateBtn: document.getElementById('generateRouteBtn'),
            
            // Récents
            recentSection: document.getElementById('recentSearchesSection'),
            recentList: document.getElementById('recentList'),
            
            // Éléments de la barre de recherche flottante existante
            floatingSearch: document.querySelector('.search-pill'),
            floatingInput: document.querySelector('.search-pill-input')
        };
        
        // DEBUG: Vérifier que les éléments critiques sont trouvés
        console.log('📋 Éléments slider trouvés:', {
            distanceSlider: !!this.elements.distanceSlider,
            distanceValue: !!this.elements.distanceValue,
            sliderValue: this.elements.distanceSlider?.value,
            valueText: this.elements.distanceValue?.textContent
        });
        
        if (!this.elements.distanceSlider) {
            console.error('❌ distanceSlider (id="distanceSlider") non trouvé!');
        }
        if (!this.elements.distanceValue) {
            console.error('❌ distanceValue (id="distanceValue") non trouvé!');
        }
    }
    
    setupTouchEvents() {
        // MOBILE-FIRST: Utilisation exclusive de touchstart
        
        // Quand on touche la barre de recherche flottante
        if (this.elements.floatingSearch) {
            this.elements.floatingSearch.addEventListener('touchstart', (e) => {
                console.log('📱 Touch sur search pill - ouverture bottom sheet');
                e.preventDefault();
                e.stopPropagation();
                this.open();
            }, { passive: false });
            
            // Fallback pour desktop
            this.elements.floatingSearch.addEventListener('click', (e) => {
                if (!('ontouchstart' in window)) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.open();
                }
            });
        }
        
        // Overlay pour fermer
        this.elements.mapOverlay.addEventListener('touchstart', (e) => {
            console.log('📱 Touch sur overlay - fermeture');
            e.preventDefault();
            e.stopPropagation();
            this.close();
        }, { passive: false });
        
        // Gérer aussi les clics pour desktop
        this.elements.mapOverlay.addEventListener('click', (e) => {
            console.log('🖱️ Click sur overlay - fermeture');
            e.preventDefault();
            e.stopPropagation();
            if (!('ontouchstart' in window)) {
                this.close();
            }
        });
        
        // Gestion du glissement (drag) de la poignée
        this.setupDragHandle();
        
        // Modes de transport
        this.elements.transportModes.querySelectorAll('.mode-button').forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.selectMode(btn.dataset.mode);
            }, { passive: false });
            
            btn.addEventListener('click', (e) => {
                if (!('ontouchstart' in window)) {
                    this.selectMode(btn.dataset.mode);
                }
            });
        });
        
        // Slider de distance - Événements pour mobile et desktop
        this.elements.distanceSlider.addEventListener('input', (e) => {
            console.log('📏 Slider input:', e.target.value);
            this.updateDistance(e.target.value);
        });
        
        // Pour mobile, ajouter aussi touchmove pour une meilleure réactivité
        this.elements.distanceSlider.addEventListener('touchmove', (e) => {
            console.log('📏 Slider touchmove:', e.target.value);
            this.updateDistance(e.target.value);
        }, { passive: true });
        
        // Et change pour être sûr de capturer la valeur finale
        this.elements.distanceSlider.addEventListener('change', (e) => {
            console.log('📏 Slider change:', e.target.value);
            this.updateDistance(e.target.value);
        });
        
        // Option boucle
        this.elements.returnToStartOption.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.toggleReturnToStart();
        }, { passive: false });
        
        this.elements.returnToStartOption.addEventListener('click', (e) => {
            if (!('ontouchstart' in window)) {
                this.toggleReturnToStart();
            }
        });
        
        // POI
        this.elements.poiCategories.querySelectorAll('.poi-chip').forEach(chip => {
            chip.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.togglePOI(chip.dataset.poi);
            }, { passive: false });
            
            chip.addEventListener('click', (e) => {
                if (!('ontouchstart' in window)) {
                    this.togglePOI(chip.dataset.poi);
                }
            });
        });
        
        // Bouton position actuelle
        this.elements.currentLocationBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.useCurrentLocation();
        }, { passive: false });
        
        // Bouton clear
        this.elements.clearBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.clearSearch();
        }, { passive: false });
        
        // Bouton générer
        this.elements.generateBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.generateRoute();
        }, { passive: false });
        
        this.elements.generateBtn.addEventListener('click', (e) => {
            if (!('ontouchstart' in window)) {
                this.generateRoute();
            }
        });
        
        // Input events
        this.elements.searchInput.addEventListener('focus', () => {
            console.log('📱 Focus sur input dans bottom sheet');
            this.elements.clearBtn.style.display = this.elements.searchInput.value ? 'flex' : 'none';
        });
        
        this.elements.searchInput.addEventListener('input', () => {
            const value = this.elements.searchInput.value;
            this.elements.clearBtn.style.display = value ? 'flex' : 'none';
            
            // SYNCHRONISATION: Mettre à jour UIManager lors de la saisie manuelle
            if (this.uiManager && this.uiManager.updateDestination) {
                // Utiliser un debounce pour éviter trop d'appels
                clearTimeout(this.syncTimeout);
                this.syncTimeout = setTimeout(() => {
                    // Ne mettre à jour que le texte, pas les coords (sera fait lors de la sélection)
                    if (value !== this.uiManager.getDestination().text) {
                        this.uiManager.updateDestination({
                            text: value,
                            coords: null,
                            source: 'citymapper'
                        });
                    }
                }, 500);
            }
            
            // La logique d'autocomplete est déjà gérée plus bas
            
            // Activer/désactiver le bouton générer
            this.updateGenerateButton();
        });
    }
    
    setupDragHandle() {
        let startY = 0;
        let startHeight = 0;
        let currentHeight = 0;
        
        const handle = this.elements.sheetHandle;
        const sheet = this.elements.bottomSheet;
        
        // Touch start
        handle.addEventListener('touchstart', (e) => {
            console.log('📱 Début du drag');
            this.state.isDragging = true;
            startY = e.touches[0].clientY;
            startHeight = sheet.offsetHeight;
            sheet.classList.add('dragging');
        }, { passive: true });
        
        // Touch move
        document.addEventListener('touchmove', (e) => {
            if (!this.state.isDragging) return;
            
            const deltaY = startY - e.touches[0].clientY;
            currentHeight = startHeight + deltaY;
            
            // Limiter la hauteur
            const maxHeight = window.innerHeight * 0.9;
            const minHeight = window.innerHeight * 0.15;
            
            currentHeight = Math.max(minHeight, Math.min(maxHeight, currentHeight));
            sheet.style.height = `${currentHeight}px`;
        }, { passive: true });
        
        // Touch end
        document.addEventListener('touchend', (e) => {
            if (!this.state.isDragging) return;
            
            this.state.isDragging = false;
            sheet.classList.remove('dragging');
            
            // Snap aux hauteurs prédéfinies
            const vh = window.innerHeight / 100;
            const currentVh = currentHeight / vh;
            
            if (currentVh < 25) {
                this.close();
            } else if (currentVh < 55) {
                this.setHeight('open');
            } else {
                this.setHeight('full');
            }
        });
    }
    
    setupAutocomplete() {
        let autocompleteTimeout;
        
        this.elements.searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            
            clearTimeout(autocompleteTimeout);
            
            if (query.length < 3) {
                this.hideSuggestions();
                return;
            }
            
            autocompleteTimeout = setTimeout(async () => {
                const suggestions = await this.apiService.searchPlaces(query);
                this.displaySuggestions(suggestions);
            }, 300);
        });
    }
    
    selectMode(mode) {
        console.log(`🚶 Mode sélectionné: ${mode}`);
        this.state.mode = mode;
        
        // Mettre à jour l'UI
        this.elements.transportModes.querySelectorAll('.mode-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Mettre à jour les limites de distance selon le mode
        const limits = CONFIG.DISTANCE_LIMITS[mode];
        this.elements.distanceSlider.min = limits.min;
        this.elements.distanceSlider.max = limits.max;
        this.elements.minDistance.textContent = `${limits.min} km`;
        this.elements.maxDistance.textContent = `${limits.max} km`;
        
        // Ajuster la distance si nécessaire
        if (this.state.distance < limits.min) {
            this.updateDistance(limits.min);
        } else if (this.state.distance > limits.max) {
            this.updateDistance(limits.max);
        }
        
        // Synchroniser avec l'UIManager
        if (this.uiManager) {
            this.uiManager.state.currentMode = mode;
        }
    }
    
    updateDistance(value) {
        console.log('🎯 updateDistance appelé avec:', value);
        
        this.state.distance = parseFloat(value);
        const displayValue = `${value} km`;
        
        // Utiliser le BON ID spécifique au CityMapperBottomSheet
        const distanceEl = document.getElementById('cityMapperDistanceValue');
        
        if (distanceEl) {
            // Mise à jour simple et directe
            distanceEl.textContent = displayValue;
            distanceEl.innerHTML = displayValue;
            
            console.log('✅ Distance mise à jour dans CityMapper:', displayValue);
            console.log('✅ Element:', distanceEl);
            
            // Cache
            if (!this.elements.distanceValue) {
                this.elements.distanceValue = distanceEl;
            }
        } else {
            console.error('❌ Element cityMapperDistanceValue introuvable!');
            
            // Fallback: chercher dans le bottom sheet par classe
            const inBottomSheet = document.querySelector('#cityMapperSheet .distance-value');
            if (inBottomSheet) {
                inBottomSheet.textContent = displayValue;
                inBottomSheet.innerHTML = displayValue;
                console.log('✅ Mise à jour par fallback classe:', inBottomSheet);
            }
        }
        
        // Mettre à jour la position du slider
        if (this.elements.distanceSlider) {
            this.elements.distanceSlider.value = value;
        } else {
            const slider = document.getElementById('distanceSlider');
            if (slider) {
                slider.value = value;
            }
        }
        
        // Mettre à jour aussi les limites min/max si elles existent
        if (this.elements.minDistance) {
            const min = this.elements.distanceSlider?.min || 1;
            this.elements.minDistance.textContent = `${min} km`;
        }
        if (this.elements.maxDistance) {
            const max = this.elements.distanceSlider?.max || 15;
            this.elements.maxDistance.textContent = `${max} km`;
        }
        
        // Synchroniser avec l'UIManager
        if (this.uiManager) {
            this.uiManager.state.targetDistance = this.state.distance;
        }
    }
    
    toggleReturnToStart() {
        const option = this.elements.returnToStartOption;
        option.classList.toggle('active');
        this.state.returnToStart = option.classList.contains('active');
        
        // Synchroniser avec l'UIManager
        if (this.uiManager) {
            this.uiManager.state.returnToStart = this.state.returnToStart;
            this.uiManager.state.routeType = this.state.returnToStart ? 'loop' : 'oneway';
        }
    }
    
    togglePOI(poiId) {
        const chip = this.elements.poiCategories.querySelector(`[data-poi="${poiId}"]`);
        chip.classList.toggle('active');
        
        if (chip.classList.contains('active')) {
            if (!this.state.selectedPOIs.includes(poiId)) {
                this.state.selectedPOIs.push(poiId);
            }
        } else {
            this.state.selectedPOIs = this.state.selectedPOIs.filter(id => id !== poiId);
        }
        
        console.log('POIs sélectionnés:', this.state.selectedPOIs);
        
        // Synchroniser avec POIManager si disponible
        if (this.uiManager && this.uiManager.poiManager) {
            this.uiManager.poiManager.selectedCategories = this.state.selectedPOIs;
        }
    }
    
    open() {
        console.log('🎬 Ouverture du bottom sheet avec config parcours');
        
        // SYNCHRONISATION: Récupérer la destination depuis UIManager
        if (this.uiManager && this.uiManager.getDestination) {
            const destination = this.uiManager.getDestination();
            if (destination.text) {
                this.elements.searchInput.value = destination.text;
                this.elements.clearBtn.style.display = 'flex';
            }
            if (destination.coords) {
                this.state.destination = destination.coords;
            }
        }
        
        // Masquer la barre de recherche flottante
        if (this.elements.floatingSearch) {
            this.elements.floatingSearch.style.opacity = '0';
            this.elements.floatingSearch.style.pointerEvents = 'none';
        }
        
        // Afficher l'overlay
        this.elements.mapOverlay.classList.add('show');
        
        // Ouvrir le bottom sheet
        this.elements.bottomSheet.classList.add('open');
        this.state.isOpen = true;
        this.state.currentHeight = 'open';
        
        // Focus sur le champ de recherche après l'animation
        setTimeout(() => {
            this.elements.searchInput.focus();
        }, 400);
        
        // Charger les recherches récentes
        this.displayRecentSearches();
        
        // Mettre à jour le bouton générer
        this.updateGenerateButton();
    }
    
    close() {
        console.log('🎬 Fermeture du bottom sheet');
        
        // SYNCHRONISATION: Synchroniser l'état avant de fermer
        if (this.uiManager && this.uiManager.syncDestinationInputs) {
            this.uiManager.syncDestinationInputs();
        }
        
        // Réafficher la barre de recherche flottante
        if (this.elements.floatingSearch) {
            this.elements.floatingSearch.style.opacity = '1';
            this.elements.floatingSearch.style.pointerEvents = 'all';
        }
        
        // Masquer l'overlay
        this.elements.mapOverlay.classList.remove('show');
        
        // Fermer le bottom sheet
        this.elements.bottomSheet.classList.remove('open', 'full');
        this.state.isOpen = false;
        this.state.currentHeight = 'closed';
    }
    
    setHeight(height) {
        const sheet = this.elements.bottomSheet;
        
        // Retirer toutes les classes de hauteur
        sheet.classList.remove('peek', 'open', 'full');
        
        // Ajouter la nouvelle classe
        if (height !== 'closed') {
            sheet.classList.add(height);
        }
        
        this.state.currentHeight = height;
        sheet.style.height = ''; // Reset inline style
    }
    
    async useCurrentLocation() {
        console.log('📍 Utilisation de la position actuelle comme destination');
        
        this.elements.currentLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000
                    });
                });
                
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Géocoder pour obtenir l'adresse
                const address = await this.apiService.reverseGeocode(coords.lat, coords.lng);
                
                // Mettre à jour l'input
                this.elements.searchInput.value = address || 'Position actuelle';
                this.state.destination = coords;
                this.state.useCurrentLocation = true;
                
                // Placer le marqueur sur la carte
                this.mapManager.setStartMarker(coords);
                this.mapManager.centerOn(coords, 15);
                
                // Synchroniser avec UIManager
                if (this.uiManager) {
                    this.uiManager.state.startPoint = coords;
                }
                
                this.updateGenerateButton();
                this.showToast('Position obtenue avec succès', 'success');
                
            } catch (error) {
                console.error('Erreur géolocalisation:', error);
                this.showToast('Impossible d\'obtenir votre position', 'error');
            }
        }
        
        this.elements.currentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
    }
    
    async generateRoute() {
        if (!this.state.destination && !this.state.useCurrentLocation) {
            this.showToast('Veuillez choisir une destination', 'error');
            return;
        }
        
        console.log('🚀 Génération du parcours avec:', {
            destination: this.state.destination,
            mode: this.state.mode,
            distance: this.state.distance,
            returnToStart: this.state.returnToStart,
            pois: this.state.selectedPOIs
        });
        
        // Synchroniser tous les paramètres avec UIManager
        if (this.uiManager) {
            this.uiManager.state.currentMode = this.state.mode;
            this.uiManager.state.targetDistance = this.state.distance;
            this.uiManager.state.returnToStart = this.state.returnToStart;
            this.uiManager.state.routeType = this.state.returnToStart ? 'loop' : 'oneway';
            
            if (this.state.destination) {
                this.uiManager.state.endPoint = this.state.destination;
                this.uiManager.state.destinationPoint = this.state.destination;
                this.uiManager.state.destinationSelected = true;
            }
            
            if (this.uiManager.poiManager) {
                this.uiManager.poiManager.selectedCategories = this.state.selectedPOIs;
            }
        }
        
        // Fermer le bottom sheet
        this.close();
        
        // Lancer la génération via UIManager
        if (this.uiManager) {
            this.uiManager.generateRoute();
        }
    }
    
    updateGenerateButton() {
        const hasDestination = this.state.destination || this.state.useCurrentLocation || this.elements.searchInput.value.length > 0;
        this.elements.generateBtn.disabled = !hasDestination;
    }
    
    displaySuggestions(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        const html = suggestions.map(place => `
            <div class="search-suggestion-item" data-place-id="${place.place_id}">
                <i class="fas fa-map-marker-alt search-suggestion-icon"></i>
                <div class="search-suggestion-text">
                    <div>${place.name}</div>
                    <div class="search-suggestion-detail">${place.address}</div>
                </div>
            </div>
        `).join('');
        
        this.elements.suggestions.innerHTML = html;
        this.elements.suggestions.classList.add('show');
        
        // Ajouter les événements
        this.elements.suggestions.querySelectorAll('.search-suggestion-item').forEach(item => {
            item.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const placeId = item.dataset.placeId;
                const place = suggestions.find(p => p.place_id === placeId);
                this.selectLocation(place);
            }, { passive: false });
            
            item.addEventListener('click', (e) => {
                if (!('ontouchstart' in window)) {
                    const placeId = item.dataset.placeId;
                    const place = suggestions.find(p => p.place_id === placeId);
                    this.selectLocation(place);
                }
            });
        });
    }
    
    hideSuggestions() {
        this.elements.suggestions.classList.remove('show');
        this.elements.suggestions.innerHTML = '';
    }
    
    async selectLocation(place) {
        console.log('📍 Lieu sélectionné:', place);
        
        // Mettre à jour l'input local
        this.elements.searchInput.value = place.name;
        this.elements.clearBtn.style.display = 'flex';
        
        // Masquer les suggestions
        this.hideSuggestions();
        
        // Si le lieu n'a pas de géométrie, récupérer les détails
        if (!place.geometry && place.place_id) {
            const placeDetails = await this.apiService.getPlaceDetails(place.place_id);
            if (placeDetails) {
                place.geometry = placeDetails.geometry;
            }
        }
        
        // Définir comme destination
        if (place.geometry) {
            const coords = {
                lat: typeof place.geometry.location.lat === 'function' 
                    ? place.geometry.location.lat() 
                    : place.geometry.location.lat,
                lng: typeof place.geometry.location.lng === 'function'
                    ? place.geometry.location.lng()
                    : place.geometry.location.lng
            };
            
            this.state.destination = coords;
            this.state.useCurrentLocation = false;
            
            // SYNCHRONISATION: Utiliser UIManager pour la source de vérité unique
            if (this.uiManager && this.uiManager.updateDestination) {
                this.uiManager.updateDestination({
                    text: place.name || place.address,
                    coords: coords,
                    source: 'citymapper'
                });
            } else {
                // Fallback: comportement original
                this.mapManager.setEndMarker(coords);
                this.mapManager.centerOn(coords, 15);
            }
            
            // Sauvegarder dans les recherches récentes
            this.saveRecentSearch(place);
            
            // Activer le bouton générer
            this.updateGenerateButton();
        } else {
            console.warn('⚠️ Impossible de récupérer les coordonnées du lieu');
            this.showToast('Impossible de localiser cette adresse', 'error');
        }
    }
    
    saveRecentSearch(place) {
        // Sauvegarder dans localStorage
        let recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        
        // Éviter les doublons
        recent = recent.filter(r => r.place_id !== place.place_id);
        
        // Ajouter en tête
        recent.unshift({
            place_id: place.place_id,
            name: place.name,
            address: place.address,
            geometry: place.geometry,
            timestamp: Date.now()
        });
        
        // Limiter à 10 éléments
        recent = recent.slice(0, 10);
        
        localStorage.setItem('recentSearches', JSON.stringify(recent));
        this.recentSearches = recent;
    }
    
    displayRecentSearches() {
        const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        
        if (recent.length === 0) {
            this.elements.recentSection.style.display = 'none';
            return;
        }
        
        this.elements.recentSection.style.display = 'block';
        
        const html = recent.map(item => {
            const timeAgo = this.getTimeAgo(item.timestamp);
            return `
                <div class="recent-item" data-place-id="${item.place_id}">
                    <div class="recent-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <div class="recent-text">${item.name}</div>
                    <div class="recent-time">${timeAgo}</div>
                </div>
            `;
        }).join('');
        
        this.elements.recentList.innerHTML = html;
        
        // Ajouter les événements
        this.elements.recentList.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const placeId = item.dataset.placeId;
                const place = recent.find(r => r.place_id === placeId);
                this.selectLocation(place);
            }, { passive: false });
            
            item.addEventListener('click', (e) => {
                if (!('ontouchstart' in window)) {
                    const placeId = item.dataset.placeId;
                    const place = recent.find(r => r.place_id === placeId);
                    this.selectLocation(place);
                }
            });
        });
    }
    
    getTimeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'À l\'instant';
        if (minutes < 60) return `Il y a ${minutes} min`;
        if (hours < 24) return `Il y a ${hours}h`;
        if (days < 7) return `Il y a ${days}j`;
        return new Date(timestamp).toLocaleDateString('fr-FR');
    }
    
    clearSearch() {
        this.elements.searchInput.value = '';
        this.elements.clearBtn.style.display = 'none';
        this.hideSuggestions();
        this.state.destination = null;
        this.state.useCurrentLocation = false;
        
        // SYNCHRONISATION: Effacer aussi dans UIManager
        if (this.uiManager && this.uiManager.updateDestination) {
            this.uiManager.updateDestination({
                text: '',
                coords: null,
                source: 'citymapper'
            });
        }
        
        this.updateGenerateButton();
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `floating-toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    loadSavedData() {
        // Charger les données sauvegardées
        this.recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        
        // Charger les préférences utilisateur
        const savedPrefs = localStorage.getItem('routePreferences');
        if (savedPrefs) {
            const prefs = JSON.parse(savedPrefs);
            if (prefs.mode) this.selectMode(prefs.mode);
            if (prefs.distance) this.updateDistance(prefs.distance);
            if (prefs.returnToStart !== undefined) {
                this.state.returnToStart = prefs.returnToStart;
                this.elements.returnToStartOption.classList.toggle('active', prefs.returnToStart);
            }
        }
    }
    
    savePreferences() {
        const prefs = {
            mode: this.state.mode,
            distance: this.state.distance,
            returnToStart: this.state.returnToStart
        };
        localStorage.setItem('routePreferences', JSON.stringify(prefs));
    }
}

// Export pour utilisation globale
window.CityMapperBottomSheet = CityMapperBottomSheet;