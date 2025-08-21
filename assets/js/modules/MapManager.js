import { CONFIG } from '../config.js';

/**
 * Gestionnaire de la carte Google Maps et des interactions cartographiques
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
     * Initialise la carte Google Maps
     * @param {string} containerId - ID du conteneur de carte
     * @returns {Promise<void>}
     */
    async initialize(containerId = 'map') {
        // Vérifier que Google Maps est chargé
        if (typeof google === 'undefined' || !google.maps) {
            throw new Error('Google Maps API n\'est pas chargée');
        }

        const mapContainer = document.getElementById(containerId);
        if (!mapContainer) {
            throw new Error(`Conteneur de carte non trouvé: ${containerId}`);
        }

        try {
            // Créer la carte Google Maps
            this.map = new google.maps.Map(mapContainer, {
                center: { 
                    lat: CONFIG.MAP.DEFAULT_CENTER[0], 
                    lng: CONFIG.MAP.DEFAULT_CENTER[1] 
                },
                zoom: CONFIG.MAP.DEFAULT_ZOOM,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                // Options de style et contrôles
                zoomControl: false, // On utilisera nos propres contrôles
                mapTypeControl: false,
                scaleControl: true,
                streetViewControl: false,
                rotateControl: false,
                fullscreenControl: false,
                // Style moderne
                styles: [
                    {
                        featureType: "poi",
                        elementType: "labels",
                        stylers: [{ visibility: "off" }]
                    }
                ]
            });

            // Configurer les événements
            this.setupMapEvents();
            
            console.log('🗺️ Carte Google Maps initialisée');

            // Initialiser le Places Service dans ApiService si disponible
            if (this.apiService && this.apiService.initializePlacesService) {
                this.apiService.initializePlacesService(this.map);
            }

        } catch (error) {
            console.error('Erreur initialisation carte Google Maps:', error);
            throw error;
        }
    }


    /**
     * Configure les événements de la carte Google Maps
     */
    setupMapEvents() {
        // Clic sur la carte
        this.map.addListener('click', (e) => {
            if (this.onMapClick) {
                // Convertir au format attendu par l'application
                const latlng = {
                    lat: e.latLng.lat(),
                    lng: e.latLng.lng()
                };
                this.onMapClick(latlng);
            }
        });

        // Événements de redimensionnement (pas nécessaire avec Google Maps, il s'adapte automatiquement)
        // Mais on garde pour compatibilité
        google.maps.event.addListener(this.map, 'resize', () => {
            // Google Maps gère le redimensionnement automatiquement
            console.log('🔄 Redimensionnement de la carte détecté');
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

        // Créer le nouveau marqueur Google Maps
        this.markers.start = new google.maps.Marker({
            position: { lat: latlng.lat, lng: latlng.lng },
            map: this.map,
            draggable: true,
            title: 'Point de départ - Glissez pour déplacer, clic droit pour supprimer',
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#10B981', // Vert succès
                fillOpacity: 1,
                strokeWeight: 3,
                strokeColor: 'white'
            }
        });

        // Configurer les événements du marqueur
        this.setupStartMarkerEvents();

        console.log('📍 Marqueur de départ Google Maps placé:', latlng);
    }

    /**
     * Configure les événements du marqueur de départ Google Maps
     */
    setupStartMarkerEvents() {
        if (!this.markers.start) return;

        // Événement de début de glissement
        this.markers.start.addListener('dragstart', () => {
            console.log('🤏 Déplacement du point de départ...');
        });

        // Événement de fin de glissement
        this.markers.start.addListener('dragend', (e) => {
            const newPos = {
                lat: e.latLng.lat(),
                lng: e.latLng.lng()
            };
            if (this.onMarkerMove) {
                this.onMarkerMove('start', newPos);
            }
            console.log('📍 Point de départ déplacé:', newPos);
        });

        // Clic droit pour supprimer
        this.markers.start.addListener('rightclick', (e) => {
            this.removeStartMarker();
            if (this.onMarkerMove) {
                this.onMarkerMove('start', null);
            }
        });

        // InfoWindow d'aide (popup Google Maps)
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div class="marker-popup">
                    <strong><i class="fas fa-play"></i> Point de départ</strong>
                    <div class="popup-tips">
                        <small>💡 Glissez pour déplacer<br>🖱️ Clic droit pour supprimer</small>
                    </div>
                </div>
            `
        });

        // Afficher l'info au clic
        this.markers.start.addListener('click', () => {
            infoWindow.open(this.map, this.markers.start);
        });
    }

    /**
     * Place ou met à jour le marqueur d'arrivée
     * @param {Object} latlng - Position {lat, lng}
     */
    setEndMarker(latlng) {
        // Supprimer l'ancien marqueur
        this.removeEndMarker();

        // Créer le nouveau marqueur Google Maps
        this.markers.end = new google.maps.Marker({
            position: { lat: latlng.lat, lng: latlng.lng },
            map: this.map,
            draggable: true,
            title: 'Point d\'arrivée - Glissez pour déplacer, clic droit pour supprimer',
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#EF4444', // Rouge erreur
                fillOpacity: 1,
                strokeWeight: 3,
                strokeColor: 'white'
            }
        });

        // Configurer les événements du marqueur
        this.setupEndMarkerEvents();

        console.log('🏁 Marqueur d\'arrivée Google Maps placé:', latlng);
    }

    /**
     * Configure les événements du marqueur d'arrivée Google Maps
     */
    setupEndMarkerEvents() {
        if (!this.markers.end) return;

        // Événement de début de glissement
        this.markers.end.addListener('dragstart', () => {
            console.log('🤏 Déplacement du point d\'arrivée...');
        });

        // Événement de fin de glissement
        this.markers.end.addListener('dragend', (e) => {
            const newPos = {
                lat: e.latLng.lat(),
                lng: e.latLng.lng()
            };
            if (this.onMarkerMove) {
                this.onMarkerMove('end', newPos);
            }
            console.log('🏁 Point d\'arrivée déplacé:', newPos);
        });

        // Clic droit pour supprimer
        this.markers.end.addListener('rightclick', (e) => {
            this.removeEndMarker();
            if (this.onMarkerMove) {
                this.onMarkerMove('end', null);
            }
        });

        // InfoWindow d'aide (popup Google Maps)
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div class="marker-popup">
                    <strong><i class="fas fa-flag-checkered"></i> Point d'arrivée</strong>
                    <div class="popup-tips">
                        <small>💡 Glissez pour déplacer<br>🖱️ Clic droit pour supprimer</small>
                    </div>
                </div>
            `
        });

        // Afficher l'info au clic
        this.markers.end.addListener('click', () => {
            infoWindow.open(this.map, this.markers.end);
        });
    }

    /**
     * Ajoute un marqueur POI sur la carte
     * @param {Object} poi - Données du POI {name, lat, lng, type, ...}
     * @returns {Object} Référence du marqueur ajouté
     */
    addPOIMarker(poi) {
        const marker = new google.maps.Marker({
            position: { lat: poi.lat, lng: poi.lng },
            map: this.map,
            title: poi.name,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: '#F59E0B', // Couleur ambre pour les POI
                fillOpacity: 0.8,
                strokeWeight: 2,
                strokeColor: 'white'
            }
        });

        // InfoWindow avec informations du POI
        const icon = this.apiService.getPOITypeIcon(poi.type);
        const typeLabel = this.apiService.formatPOIType(poi.type, poi.class);
        
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div class="poi-popup">
                    <strong>${icon} ${poi.name}</strong><br>
                    <small>${typeLabel}</small>
                </div>
            `
        });

        // Afficher l'info au clic
        marker.addListener('click', () => {
            infoWindow.open(this.map, marker);
        });

        // Stocker la référence du marqueur avec le POI
        this.markers.pois.push(marker);
        
        return marker;
    }

    /**
     * Supprime un marqueur POI spécifique
     * @param {Object} marker - Référence du marqueur à supprimer
     */
    removePOIMarker(marker) {
        if (marker) {
            marker.setMap(null);
            
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
            marker.setMap(null);
        });
        this.markers.pois = [];
        console.log('🗑️ Tous les marqueurs POI supprimés');
    }

    /**
     * Affiche un itinéraire sur la carte avec Google Maps Polyline
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

        // Convertir les points au format Google Maps LatLng
        const path = routePoints.map(point => ({
            lat: point.lat,
            lng: point.lng
        }));

        // Créer la polyline Google Maps
        this.routePolyline = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: routeColor,
            strokeOpacity: options.opacity || 0.8,
            strokeWeight: options.weight || 4
        });

        // Ajouter la polyline à la carte
        this.routePolyline.setMap(this.map);

        // Ajouter des marqueurs aux points clés si demandé
        if (options.showWaypoints && routePoints.length > 4) {
            const midPoint = Math.floor(routePoints.length / 2);
            if (routePoints[midPoint]) {
                const waypointMarker = new google.maps.Marker({
                    position: { lat: routePoints[midPoint].lat, lng: routePoints[midPoint].lng },
                    map: this.map,
                    title: 'Point intermédiaire',
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 4,
                        fillColor: routeColor,
                        fillOpacity: 0.8,
                        strokeWeight: 2,
                        strokeColor: 'white'
                    }
                });

                // Stocker le marqueur pour le nettoyer plus tard
                this.waypointMarkers = this.waypointMarkers || [];
                this.waypointMarkers.push(waypointMarker);
            }
        }

        // Ajuster la vue pour voir tout l'itinéraire
        this.fitRouteInView(options.padding);

        console.log(`🛣️ Itinéraire Google Maps affiché: ${routePoints.length} points`);
    }

    /**
     * Supprime l'itinéraire affiché
     */
    clearRoute() {
        if (this.routePolyline) {
            this.routePolyline.setMap(null);
            this.routePolyline = null;
            console.log('🗑️ Itinéraire supprimé');
        }

        // Supprimer les marqueurs de waypoints
        if (this.waypointMarkers && this.waypointMarkers.length > 0) {
            this.waypointMarkers.forEach(marker => marker.setMap(null));
            this.waypointMarkers = [];
        }
    }

    /**
     * Supprime le marqueur de départ
     */
    removeStartMarker() {
        if (this.markers.start) {
            this.markers.start.setMap(null);
            this.markers.start = null;
            console.log('🗑️ Marqueur de départ supprimé');
        }
    }

    /**
     * Supprime le marqueur d'arrivée
     */
    removeEndMarker() {
        if (this.markers.end) {
            this.markers.end.setMap(null);
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
        this.map.setCenter({ 
            lat: CONFIG.MAP.DEFAULT_CENTER[0], 
            lng: CONFIG.MAP.DEFAULT_CENTER[1] 
        });
        this.map.setZoom(CONFIG.MAP.DEFAULT_ZOOM);
        
        console.log('🔄 Carte remise à zéro');
    }

    /**
     * Centre la carte sur l'itinéraire actuel
     * @param {Array} padding - Padding optionnel [top, right, bottom, left]
     */
    fitRouteInView(padding = [20, 20]) {
        if (this.routePolyline) {
            // Créer les bounds à partir des points de la polyline
            const bounds = new google.maps.LatLngBounds();
            
            // Ajouter chaque point de la polyline aux bounds
            const path = this.routePolyline.getPath();
            for (let i = 0; i < path.getLength(); i++) {
                bounds.extend(path.getAt(i));
            }
            
            // Ajuster la vue de la carte
            this.map.fitBounds(bounds, { 
                top: padding[0], 
                right: padding[1] || padding[0], 
                bottom: padding[2] || padding[0], 
                left: padding[3] || padding[1] || padding[0] 
            });
        }
    }

    /**
     * Centre la carte sur un point spécifique
     * @param {Object} latlng - Position {lat, lng}
     * @param {number} zoom - Niveau de zoom optionnel
     */
    centerOn(latlng, zoom = null) {
        if (zoom !== null) {
            this.map.setCenter({ lat: latlng.lat, lng: latlng.lng });
            this.map.setZoom(zoom);
        } else {
            this.map.panTo({ lat: latlng.lat, lng: latlng.lng });
        }
    }

    /**
     * Ajuste la vue pour voir deux points
     * @param {Object} point1 - Premier point {lat, lng}
     * @param {Object} point2 - Deuxième point {lat, lng}
     * @param {Array} padding - Padding optionnel
     */
    fitTwoPoints(point1, point2, padding = [50, 50]) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: point1.lat, lng: point1.lng });
        bounds.extend({ lat: point2.lat, lng: point2.lng });
        this.map.fitBounds(bounds, { 
            top: padding[0], 
            right: padding[1] || padding[0], 
            bottom: padding[0], 
            left: padding[1] || padding[0] 
        });
    }

    /**
     * Contrôles de zoom
     */
    zoomIn() {
        this.map.setZoom(this.map.getZoom() + 1);
    }

    zoomOut() {
        this.map.setZoom(this.map.getZoom() - 1);
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
            start: this.markers.start ? {
                lat: this.markers.start.getPosition().lat(),
                lng: this.markers.start.getPosition().lng()
            } : null,
            end: this.markers.end ? {
                lat: this.markers.end.getPosition().lat(),
                lng: this.markers.end.getPosition().lng()
            } : null,
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
            // Google Maps se redimensionne automatiquement
            // Forcer un redraw si nécessaire
            setTimeout(() => {
                google.maps.event.trigger(this.map, 'resize');
            }, 100);
        }
    }
}

