import { CONFIG } from '../config.js';

/**
 * Gestionnaire de la carte Leaflet et des interactions cartographiques
 */
export class MapManager {
    constructor(apiService) {
        this.apiService = apiService;
        this.map = null;
        this.markers = {
            start: null,
            end: null,
            pois: []
        };
        this.routePolyline = null;
        this.onMapClick = null; // Callback pour les clics sur la carte
        this.onMarkerMove = null; // Callback pour le déplacement des marqueurs
    }

    /**
     * Initialise la carte Leaflet
     * @param {string} containerId - ID du conteneur de carte
     * @returns {Promise<void>}
     */
    async initialize(containerId = 'map') {
        if (typeof L === 'undefined') {
            throw new Error('Leaflet n\'est pas chargé');
        }

        const mapContainer = document.getElementById(containerId);
        if (!mapContainer) {
            throw new Error(`Conteneur de carte non trouvé: ${containerId}`);
        }

        try {
            // Créer la carte
            this.map = L.map(containerId).setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);
            
            // Ajouter les tuiles
            L.tileLayer(CONFIG.MAP.TILE_LAYER, {
                attribution: CONFIG.MAP.ATTRIBUTION,
                maxZoom: CONFIG.MAP.MAX_ZOOM,
                minZoom: CONFIG.MAP.MIN_ZOOM
            }).addTo(this.map);

            // Désactiver les contrôles de zoom par défaut
            if (this.map.zoomControl) {
                this.map.zoomControl.remove();
            }

            // Configurer les événements
            this.setupMapEvents();
            
            console.log('🗺️ Carte initialisée');

        } catch (error) {
            console.error('Erreur initialisation carte:', error);
            throw error;
        }
    }

    /**
     * Configure les événements de la carte
     */
    setupMapEvents() {
        // Clic sur la carte
        this.map.on('click', (e) => {
            if (this.onMapClick) {
                this.onMapClick(e.latlng);
            }
        });

        // Événements de redimensionnement
        this.map.on('resize', () => {
            this.map.invalidateSize();
        });
    }

    /**
     * Définit le callback pour les clics sur la carte
     * @param {Function} callback - Fonction appelée lors d'un clic (latlng) => void
     */
    setMapClickHandler(callback) {
        this.onMapClick = callback;
    }

    /**
     * Définit le callback pour le déplacement des marqueurs
     * @param {Function} callback - Fonction appelée lors du déplacement (type, latlng) => void
     */
    setMarkerMoveHandler(callback) {
        this.onMarkerMove = callback;
    }

    /**
     * Place ou met à jour le marqueur de départ
     * @param {Object} latlng - Position {lat, lng}
     */
    setStartMarker(latlng) {
        // Supprimer l'ancien marqueur
        this.removeStartMarker();

        // Créer le nouveau marqueur
        this.markers.start = L.marker(latlng, {
            icon: L.divIcon({
                html: '<div class="custom-marker-start"><i class="fas fa-play"></i></div>',
                className: 'custom-marker-container',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            }),
            draggable: true
        }).addTo(this.map);

        // Configurer les événements du marqueur
        this.setupStartMarkerEvents();

        console.log('📍 Marqueur de départ placé:', latlng);
    }

    /**
     * Configure les événements du marqueur de départ
     */
    setupStartMarkerEvents() {
        if (!this.markers.start) return;

        // Événements de drag & drop
        this.markers.start.on('dragstart', () => {
            console.log('🤏 Déplacement du point de départ...');
        });

        this.markers.start.on('dragend', (e) => {
            const newPos = e.target.getLatLng();
            if (this.onMarkerMove) {
                this.onMarkerMove('start', newPos);
            }
            console.log('📍 Point de départ déplacé:', newPos);
        });

        // Clic droit pour supprimer
        this.markers.start.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            this.removeStartMarker();
            if (this.onMarkerMove) {
                this.onMarkerMove('start', null);
            }
        });

        // Popup d'aide
        this.markers.start.bindPopup(`
            <div class="marker-popup">
                <strong><i class="fas fa-play"></i> Point de départ</strong>
                <div class="popup-tips">
                    <small>💡 Glissez pour déplacer<br>🖱️ Clic droit pour supprimer</small>
                </div>
            </div>
        `);
    }

    /**
     * Place ou met à jour le marqueur d'arrivée
     * @param {Object} latlng - Position {lat, lng}
     */
    setEndMarker(latlng) {
        // Supprimer l'ancien marqueur
        this.removeEndMarker();

        // Créer le nouveau marqueur
        this.markers.end = L.marker(latlng, {
            icon: L.divIcon({
                html: '<div class="custom-marker-end"><i class="fas fa-flag-checkered"></i></div>',
                className: 'custom-marker-container',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            }),
            draggable: true
        }).addTo(this.map);

        // Configurer les événements du marqueur
        this.setupEndMarkerEvents();

        console.log('🏁 Marqueur d\'arrivée placé:', latlng);
    }

    /**
     * Configure les événements du marqueur d'arrivée
     */
    setupEndMarkerEvents() {
        if (!this.markers.end) return;

        // Événements de drag & drop
        this.markers.end.on('dragstart', () => {
            console.log('🤏 Déplacement du point d\'arrivée...');
        });

        this.markers.end.on('dragend', (e) => {
            const newPos = e.target.getLatLng();
            if (this.onMarkerMove) {
                this.onMarkerMove('end', newPos);
            }
            console.log('🏁 Point d\'arrivée déplacé:', newPos);
        });

        // Clic droit pour supprimer
        this.markers.end.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            this.removeEndMarker();
            if (this.onMarkerMove) {
                this.onMarkerMove('end', null);
            }
        });

        // Popup d'aide
        this.markers.end.bindPopup(`
            <div class="marker-popup">
                <strong><i class="fas fa-flag-checkered"></i> Point d'arrivée</strong>
                <div class="popup-tips">
                    <small>💡 Glissez pour déplacer<br>🖱️ Clic droit pour supprimer</small>
                </div>
            </div>
        `);
    }

    /**
     * Ajoute un marqueur POI sur la carte
     * @param {Object} poi - Données du POI {name, lat, lng, type, ...}
     * @returns {Object} Référence du marqueur ajouté
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

        // Popup avec informations du POI
        const icon = this.apiService.getPOITypeIcon(poi.type);
        const typeLabel = this.apiService.formatPOIType(poi.type, poi.class);
        
        marker.bindPopup(`
            <div class="poi-popup">
                <strong>${icon} ${poi.name}</strong><br>
                <small>${typeLabel}</small>
            </div>
        `);

        // Stocker la référence du marqueur avec le POI
        this.markers.pois.push(marker);
        
        return marker;
    }

    /**
     * Supprime un marqueur POI spécifique
     * @param {Object} marker - Référence du marqueur à supprimer
     */
    removePOIMarker(marker) {
        if (marker && this.map.hasLayer(marker)) {
            this.map.removeLayer(marker);
            
            // Retirer de la liste des marqueurs POI
            const index = this.markers.pois.indexOf(marker);
            if (index > -1) {
                this.markers.pois.splice(index, 1);
            }
        }
    }

    /**
     * Supprime tous les marqueurs POI
     */
    removeAllPOIMarkers() {
        this.markers.pois.forEach(marker => {
            if (this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        this.markers.pois = [];
        console.log('🗑️ Tous les marqueurs POI supprimés');
    }

    /**
     * Affiche un itinéraire sur la carte
     * @param {Array} routePoints - Points de l'itinéraire [{lat, lng}, ...]
     * @param {string} mode - Mode de transport pour la couleur
     * @param {Object} options - Options d'affichage
     */
    displayRoute(routePoints, mode = 'walking', options = {}) {
        // Supprimer l'ancien parcours
        this.clearRoute();

        if (!routePoints || routePoints.length < 2) {
            console.warn('Pas assez de points pour afficher l\'itinéraire');
            return;
        }

        // Couleur selon le mode
        const colors = {
            walking: '#8B5CF6',  // Violet
            running: '#EF4444',  // Rouge
            cycling: '#10B981'   // Vert
        };

        const routeColor = colors[mode] || colors.walking;

        // Créer la polyline
        this.routePolyline = L.polyline(routePoints, {
            color: routeColor,
            weight: options.weight || 4,
            opacity: options.opacity || 0.8,
            smoothFactor: options.smoothFactor || 1
        }).addTo(this.map);

        // Ajouter des marqueurs aux points clés si demandé
        if (options.showWaypoints) {
            const midPoint = Math.floor(routePoints.length / 2);
            if (routePoints[midPoint]) {
                L.circleMarker(routePoints[midPoint], {
                    radius: 6,
                    fillColor: routeColor,
                    color: 'white',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(this.map).bindPopup('Point intermédiaire');
            }
        }

        // Ajuster la vue pour voir tout l'itinéraire
        this.fitRouteInView(options.padding);

        console.log(`🛣️ Itinéraire affiché: ${routePoints.length} points`);
    }

    /**
     * Supprime l'itinéraire affiché
     */
    clearRoute() {
        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
            this.routePolyline = null;
            console.log('🗑️ Itinéraire supprimé');
        }
    }

    /**
     * Supprime le marqueur de départ
     */
    removeStartMarker() {
        if (this.markers.start) {
            this.map.removeLayer(this.markers.start);
            this.markers.start = null;
            console.log('🗑️ Marqueur de départ supprimé');
        }
    }

    /**
     * Supprime le marqueur d'arrivée
     */
    removeEndMarker() {
        if (this.markers.end) {
            this.map.removeLayer(this.markers.end);
            this.markers.end = null;
            console.log('🗑️ Marqueur d\'arrivée supprimé');
        }
    }

    /**
     * Remet la carte à son état initial
     */
    reset() {
        // Supprimer tous les marqueurs et itinéraires
        this.removeStartMarker();
        this.removeEndMarker();
        this.removeAllPOIMarkers();
        this.clearRoute();

        // Retourner à la vue par défaut
        this.map.setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);
        
        console.log('🔄 Carte remise à zéro');
    }

    /**
     * Centre la carte sur l'itinéraire actuel
     * @param {Array} padding - Padding optionnel [top, right, bottom, left]
     */
    fitRouteInView(padding = [20, 20]) {
        if (this.routePolyline) {
            this.map.fitBounds(this.routePolyline.getBounds(), { padding });
        }
    }

    /**
     * Centre la carte sur un point spécifique
     * @param {Object} latlng - Position {lat, lng}
     * @param {number} zoom - Niveau de zoom optionnel
     */
    centerOn(latlng, zoom = null) {
        if (zoom !== null) {
            this.map.setView(latlng, zoom);
        } else {
            this.map.panTo(latlng);
        }
    }

    /**
     * Ajuste la vue pour voir deux points
     * @param {Object} point1 - Premier point {lat, lng}
     * @param {Object} point2 - Deuxième point {lat, lng}
     * @param {Array} padding - Padding optionnel
     */
    fitTwoPoints(point1, point2, padding = [50, 50]) {
        const bounds = L.latLngBounds([point1, point2]);
        this.map.fitBounds(bounds, { padding });
    }

    /**
     * Contrôles de zoom
     */
    zoomIn() {
        this.map.zoomIn();
    }

    zoomOut() {
        this.map.zoomOut();
    }

    /**
     * Toggle plein écran
     */
    toggleFullscreen() {
        const container = this.map.getContainer().parentElement;
        
        if (!document.fullscreenElement) {
            container.requestFullscreen?.() || 
            container.webkitRequestFullscreen?.() || 
            container.msRequestFullscreen?.();
        } else {
            document.exitFullscreen?.() || 
            document.webkitExitFullscreen?.() || 
            document.msExitFullscreen?.();
        }
    }

    /**
     * Obtient la position actuelle de l'utilisateur
     * @returns {Promise<Object>} Position {lat, lng}
     */
    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error(CONFIG.MESSAGES.ERRORS.NO_GEOLOCATION));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latlng = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    resolve(latlng);
                },
                (error) => {
                    console.error('Erreur géolocalisation:', error);
                    reject(new Error(CONFIG.MESSAGES.ERRORS.POSITION_ERROR));
                },
                {
                    timeout: CONFIG.TIMEOUTS.GEOLOCATION,
                    enableHighAccuracy: true,
                    maximumAge: 60000 // 1 minute de cache
                }
            );
        });
    }

    /**
     * Obtient le centre actuel de la carte
     * @returns {Object} Position {lat, lng}
     */
    getMapCenter() {
        const center = this.map.getCenter();
        return {
            lat: center.lat,
            lng: center.lng
        };
    }

    /**
     * Obtient les positions actuelles des marqueurs
     * @returns {Object} Positions des marqueurs
     */
    getMarkerPositions() {
        return {
            start: this.markers.start ? this.markers.start.getLatLng() : null,
            end: this.markers.end ? this.markers.end.getLatLng() : null,
            poisCount: this.markers.pois.length
        };
    }

    /**
     * Vérifie si la carte est initialisée
     * @returns {boolean}
     */
    isInitialized() {
        return this.map !== null;
    }

    /**
     * Force le redimensionnement de la carte
     */
    invalidateSize() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }
}