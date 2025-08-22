/**
 * Adaptateur de catégories POI selon le mode de transport
 * Optimise la pertinence des points d'intérêt selon l'activité
 */
export class POICategoryAdapter {
    constructor() {
        // Catégories adaptées par mode de transport
        this.categoriesByMode = {
            walking: [
                { id: 'nature', label: 'Nature', icon: '🌳', types: ['park', 'garden', 'forest'] },
                { id: 'culture', label: 'Culture', icon: '🏛️', types: ['museum', 'art_gallery', 'monument'] },
                { id: 'panorama', label: 'Points de vue', icon: '🌅', types: ['viewpoint', 'observation_deck'] },
                { id: 'cafe', label: 'Cafés & Restos', icon: '☕', types: ['cafe', 'restaurant', 'bakery'] },
                { id: 'shopping', label: 'Shopping', icon: '🛍️', types: ['shopping_mall', 'store', 'market'] },
                { id: 'bench', label: 'Bancs & Repos', icon: '🪑', types: ['bench', 'rest_area', 'square'] }
            ],
            running: [
                { id: 'nature', label: 'Parcs & Nature', icon: '🌲', types: ['park', 'trail', 'forest'] },
                { id: 'water', label: 'Points d\'eau', icon: '💧', types: ['drinking_water', 'fountain'] },
                { id: 'sport', label: 'Sport', icon: '🏃', types: ['stadium', 'sports_complex', 'track'] },
                { id: 'toilet', label: 'Toilettes', icon: '🚻', types: ['toilet', 'public_toilet'] },
                { id: 'shade', label: 'Zones ombragées', icon: '🌳', types: ['shaded_area', 'tree_cover'] },
                { id: 'bench', label: 'Zones de repos', icon: '🪑', types: ['bench', 'rest_area'] }
            ],
            cycling: [
                { id: 'nature', label: 'Nature & Parcs', icon: '🌳', types: ['park', 'trail', 'scenic_route'] },
                { id: 'panorama', label: 'Points de vue', icon: '🏔️', types: ['viewpoint', 'scenic_spot'] },
                { id: 'bike_service', label: 'Services vélo', icon: '🚲', types: ['bike_shop', 'bike_repair'] },
                { id: 'water', label: 'Points d\'eau', icon: '💧', types: ['drinking_water', 'fountain'] },
                { id: 'bike_parking', label: 'Parking vélo', icon: '🅿️', types: ['bike_parking', 'bike_rack'] },
                { id: 'rest_area', label: 'Aires de repos', icon: '🛤️', types: ['rest_area', 'picnic_area'] }
            ]
        };

        // Scoring de pertinence par catégorie et mode
        this.relevanceScores = {
            walking: {
                nature: 80,
                culture: 90,
                panorama: 85,
                cafe: 75,
                shopping: 60,
                bench: 70
            },
            running: {
                nature: 100,
                water: 95,
                sport: 85,
                toilet: 80,
                shade: 90,
                bench: 70
            },
            cycling: {
                nature: 90,
                panorama: 95,
                bike_service: 85,
                water: 80,
                bike_parking: 75,
                rest_area: 70
            }
        };

        // Configuration des rayons de recherche par mode (en mètres)
        this.searchRadius = {
            walking: 500,    // 500m de détour max
            running: 300,    // 300m de détour max (coureurs veulent rester sur leur route)
            cycling: 1000    // 1km de détour max (vélos peuvent couvrir plus de distance)
        };
    }

    /**
     * Obtient les catégories adaptées pour un mode de transport
     * @param {string} mode - Mode de transport (walking, running, cycling)
     * @returns {Array} Catégories adaptées
     */
    getCategoriesForMode(mode) {
        return this.categoriesByMode[mode] || this.categoriesByMode.walking;
    }

    /**
     * Obtient le score de pertinence d'une catégorie pour un mode
     * @param {string} mode - Mode de transport
     * @param {string} categoryId - ID de la catégorie
     * @returns {number} Score de pertinence (0-100)
     */
    getRelevanceScore(mode, categoryId) {
        return this.relevanceScores[mode]?.[categoryId] || 50;
    }

    /**
     * Filtre et score les POI selon leur pertinence
     * @param {Array} pois - Liste des POI à filtrer
     * @param {string} mode - Mode de transport
     * @param {Object} route - Données du parcours
     * @returns {Array} POI triés par pertinence
     */
    filterAndScorePOIs(pois, mode, route) {
        return pois
            .map(poi => ({
                ...poi,
                score: this.calculatePOIScore(poi, mode, route)
            }))
            .filter(poi => poi.score > 30) // Filtre les POI peu pertinents
            .sort((a, b) => b.score - a.score);
    }

