import { CONFIG, ConfigUtils } from '../config.js';

/**
 * Service de gestion des appels API externes (OSRM et Nominatim)
 */
export class ApiService {
    constructor() {
        this.cache = new Map();
        this.setupCacheCleanup();
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
     * Recherche d'adresses via l'API Nominatim
     * @param {string} query - Terme de recherche
     * @param {number} limit - Nombre maximum de résultats
     * @returns {Promise<Array>} Liste des adresses trouvées
     */
    async searchAddresses(query, limit = 5) {
        if (!query || query.length < 2) {
            return [];
        }

        const cacheKey = `address_${query}_${limit}`;
        
        // Vérifier le cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const url = ConfigUtils.buildNominatimUrl('search', {
                q: query,
                limit,
                addressdetails: 1
            });

            const response = await fetch(url, {
                headers: ConfigUtils.getDefaultHeaders(),
                signal: AbortSignal.timeout(CONFIG.TIMEOUTS.API_REQUEST)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            const addresses = data.map(item => ({
                display_name: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon || item.lng),
                type: item.type,
                importance: item.importance || 0
            }));

            // Mettre en cache
            this.cache.set(cacheKey, addresses);
            
            return addresses;

        } catch (error) {
            console.error('Erreur API Nominatim (searchAddresses):', error);
            return [];
        }
    }

    /**
     * Géocodage inversé - obtient l'adresse depuis des coordonnées
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<string|null>} Adresse formatée ou null
     */
    async reverseGeocode(lat, lng) {
        const cacheKey = `reverse_${Math.round(lat * 1000)}_${Math.round(lng * 1000)}`;
        
        // Vérifier le cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const url = ConfigUtils.buildNominatimUrl('reverse', {
                lat,
                lon: lng,
                zoom: 18,
                addressdetails: 1
            });

            const response = await fetch(url, {
                headers: ConfigUtils.getDefaultHeaders(),
                signal: AbortSignal.timeout(CONFIG.TIMEOUTS.GEOCODING)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const address = data.display_name ? this.formatAddressName(data.display_name) : null;

            // Mettre en cache
            this.cache.set(cacheKey, address);
            
            return address;

        } catch (error) {
            console.warn('Erreur géocodage inversé:', error);
            return null;
        }
    }

    /**
     * Recherche de POI (Points d'intérêt) dans une zone donnée
     * @param {string} query - Terme de recherche
     * @param {Object} centerPoint - Point central de la recherche {lat, lng}
     * @param {number} radiusKm - Rayon de recherche en km
     * @returns {Promise<Array>} Liste des POI trouvés
     */
    async searchPOIs(query, centerPoint, radiusKm = CONFIG.POI.SEARCH_RADIUS) {
        if (!query || query.length < CONFIG.POI.MIN_QUERY_LENGTH) {
            return [];
        }

        const cacheKey = `poi_${query}_${Math.round(centerPoint.lat * 100)}_${Math.round(centerPoint.lng * 100)}_${radiusKm}`;
        
        // Vérifier le cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Calculer la viewbox (approximation)
            const offset = radiusKm / 111; // Conversion km -> degrés (approximation)
            
            const url = ConfigUtils.buildNominatimUrl('search', {
                q: query,
                limit: CONFIG.POI.MAX_SEARCH_RESULTS,
                lat: centerPoint.lat,
                lon: centerPoint.lng,
                bounded: 1,
                viewbox: `${centerPoint.lng - offset},${centerPoint.lat + offset},${centerPoint.lng + offset},${centerPoint.lat - offset}`
            });

            const response = await fetch(url, {
                headers: ConfigUtils.getDefaultHeaders(),
                signal: AbortSignal.timeout(CONFIG.TIMEOUTS.API_REQUEST)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            const pois = data
                .map(item => ({
                    name: item.display_name.split(',')[0],
                    full_name: item.display_name,
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon || item.lng),
                    type: item.type,
                    class: item.class,
                    importance: item.importance || 0
                }))
                .filter(poi => {
                    // Filtrer les types intéressants
                    const interestingTypes = ['tourism', 'amenity', 'leisure', 'historic', 'natural'];
                    return interestingTypes.includes(poi.class);
                });

            // Mettre en cache
            this.cache.set(cacheKey, pois);
            
            return pois;

        } catch (error) {
            console.error('Erreur API POI:', error);
            return [];
        }
    }

    /**
     * Trouve le point routier le plus proche via OSRM
     * @param {Object} point - Point à aligner {lat, lng}
     * @param {string} mode - Mode de transport ('walking', 'running', 'cycling')
     * @returns {Promise<Object|null>} Point aligné ou point original
     */
    async snapToRoad(point, mode) {
        // Clé de cache basée sur position arrondie (précision selon CONFIG)
        const lat = Math.round(point.lat * CONFIG.CACHE.PRECISION) / CONFIG.CACHE.PRECISION;
        const lng = Math.round(point.lng * CONFIG.CACHE.PRECISION) / CONFIG.CACHE.PRECISION;
        const profile = ConfigUtils.getModeConfig(mode).profile;
        const cacheKey = `snap_${profile}_${lat}_${lng}`;
        
        // Vérifier le cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const url = ConfigUtils.buildOSRMUrl('nearest', profile, `${point.lng},${point.lat}`, {
                number: 1
            });

            const response = await fetch(url);
            const data = await response.json();
            
            let result = point; // Point original par défaut
            
            if (data.code === 'Ok' && data.waypoints && data.waypoints.length > 0) {
                const wp = data.waypoints[0];
                result = {
                    lat: wp.location[1],
                    lng: wp.location[0]
                };
            }
            
            // Mettre en cache
            this.cache.set(cacheKey, result);
            return result;
            
        } catch (error) {
            console.warn('Erreur snap to road:', error);
            return point; // Retourner le point original en cas d'erreur
        }
    }

    /**
     * Calcule un itinéraire complet via l'API OSRM
     * @param {Array} points - Liste des points de passage [{lat, lng}, ...]
     * @param {string} mode - Mode de transport
     * @returns {Promise<Object>} Données de l'itinéraire {route: [...], distance: number, duration: number}
     */
    async calculateRoute(points, mode) {
        if (!points || points.length < 2) {
            throw new Error('Au moins 2 points requis pour calculer un itinéraire');
        }

        const profile = ConfigUtils.getModeConfig(mode).profile;
        const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
        const cacheKey = `route_${profile}_${coordinates}`;

        // Vérifier le cache pour les itinéraires courts (éviter de cacher les longs)
        if (points.length <= 5 && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const url = ConfigUtils.buildOSRMUrl('route', profile, coordinates, {
                overview: 'full',
                geometries: 'geojson'
            });

            console.log(`🛣️ Appel OSRM: ${url}`);

            const response = await fetch(url, {
                signal: AbortSignal.timeout(CONFIG.TIMEOUTS.API_REQUEST)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                throw new Error(data.message || 'Aucun itinéraire trouvé');
            }

            const route = data.routes[0];
            const geometry = route.geometry;

            // Convertir les coordonnées en format attendu par Leaflet
            const routePoints = geometry.coordinates.map(coord => ({
                lat: coord[1],
                lng: coord[0]
            }));

            const result = {
                route: routePoints,
                distance: route.distance / 1000, // Conversion en km
                duration: route.duration / 60    // Conversion en minutes
            };

            // Mettre en cache seulement les itinéraires courts
            if (points.length <= 5) {
                this.cache.set(cacheKey, result);
            }

            console.log(`✅ Itinéraire calculé: ${routePoints.length} points, ${result.distance.toFixed(1)}km`);
            
            return result;

        } catch (error) {
            console.error('Erreur API OSRM (calculateRoute):', error);
            throw new Error(`Impossible de calculer l'itinéraire: ${error.message}`);
        }
    }

    /**
     * Recherche multiple de POI par catégorie
     * @param {string} category - Catégorie de POI
     * @param {Object} centerPoint - Point central
     * @param {number} maxResults - Nombre maximum de résultats par requête
     * @returns {Promise<Array>} Liste des POI trouvés
     */
    async searchPOIsByCategory(category, centerPoint, maxResults = 3) {
        const categoryConfig = CONFIG.POI.CATEGORIES[category];
        if (!categoryConfig) {
            console.warn(`Catégorie POI inconnue: ${category}`);
            return [];
        }

        const allPOIs = [];

        try {
            for (const query of categoryConfig.queries) {
                const pois = await this.searchPOIs(query, centerPoint);
                
                // Prendre les meilleurs résultats
                const filteredPOIs = pois
                    .filter(poi => !allPOIs.some(existing => 
                        Math.abs(existing.lat - poi.lat) < 0.001 && 
                        Math.abs(existing.lng - poi.lng) < 0.001
                    ))
                    .slice(0, Math.max(1, Math.floor(maxResults / categoryConfig.queries.length)));

                for (const poi of filteredPOIs) {
                    poi.category = category; // Marquer la catégorie
                    allPOIs.push(poi);
                }

                // Délai entre les requêtes pour éviter de surcharger l'API
                await new Promise(resolve => setTimeout(resolve, CONFIG.ROUTE_GENERATION.WAYPOINTS.DELAY_BETWEEN_API_CALLS));
            }

            return allPOIs;

        } catch (error) {
            console.error(`Erreur recherche POI catégorie ${category}:`, error);
            return [];
        }
    }

    /**
     * Formate le nom d'une adresse pour l'affichage
     * @param {string} displayName - Nom complet de l'adresse
     * @returns {string} Nom formaté
     */
    formatAddressName(displayName) {
        if (!displayName) return '';
        const parts = displayName.split(',');
        return parts[0] + (parts[1] ? ', ' + parts[1] : '');
    }

    /**
     * Extrait les détails d'une adresse
     * @param {string} displayName - Nom complet de l'adresse  
     * @returns {string} Détails de l'adresse
     */
    getAddressDetails(displayName) {
        if (!displayName) return '';
        const parts = displayName.split(',');
        return parts.slice(2).join(',').trim();
    }

    /**
     * Obtient l'icône pour un type de POI
     * @param {string} type - Type de POI
     * @returns {string} Emoji/icône correspondant
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
     * @param {string} type - Type de POI
     * @param {string} poiClass - Classe de POI
     * @returns {string} Type formaté en français
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
}