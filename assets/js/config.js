/**
 * Configuration centralisée pour MakeMyWay
 */

export const CONFIG = {
    // APIs
    GOOGLE_MAPS: {
        // Configuration Google Maps gérée dans index.html
        DEFAULT_COUNTRY: 'fr',
        DEFAULT_LANGUAGE: 'fr'
    },

    // Configuration de la carte
    MAP: {
        DEFAULT_CENTER: [48.8566, 2.3522], // Paris
        DEFAULT_ZOOM: 12,
        MIN_ZOOM: 5,
        MAX_ZOOM: 19
    },

    // Vitesses moyennes par mode (km/h)
    SPEEDS: {
        walking: 4.5,
        running: 8.5,
        cycling: 18
    },

    // Limites de distance par mode (km)
    DISTANCE_LIMITS: {
        walking: { min: 1, max: 15, default: 5 },
        running: { min: 1, max: 30, default: 10 },
        cycling: { min: 2, max: 80, default: 25 }
    },

    // Configuration des parcours
    ROUTE_GENERATION: {
        // Nombre maximum d'essais pour générer un parcours
        MAX_ATTEMPTS: 3,
        
        // Tolérance de distance (pourcentage)
        DISTANCE_TOLERANCE: {
            SHORT: 0.08,    // ≤ 8km : 8%
            MEDIUM: 0.12,   // 8-20km : 12%
            LONG: 0.20,     // > 20km : 20%
            VERY_LONG: 0.25 // > 50km : 25%
        },
        
        // Configuration des points de passage
        WAYPOINTS: {
            MIN_POINTS: 2,
            MAX_POINTS: 8,
            BATCH_SIZE: 3, // Traitement par batch pour l'API
            DELAY_BETWEEN_BATCHES: 50, // ms
            DELAY_BETWEEN_API_CALLS: 30 // ms
        },

        // Rayons de recherche (km)
        SEARCH_RADIUS: {
            walking: { base: 2, max: 5 },
            running: { base: 3, max: 8 },
            cycling: { base: 5, max: 20 }
        }
    },

    // Configuration des POI
    POI: {
        MAX_SEARCH_RESULTS: 8,
        SEARCH_RADIUS: 10, // km
        MIN_QUERY_LENGTH: 3,
        SEARCH_DELAY: 300, // ms pour éviter trop de requêtes
        
        CATEGORIES: {
            nature: {
                name: 'Nature',
                icon: '🌳',
                queries: ['parc', 'jardin public', 'forêt', 'lac']
            },
            culture: {
                name: 'Culture',
                icon: '🏛️',
                queries: ['musée', 'monument', 'église', 'théâtre']
            },
            sport: {
                name: 'Sport',
                icon: '🏃',
                queries: ['stade', 'piscine', 'gymnase', 'terrain de sport']
            },
            panorama: {
                name: 'Panorama',
                icon: '🏔️',
                queries: ['belvédère', 'point de vue', 'tour', 'colline']
            },
            eau: {
                name: 'Points d\'eau',
                icon: '💧',
                queries: ['fontaine', 'lac', 'rivière', 'canal']
            },
            shopping: {
                name: 'Shopping',
                icon: '🛍️',
                queries: ['marché', 'centre commercial', 'rue commerçante']
            }
        }
    },

    // Configuration du cache
    CACHE: {
        MAX_SIZE: 100,
        CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 minutes
        PRECISION: 1000 // Arrondi à 100m pour les coordonnées
    },

    // Configuration des timeouts
    TIMEOUTS: {
        API_REQUEST: 5000,      // 5 secondes
        GEOCODING: 3000,        // 3 secondes pour le géocodage inversé
        GEOLOCATION: 10000      // 10 secondes pour la géolocalisation
    },

    // Configuration de l'interface
    UI: {
        SUGGESTION_DELAY: 200,  // ms avant de masquer les suggestions
        ANIMATION_DURATION: 300, // ms
        ERROR_DISPLAY_TIME: 5000, // ms
        
        // Breakpoints responsive
        BREAKPOINTS: {
            MOBILE: 768,
            TABLET: 1024,
            DESKTOP: 1200
        }
    },

    // Messages et textes
    MESSAGES: {
        ERRORS: {
            NO_GEOLOCATION: 'La géolocalisation n\'est pas supportée',
            POSITION_ERROR: 'Impossible d\'obtenir votre position',
            NO_ROUTE: 'Impossible de générer un parcours pour cette zone',
            DISTANCE_TOO_HIGH: 'Distance trop élevée pour ce mode de transport',
            NO_START_POINT: 'Veuillez définir un point de départ',
            API_ERROR: 'Erreur de connexion aux services de cartographie',
            INVALID_QUERY: 'Veuillez saisir un nom de lieu valide'
        },
        
        SUCCESS: {
            ROUTE_GENERATED: 'Parcours généré avec succès !',
            GPX_EXPORTED: 'Fichier GPX exporté avec succès',
            POSITION_FOUND: 'Position obtenue avec succès'
        },
        
        INFO: {
            LOADING: 'Génération du parcours en cours...',
            SEARCHING: 'Recherche en cours...',
            PLACE_START: 'Cliquez sur la carte pour placer le point de départ',
            PLACE_END: 'Cliquez sur la carte pour placer l\'arrivée'
        }
    },

    // Configuration d'export
    EXPORT: {
        GPX: {
            VERSION: '1.1',
            CREATOR: 'MakeMyWay',
            DEFAULT_NAME: 'Parcours MakeMyWay'
        }
    }
};

// Fonctions utilitaires de configuration
export const ConfigUtils = {
    /**
     * Obtient la configuration pour un mode de transport
     */
    getModeConfig(mode) {
        return {
            speed: CONFIG.SPEEDS[mode] || CONFIG.SPEEDS.walking,
            limits: CONFIG.DISTANCE_LIMITS[mode] || CONFIG.DISTANCE_LIMITS.walking,
            searchRadius: CONFIG.ROUTE_GENERATION.SEARCH_RADIUS[mode] || CONFIG.ROUTE_GENERATION.SEARCH_RADIUS.walking
        };
    },

    /**
     * Obtient la tolérance de distance selon la distance cible
     */
    getDistanceTolerance(targetDistance) {
        if (targetDistance <= 8) return CONFIG.ROUTE_GENERATION.DISTANCE_TOLERANCE.SHORT;
        if (targetDistance <= 20) return CONFIG.ROUTE_GENERATION.DISTANCE_TOLERANCE.MEDIUM;
        if (targetDistance <= 50) return CONFIG.ROUTE_GENERATION.DISTANCE_TOLERANCE.LONG;
        return CONFIG.ROUTE_GENERATION.DISTANCE_TOLERANCE.VERY_LONG;
    },

    /**
     * Obtient les options par défaut pour Google Maps
     */
    getGoogleMapsOptions() {
        return {
            language: CONFIG.GOOGLE_MAPS.DEFAULT_LANGUAGE,
            region: CONFIG.GOOGLE_MAPS.DEFAULT_COUNTRY
        };
    }
};