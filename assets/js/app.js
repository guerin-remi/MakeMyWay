/**
 * MakeMyWay - Application de génération de parcours
 */

class MakeMyWayApp {
    constructor() {
        this.map = null;
        this.markers = [];
        this.routePolyline = null;
        this.startPoint = null;
        this.endPoint = null;
        this.pois = [];
        
        // Cache pour optimiser les performances
        this.routeCache = new Map();
        this.snapCache = new Map();
        
        // Nettoyage automatique du cache (toutes les 10 minutes)
        setInterval(() => this.cleanupCache(), 10 * 60 * 1000);
        
        // Configuration POI
        this.poiCategories = [
            { id: 'parc', name: 'Parcs et jardins', icon: '🌳', queries: ['parc', 'jardin public'] },
            { id: 'monument', name: 'Monuments', icon: '🏛️', queries: ['monument', 'château'] },
            { id: 'eau', name: 'Points d\'eau', icon: '💧', queries: ['lac', 'rivière'] },
            { id: 'culture', name: 'Lieux culturels', icon: '🎭', queries: ['musée', 'théâtre'] }
        ];
    }

    async init() {
        console.log('🚀 Initialisation de MakeMyWay...');
        
        try {
            this.initializeMap();
            this.setupEventListeners();
            this.setupAutocomplete();
            this.setupUI();
            
            console.log('✅ MakeMyWay initialisé avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.showError('Erreur lors de l\'initialisation de l\'application');
        }
    }

    initializeMap() {
        if (typeof L === 'undefined') {
            throw new Error('Leaflet n\'est pas chargé');
        }

        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            throw new Error('Conteneur de carte non trouvé');
        }

        // Créer la carte
        this.map = L.map('map').setView([48.8566, 2.3522], 12);
        
        // Ajouter les tuiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Événements de carte
        this.map.on('click', (e) => this.handleMapClick(e));
        
