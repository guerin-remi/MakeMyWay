import { CONFIG } from '../config.js';

/**
 * Service de gestion des appels API Google Maps
 * (Directions, Geocoding, Places)
 */
export class ApiService {
    constructor() {
        this.cache = new Map();
        this.setupCacheCleanup();
        
        // Initialiser les services Google Maps
        this.initializeGoogleServices();
    }

    /**
     * Initialise les services Google Maps
     */
    initializeGoogleServices() {
        if (typeof google !== 'undefined' && google.maps) {
            this.directionsService = new google.maps.DirectionsService();
            this.geocoder = new google.maps.Geocoder();
            this.placesService = null; // Sera initialisé avec une carte si nécessaire
            console.log('✅ Services Google Maps initialisés');
        } else {
            console.warn('⚠️ Google Maps API non disponible');
            this.directionsService = null;
            this.geocoder = null;
            this.placesService = null;
        }
    }

    /**
     * Convertit le mode de transport de l'application vers Google Maps
     * @param {string} mode - Mode de l'application ('walking', 'running', 'cycling')
     * @returns {google.maps.TravelMode} Mode Google Maps
     */
    getGoogleTravelMode(mode) {
        if (!google || !google.maps) {
            return null;
        }

        const modeMapping = {
            'walking': google.maps.TravelMode.WALKING,
            'running': google.maps.TravelMode.WALKING, // Google Maps n'a pas de mode running spécifique
            'cycling': google.maps.TravelMode.BICYCLING
        };

        return modeMapping[mode] || google.maps.TravelMode.WALKING;
    }

    /**
     * Initialise le nettoyage automatique du cache
     */
    setupCacheCleanup() {
        setInterval(() => {
            if (this.cache.size > CONFIG.CACHE.MAX_SIZE) {
                const keys = Array.from(this.cache.keys());
                const keysToDelete = keys.slice(0, keys.length - CONFIG.CACHE.MAX_SIZE);
                keysToDelete.forEach(key => this.cache.delete(key));
                console.log(`🧹 Cache API nettoyé: ${keysToDelete.length} entrées supprimées`);
            }
        }, CONFIG.CACHE.CLEANUP_INTERVAL);
    }

