import { CONFIG } from '../config.js';

/**
 * Gestionnaire de la recherche flottante simplifiée
 * Gère la barre de recherche pill et le bouton de géolocalisation
 */
export class FloatingSearchManager {
    constructor(apiService, mapManager) {
        this.apiService = apiService;
        this.mapManager = mapManager;
        this.elements = {};
        this.isSearching = false;
        this.searchTimeout = null;
        this.currentPosition = null;
        this.destinationMarker = null;
        this.positionMarker = null;
    }

    /**
     * Initialise le gestionnaire de recherche flottante
     */
    async initialize() {
        try {
            this.cacheElements();
            this.setupEventListeners();
            this.setupAutocomplete();
            
            console.log('🔍 Gestionnaire de recherche flottante initialisé');
            
        } catch (error) {
            console.error('Erreur initialisation FloatingSearchManager:', error);
            throw error;
        }
    }

    /**
     * Cache les références aux éléments DOM
     */
    cacheElements() {
        const elementIds = [
            'destinationSearch',
            'geoLocationBtn', 
            'searchSuggestions',
            'searchPill'
        ];

        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });

        // Vérifier les éléments critiques
        const criticalElements = ['destinationSearch', 'geoLocationBtn'];
        const missingElements = criticalElements.filter(id => !this.elements[id]);
        
        if (missingElements.length > 0) {
            console.warn('Éléments DOM manquants:', missingElements);
        }

        console.log('🔧 Éléments FloatingSearch cachés:', {
            destinationSearch: !!this.elements.destinationSearch,
            geoLocationBtn: !!this.elements.geoLocationBtn,
            searchSuggestions: !!this.elements.searchSuggestions
        });
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        // Recherche de lieu
        if (this.elements.destinationSearch) {
            this.elements.destinationSearch.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });

            this.elements.destinationSearch.addEventListener('focus', () => {
                this.handleSearchFocus();
            });

            this.elements.destinationSearch.addEventListener('blur', () => {
                // Délai pour permettre la sélection des suggestions
                setTimeout(() => this.handleSearchBlur(), 200);
            });

            this.elements.destinationSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearchSubmit();
                }
            });
        }

        // Géolocalisation
        if (this.elements.geoLocationBtn) {
            this.elements.geoLocationBtn.addEventListener('click', () => {
                this.handleGeolocation();
            });
        }

        // Fermeture des suggestions au clic extérieur
        document.addEventListener('click', (e) => {
            if (!this.elements.searchPill?.contains(e.target)) {
                this.hideSuggestions();
            }
            
            // Fermer le panneau principal si on clique en dehors
            const mainPanel = document.getElementById('mainPanel');
            if (mainPanel && !mainPanel.contains(e.target) && !this.elements.searchPill?.contains(e.target)) {
                this.hideMainPanel();
            }
        });

        console.log('✅ Event listeners configurés');
    }

    /**
     * Configure l'autocomplétion via Google Places
     */
    setupAutocomplete() {
        if (!this.apiService || !this.elements.destinationSearch) return;

        // Initialiser le service Places si disponible
        if (this.apiService.initializePlacesService && this.mapManager.map) {
            this.apiService.initializePlacesService(this.mapManager.map);
        }

        console.log('🔧 Autocomplétion configurée');
    }

    /**
     * Gère la saisie dans le champ de recherche
     */
    async handleSearchInput(query) {
        const trimmedQuery = query.trim();
        
        // Annuler la recherche précédente
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        if (trimmedQuery.length < CONFIG.POI?.MIN_QUERY_LENGTH || 3) {
            this.hideSuggestions();
            return;
        }

        // Debounce pour éviter trop de requêtes
        this.searchTimeout = setTimeout(async () => {
            try {
                await this.performSearch(trimmedQuery);
            } catch (error) {
                console.error('Erreur recherche:', error);
                this.showToast('Erreur lors de la recherche', 'error');
            }
        }, CONFIG.POI?.SEARCH_DELAY || 300);
    }

    /**
     * Effectue la recherche de lieux
     */
    async performSearch(query) {
        if (this.isSearching) return;

        try {
            this.isSearching = true;
            
            // Utiliser le centre de la carte ou la position actuelle comme référence
            const searchCenter = this.currentPosition || this.mapManager.getMapCenter();
            
            // Rechercher via l'API Service
            const suggestions = await this.apiService.searchPlaces(query, {
                location: searchCenter,
                radius: 50000, // 50km
                types: ['geocode', 'establishment'] // Adresses et établissements
            });

            this.displaySuggestions(suggestions);
            
        } catch (error) {
            console.error('Erreur recherche Places:', error);
            this.hideSuggestions();
            
        } finally {
            this.isSearching = false;
        }
    }

    /**
     * Affiche les suggestions de recherche
     */
    displaySuggestions(suggestions) {
        if (!this.elements.searchSuggestions || !suggestions?.length) {
            this.hideSuggestions();
            return;
        }

        const suggestionsHtml = suggestions.slice(0, 8).map(suggestion => {
            const icon = this.getSuggestionIcon(suggestion.types);
            const mainText = suggestion.structured_formatting?.main_text || suggestion.description;
            const secondaryText = suggestion.structured_formatting?.secondary_text || '';
            
            return `
                <div class="search-suggestion-item" data-place-id="${suggestion.place_id}" data-description="${suggestion.description}">
                    <i class="fas fa-${icon} search-suggestion-icon"></i>
                    <div class="search-suggestion-text">
                        <div class="search-suggestion-main">${mainText}</div>
                        ${secondaryText ? `<div class="search-suggestion-detail">${secondaryText}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        this.elements.searchSuggestions.innerHTML = suggestionsHtml;
        this.showSuggestions();
        this.setupSuggestionListeners();
    }

    /**
     * Configure les écouteurs pour les suggestions
     */
    setupSuggestionListeners() {
        const suggestionItems = this.elements.searchSuggestions?.querySelectorAll('.search-suggestion-item');
        
        suggestionItems?.forEach(item => {
            item.addEventListener('click', () => {
                const placeId = item.dataset.placeId;
                const description = item.dataset.description;
                this.selectPlace(placeId, description);
            });
        });
    }

    /**
     * Sélectionne un lieu depuis les suggestions
     */
    async selectPlace(placeId, description) {
        try {
            this.hideSuggestions();
            this.elements.destinationSearch.value = description;

            // Obtenir les détails du lieu
            const placeDetails = await this.apiService.getPlaceDetails(placeId);
            
            if (placeDetails?.geometry?.location) {
                const location = {
                    lat: placeDetails.geometry.location.lat(),
                    lng: placeDetails.geometry.location.lng()
                };

                // Centrer la carte et ajouter le repère
                await this.setDestination(location, description);
                
                // Événement de tracking
                this.trackEvent('place_selected', { 
                    placeId, 
                    description,
                    source: 'search'
                });
            }
            
        } catch (error) {
            console.error('Erreur sélection lieu:', error);
            this.showToast('Impossible de sélectionner ce lieu', 'error');
        }
    }

    /**
     * Gère la soumission de recherche (Enter ou validation)
     */
    async handleSearchSubmit() {
        const query = this.elements.destinationSearch?.value?.trim();
        if (!query) return;

        try {
            // Rechercher le premier résultat pertinent
            const searchCenter = this.currentPosition || this.mapManager.getMapCenter();
            const results = await this.apiService.geocodeAddress(query, searchCenter);
            
            if (results?.length > 0) {
                const location = {
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng()
                };
                
                await this.setDestination(location, results[0].formatted_address);
                this.trackEvent('place_selected', { 
                    query, 
                    source: 'direct_search' 
                });
            } else {
                this.showToast('Lieu non trouvé', 'error');
            }
            
        } catch (error) {
            console.error('Erreur recherche directe:', error);
            this.showToast('Erreur lors de la recherche', 'error');
        }
    }

    /**
     * Définit la destination sur la carte
     */
    async setDestination(location, address) {
        try {
            // Centrer la carte sur le lieu
            this.mapManager.centerOn(location, 15);

            // Ajouter/Mettre à jour le repère destination
            if (this.destinationMarker) {
                this.destinationMarker.setMap(null);
            }

            this.destinationMarker = new google.maps.Marker({
                position: location,
                map: this.mapManager.map,
                title: 'Destination',
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="16" cy="16" r="12" fill="#ef4444" stroke="white" stroke-width="3"/>
                            <circle cx="16" cy="16" r="6" fill="white"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(32, 32),
                    anchor: new google.maps.Point(16, 16)
                }
            });

            this.showToast(`Destination: ${address}`, 'success');
            
            console.log('🎯 Destination définie:', { location, address });
            
        } catch (error) {
            console.error('Erreur définition destination:', error);
            this.showToast('Erreur lors de la définition de la destination', 'error');
        }
    }

    /**
     * Gère la géolocalisation
     */
    async handleGeolocation() {
        const geoBtn = this.elements.geoLocationBtn;
        
        try {
            console.log('🎯 Demande de géolocalisation...');
            this.trackEvent('geolocate_clicked');
            
            // État de chargement
            if (geoBtn) {
                geoBtn.classList.add('loading');
                const icon = geoBtn.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-spinner fa-spin';
                }
            }
            
            // Vérifier le support
            if (!navigator.geolocation) {
                throw new Error('La géolocalisation n\'est pas supportée par votre navigateur');
            }
            
            const position = await this.mapManager.getCurrentPosition();
            this.currentPosition = position;
            
            // Centrer la carte
            this.mapManager.centerOn(position, 16);
            
            // Ajouter/Mettre à jour le repère position
            if (this.positionMarker) {
                this.positionMarker.setMap(null);
            }

            this.positionMarker = new google.maps.Marker({
                position: position,
                map: this.mapManager.map,
                title: 'Ma position',
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="8" fill="#6366f1" stroke="white" stroke-width="3"/>
                            <circle cx="12" cy="12" r="3" fill="white"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(24, 24),
                    anchor: new google.maps.Point(12, 12)
                }
            });
            
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
            
            this.showToast('Position obtenue avec succès !', 'success');
            this.trackEvent('geolocate_success');
            
            console.log('✅ Géolocalisation réussie:', position);
            
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
            
            // Messages d'erreur contextuels
            let errorMessage = 'Impossible d\'obtenir votre position';
            if (error.code) {
                switch (error.code) {
                    case 1: // PERMISSION_DENIED
                        errorMessage = 'Autorisez la localisation pour centrer la carte sur votre position';
                        break;
                    case 2: // POSITION_UNAVAILABLE
                        errorMessage = 'Position indisponible. Vérifiez votre connexion GPS.';
                        break;
                    case 3: // TIMEOUT
                        errorMessage = 'Position indisponible';
                        break;
                }
            }
            
            this.showToast(errorMessage, 'error');
            this.trackEvent('geolocate_error', { error: error.message });
        }
    }

    /**
     * Obtient l'icône appropriée pour un type de suggestion
     */
    getSuggestionIcon(types) {
        if (types.includes('route') || types.includes('street_address')) {
            return 'road';
        } else if (types.includes('locality') || types.includes('administrative_area')) {
            return 'map-marker-alt';
        } else if (types.includes('establishment')) {
            return 'building';
        } else if (types.includes('point_of_interest')) {
            return 'star';
        }
        return 'map-marker-alt';
    }

    /**
     * Affiche les suggestions
     */
    showSuggestions() {
        if (this.elements.searchSuggestions) {
            this.elements.searchSuggestions.classList.add('show');
        }
    }

    /**
     * Masque les suggestions
     */
    hideSuggestions() {
        if (this.elements.searchSuggestions) {
            this.elements.searchSuggestions.classList.remove('show');
        }
    }

    /**
     * Gère le focus sur la recherche
     */
    handleSearchFocus() {
        const query = this.elements.destinationSearch?.value?.trim();
        if (query && query.length >= 3) {
            this.handleSearchInput(query);
        }
        
        // Ouvrir le panneau principal pour les options avancées
        this.showMainPanel();
        
        this.trackEvent('search_opened');
    }

    /**
     * Affiche le panneau principal de configuration
     */
    showMainPanel() {
        const mainPanel = document.getElementById('mainPanel');
        if (mainPanel) {
            mainPanel.classList.remove('collapsed');
            mainPanel.classList.add('show');
            document.body.classList.add('floating-search-active');
            
            console.log('📱 Panneau principal ouvert depuis la recherche flottante');
        }
    }

    /**
     * Masque le panneau principal
     */
    hideMainPanel() {
        const mainPanel = document.getElementById('mainPanel');
        if (mainPanel) {
            mainPanel.classList.remove('show');
            mainPanel.classList.add('collapsed');
            document.body.classList.remove('floating-search-active');
            
            console.log('📱 Panneau principal fermé');
        }
    }

    /**
     * Gère la perte de focus sur la recherche
     */
    handleSearchBlur() {
        // Les suggestions se masquent automatiquement via le délai
    }

    /**
     * Affiche un toast de notification
     */
    showToast(message, type = 'info') {
        // Supprimer les anciens toasts
        const existingToasts = document.querySelectorAll('.floating-toast');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `floating-toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' :
                     type === 'error' ? 'exclamation-triangle' :
                     'info-circle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        // Masquer automatiquement après 4 secondes
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    /**
     * Événements de tracking (optionnel)
     */
    trackEvent(eventName, data = {}) {
        // Implémentation du tracking si nécessaire
        console.log(`📊 Event: ${eventName}`, data);
    }

    /**
     * Nettoie les ressources
     */
    cleanup() {
        // Annuler les timeouts
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Supprimer les marqueurs
        if (this.destinationMarker) {
            this.destinationMarker.setMap(null);
        }
        if (this.positionMarker) {
            this.positionMarker.setMap(null);
        }

        console.log('🧹 FloatingSearchManager nettoyé');
    }
}