        console.log('🗺️ Carte initialisée');
    }

    setupEventListeners() {
        // Bouton générer
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateRoute());
        }

        // Bouton reset
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }

        // Bouton export
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportGPX());
        }

        // Bouton position
        const useLocationBtn = document.getElementById('useLocationBtn');
        if (useLocationBtn) {
            useLocationBtn.addEventListener('click', () => this.useCurrentLocation());
        }

        // Slider distance
        const distanceSlider = document.getElementById('targetDistance');
        const distanceValue = document.getElementById('distanceValue');
        if (distanceSlider && distanceValue) {
            distanceSlider.addEventListener('input', (e) => {
                distanceValue.textContent = e.target.value + ' km';
            });
        }

        // Gestion POI
        const addPOIBtn = document.getElementById('addPOIBtn');
        if (addPOIBtn) {
            addPOIBtn.addEventListener('click', () => this.addCustomPOI());
        }

        const poiInput = document.getElementById('poiInput');
        if (poiInput) {
            poiInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addCustomPOI();
                }
            });
            this.setupPOIAutocomplete(poiInput);
        }

        // Gestion des onglets POI
        const poiTabs = document.querySelectorAll('.poi-tab');
        poiTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchPOITab(tabName);
            });
        });

        // Gestion des presets POI
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.currentTarget.dataset.preset;
                this.togglePOIPreset(preset, e.currentTarget);
            });
        });

        // Contrôles de carte
        const centerMapBtn = document.getElementById('centerMapBtn');
        if (centerMapBtn) {
            centerMapBtn.addEventListener('click', () => this.centerMapOnRoute());
        }

        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        // Gestion du toggle "Retour au départ"
        const returnToStartToggle = document.getElementById('returnToStart');
        if (returnToStartToggle) {
            returnToStartToggle.addEventListener('change', (e) => {
                this.handleReturnToStartToggle(e.target.checked);
            });
        }

        // Boutons de suppression des points
        const clearStartBtn = document.getElementById('clearStartBtn');
        if (clearStartBtn) {
            clearStartBtn.addEventListener('click', () => this.removeStartPoint());
        }

        const clearEndBtn = document.getElementById('clearEndBtn');
        if (clearEndBtn) {
            clearEndBtn.addEventListener('click', () => this.removeEndPoint());
        }

        // Gestion de la bulle d'aide au survol
        const routeHelpBtn = document.getElementById('routeHelpBtn');
        const routeHelpBubble = document.getElementById('routeHelpBubble');

        if (routeHelpBtn && routeHelpBubble) {
            routeHelpBtn.addEventListener('mouseenter', () => {
                routeHelpBubble.style.display = 'block';
            });

            routeHelpBtn.addEventListener('mouseleave', () => {
                // Délai pour permettre à l'utilisateur de passer sur la bulle
                setTimeout(() => {
                    if (!routeHelpBubble.matches(':hover') && !routeHelpBtn.matches(':hover')) {
                        routeHelpBubble.style.display = 'none';
                    }
                }, 100);
            });

            // Garder la bulle visible quand on survole la bulle elle-même
            routeHelpBubble.addEventListener('mouseenter', () => {
                routeHelpBubble.style.display = 'block';
            });

            routeHelpBubble.addEventListener('mouseleave', () => {
                routeHelpBubble.style.display = 'none';
            });
        }

        console.log('🔗 Événements configurés');
    }

    /**
     * Setup autocomplete for address and POI inputs
     */
    setupAutocomplete() {
        const startAddressInput = document.getElementById('startAddress');
        const endAddressInput = document.getElementById('endAddress');
        
        if (startAddressInput) {
            this.setupAddressAutocomplete(startAddressInput, 'startAddressSuggestions', 'start');
        }
        
        if (endAddressInput) {
            this.setupAddressAutocomplete(endAddressInput, 'endAddressSuggestions', 'end');
        }
        
        console.log('🔍 Autocomplete setup complete');
    }

    /**
     * Configure l'autocomplétion pour un champ d'adresse
     */
    setupAddressAutocomplete(input, suggestionsId, type) {
        const suggestionsContainer = document.getElementById(suggestionsId);
        let searchTimeout;
        
        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Effacer le timeout précédent
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // Masquer les suggestions si la requête est trop courte
            if (query.length < 3) {
                this.hideSuggestions(suggestionsContainer);
                return;
            }
            
            // Délai pour éviter trop de requêtes
            searchTimeout = setTimeout(async () => {
                try {
                    const suggestions = await this.searchAddresses(query);
                    this.showAddressSuggestions(suggestions, suggestionsContainer, input, type);
                } catch (error) {
                    console.error('Erreur de recherche d\'adresses:', error);
                    this.hideSuggestions(suggestionsContainer);
                }
            }, 300);
        });
        
        // Masquer les suggestions quand on clique ailleurs
        input.addEventListener('blur', () => {
            setTimeout(() => {
                this.hideSuggestions(suggestionsContainer);
            }, 200);
        });
        
        input.addEventListener('focus', () => {
            if (input.value.length >= 3 && suggestionsContainer.children.length > 0) {
                suggestionsContainer.style.display = 'block';
            }
        });
    }

    /**
     * Recherche d'adresses via l'API Nominatim
     */
    async searchAddresses(query) {
        const url = `https://nominatim.openstreetmap.org/search?` +
            `format=json&` +
            `q=${encodeURIComponent(query)}&` +
            `limit=5&` +
            `countrycodes=fr&` +
            `addressdetails=1`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Accept-Language': 'fr',
                    'User-Agent': 'RunMyWay/1.0'
                },
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return data.map(item => ({
                display_name: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon || item.lng),
                type: item.type,
                importance: item.importance || 0
            }));
        } catch (error) {
            console.error('Erreur API Nominatim:', error);
            return [];
        }
    }

    /**
     * Affiche les suggestions d'adresses
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
                <div style="font-weight: 500;">${this.formatAddressName(suggestion.display_name)}</div>
                <div style="font-size: 0.8rem; color: #64748B; margin-top: 0.25rem;">
                    ${this.getAddressDetails(suggestion.display_name)}
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
     * Formate le nom d'une adresse pour l'affichage
     */
    formatAddressName(displayName) {
        const parts = displayName.split(',');
        return parts[0] + (parts[1] ? ', ' + parts[1] : '');
    }

    /**
     * Extrait les détails d'une adresse
     */
    getAddressDetails(displayName) {
        const parts = displayName.split(',');
        return parts.slice(2).join(',').trim();
    }

    /**
     * Sélectionne une adresse dans les suggestions
     */
    selectAddress(suggestion, input, type) {
        input.value = this.formatAddressName(suggestion.display_name);
        
        const latlng = L.latLng(suggestion.lat, suggestion.lng);
        
        if (type === 'start') {
            this.setStartPoint(latlng);
            // Centrer la carte sur l'adresse
            this.map.setView(latlng, 15);
        } else if (type === 'end') {
            this.setEndPoint(latlng);
            // Ajuster la vue pour voir les deux points
            if (this.startPoint) {
                const bounds = L.latLngBounds([this.startPoint, latlng]);
                this.map.fitBounds(bounds, { padding: [50, 50] });
            } else {
                this.map.setView(latlng, 15);
            }
        }
        
        console.log(`✅ ${type === 'start' ? 'Départ' : 'Arrivée'} défini:`, suggestion.display_name);
    }

    /**
     * Masque les suggestions
     */
    hideSuggestions(container) {
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Configure l'autocomplétion pour les POI personnalisés
     */
    setupPOIAutocomplete(input) {
        const suggestionsContainer = document.getElementById('poiSuggestions');
        let searchTimeout;
        
        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            if (query.length < 3) {
                this.hideSuggestions(suggestionsContainer);
                return;
            }
            
            searchTimeout = setTimeout(async () => {
                try {
                    // Rechercher autour du point de départ ou centre de la carte
                    const searchCenter = this.startPoint || this.map.getCenter();
                    const suggestions = await this.searchPOIs(query, searchCenter);
                    this.showPOISuggestions(suggestions, suggestionsContainer, input);
                } catch (error) {
                    console.error('Erreur de recherche POI:', error);
                    this.hideSuggestions(suggestionsContainer);
                }
            }, 300);
        });
        
        input.addEventListener('blur', () => {
            setTimeout(() => {
                this.hideSuggestions(suggestionsContainer);
            }, 200);
        });
    }

    /**
     * Recherche de POI via l'API Nominatim
     */
    async searchPOIs(query, centerPoint, radiusKm = 10) {
        const url = `https://nominatim.openstreetmap.org/search?` +
            `format=json&` +
            `q=${encodeURIComponent(query)}&` +
            `limit=8&` +
            `countrycodes=fr&` +
            `lat=${centerPoint.lat}&` +
            `lon=${centerPoint.lng}&` +
            `bounded=1&` +
            `viewbox=${centerPoint.lng - 0.1},${centerPoint.lat + 0.1},${centerPoint.lng + 0.1},${centerPoint.lat - 0.1}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Accept-Language': 'fr',
                    'User-Agent': 'RunMyWay/1.0'
                },
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return data.map(item => ({
                name: item.display_name.split(',')[0],
                full_name: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon || item.lng),
                type: item.type,
                class: item.class,
                importance: item.importance || 0
            })).filter(poi => {
                // Filtrer les types intéressants
                const interestingTypes = ['tourism', 'amenity', 'leisure', 'historic', 'natural'];
                return interestingTypes.includes(poi.class);
            });
        } catch (error) {
            console.error('Erreur API POI:', error);
            return [];
        }
    }

    /**
     * Affiche les suggestions de POI
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
                    ${this.getPOITypeIcon(suggestion.type)} ${this.formatPOIType(suggestion.type, suggestion.class)}
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
     * Obtient l'icône pour un type de POI
     */
    getPOITypeIcon(type) {
        const icons = {
            attraction: '🎯',
            museum: '🏛️',
            park: '🌳',
            restaurant: '🍽️',
            cafe: '☕',
            shop: '🛒',
            church: '⛪',
            monument: '🏛️',
            fountain: '⛲',
            garden: '🌺',
            default: '📍'
        };
        return icons[type] || icons.default;
    }

    /**
     * Formate le type de POI pour l'affichage
     */
    formatPOIType(type, poiClass) {
        const translations = {
            attraction: 'Attraction',
            museum: 'Musée',
            park: 'Parc',
            restaurant: 'Restaurant',
            cafe: 'Café',
            shop: 'Commerce',
            church: 'Église',
            monument: 'Monument',
            fountain: 'Fontaine',
            garden: 'Jardin',
            tourism: 'Tourisme',
            amenity: 'Service',
            leisure: 'Loisir',
            historic: 'Historique',
            natural: 'Nature'
        };
        return translations[type] || translations[poiClass] || type;
    }

    /**
     * Sélectionne un POI depuis les suggestions
     */
    selectPOI(poi, input) {
        input.value = poi.name;
        this.addPOIToList(poi);
    }

    /**
     * Ajoute un POI personnalisé
     */
    async addCustomPOI() {
        const poiInput = document.getElementById('poiInput');
        if (!poiInput) return;
        
        const query = poiInput.value.trim();
        if (query.length < 2) {
            this.showError('Veuillez saisir un nom de lieu');
            return;
        }
        
        try {
            // Rechercher le POI
            const searchCenter = this.startPoint || this.map.getCenter();
            const pois = await this.searchPOIs(query, searchCenter);
            
            if (pois.length > 0) {
                const poi = pois[0]; // Prendre le premier résultat
                this.addPOIToList(poi);
                poiInput.value = '';
            } else {
                // Créer un POI générique basé sur la recherche d'adresse
                const addresses = await this.searchAddresses(query);
                if (addresses.length > 0) {
                    const address = addresses[0];
                    const genericPOI = {
                        name: this.formatAddressName(address.display_name),
                        full_name: address.display_name,
                        lat: address.lat,
                        lng: address.lng,
                        type: 'custom',
                        class: 'custom'
                    };
                    this.addPOIToList(genericPOI);
                    poiInput.value = '';
                } else {
                    this.showError('Aucun lieu trouvé pour cette recherche');
                }
            }
        } catch (error) {
            console.error('Erreur ajout POI:', error);
            this.showError('Erreur lors de l\'ajout du POI');
        }
    }

    /**
     * Ajoute un POI à la liste des POI sélectionnés
     */
    addPOIToList(poi) {
        // Éviter les doublons
        const exists = this.pois.find(p => 
            Math.abs(p.lat - poi.lat) < 0.001 && Math.abs(p.lng - poi.lng) < 0.001
        );
        
        if (exists) {
            this.showError('Ce POI est déjà dans votre liste');
            return;
        }
        
        // Ajouter à la liste
        this.pois.push(poi);
        this.updatePOIChips();
        
        // Ajouter un marqueur temporaire sur la carte
        this.addPOIMarker(poi);
        
        console.log(`✅ POI ajouté: ${poi.name}`);
    }

    /**
     * Met à jour l'affichage des chips POI
     */
    updatePOIChips() {
        const chipsContainer = document.getElementById('poiChips');
        if (!chipsContainer) return;
        
        chipsContainer.innerHTML = '';
        
        this.pois.forEach((poi, index) => {
            const chip = document.createElement('div');
            chip.className = 'poi-chip';
            chip.innerHTML = `
                <span>${this.getPOITypeIcon(poi.type)} ${poi.name}</span>
                <button onclick="window.runMyWayApp.removePOI(${index})" title="Supprimer">×</button>
            `;
            chipsContainer.appendChild(chip);
        });
    }

    /**
     * Supprime un POI de la liste
     */
    removePOI(index) {
        if (index >= 0 && index < this.pois.length) {
            const poi = this.pois[index];
            this.pois.splice(index, 1);
            this.updatePOIChips();
            this.removePOIMarker(poi);
            console.log(`🗑️ POI supprimé: ${poi.name}`);
        }
    }

    /**
     * Ajoute un marqueur POI sur la carte
     */
    addPOIMarker(poi) {
        const marker = L.circleMarker([poi.lat, poi.lng], {
            radius: 8,
            fillColor: '#F59E0B',
            color: 'white',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(this.map);
        
        marker.bindPopup(`<strong>${poi.name}</strong><br>${this.formatPOIType(poi.type, poi.class)}`);
        
        // Stocker la référence du marqueur avec le POI
        poi._marker = marker;
    }

    /**
     * Supprime un marqueur POI de la carte
     */
    removePOIMarker(poi) {
        if (poi._marker) {
            this.map.removeLayer(poi._marker);
            delete poi._marker;
        }
    }

    /**
     * Gestion des onglets POI
     */
    switchPOITab(tabName) {
        // Mettre à jour les onglets
        document.querySelectorAll('.poi-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.poi-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Activer l'onglet sélectionné
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    /**
     * Active/désactive un preset POI
     */
    async togglePOIPreset(presetType, buttonElement) {
        const isActive = buttonElement.classList.contains('active');
        
        if (isActive) {
            // Désactiver le preset
            buttonElement.classList.remove('active');
            this.removePOIsByCategory(presetType);
        } else {
            // Activer le preset
            buttonElement.classList.add('active');
            await this.addPOIsByCategory(presetType);
        }
    }

    /**
     * Ajoute automatiquement des POI selon une catégorie
     */
    async addPOIsByCategory(category) {
        if (!this.startPoint) {
            this.showError('Veuillez d\'abord définir un point de départ');
            return;
        }

        try {
            const queries = this.getCategoryQueries(category);
            const searchCenter = this.startPoint;
            const maxPOIs = 3; // Limiter à 3 POI par catégorie
            
            console.log(`🔍 Recherche POI catégorie: ${category}`);
            
            for (const query of queries) {
                const pois = await this.searchPOIs(query, searchCenter);
                
                // Ajouter les meilleurs POI de cette recherche
                const filteredPOIs = pois
                    .filter(poi => !this.pois.some(existing => 
                        Math.abs(existing.lat - poi.lat) < 0.001 && 
                        Math.abs(existing.lng - poi.lng) < 0.001
                    ))
                    .slice(0, Math.max(1, Math.floor(maxPOIs / queries.length)));
                
                for (const poi of filteredPOIs) {
                    poi.category = category; // Marquer la catégorie
                    this.addPOIToList(poi);
                }
                
                // Délai pour éviter de surcharger l'API
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            if (this.pois.filter(p => p.category === category).length === 0) {
                this.showError(`Aucun POI ${this.getCategoryName(category)} trouvé dans cette zone`);
            } else {
                console.log(`✅ POI ${category} ajoutés`);
            }
            
        } catch (error) {
            console.error(`Erreur ajout POI ${category}:`, error);
            this.showError(`Erreur lors de la recherche de POI ${this.getCategoryName(category)}`);
        }
    }

    /**
     * Supprime les POI d'une catégorie
     */
    removePOIsByCategory(category) {
        const poisToRemove = this.pois.filter(poi => poi.category === category);
        
        poisToRemove.forEach(poi => {
            const index = this.pois.indexOf(poi);
            if (index > -1) {
                this.removePOI(index);
            }
        });
        
        console.log(`🗑️ POI ${category} supprimés`);
    }

    /**
     * Obtient les requêtes de recherche pour une catégorie
     */
    getCategoryQueries(category) {
        const queries = {
            nature: ['parc', 'jardin public', 'forêt', 'lac'],
            culture: ['musée', 'monument', 'église', 'théâtre'],
            sport: ['stade', 'piscine', 'gymnase', 'terrain de sport'],
            panorama: ['belvédère', 'point de vue', 'tour', 'colline'],
            eau: ['fontaine', 'lac', 'rivière', 'canal'],
            shopping: ['marché', 'centre commercial', 'rue commerçante']
        };
        
        return queries[category] || [category];
    }

    /**
     * Obtient le nom d'affichage d'une catégorie
     */
    getCategoryName(category) {
        const names = {
            nature: 'Nature',
            culture: 'Culture', 
            sport: 'Sport',
            panorama: 'Panorama',
            eau: 'Points d\'eau',
            shopping: 'Shopping'
        };
        
        return names[category] || category;
    }

    setupUI() {
        // Configuration basique de l'interface
        this.updateDistanceSlider();
        
        // Initialiser l'état du toggle "Retour au départ"
        this.handleReturnToStartToggle(false); // Par défaut décoché
        
        // Initialiser les limites du slider selon le mode par défaut
        this.initializeSliderLimits();
        
        console.log('🎨 Interface configurée');
    }

    updateDistanceSlider() {
        const modeInputs = document.querySelectorAll('input[name="travelMode"]');
        const distanceSlider = document.getElementById('targetDistance');
        const maxLabel = document.getElementById('maxLabel');

        if (modeInputs && distanceSlider && maxLabel) {
            modeInputs.forEach(input => {
                input.addEventListener('change', () => {
                    const mode = input.value;
                    let maxDistance = 10;
                    
                    if (mode === 'running') maxDistance = 25;
                    if (mode === 'cycling') maxDistance = 80;
                    
                    // Ajuster la valeur actuelle si elle dépasse le nouveau max
                    if (parseFloat(distanceSlider.value) > maxDistance) {
                        distanceSlider.value = maxDistance;
                        document.getElementById('distanceValue').textContent = maxDistance + ' km';
                    }
                    
                    distanceSlider.max = maxDistance;
                    maxLabel.textContent = maxDistance + 'km';
                    
                    console.log(`Mode ${mode}: Distance max ajustée à ${maxDistance}km`);
                });
            });
        }
    }

    /**
     * Initialise les limites du slider selon le mode par défaut
     */
    initializeSliderLimits() {
        const distanceSlider = document.getElementById('targetDistance');
        const maxLabel = document.getElementById('maxLabel');
        const distanceValue = document.getElementById('distanceValue');
        
        if (distanceSlider && maxLabel) {
            // Mode par défaut : marche (walking)
            const defaultMax = 10;
            distanceSlider.max = defaultMax;
            maxLabel.textContent = defaultMax + 'km';
            
            // Si la valeur actuelle dépasse le nouveau max, l'ajuster
            if (parseFloat(distanceSlider.value) > defaultMax) {
                distanceSlider.value = 5; // Valeur par défaut raisonnable
                if (distanceValue) {
                    distanceValue.textContent = '5 km';
                }
            }
            
            console.log(`Slider initialisé: max ${defaultMax}km, valeur ${distanceSlider.value}km`);
        }
    }

    handleMapClick(event) {
        console.log('Clic sur la carte:', event.latlng);
        
        const returnToStart = document.getElementById('returnToStart')?.checked;
        
        if (!this.startPoint) {
            this.setStartPoint(event.latlng);
        } else if (!this.endPoint && !returnToStart) {
            this.setEndPoint(event.latlng);
        } else {
            // Si on a déjà les deux points ou si retour au départ est activé,
            // remplacer le point de départ
            this.setStartPoint(event.latlng);
        }
    }

    setStartPoint(latlng) {
        // Supprimer le marqueur de départ existant
        if (this.startMarker) {
            this.map.removeLayer(this.startMarker);
        }

        // Créer le nouveau marqueur de départ avec popup interactive et drag & drop
        this.startMarker = L.marker(latlng, {
            icon: L.divIcon({
                html: '<div class="custom-marker-start"><i class="fas fa-play"></i></div>',
                className: 'custom-marker-container',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            }),
            draggable: true
        }).addTo(this.map);

        // Events pour le marqueur de départ
        this.startMarker.on('dragstart', () => {
            console.log('🤏 Déplacement du point de départ...');
        });

        this.startMarker.on('dragend', (e) => {
            const newPos = e.target.getLatLng();
            this.startPoint = newPos;
            this.updateAddressField(newPos, 'startAddress');
            console.log('📍 Point de départ déplacé:', newPos);
        });

        this.startMarker.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            this.removeStartPoint();
        });

        // Ajouter popup interactive
        this.startMarker.bindPopup(`
            <div class="marker-popup">
                <strong><i class="fas fa-play"></i> Point de départ</strong>
                <div class="popup-tips">
                    <small>💡 Glissez pour déplacer<br>🖱️ Clic droit pour supprimer</small>
                </div>
                <div class="marker-actions">
                    <button onclick="window.runMyWayApp.removeStartPoint()" class="marker-btn danger">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>
            </div>
        `);

        this.startPoint = latlng;
        
        // Mettre à jour le champ d'adresse
        this.updateAddressField(latlng, 'startAddress');
        
        // Mettre à jour le feedback
        this.updateRouteInfo();
        
        // Afficher le bouton de suppression
        this.toggleClearButton('clearStartBtn', true);
        
        console.log('✅ Point de départ défini:', latlng);
    }

    setEndPoint(latlng) {
        // Supprimer le marqueur d'arrivée existant
        if (this.endMarker) {
            this.map.removeLayer(this.endMarker);
        }

        // Créer le nouveau marqueur d'arrivée avec popup interactive et drag & drop
        this.endMarker = L.marker(latlng, {
            icon: L.divIcon({
                html: '<div class="custom-marker-end"><i class="fas fa-flag-checkered"></i></div>',
                className: 'custom-marker-container',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            }),
            draggable: true
        }).addTo(this.map);

        // Events pour le marqueur d'arrivée
        this.endMarker.on('dragstart', () => {
            console.log('🤏 Déplacement du point d\'arrivée...');
        });

        this.endMarker.on('dragend', (e) => {
            const newPos = e.target.getLatLng();
            this.endPoint = newPos;
            this.updateAddressField(newPos, 'endAddress');
            console.log('🏁 Point d\'arrivée déplacé:', newPos);
        });

        this.endMarker.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            this.removeEndPoint();
        });

        // Ajouter popup interactive
        this.endMarker.bindPopup(`
            <div class="marker-popup">
                <strong><i class="fas fa-flag-checkered"></i> Point d'arrivée</strong>
                <div class="popup-tips">
                    <small>💡 Glissez pour déplacer<br>🖱️ Clic droit pour supprimer</small>
                </div>
                <div class="marker-actions">
                    <button onclick="window.runMyWayApp.removeEndPoint()" class="marker-btn danger">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>
            </div>
        `);

        this.endPoint = latlng;
        
        // Mettre à jour le champ d'adresse
        this.updateAddressField(latlng, 'endAddress');
        
        // Mettre à jour le feedback
        this.updateRouteInfo();
        
        // Afficher le bouton de suppression
        this.toggleClearButton('clearEndBtn', true);
        
        console.log('✅ Point d\'arrivée défini:', latlng);
    }

    /**
     * Supprime le point de départ
     */
    removeStartPoint() {
        if (this.startMarker) {
            this.map.removeLayer(this.startMarker);
            this.startMarker = null;
        }
        this.startPoint = null;
        
        // Vider le champ
        const startAddressField = document.getElementById('startAddress');
        if (startAddressField) {
            startAddressField.value = '';
        }
        
        // Mettre à jour le feedback
        this.updateRouteInfo();
        
        // Masquer le bouton de suppression
        this.toggleClearButton('clearStartBtn', false);
        
        console.log('🗑️ Point de départ supprimé');
    }

    /**
     * Supprime le point d'arrivée
     */
    removeEndPoint() {
        if (this.endMarker) {
            this.map.removeLayer(this.endMarker);
            this.endMarker = null;
        }
        this.endPoint = null;
        
        // Vider le champ
        const endAddressField = document.getElementById('endAddress');
        if (endAddressField) {
            endAddressField.value = '';
        }
        
        // Mettre à jour le feedback
        this.updateRouteInfo();
        
        // Masquer le bouton de suppression
        this.toggleClearButton('clearEndBtn', false);
        
        console.log('🗑️ Point d\'arrivée supprimé');
    }

    /**
     * Affiche/masque un bouton de suppression
     */
    toggleClearButton(buttonId, show) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.style.display = show ? 'flex' : 'none';
        }
    }


    /**
     * Met à jour un champ d'adresse via géocodage inverse
     */
    async updateAddressField(latlng, fieldId) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?` +
                `format=json&` +
                `lat=${latlng.lat}&` +
                `lon=${latlng.lng}&` +
                `zoom=18&` +
                `addressdetails=1`;
            
            const response = await fetch(url, {
                headers: {
                    'Accept-Language': 'fr',
                    'User-Agent': 'RunMyWay/1.0'
                },
                signal: AbortSignal.timeout(3000)
            });
            
            if (response.ok) {
                const data = await response.json();
                const field = document.getElementById(fieldId);
                if (field && data.display_name) {
                    field.value = this.formatAddressName(data.display_name);
                }
            }
        } catch (error) {
            // Erreur CORS ou réseau - afficher les coordonnées silencieusement
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
            }
        }
    }

    /**
     * Met à jour les informations de statut du parcours
     */
    updateRouteInfo() {
        const routeInfoText = document.getElementById('routeInfoText');
        if (!routeInfoText) return;

        const returnToStart = document.getElementById('returnToStart')?.checked;
        
        if (!this.startPoint) {
            routeInfoText.innerHTML = '<small>🎯 Cliquez sur la carte pour placer le point de départ</small>';
            routeInfoText.style.color = 'var(--text-secondary)';
        } else if (returnToStart) {
            routeInfoText.innerHTML = '<small>✅ Départ défini - Parcours en boucle</small>';
            routeInfoText.style.color = 'var(--success-color)';
        } else if (!this.endPoint) {
            routeInfoText.innerHTML = '<small>🎯 Cliquez sur la carte pour placer l\'arrivée</small>';
            routeInfoText.style.color = 'var(--primary-color)';
        } else {
            routeInfoText.innerHTML = '<small>✅ Départ et arrivée définis - Parcours A→B</small>';
            routeInfoText.style.color = 'var(--success-color)';
        }
    }

    /**
     * Gère le changement du toggle "Retour au départ"
     */
    handleReturnToStartToggle(isChecked) {
        const endAddressGroup = document.querySelector('#endAddress').closest('.route-input-group');
        
        if (isChecked) {
            // Masquer le champ d'arrivée et supprimer le marqueur
            if (endAddressGroup) {
                endAddressGroup.style.opacity = '0.5';
                endAddressGroup.style.pointerEvents = 'none';
            }
            
            if (this.endMarker) {
                this.map.removeLayer(this.endMarker);
                this.endMarker = null;
            }
            this.endPoint = null;
            
            // Vider le champ
            const endAddressField = document.getElementById('endAddress');
            if (endAddressField) {
                endAddressField.value = '';
                endAddressField.placeholder = 'Retour au départ activé';
            }
        } else {
            // Réactiver le champ d'arrivée
            if (endAddressGroup) {
                endAddressGroup.style.opacity = '1';
                endAddressGroup.style.pointerEvents = 'auto';
            }
            
            const endAddressField = document.getElementById('endAddress');
            if (endAddressField) {
                endAddressField.placeholder = 'Point d\'arrivée (optionnel)';
            }
        }
        
        // Mettre à jour le feedback
        this.updateRouteInfo();
    }

    async generateRoute() {
        console.log('🛣️ Génération du parcours...');
        
        if (!this.startPoint) {
            this.showError('Veuillez définir un point de départ en cliquant sur la carte');
            return;
        }

        try {
            this.showLoading();
            
            // Obtenir les paramètres
            const distanceSlider = document.getElementById('targetDistance');
            const distance = parseFloat(distanceSlider?.value || 3);
            const mode = document.querySelector('input[name="travelMode"]:checked')?.value || 'walking';
            const returnToStart = document.getElementById('returnToStart')?.checked;
            
            // Validation des paramètres selon le mode
            const maxDistances = { walking: 15, running: 30, cycling: 80 };
            const maxAllowed = maxDistances[mode] || 15;
            
            if (distance > maxAllowed) {
                this.showError(`Distance trop élevée pour ${mode}: maximum ${maxAllowed}km recommandé`);
                this.hideLoading();
                return;
            }

            console.log(`🎯 Paramètres de génération:`);
            console.log(`  - Distance cible: ${distance}km (slider value: ${distanceSlider?.value})`);
            console.log(`  - Mode: ${mode} (max recommandé: ${maxAllowed}km)`);
            console.log(`  - Retour au départ: ${returnToStart}`);
            console.log(`  - Point d'arrivée défini: ${this.endPoint ? 'Oui' : 'Non'}`);
            
            // Générer un parcours amélioré
            const route = await this.createSmartRoute(this.startPoint, distance, mode, returnToStart);
            
            if (route && route.length > 0) {
                this.displayRoute(route, distance, mode);
                this.hideLoading();
                this.showResults(route, distance, mode);
                console.log('✅ Parcours généré avec succès');
            } else {
                throw new Error('Impossible de générer un parcours pour cette zone');
            }
            
        } catch (error) {
            this.hideLoading();
            this.showError(error.message || 'Erreur lors de la génération du parcours');
            console.error('❌ Erreur génération:', error);
        }
    }

    /**
     * Génère un parcours intelligent basé sur la distance et le mode
     */
    async createSmartRoute(startPoint, targetDistance, mode, returnToStart) {
        console.log(`Génération d'un parcours de ${targetDistance}km en mode ${mode}`);
        
        try {
            // Conversion du mode pour l'API OSRM
            const osrmMode = this.getOSRMMode(mode);
            
            if (returnToStart) {
                // Générer un parcours en boucle
                return await this.generateLoopRoute(startPoint, targetDistance, osrmMode);
            } else if (this.endPoint) {
                // Calcul de la distance directe
                const directDistance = this.calculateDirectDistance(startPoint, this.endPoint);
                console.log(`Distance directe A→B: ${directDistance.toFixed(1)}km vs cible: ${targetDistance}km`);
                
                // Toujours utiliser l'algorithme spécialisé pour les parcours A→B
                console.log('Parcours A→B avec distance cible, algorithme spécialisé');
                return await this.generateLongDistanceRoute(startPoint, this.endPoint, targetDistance, osrmMode);
            } else {
                // Générer un parcours en boucle par défaut
                return await this.generateLoopRoute(startPoint, targetDistance, osrmMode);
            }
        } catch (error) {
            console.error('Erreur génération parcours:', error);
            // Fallback vers l'ancienne méthode en cas d'erreur API
            return this.generateFallbackRoute(startPoint, targetDistance, returnToStart);
        }
    }

    /**
     * Convertit le mode de transport pour l'API OSRM
     */
    getOSRMMode(mode) {
        const modeMap = {
            'walking': 'foot',
            'running': 'foot', 
            'cycling': 'bike'
        };
        return modeMap[mode] || 'foot';
    }

    /**
     * Génère un parcours en boucle utilisant l'API OSRM
     */
    async generateLoopRoute(startPoint, targetDistance, mode) {
        console.log(`Génération d'un parcours en boucle de ${targetDistance}km`);
        
        // Essayer différentes configurations pour s'approcher de la distance cible
        let bestRoute = null;
        let bestDistance = 0;
        let bestDeviation = Infinity;
        
        // Plus de tentatives pour les longues distances (vélo notamment)
        const maxAttempts = targetDistance > 20 ? 5 : 3;
        
        // Tolérance très stricte pour les courtes distances
        let tolerance = 0.15; // 15% par défaut
        if (mode === 'bike' && targetDistance > 30) {
            tolerance = 0.25; // Plus permissif pour vélo longue distance
        } else if (targetDistance <= 8) {
            tolerance = 0.08; // Très strict pour très courtes distances (8%)
        } else if (targetDistance <= 12) {
            tolerance = 0.10; // Strict pour courtes distances (10%)
        } else if (targetDistance <= 20) {
            tolerance = 0.12; // Plus strict pour distances moyennes (12%)
        }
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`Tentative ${attempt}/${maxAttempts} (tolérance: ${(tolerance*100).toFixed(0)}%)`);
                
                // Ajuster le rayon selon les tentatives précédentes de manière plus agressive
                let radiusFactor = 1.0;
                if (attempt === 2 && bestDistance > 0) {
                    radiusFactor = Math.max(0.5, Math.min(2.0, targetDistance / bestDistance));
                }
                if (attempt === 3 && bestDistance > 0) {
                    radiusFactor = Math.max(0.4, Math.min(2.5, (targetDistance / bestDistance) * 1.1));
                }
                if (attempt === 4 && bestDistance > 0) {
                    radiusFactor = Math.max(0.3, Math.min(3.0, (targetDistance / bestDistance) * 1.3));
                }
                if (attempt === 5 && bestDistance > 0) {
                    radiusFactor = Math.max(0.2, Math.min(4.0, (targetDistance / bestDistance) * 1.5));
                }
                
                // Générer des points de passage stratégiques
                const waypoints = await this.generateWaypoints(startPoint, targetDistance, mode, radiusFactor);
                
                if (waypoints.length < 2) {
                    console.warn(`Tentative ${attempt}: Pas assez de points de passage`);
                    continue;
                }
                
                // Créer une boucle en passant par tous les waypoints
                const allPoints = [startPoint, ...waypoints, startPoint];
                
                // Calculer l'itinéraire complet via OSRM
                const route = await this.calculateOSRMRoute(allPoints, mode);
                const distance = this.lastRouteDistance || this.calculateRouteDistance(route);
                const deviation = Math.abs(distance - targetDistance);
                
                console.log(`Tentative ${attempt}: ${distance.toFixed(1)}km (cible: ${targetDistance}km, écart: ${deviation.toFixed(1)}km, facteur: ${radiusFactor.toFixed(2)})`);
                
                // Garder le meilleur résultat
                if (deviation < bestDeviation || bestRoute === null) {
                    bestRoute = route;
                    bestDistance = distance;
                    bestDeviation = deviation;
                }
                
                // Si on est assez proche, on s'arrête
                if (deviation < targetDistance * tolerance) {
                    console.log(`✅ Distance acceptable trouvée: ${distance.toFixed(1)}km`);
                    break;
                }
                
            } catch (error) {
                console.warn(`Erreur tentative ${attempt}:`, error);
            }
        }
        
        if (!bestRoute) {
            throw new Error('Impossible de générer un parcours valide');
        }
        
        console.log(`🏆 Meilleur parcours: ${bestDistance.toFixed(1)}km (écart: ${bestDeviation.toFixed(1)}km)`);
        return bestRoute;
    }

    /**
     * Génère une boucle qui passe par le point d'arrivée
     */
    async generateLoopRouteThroughEndPoint(startPoint, endPoint, targetDistance, mode) {
        console.log(`Génération d'une boucle de ${targetDistance}km passant par le point d'arrivée`);
        
        // Utiliser le point milieu entre départ et arrivée comme centre
        const centerLat = (startPoint.lat + endPoint.lat) / 2;
        const centerLng = (startPoint.lng + endPoint.lng) / 2;
        const center = L.latLng(centerLat, centerLng);
        
        let bestRoute = null;
        let bestDistance = 0;
        let bestDeviation = Infinity;
        
        const maxAttempts = targetDistance > 20 ? 5 : 3;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`Tentative boucle ${attempt}/${maxAttempts}`);
                
                // Générer des points de passage autour du centre
                let radiusFactor = 1.0;
                if (attempt === 2 && bestDistance > 0) {
                    radiusFactor = Math.max(0.5, Math.min(2.0, targetDistance / bestDistance));
                }
                if (attempt >= 3 && bestDistance > 0) {
                    radiusFactor = Math.max(0.3, Math.min(3.0, (targetDistance / bestDistance) * (0.8 + attempt * 0.2)));
                }
                
                const waypoints = await this.generateWaypoints(center, targetDistance, mode, radiusFactor);
                
                if (waypoints.length < 2) {
                    console.warn(`Tentative ${attempt}: Pas assez de points de passage`);
                    continue;
                }
                
                // Créer un parcours : départ → waypoints → arrivée → retour au départ
                const allPoints = [startPoint, ...waypoints, endPoint, startPoint];
                
                // Calculer l'itinéraire
                const route = await this.calculateOSRMRoute(allPoints, mode);
                const distance = this.lastRouteDistance || this.calculateRouteDistance(route);
                const deviation = Math.abs(distance - targetDistance);
                
                console.log(`Tentative boucle ${attempt}: ${distance.toFixed(1)}km (cible: ${targetDistance}km, écart: ${deviation.toFixed(1)}km)`);
                
                if (deviation < bestDeviation || bestRoute === null) {
                    bestRoute = route;
                    bestDistance = distance;
                    bestDeviation = deviation;
                }
                
                // Tolérance adaptative
                let tolerance = 0.20; // 20% par défaut pour boucles complexes
                if (targetDistance >= 50) tolerance = 0.30;
                
                if (deviation < targetDistance * tolerance) {
                    console.log(`✅ Boucle acceptable trouvée: ${distance.toFixed(1)}km`);
                    break;
                }
                
            } catch (error) {
                console.warn(`Erreur tentative boucle ${attempt}:`, error);
            }
        }
        
        if (!bestRoute) {
            console.warn('Échec génération boucle, fallback vers parcours simple');
            return await this.generatePointToPointRouteWithDistance(startPoint, endPoint, targetDistance, mode);
        }
        
        console.log(`🏆 Meilleure boucle: ${bestDistance.toFixed(1)}km (écart: ${bestDeviation.toFixed(1)}km)`);
        return bestRoute;
    }

    /**
     * Calcule la distance directe entre deux points (à vol d'oiseau)
     */
    calculateDirectDistance(point1, point2) {
        const R = 6371; // Rayon de la Terre en km
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLng = (point2.lng - point1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Génère un parcours pour les très longues distances (≥40km)
     */
    async generateLongDistanceRoute(startPoint, endPoint, targetDistance, mode) {
        console.log(`Génération longue distance: ${targetDistance}km`);
        
        const directDistance = this.calculateDirectDistance(startPoint, endPoint);
        const remainingDistance = targetDistance - directDistance;
        
        // Stratégie adaptative selon la distance - beaucoup plus conservatrice pour courtes distances
        let segments;
        if (targetDistance >= 60) {
            segments = Math.max(6, Math.min(8, Math.floor(targetDistance / 12))); // 1 segment par 12km
        } else if (targetDistance >= 30) {
            segments = Math.max(3, Math.min(5, Math.floor(targetDistance / 8))); // 1 segment par 8km
        } else if (targetDistance >= 15) {
            segments = Math.max(2, Math.min(3, Math.floor(targetDistance / 6))); // 1 segment par 6km pour distances moyennes
        } else if (targetDistance >= 8) {
            segments = Math.max(1, Math.min(2, Math.floor(targetDistance / 5))); // 1 segment par 5km pour courtes distances
        } else {
            segments = 1; // Un seul segment pour très courtes distances
        }
        const segmentLength = remainingDistance / segments;
        
        console.log(`Stratégie: ${segments} segments de ~${segmentLength.toFixed(1)}km chacun`);
        
        let allPoints = [startPoint];
        let currentPoint = startPoint;
        
        // Générer des segments entre départ et arrivée
        for (let i = 0; i < segments; i++) {
            console.log(`Génération segment ${i + 1}/${segments}`);
            
            // Position interpolée vers l'arrivée
            const progress = (i + 1) / (segments + 1);
            const targetLat = startPoint.lat + (endPoint.lat - startPoint.lat) * progress;
            const targetLng = startPoint.lng + (endPoint.lng - startPoint.lng) * progress;
            const targetPoint = L.latLng(targetLat, targetLng);
            
            // Créer un détour beaucoup plus conservateur selon la distance cible
            let maxDetourRadius;
            if (targetDistance >= 60) {
                maxDetourRadius = 12; // Très longues distances
            } else if (targetDistance >= 30) {
                maxDetourRadius = 6;  // Longues distances  
            } else if (targetDistance >= 15) {
                maxDetourRadius = 2;  // Distances moyennes
            } else if (targetDistance >= 10) {
                maxDetourRadius = 1;  // Courtes distances
            } else if (targetDistance >= 8) {
                maxDetourRadius = 0.5; // Très courtes distances
            } else {
                maxDetourRadius = 0.3; // Ultra courtes distances
            }
            
            const detourRadius = Math.min(segmentLength / 3, maxDetourRadius); // Diviser par 3 au lieu de 2 pour plus de conservatisme
            const angle = (i * 120 + Math.random() * 60) * Math.PI / 180; // Répartir les détours
            
            const detourLat = targetPoint.lat + Math.cos(angle) * (detourRadius / 111);
            const detourLng = targetPoint.lng + Math.sin(angle) * (detourRadius / 111);
            const detourPoint = L.latLng(detourLat, detourLng);
            
            // Trouver un point routier pour le détour
            const snapPoint = await this.snapToRoad(detourPoint, mode);
            if (snapPoint) {
                allPoints.push(snapPoint);
                currentPoint = snapPoint;
                console.log(`Segment ${i + 1}: détour de ${detourRadius.toFixed(1)}km ajouté`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 150)); // Délai API
        }
        
        // Ajouter le point d'arrivée
        allPoints.push(endPoint);
        
        // Calculer le parcours final
        console.log(`Calcul du parcours final avec ${allPoints.length} points`);
        const route = await this.calculateOSRMRoute(allPoints, mode);
        const finalDistance = this.lastRouteDistance || this.calculateRouteDistance(route);
        
        console.log(`Parcours longue distance généré: ${finalDistance.toFixed(1)}km (cible: ${targetDistance}km)`);
        
        // Seuil adaptatif beaucoup plus strict pour les courtes distances
        let threshold = 0.85; // 85% par défaut
        if (targetDistance <= 8) {
            threshold = 0.90; // Très strict pour très courtes distances
        } else if (targetDistance <= 12) {
            threshold = 0.85; // Strict pour courtes distances
        } else if (targetDistance <= 20) {
            threshold = 0.80; // Moyennement strict
        }
        
        // Si c'est encore trop court, ajouter des détours supplémentaires
        if (finalDistance < targetDistance * threshold) {
            console.log(`Distance insuffisante (${finalDistance.toFixed(1)}km < ${(targetDistance * threshold).toFixed(1)}km), ajout de détours supplémentaires...`);
            return await this.addExtraDetours(allPoints, targetDistance, finalDistance, mode);
        }
        
        return route;
    }

    /**
     * Ajoute des détours supplémentaires si le parcours est trop court
     */
    async addExtraDetours(basePoints, targetDistance, currentDistance, mode) {
        const missingDistance = targetDistance - currentDistance;
        
        // Pour les courtes distances, être beaucoup plus conservateur
        let detoursNeeded;
        if (targetDistance <= 10) {
            detoursNeeded = Math.min(1, Math.ceil(missingDistance / 2)); // Maximum 1 détour, 1 par 2km manquants
        } else if (targetDistance <= 20) {
            detoursNeeded = Math.min(2, Math.ceil(missingDistance / 5)); // Maximum 2 détours, 1 par 5km manquants
        } else {
            detoursNeeded = Math.ceil(missingDistance / 10); // 1 détour par 10km manquants pour longues distances
        }
        
        console.log(`Ajout de ${detoursNeeded} détours pour combler ${missingDistance.toFixed(1)}km`);
        
        const enhancedPoints = [...basePoints];
        
        // Insérer des détours entre les points existants
        for (let i = 0; i < detoursNeeded && i < basePoints.length - 1; i++) {
            const point1 = basePoints[i];
            const point2 = basePoints[i + 1];
            
            // Point milieu
            const midLat = (point1.lat + point2.lat) / 2;
            const midLng = (point1.lng + point2.lng) / 2;
            
            // Détour perpendiculaire très conservateur pour courtes distances
            let maxExtraDetour;
            if (targetDistance >= 60) {
                maxExtraDetour = 10;
            } else if (targetDistance >= 30) {
                maxExtraDetour = 6;
            } else if (targetDistance >= 15) {
                maxExtraDetour = 2;
            } else if (targetDistance >= 10) {
                maxExtraDetour = 1;
            } else {
                maxExtraDetour = 0.5; // Très petit détour pour courtes distances
            }
            
            const detourRadius = Math.min(missingDistance / detoursNeeded / 3, maxExtraDetour); // Diviser par 3 au lieu de 2
            const angle = Math.random() * 2 * Math.PI;
            
            const detourLat = midLat + Math.cos(angle) * (detourRadius / 111);
            const detourLng = midLng + Math.sin(angle) * (detourRadius / 111);
            const detourPoint = L.latLng(detourLat, detourLng);
            
            const snapPoint = await this.snapToRoad(detourPoint, mode);
            if (snapPoint) {
                enhancedPoints.splice(i * 2 + 1, 0, snapPoint);
                console.log(`Détour supplémentaire ${i + 1}: ${detourRadius.toFixed(1)}km`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const finalRoute = await this.calculateOSRMRoute(enhancedPoints, mode);
        const finalDistance = this.lastRouteDistance || this.calculateRouteDistance(finalRoute);
        
        console.log(`Parcours final avec détours: ${finalDistance.toFixed(1)}km`);
        return finalRoute;
    }

    /**
     * Génère des points de passage intelligents autour du point de départ
     */
    async generateWaypoints(center, targetDistance, mode, radiusFactor = 1.0) {
        const waypoints = [];
        
        // Ajustement selon le mode de transport
        let baseRadius, numWaypoints, maxRadius;
        
        if (mode === 'bike') {
            // Vélo : ajustement plus conservateur
            baseRadius = Math.min(targetDistance / 6, 15); // Maximum 15km de rayon
            numWaypoints = Math.min(6, Math.max(3, Math.floor(targetDistance / 12)));
            maxRadius = Math.min(targetDistance / 4, 20); // Rayon max = 20km
        } else if (mode === 'foot' && targetDistance > 10) {
            // Course longue distance
            baseRadius = Math.min(targetDistance / 5, 8);
            numWaypoints = Math.min(6, Math.max(3, Math.floor(targetDistance / 3)));
            maxRadius = Math.min(targetDistance / 3, 12);
        } else {
            // Marche/course courte
            baseRadius = targetDistance / 5;
            numWaypoints = Math.min(5, Math.max(3, Math.floor(targetDistance / 2)));
            maxRadius = targetDistance / 3;
        }
        
        const radiusKm = Math.min(baseRadius * radiusFactor, maxRadius);
        
        console.log(`Mode ${mode}: Recherche de ${numWaypoints} points de passage dans un rayon de ${radiusKm.toFixed(1)}km (distance cible: ${targetDistance}km)`);
        
        // Générer tous les points candidats d'abord
        const candidatePoints = [];
        for (let i = 0; i < numWaypoints; i++) {
            const angle = (i / numWaypoints) * 2 * Math.PI;
            
            // Variation du rayon plus importante pour les longues distances
            const variationRange = targetDistance > 20 ? 1.0 : 0.8;
            const variation = 0.6 + (Math.random() * variationRange);
            const currentRadius = (radiusKm * variation) / 111; // Conversion en degrés
            
            // Variation angulaire proportionnelle à la distance
            const angleVariationRange = Math.min(0.7, targetDistance / 50);
            const angleVariation = (Math.random() - 0.5) * angleVariationRange;
            const finalAngle = angle + angleVariation;
            
            const lat = center.lat + Math.cos(finalAngle) * currentRadius;
            const lng = center.lng + Math.sin(finalAngle) * currentRadius;
            
            candidatePoints.push(L.latLng(lat, lng));
        }
        
        // Traitement en parallèle avec limitation
        const batchSize = 3; // Traiter par batch de 3 pour éviter surcharge API
        for (let i = 0; i < candidatePoints.length; i += batchSize) {
            const batch = candidatePoints.slice(i, i + batchSize);
            const snapPromises = batch.map(point => this.snapToRoad(point, mode));
            
            const snapResults = await Promise.all(snapPromises);
            waypoints.push(...snapResults.filter(point => point !== null));
            
            // Petit délai entre les batchs
            if (i + batchSize < candidatePoints.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        console.log(`✅ ${waypoints.length} points de passage trouvés`);
        return waypoints;
    }

    /**
     * Trouve le point routier le plus proche avec cache
     */
    async snapToRoad(point, mode) {
        // Clé de cache basée sur position arrondie (précision 100m)
        const lat = Math.round(point.lat * 1000) / 1000;
        const lng = Math.round(point.lng * 1000) / 1000;
        const cacheKey = `${mode}_${lat}_${lng}`;
        
        // Vérifier le cache
        if (this.snapCache.has(cacheKey)) {
            return this.snapCache.get(cacheKey);
        }
        
        try {
            const url = `https://router.project-osrm.org/nearest/v1/${mode}/${point.lng},${point.lat}?number=1`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            let result = point; // Point original par défaut
            if (data.code === 'Ok' && data.waypoints && data.waypoints.length > 0) {
                const wp = data.waypoints[0];
                result = L.latLng(wp.location[1], wp.location[0]);
            }
            
            // Mettre en cache
            this.snapCache.set(cacheKey, result);
            return result;
            
        } catch (error) {
            console.warn('Erreur snap to road:', error);
            return point; // Retourner le point original en cas d'erreur
        }
    }

    /**
     * Calcule un itinéraire via l'API OSRM
     */
    async calculateOSRMRoute(points, mode) {
        if (points.length < 2) {
            throw new Error('Au moins 2 points requis pour calculer un itinéraire');
        }
        
        // Construire l'URL OSRM
        const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/${mode}/${coordinates}?overview=full&geometries=geojson`;
        
        console.log(`Appel OSRM: ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            throw new Error('Aucun itinéraire trouvé');
        }
        
        const route = data.routes[0];
        const geometry = route.geometry;
        
        // Convertir les coordonnées en LatLng pour Leaflet
        const routePoints = geometry.coordinates.map(coord => 
            L.latLng(coord[1], coord[0])
        );
        
        // Stocker la distance réelle de l'API
        this.lastRouteDistance = route.distance / 1000; // Conversion en km
        
        console.log(`✅ Itinéraire calculé: ${routePoints.length} points, ${this.lastRouteDistance.toFixed(1)}km`);
        
        return routePoints;
    }

    /**
     * Génère un parcours point à point
     */
    async generatePointToPointRoute(start, end, mode) {
        console.log('Génération d\'un parcours point à point');
        
        const route = await this.calculateOSRMRoute([start, end], mode);
        return route;
    }

    /**
     * Génère un parcours point à point en tenant compte de la distance cible
     */
    async generatePointToPointRouteWithDistance(start, end, targetDistance, mode) {
        console.log(`Génération d'un parcours A→B de ${targetDistance}km`);
        
        try {
            // Calculer la distance directe
            const directRoute = await this.calculateOSRMRoute([start, end], mode);
            const directDistance = this.lastRouteDistance;
            
            console.log(`Distance directe: ${directDistance?.toFixed(1)}km, cible: ${targetDistance}km`);
            
            // Si la distance directe est proche de la cible (±20%), l'utiliser
            if (directDistance && Math.abs(directDistance - targetDistance) <= targetDistance * 0.2) {
                console.log('✅ Distance directe acceptable');
                return directRoute;
            }
            
            // Sinon, générer un parcours avec des détours
            if (directDistance && directDistance < targetDistance) {
                console.log('🔄 Ajout de détours pour atteindre la distance cible');
                return await this.generateRouteWithDetours(start, end, targetDistance, mode);
            } else {
                console.log('ℹ️ Distance directe supérieure à la cible, utilisation du trajet direct');
                return directRoute;
            }
            
        } catch (error) {
            console.error('Erreur parcours A→B:', error);
            // Fallback vers le parcours direct
            return await this.calculateOSRMRoute([start, end], mode);
        }
    }

    /**
     * Génère un parcours avec détours pour atteindre la distance cible
     */
    async generateRouteWithDetours(start, end, targetDistance, mode) {
        console.log('Génération de détours...');
        
        const maxAttempts = 3;
        let bestRoute = null;
        let bestDistance = 0;
        let bestDeviation = Infinity;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                // Calculer le point milieu
                const midLat = (start.lat + end.lat) / 2;
                const midLng = (start.lng + end.lng) / 2;
                const midPoint = L.latLng(midLat, midLng);
                
                // Générer des points de passage pour allonger le trajet
                const detoursNeeded = Math.max(3, Math.floor(targetDistance / 15)); // Plus de points pour longues distances
                const waypoints = await this.generateDetourWaypoints(midPoint, detoursNeeded, attempt, targetDistance, mode);
                
                if (waypoints.length > 0) {
                    // Créer le parcours avec détours
                    const routePoints = [start, ...waypoints, end];
                    const route = await this.calculateOSRMRoute(routePoints, mode);
                    const distance = this.lastRouteDistance;
                    const deviation = Math.abs(distance - targetDistance);
                    
                    console.log(`Tentative ${attempt}: ${distance?.toFixed(1)}km (écart: ${deviation?.toFixed(1)}km)`);
                    
                    if (distance && (deviation < bestDeviation || bestRoute === null)) {
                        bestRoute = route;
                        bestDistance = distance;
                        bestDeviation = deviation;
                    }
                    
                    // Tolérance adaptative selon la distance
                    let tolerance = 0.15; // 15% par défaut
                    if (targetDistance >= 50) tolerance = 0.25; // 25% pour très longues distances
                    else if (targetDistance >= 20) tolerance = 0.20; // 20% pour longues distances
                    
                    // Si c'est assez proche, on s'arrête
                    if (deviation <= targetDistance * tolerance) {
                        console.log(`✅ Distance acceptable avec détours (${(tolerance*100).toFixed(0)}% tolérance)`);
                        break;
                    }
                }
                
            } catch (error) {
                console.warn(`Erreur tentative détour ${attempt}:`, error);
            }
        }
        
        return bestRoute || await this.calculateOSRMRoute([start, end], mode);
    }

    /**
     * Génère des points de passage pour créer des détours
     */
    async generateDetourWaypoints(centerPoint, count, attempt, targetDistance, mode) {
        const waypoints = [];
        
        // Calculer un rayon approprié selon la distance cible
        let baseRadius;
        if (targetDistance >= 50) {
            baseRadius = targetDistance / 4; // 20km de rayon pour 80km de cible
        } else if (targetDistance >= 20) {
            baseRadius = targetDistance / 5; // 4km de rayon pour 20km de cible
        } else {
            baseRadius = targetDistance / 6; // Plus conservateur pour courtes distances
        }
        
        const radiusKm = baseRadius + (attempt * baseRadius * 0.3); // Augmentation progressive
        const maxWaypoints = Math.min(6, Math.max(3, Math.floor(targetDistance / 10)));
        
        console.log(`Génération détours tentative ${attempt}: rayon ${radiusKm.toFixed(1)}km, ${maxWaypoints} points max`);
        
        for (let i = 0; i < Math.min(count, maxWaypoints); i++) {
            const angle = (i / maxWaypoints) * 2 * Math.PI + (attempt * 0.7); // Décalage par tentative
            const variation = 0.7 + (Math.random() * 0.6); // Variation du rayon
            const currentRadius = (radiusKm * variation) / 111; // Conversion en degrés
            
            const lat = centerPoint.lat + Math.cos(angle) * currentRadius;
            const lng = centerPoint.lng + Math.sin(angle) * currentRadius;
            
            const waypoint = await this.snapToRoad(L.latLng(lat, lng), mode);
            if (waypoint) {
                waypoints.push(waypoint);
                await new Promise(resolve => setTimeout(resolve, 100)); // Délai API
            }
        }
        
        console.log(`Détours générés: ${waypoints.length} points dans un rayon de ${radiusKm.toFixed(1)}km`);
        return waypoints;
    }

    /**
     * Méthode de fallback en cas d'erreur API
     */
    generateFallbackRoute(startPoint, targetDistance, returnToStart) {
        console.log('🔄 Utilisation du mode fallback');
        
        const route = [];
        const radiusKm = targetDistance / (2 * Math.PI);
        const radiusDeg = radiusKm / 111;
        const points = 8;
        
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            const lat = startPoint.lat + Math.cos(angle) * radiusDeg * 0.8;
            const lng = startPoint.lng + Math.sin(angle) * radiusDeg * 0.8;
            route.push(L.latLng(lat, lng));
        }
        
        if (returnToStart) {
            route.push(startPoint);
        }
        
        return route;
    }

    /**
     * Calcule la distance totale d'un parcours
     */
    calculateRouteDistance(route) {
        if (!route || route.length < 2) return 0;
        
        let totalDistance = 0;
        for (let i = 1; i < route.length; i++) {
            totalDistance += route[i-1].distanceTo(route[i]);
        }
        
        return totalDistance / 1000; // Conversion en kilomètres
    }

    /**
     * Affiche le parcours sur la carte
     */
    displayRoute(route, targetDistance, mode) {
        // Supprimer l'ancien parcours
        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
        }

        // Couleur selon le mode
        let routeColor = '#8B5CF6';
        switch (mode) {
            case 'running':
                routeColor = '#EF4444'; // Rouge pour course
                break;
            case 'cycling':
                routeColor = '#10B981'; // Vert pour vélo
                break;
            case 'walking':
            default:
                routeColor = '#8B5CF6'; // Violet pour marche
                break;
        }

        // Créer la polyline
        this.routePolyline = L.polyline(route, {
            color: routeColor,
            weight: 4,
            opacity: 0.8,
            smoothFactor: 1
        }).addTo(this.map);

        // Ajouter des marqueurs aux points clés
        const midPoint = Math.floor(route.length / 2);
        if (route[midPoint]) {
            L.circleMarker(route[midPoint], {
                radius: 6,
                fillColor: routeColor,
                color: 'white',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map).bindPopup(`Point intermédiaire`);
        }

        // Ajuster la vue
        this.map.fitBounds(this.routePolyline.getBounds(), { 
            padding: [20, 20] 
        });

        // Afficher le panel d'informations sur la carte
        this.showRouteInfoPanel();
    }

    createTestRoute() {
        // Méthode obsolète - remplacée par createSmartRoute
        console.warn('createTestRoute est obsolète, utiliser createSmartRoute');
    }

    showResults(route, targetDistance, mode) {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }

        // Calculer les statistiques réelles
        const actualDistance = this.lastRouteDistance || this.calculateRouteDistance(route);
        const duration = this.calculateDuration(actualDistance, mode);
        const deviation = Math.abs(actualDistance - targetDistance);

        // Mettre à jour les statistiques
        const distanceResult = document.getElementById('distanceResult');
        const durationResult = document.getElementById('durationResult');
        const deviationResult = document.getElementById('deviationResult');

        if (distanceResult) distanceResult.textContent = `${actualDistance.toFixed(1)} km`;
        if (durationResult) durationResult.textContent = this.formatDuration(duration);
        if (deviationResult) deviationResult.textContent = `${deviation.toFixed(1)} km`;

        console.log(`📊 Statistiques: ${actualDistance.toFixed(1)}km en ${this.formatDuration(duration)}`);
    }

    /**
     * Affiche le panel d'informations sur la carte
     */
    showRouteInfoPanel() {
        const routeInfoPanel = document.getElementById('routeInfoPanel');
        if (!routeInfoPanel) return;

        const actualDistance = this.lastRouteDistance || this.calculateRouteDistance(this.routePolyline.getLatLngs());
        const mode = document.querySelector('input[name="travelMode"]:checked')?.value || 'walking';
        const duration = this.calculateDuration(actualDistance, mode);

        // Mettre à jour les informations dans le panel de la carte
        const routeDistance = document.getElementById('routeDistance');
        const routeDuration = document.getElementById('routeDuration');

        if (routeDistance) routeDistance.textContent = `${actualDistance.toFixed(1)} km`;
        if (routeDuration) routeDuration.textContent = this.formatDuration(duration);

        // Afficher le panel
        routeInfoPanel.classList.add('show');
    }

    /**
     * Masque le panel d'informations sur la carte
     */
    hideRouteInfoPanel() {
        const routeInfoPanel = document.getElementById('routeInfoPanel');
        if (routeInfoPanel) {
            routeInfoPanel.classList.remove('show');
        }
    }

    /**
     * Calcule la durée estimée selon le mode et la distance
     */
    calculateDuration(distance, mode) {
        // Vitesses moyennes réalistes en km/h
        const speeds = {
            walking: 4.5,   // Marche normale
            running: 8.5,   // Course loisir moyenne
            cycling: 18     // Vélo loisir en ville
        };

        const speed = speeds[mode] || speeds.walking;
        return (distance / speed) * 60; // Durée en minutes
    }

    /**
     * Formate la durée en format lisible
     */
    formatDuration(minutes) {
        if (minutes < 60) {
            return `${Math.round(minutes)} min`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = Math.round(minutes % 60);
            if (remainingMinutes === 0) {
                return `${hours}h`;
            } else {
                return `${hours}h${remainingMinutes}`;
            }
        }
    }

    useCurrentLocation() {
        console.log('📍 Obtention de la position...');
        
        if (!navigator.geolocation) {
            this.showError('La géolocalisation n\'est pas supportée');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
                this.setStartPoint(latlng);
                this.map.setView(latlng, 15);
                console.log('✅ Position obtenue:', latlng);
            },
            (error) => {
                this.showError('Impossible d\'obtenir votre position');
                console.error('❌ Erreur géolocalisation:', error);
            }
        );
    }

    exportGPX() {
        console.log('📁 Export GPX...');
        if (!this.routePolyline) {
            this.showError('Aucun parcours à exporter');
            return;
        }

        // Export GPX simple
        const points = this.routePolyline.getLatLngs();
        let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
        gpx += '<gpx version="1.1">\n';
        gpx += '<trk><name>Parcours RunMyWay</name><trkseg>\n';
        
        points.forEach(point => {
            gpx += `<trkpt lat="${point.lat}" lon="${point.lng}"></trkpt>\n`;
        });
        
        gpx += '</trkseg></trk>\n</gpx>';

        const blob = new Blob([gpx], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'parcours-runmyway.gpx';
        a.click();
        URL.revokeObjectURL(url);

        console.log('✅ GPX exporté');
    }

    /**
     * Centre la carte sur le parcours
     */
    centerMapOnRoute() {
        if (this.routePolyline) {
            this.map.fitBounds(this.routePolyline.getBounds(), { 
                padding: [20, 20] 
            });
        } else if (this.startPoint) {
            this.map.setView(this.startPoint, 15);
        }
    }

    /**
     * Toggle plein écran (basique)
     */
    toggleFullscreen() {
        const mapContainer = document.getElementById('mapContainer');
        if (!document.fullscreenElement) {
            mapContainer.requestFullscreen?.() || 
            mapContainer.webkitRequestFullscreen?.() || 
            mapContainer.msRequestFullscreen?.();
        } else {
            document.exitFullscreen?.() || 
            document.webkitExitFullscreen?.() || 
            document.msExitFullscreen?.();
        }
    }

    reset() {
        console.log('🔄 Remise à zéro...');
        
        // Supprimer les marqueurs
        if (this.startMarker) {
            this.map.removeLayer(this.startMarker);
            this.startMarker = null;
        }
        if (this.endMarker) {
            this.map.removeLayer(this.endMarker);
            this.endMarker = null;
        }
        
        // Supprimer le parcours
        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
            this.routePolyline = null;
        }

        // Reset des points et POI
        this.startPoint = null;
        this.endPoint = null;
        
        // Masquer le panel d'informations
        this.hideRouteInfoPanel();
        
        // Nettoyer les POI
        this.pois.forEach(poi => this.removePOIMarker(poi));
        this.pois = [];
        this.updatePOIChips();
        
        // Désactiver tous les presets POI
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Masquer les résultats
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }

        // Reset des champs d'adresse et POI
        const startAddress = document.getElementById('startAddress');
        const endAddress = document.getElementById('endAddress');
        const poiInput = document.getElementById('poiInput');
        if (startAddress) startAddress.value = '';
        if (endAddress) endAddress.value = '';
        if (poiInput) poiInput.value = '';
        
        // Masquer les suggestions
        this.hideSuggestions(document.getElementById('startAddressSuggestions'));
        this.hideSuggestions(document.getElementById('endAddressSuggestions'));
        this.hideSuggestions(document.getElementById('poiSuggestions'));

        // Masquer les boutons de suppression
        this.toggleClearButton('clearStartBtn', false);
        this.toggleClearButton('clearEndBtn', false);

        // Recentrer sur Paris
        this.map.setView([48.8566, 2.3522], 12);
        
        console.log('✅ Application remise à zéro');
    }

    showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    showError(message) {
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorAlert && errorMessage) {
            errorMessage.textContent = message;
            errorAlert.style.display = 'block';
            
            setTimeout(() => {
                errorAlert.style.display = 'none';
            }, 5000);
        }
        
        console.error('Erreur:', message);
    }

    /**
     * Nettoie le cache pour éviter l'accumulation
     */
    cleanupCache() {
        const maxCacheSize = 100;
        
        if (this.snapCache.size > maxCacheSize) {
            const keys = Array.from(this.snapCache.keys());
            const keysToDelete = keys.slice(0, keys.length - maxCacheSize);
            keysToDelete.forEach(key => this.snapCache.delete(key));
            console.log(`🧹 Cache nettoyé: ${keysToDelete.length} entrées supprimées`);
        }
        
        if (this.routeCache.size > maxCacheSize) {
            const keys = Array.from(this.routeCache.keys());
            const keysToDelete = keys.slice(0, keys.length - maxCacheSize);
            keysToDelete.forEach(key => this.routeCache.delete(key));
            console.log(`🧹 Cache routes nettoyé: ${keysToDelete.length} entrées supprimées`);
        }
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    console.log('📦 DOM chargé, initialisation...');
    
    if (typeof L === 'undefined') {
        console.error('❌ Leaflet non chargé');
        return;
    }
    
    window.runMyWayApp = new MakeMyWayApp();
    window.runMyWayApp.init();
});

console.log('📦 Script MakeMyWay chargé');