    /**
     * Géocodage inversé - obtient l'adresse depuis des coordonnées via Google Geocoding
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<string|null>} Adresse formatée ou null
     */
    async reverseGeocode(lat, lng) {
        // Si Google Maps n'est pas disponible
        if (!this.geocoder) {
            console.warn('⚠️ Google Geocoder non disponible');
            return null;
        }

        const cacheKey = `reverse_${Math.round(lat * 1000)}_${Math.round(lng * 1000)}`;
        
        // Vérifier le cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            console.log(`🌍 Géocodage inversé Google Maps: ${lat}, ${lng}`);

            // Effectuer la requête de géocodage inversé
            const result = await new Promise((resolve, reject) => {
                this.geocoder.geocode(
                    { location: { lat, lng } },
                    (results, status) => {
                        if (status === google.maps.GeocoderStatus.OK) {
                            resolve(results);
                        } else {
                            reject(new Error(`Geocoder failed: ${status}`));
                        }
                    }
                );
            });

            // Extraire la meilleure adresse
            let address = null;
            if (result && result.length > 0) {
                // Prendre la première adresse (la plus précise)
                address = result[0].formatted_address;
                
                // Ou essayer de trouver une adresse de rue plus précise
                const streetAddress = result.find(r => 
                    r.types.includes('street_address') || 
                    r.types.includes('route')
                );
                
                if (streetAddress) {
                    address = streetAddress.formatted_address;
                }
            }

            // Mettre en cache
            this.cache.set(cacheKey, address);
            
            return address;

        } catch (error) {
            console.warn('Erreur géocodage inversé Google Maps:', error);
            return null;
        }
    }

    /**
     * Calcule un itinéraire complet via l'API Google Maps Directions
     * @param {Array} points - Liste des points de passage [{lat, lng}, ...]
     * @param {string} mode - Mode de transport ('walking', 'running', 'cycling')
     * @returns {Promise<Object>} Données de l'itinéraire {route: [...], distance: number, duration: number}
     */
    async calculateRoute(points, mode) {
        if (!points || points.length < 2) {
            throw new Error('Au moins 2 points requis pour calculer un itinéraire');
        }

        // Si Google Maps n'est pas disponible, lancer une erreur
        if (!this.directionsService) {
            throw new Error('Google Maps Directions Service non disponible');
        }

        const coordinates = points.map(p => `${p.lat},${p.lng}`).join(';');
        const cacheKey = `gmaps_route_${mode}_${coordinates}`;

        // Vérifier le cache pour les itinéraires courts
        if (points.length <= 5 && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Préparer la requête Google Maps
            const origin = new google.maps.LatLng(points[0].lat, points[0].lng);
            const destination = new google.maps.LatLng(points[points.length - 1].lat, points[points.length - 1].lng);
            
            // Points intermédiaires (waypoints)
            const waypoints = points.slice(1, -1).map(point => ({
                location: new google.maps.LatLng(point.lat, point.lng),
                stopover: true
            }));

            const request = {
                origin: origin,
                destination: destination,
                waypoints: waypoints,
                travelMode: this.getGoogleTravelMode(mode),
                unitSystem: google.maps.UnitSystem.METRIC,
                avoidHighways: mode === 'walking' || mode === 'running', // Éviter les autoroutes pour la marche/course
                avoidTolls: true,
                optimizeWaypoints: waypoints.length > 0 // Optimiser l'ordre des waypoints si présents
            };

            console.log(`🛣️ Appel Google Maps Directions API: ${points.length} points, mode: ${mode}`);

            // Effectuer la requête
            const result = await new Promise((resolve, reject) => {
                this.directionsService.route(request, (response, status) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                        resolve(response);
                    } else {
                        reject(new Error(`Directions service failed: ${status}`));
                    }
                });
            });

            // Extraire la route principale
            const route = result.routes[0];

            // Extraire tous les points de la route
            const routePoints = [];
            route.legs.forEach(leg => {
                leg.steps.forEach(step => {
                    // Ajouter le point de départ du step
                    routePoints.push({
                        lat: step.start_location.lat(),
                        lng: step.start_location.lng()
                    });
                    
                    // Ajouter tous les points intermédiaires du polyline
                    if (step.path && step.path.length > 0) {
                        step.path.forEach(point => {
                            routePoints.push({
                                lat: point.lat(),
                                lng: point.lng()
                            });
                        });
                    }
                });
            });

            // Ajouter le dernier point
            if (route.legs.length > 0) {
                const lastLeg = route.legs[route.legs.length - 1];
                routePoints.push({
                    lat: lastLeg.end_location.lat(),
                    lng: lastLeg.end_location.lng()
                });
            }

            // Calculer distance et durée totales
            let totalDistance = 0; // en mètres
            let totalDuration = 0; // en secondes

            route.legs.forEach(leg => {
                totalDistance += leg.distance.value;
                totalDuration += leg.duration.value;
            });

            const routeData = {
                route: routePoints,
                distance: totalDistance / 1000, // Conversion en km
                duration: totalDuration / 60    // Conversion en minutes
            };

            // Mettre en cache seulement les itinéraires courts
            if (points.length <= 5) {
                this.cache.set(cacheKey, routeData);
            }

            console.log(`✅ Itinéraire Google Maps calculé: ${routePoints.length} points, ${routeData.distance.toFixed(1)}km`);
            
            return routeData;

        } catch (error) {
            console.error('Erreur API Google Maps Directions:', error);
            throw new Error(`Impossible de calculer l'itinéraire: ${error.message}`);
        }
    }

    /**
     * Initialise un service Places (nécessite une carte)
     * @param {google.maps.Map} map - Instance de carte Google Maps
     */
    initializePlacesService(map) {
        if (google && google.maps && map) {
            this.placesService = new google.maps.places.PlacesService(map);
            console.log('✅ Google Places Service initialisé');
        } else {
            console.warn('⚠️ Impossible d\'initialiser Google Places Service');
        }
    }

    /**
     * Nettoie le cache manuellement
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache API vidé');
    }

    /**
     * Obtient des statistiques du cache
     * @returns {Object} Statistiques du cache
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: CONFIG.CACHE.MAX_SIZE,
            usage: `${Math.round((this.cache.size / CONFIG.CACHE.MAX_SIZE) * 100)}%`
        };
    }

    /**
     * Recherche de POI par catégorie avec Google Places
     * @param {string} category - Catégorie de POI ('nature', 'culture', 'sport', etc.)
     * @param {Object} centerPoint - Point central de recherche {lat, lng}
     * @param {number} radiusKm - Rayon de recherche en km
     * @returns {Promise<Array>} Liste des POI trouvés
     */
    async searchPOIsByCategory(category, centerPoint, radiusKm = 2) {
        if (!this.placesService) {
            console.warn('⚠️ Google Places Service non disponible pour la recherche POI');
            return [];
        }

        // Mapping des catégories vers les types/mots-clés Google Places
        const categoryMapping = {
            // Catégories communes
            'nature': {
                types: ['park'],
                keywords: ['parc', 'jardin', 'nature', 'forêt', 'lac']
            },
            'culture': {
                types: ['museum', 'tourist_attraction', 'church'],
                keywords: ['musée', 'monument', 'église', 'château', 'cathédrale']
            },
            'sport': {
                types: ['gym', 'stadium'],
                keywords: ['stade', 'piscine', 'terrain de sport', 'salle de sport']
            },
            'panorama': {
                types: ['tourist_attraction'],
                keywords: ['belvédère', 'point de vue', 'observatoire', 'tour']
            },
            'eau': {
                types: ['park'],
                keywords: ['fontaine', 'lac', 'rivière', 'étang', 'bassin']
            },
            'shopping': {
                types: ['shopping_mall', 'store'],
                keywords: ['centre commercial', 'magasin', 'boutique']
            },
            
            // Nouvelles catégories adaptatives
            // Marche
            'cafe': {
                types: ['cafe', 'restaurant', 'bakery'],
                keywords: ['café', 'restaurant', 'boulangerie', 'bar']
            },
            'bench': {
                types: ['park'],
                keywords: ['banc', 'aire de repos', 'place', 'square']
            },
            
            // Course
            'water': {
                types: ['park'],
                keywords: ['fontaine', 'point d\'eau', 'eau potable']
            },
            'toilet': {
                types: ['park'],
                keywords: ['toilettes', 'wc', 'sanitaires']
            },
            'shade': {
                types: ['park'],
                keywords: ['ombre', 'couvert', 'arbres', 'parc ombragé']
            },
            
            // Vélo
            'bike_service': {
                types: ['bicycle_store'],
                keywords: ['réparation vélo', 'magasin vélo', 'atelier vélo']
            },
            'bike_parking': {
                types: ['park'],
                keywords: ['parking vélo', 'stationnement vélo', 'garage vélo']
            },
            'rest_area': {
                types: ['park', 'tourist_attraction'],
                keywords: ['aire de repos', 'aire de pique-nique', 'halte']
            }
        };

        const config = categoryMapping[category];
        if (!config) {
            console.warn(`Catégorie POI inconnue: ${category}`);
            return [];
        }

        const cacheKey = `poi_category_${category}_${Math.round(centerPoint.lat * 100)}_${Math.round(centerPoint.lng * 100)}_${radiusKm}`;
        
        // Vérifier le cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Paramètres de recherche
            const request = {
                location: new google.maps.LatLng(centerPoint.lat, centerPoint.lng),
                radius: radiusKm * 1000, // Conversion km -> mètres
                types: config.types
            };

            console.log(`🔍 Recherche Google Places POI: ${category} dans ${radiusKm}km`);

            // Effectuer la recherche
            const results = await new Promise((resolve, reject) => {
                this.placesService.nearbySearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        resolve(results || []);
                    } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                        resolve([]);
                    } else {
                        reject(new Error(`Places search failed: ${status}`));
                    }
                });
            });

            // Formater les résultats
            const formattedResults = results
                .filter(place => place.geometry && place.geometry.location)
                .map(place => ({
                    name: place.name,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    type: place.types[0] || 'point_of_interest',
                    rating: place.rating || 0,
                    vicinity: place.vicinity || '',
                    place_id: place.place_id,
                    category: category
                }))
                .slice(0, 5); // Limiter à 5 résultats

            // Mettre en cache
            this.cache.set(cacheKey, formattedResults);
            
            console.log(`✅ ${formattedResults.length} POI ${category} trouvés`);
            return formattedResults;

        } catch (error) {
            console.error(`Erreur recherche POI ${category}:`, error);
            return [];
        }
    }

    /**
     * Recherche personnalisée de POI avec Google Places Text Search
     * @param {string} query - Terme de recherche
     * @param {Object} centerPoint - Point central de recherche {lat, lng}
     * @param {number} radiusKm - Rayon de recherche en km
     * @returns {Promise<Array>} Liste des POI trouvés
     */
    async searchCustomPOI(query, centerPoint, radiusKm = 2) {
        if (!this.placesService) {
            console.warn('⚠️ Google Places Service non disponible pour la recherche POI');
            return [];
        }

        if (!query || query.length < 2) {
            return [];
        }

        const cacheKey = `poi_custom_${query}_${Math.round(centerPoint.lat * 100)}_${Math.round(centerPoint.lng * 100)}_${radiusKm}`;
        
        // Vérifier le cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Paramètres de recherche
            const request = {
                query: query,
                location: new google.maps.LatLng(centerPoint.lat, centerPoint.lng),
                radius: radiusKm * 1000 // Conversion km -> mètres
            };

            console.log(`🔍 Recherche Google Places POI personnalisé: "${query}"`);

            // Effectuer la recherche
            const results = await new Promise((resolve, reject) => {
                this.placesService.textSearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        resolve(results || []);
                    } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                        resolve([]);
                    } else {
                        reject(new Error(`Places text search failed: ${status}`));
                    }
                });
            });

            // Formater les résultats
            const formattedResults = results
                .filter(place => place.geometry && place.geometry.location)
                .map(place => ({
                    name: place.name,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    type: place.types[0] || 'point_of_interest',
                    rating: place.rating || 0,
                    formatted_address: place.formatted_address || '',
                    place_id: place.place_id,
                    category: 'custom'
                }))
                .slice(0, 8); // Limiter à 8 résultats

            // Mettre en cache
            this.cache.set(cacheKey, formattedResults);
            
            console.log(`✅ ${formattedResults.length} POI personnalisés trouvés pour "${query}"`);
            return formattedResults;

        } catch (error) {
            console.error('Erreur recherche POI personnalisée:', error);
            return [];
        }
    }

    /**
     * Obtient l'icône pour un type de POI Google Places
     * @param {string} type - Type de POI
     * @returns {string} Emoji/icône correspondant
     */
    getPOITypeIcon(type) {
        const icons = {
            // Types Google Places
            'tourist_attraction': '🎯',
            'museum': '🏛️',
            'park': '🌳',
            'restaurant': '🍽️',
            'cafe': '☕',
            'shopping_mall': '🛒',
            'store': '🛍️',
            'church': '⛪',
            'stadium': '🏟️',
            'gym': '🏋️',
            'amusement_park': '🎢',
            'zoo': '🦁',
            'aquarium': '🐠',
            'library': '📚',
            'hospital': '🏥',
            'pharmacy': '💊',
            'bank': '🏦',
            'gas_station': '⛽',
            // Fallbacks
            'point_of_interest': '📍',
            'default': '📍'
        };
        return icons[type] || icons.default;
    }

    /**
     * Formate le type de POI pour l'affichage
     * @param {string} type - Type de POI Google Places
     * @returns {string} Type formaté en français
     */
    formatPOIType(type) {
        const translations = {
            'tourist_attraction': 'Attraction touristique',
            'museum': 'Musée',
            'park': 'Parc',
            'restaurant': 'Restaurant',
            'cafe': 'Café',
            'shopping_mall': 'Centre commercial',
            'store': 'Magasin',
            'church': 'Église',
            'stadium': 'Stade',
            'gym': 'Salle de sport',
            'amusement_park': 'Parc d\'attractions',
            'zoo': 'Zoo',
            'aquarium': 'Aquarium',
            'library': 'Bibliothèque',
            'hospital': 'Hôpital',
            'pharmacy': 'Pharmacie',
            'bank': 'Banque',
            'gas_station': 'Station essence',
            'point_of_interest': 'Point d\'intérêt'
        };
        return translations[type] || type;
    }

    /**
     * Vérifie si les services Google Maps sont disponibles
     * @returns {Object} État des services
     */
    getServicesStatus() {
        return {
            directionsService: !!this.directionsService,
            geocoder: !!this.geocoder,
            placesService: !!this.placesService,
            googleMapsLoaded: !!(typeof google !== 'undefined' && google.maps)
        };
    }
}

