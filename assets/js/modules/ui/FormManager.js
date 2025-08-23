import { CONFIG, ConfigUtils } from '../../config.js';

/**
 * Gestionnaire des formulaires et champs de saisie pour MakeMyWay
 * Gère l'autocomplétion, les toggles et les sliders
 */
export class FormManager {
    constructor(apiService, uiManager, elements) {
        this.apiService = apiService;
        this.uiManager = uiManager;
        
        // Éléments DOM
        this.elements = {
            destinationAddress: elements.destinationAddress,
            endAddress: elements.endAddress,
            returnToStart: elements.returnToStart,
            targetDistance: elements.targetDistance,
            distanceValue: elements.distanceValue,
            maxLabel: elements.maxLabel,
            travelModeInputs: elements.travelModeInputs,
            destinationAddressSuggestions: elements.startAddressSuggestions,
            endAddressSuggestions: elements.endAddressSuggestions,
            poiSuggestions: elements.poiSuggestions
        };

        // État local des suggestions
        this.suggestions = {
            timeouts: new Map(),
            containers: new Map()
        };

        // Instances d'autocomplétion Google Places
        this.autocompletes = {};
    }

    /**
     * Configure la saisie automatique pour les adresses avec Google Places Autocomplete
     */
    setupAutocomplete() {
        // Vérifier que Google Maps est disponible
        if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
            console.warn('⚠️ Google Places API non disponible, autocomplétion désactivée');
            return;
        }

        try {
            // Configuration pour les autocompletes (privilégier les adresses)
            const autocompleteOptions = {
                types: ['address'],
                componentRestrictions: { country: 'fr' }, // Limiter à la France (optionnel)
                fields: ['place_id', 'geometry', 'name', 'formatted_address']
            };

            // Configurer l'autocomplétion pour le point de départ
            this.setupStartAddressAutocomplete(autocompleteOptions);

            // Configurer l'autocomplétion pour le point d'arrivée  
            this.setupEndAddressAutocomplete(autocompleteOptions);

            console.log('✅ Autocomplétion Google Places configurée');

        } catch (error) {
            console.error('Erreur configuration Google Places Autocomplete:', error);
        }
    }

    /**
     * Configure l'autocomplétion Google Places pour le point de départ
     * @param {Object} options - Options de configuration
     */
    setupStartAddressAutocomplete(options) {
        const input = this.elements.destinationAddress;
        if (!input) {
            console.warn('⚠️ Champ destinationAddress non trouvé');
            return;
        }

        // Créer l'instance d'autocomplétion
        const autocomplete = new google.maps.places.Autocomplete(input, options);

        // Écouter l'événement place_changed
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();

            // Vérifier que le lieu a une géométrie (coordonnées)
            if (!place.geometry || !place.geometry.location) {
                console.warn('⚠️ Lieu sélectionné sans coordonnées:', place.name);
                return;
            }

            // Extraire les coordonnées
            const location = place.geometry.location;
            const coordinates = {
                lat: location.lat(),
                lng: location.lng()
            };

            // Mettre à jour le point de départ via UIManager
            this.uiManager.setStartPoint(coordinates);

            console.log('📍 Point de départ défini via Google Places:', place.formatted_address);
        });

        // Stocker la référence pour un éventuel nettoyage
        this.autocompletes.start = autocomplete;
    }

    /**
     * Configure l'autocomplétion Google Places pour le point d'arrivée
     * @param {Object} options - Options de configuration
     */
    setupEndAddressAutocomplete(options) {
        const input = this.elements.endAddress;
        if (!input) {
            console.warn('⚠️ Champ endAddress non trouvé');
            return;
        }

        // Créer l'instance d'autocomplétion
        const autocomplete = new google.maps.places.Autocomplete(input, options);

        // Écouter l'événement place_changed
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();

            // Vérifier que le lieu a une géométrie (coordonnées)
            if (!place.geometry || !place.geometry.location) {
                console.warn('⚠️ Lieu sélectionné sans coordonnées:', place.name);
                return;
            }

            // Extraire les coordonnées
            const location = place.geometry.location;
            const coordinates = {
                lat: location.lat(),
                lng: location.lng()
            };

            // Mettre à jour le point d'arrivée via UIManager
            this.uiManager.setEndPoint(coordinates);

            console.log('🏁 Point d\'arrivée défini via Google Places:', place.formatted_address);
        });

        // Stocker la référence pour un éventuel nettoyage
        this.autocompletes.end = autocomplete;
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
                    // Méthode searchAddresses n'existe pas dans ApiService, désactiver cette fonctionnalité
                    console.warn('searchAddresses non implémentée dans ApiService');
                    this.hideSuggestions(suggestionsContainer);
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
                    const state = this.uiManager.getState();
                    const searchCenter = state.startPoint || this.uiManager.mapManager.getMapCenter();
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
            this.uiManager.setStartPoint(latlng);
        } else if (type === 'end') {
            this.uiManager.setEndPoint(latlng);
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
        this.uiManager.poiManager.addPOIToList(poi);
    }

    /**
     * Gère le changement du toggle "Retour au départ"
     * @param {boolean} isChecked - État du toggle
     */
    handleReturnToStartToggle(isChecked) {
        // Mettre à jour l'état dans UIManager
        const state = this.uiManager.getState();
        this.uiManager.state.returnToStart = isChecked;
        
        const endAddressGroup = this.elements.endAddress?.closest('.route-input-group');
        
        if (isChecked) {
            // Masquer et désactiver le champ d'arrivée
            if (endAddressGroup) {
                endAddressGroup.style.opacity = '0.5';
                endAddressGroup.style.pointerEvents = 'none';
            }
            
            // Supprimer le marqueur d'arrivée
            if (this.uiManager.state.endPoint) {
                this.uiManager.mapManager.removeEndMarker();
                this.uiManager.state.endPoint = null;
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
        
        this.uiManager.updateRouteInfo();
    }

    /**
     * Gère le changement de mode de transport
     * @param {string} mode - Nouveau mode ('walking', 'running', 'cycling')
     */
    handleModeChange(mode) {
        this.uiManager.state.currentMode = mode;
        this.updateDistanceLimits(mode);
        
        // Mettre \u00e0 jour les cat\u00e9gories POI selon le mode
        if (this.uiManager.poiManager) {
            this.uiManager.poiManager.updateCategoriesForMode(mode);
        }
        
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
            this.uiManager.state.targetDistance = limits.default;
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
        this.uiManager.state.targetDistance = parseFloat(value);
        
        if (this.elements.distanceValue) {
            this.elements.distanceValue.textContent = `${value} km`;
        }
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
     * Remet à zéro les champs de formulaire
     */
    reset() {
        // Vider les champs de saisie
        ['destinationAddress', 'endAddress'].forEach(fieldId => {
            if (this.elements[fieldId]) {
                this.elements[fieldId].value = '';
            }
        });

        // Masquer les suggestions
        Object.values(this.suggestions.containers).forEach(container => {
            this.hideSuggestions(container);
        });

        // Reset du toggle retour au départ
        if (this.elements.returnToStart) {
            this.elements.returnToStart.checked = false;
            this.handleReturnToStartToggle(false);
        }
    }
}