    /**
     * Calcule le score d'un POI
     * @param {Object} poi - Point d'intérêt
     * @param {string} mode - Mode de transport
     * @param {Object} route - Données du parcours
     * @returns {number} Score total du POI
     */
    calculatePOIScore(poi, mode, route) {
        let score = 0;

        // Score de pertinence de base selon la catégorie
        const relevance = this.getRelevanceScore(mode, poi.category);
        score += relevance * 0.4; // 40% du score

        // Score selon la distance au parcours
        const distanceScore = this.calculateDistanceScore(poi, route, mode);
        score += distanceScore * 0.3; // 30% du score

        // Score selon le rating Google
        const rating = poi.rating || 3;
        const ratingScore = (rating / 5) * 100;
        score += ratingScore * 0.2; // 20% du score

        // Score selon le nombre d'avis (popularité)
        const reviews = poi.user_ratings_total || 0;
        const popularityScore = Math.min(100, reviews / 10);
        score += popularityScore * 0.1; // 10% du score

        return Math.round(score);
    }

    /**
     * Calcule le score basé sur la distance au parcours
     * @param {Object} poi - Point d'intérêt
     * @param {Object} route - Données du parcours
     * @param {string} mode - Mode de transport
     * @returns {number} Score de distance (0-100)
     */
    calculateDistanceScore(poi, route, mode) {
        // Simplification : on utilise la distance au point de départ
        // En production, il faudrait calculer la distance perpendiculaire au segment de route le plus proche
        const maxRadius = this.searchRadius[mode];
        const distance = this.calculateDistance(poi, route.startPoint);
        
        if (distance > maxRadius) return 0;
        
        // Score inversement proportionnel à la distance
        return Math.round(100 * (1 - distance / maxRadius));
    }

    /**
     * Calcule la distance entre deux points (formule de Haversine simplifiée)
     * @param {Object} point1 - Premier point {lat, lng}
     * @param {Object} point2 - Deuxième point {lat, lng}
     * @returns {number} Distance en mètres
     */
    calculateDistance(point1, point2) {
        if (!point1 || !point2) return Infinity;
        
        const R = 6371000; // Rayon de la Terre en mètres
        const lat1 = point1.lat * Math.PI / 180;
        const lat2 = point2.lat * Math.PI / 180;
        const deltaLat = (point2.lat - point1.lat) * Math.PI / 180;
        const deltaLng = (point2.lng - point1.lng) * Math.PI / 180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    /**
     * Obtient les types Google Places pour une catégorie
     * @param {string} mode - Mode de transport
     * @param {string} categoryId - ID de la catégorie
     * @returns {Array} Types Google Places
     */
    getGooglePlacesTypes(mode, categoryId) {
        const categories = this.getCategoriesForMode(mode);
        const category = categories.find(c => c.id === categoryId);
        return category ? category.types : [];
    }

    /**
     * Suggère des catégories selon le contexte (heure, météo, saison)
     * @param {string} mode - Mode de transport
     * @param {Object} context - Contexte {hour, weather, season}
     * @returns {Array} Catégories suggérées
     */
    getSuggestedCategories(mode, context = {}) {
        const categories = this.getCategoriesForMode(mode);
        const { hour = new Date().getHours() } = context;

        // Logique de suggestion selon l'heure
        if (mode === 'running') {
            if (hour < 8 || hour > 20) {
                // Tôt le matin ou le soir : privilégier les zones éclairées
                return categories.filter(c => ['sport', 'water', 'toilet'].includes(c.id));
            }
        }

        if (mode === 'walking') {
            if (hour >= 11 && hour <= 14) {
                // Heure du déjeuner : suggérer les cafés
                return categories.sort((a, b) => {
                    if (a.id === 'cafe') return -1;
                    if (b.id === 'cafe') return 1;
                    return 0;
                });
            }
        }

        return categories;
    }

    /**
     * Valide si un POI est accessible pour un mode de transport
     * @param {Object} poi - Point d'intérêt
     * @param {string} mode - Mode de transport
     * @returns {boolean} True si accessible
     */
    isPOIAccessible(poi, mode) {
        // Exemples de restrictions
        if (mode === 'cycling' && poi.type === 'pedestrian_only') {
            return false;
        }
        
        if (mode === 'running' && poi.type === 'car_only') {
            return false;
        }

        // Par défaut, on considère que c'est accessible
        return true;
    }
}

// Export singleton
export default new POICategoryAdapter();