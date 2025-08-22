import { CONFIG, ConfigUtils } from '../config.js';
import RouteOptimizer from './RouteOptimizer.js';

/**
 * Générateur de parcours intelligent avec différentes stratégies
 */
export class RouteGenerator {
    constructor(apiService) {
        this.apiService = apiService;
        this.lastGeneratedRoute = null;
        this.lastRouteMetadata = null;
    }

    /**
     * Génère un parcours intelligent basé sur les paramètres
     * @param {Object} startPoint - Point de départ {lat, lng}
     * @param {number} targetDistance - Distance cible en km
     * @param {string} mode - Mode de transport
     * @param {Object} options - Options additionnelles
     * @returns {Promise<Object>} Résultat de la génération
     */
    async generateRoute(startPoint, targetDistance, mode, options = {}) {
        const { endPoint = null, returnToStart = false, pois = [] } = options;
        
        console.log(`🛣️ Génération parcours: ${targetDistance}km en mode ${mode}`);
        
        try {
            let routeData;
            
            if (returnToStart || !endPoint) {
                // Parcours en boucle
                routeData = await this.generateLoopRoute(startPoint, targetDistance, mode, { pois });
            } else {
                // Parcours point à point
                routeData = await this.generatePointToPointRoute(startPoint, endPoint, targetDistance, mode, { pois });
            }

            // Stocker les métadonnées
            this.lastRouteMetadata = {
                startPoint,
                endPoint,
                targetDistance,
                mode,
                actualDistance: routeData.distance,
                returnToStart,
                generatedAt: new Date()
            };

            this.lastGeneratedRoute = routeData;
            
            console.log(`✅ Parcours généré: ${routeData.distance.toFixed(1)}km`);
            
            return routeData;

        } catch (error) {
            console.error('Erreur génération parcours:', error);
            throw error;
        }
    }

    /**
     * Génère un parcours en boucle
     * @param {Object} startPoint - Point de départ
     * @param {number} targetDistance - Distance cible
     * @param {string} mode - Mode de transport
     * @param {Object} options - Options
     * @returns {Promise<Object>} Données du parcours
     */
    async generateLoopRoute(startPoint, targetDistance, mode, options = {}) {
        console.log(`Génération boucle: ${targetDistance}km`);
        
        let bestRoute = null;
        let bestDistance = 0;
        let bestDeviation = Infinity;
        
        const tolerance = ConfigUtils.getDistanceTolerance(targetDistance);
        const maxAttempts = CONFIG.ROUTE_GENERATION.MAX_ATTEMPTS;
        
        // Adapter le nombre de tentatives pour les longues distances
        const actualAttempts = targetDistance > 20 ? maxAttempts + 2 : maxAttempts;
        
        for (let attempt = 1; attempt <= actualAttempts; attempt++) {
            try {
                console.log(`Tentative ${attempt}/${actualAttempts} (tolérance: ${(tolerance*100).toFixed(0)}%)`);
                
                // Générer des points de passage avec facteur adaptatif
                const radiusFactor = this.calculateRadiusFactor(attempt, bestDistance, targetDistance);
                const waypoints = await this.generateWaypoints(startPoint, targetDistance, mode, radiusFactor);
                
                if (waypoints.length < CONFIG.ROUTE_GENERATION.WAYPOINTS.MIN_POINTS) {
                    console.warn(`Tentative ${attempt}: Pas assez de points de passage`);
                    continue;
                }
                
                // Ajouter les POI aux waypoints si fournis
                const { pois = [] } = options;
                let finalWaypoints = [...waypoints];
                
                if (pois.length > 0) {
                    console.log(`Optimisation de ${pois.length} POI pour l'itinéraire`);
                    // Optimiser l'ordre des POI
                    const optimizedPOIs = RouteOptimizer.optimizePOIOrder(
                        startPoint, 
                        null, // Pas de point de fin pour une boucle
                        pois,
                        true  // Retour au départ
                    );
                    // Convertir les POI optimisés au format {lat, lng}
                    const poiPoints = optimizedPOIs.map(poi => ({ lat: poi.lat, lng: poi.lng }));
                    finalWaypoints = [...waypoints, ...poiPoints];
                }
                
                // Créer la boucle complète avec POI intégrés
                const allPoints = [startPoint, ...finalWaypoints, startPoint];
                
                // Calculer l'itinéraire
                const routeData = await this.apiService.calculateRoute(allPoints, mode);
                const deviation = Math.abs(routeData.distance - targetDistance);
                
                console.log(`Tentative ${attempt}: ${routeData.distance.toFixed(1)}km (écart: ${deviation.toFixed(1)}km, facteur: ${radiusFactor.toFixed(2)})`);
                
                // Garder le meilleur résultat
                if (deviation < bestDeviation || bestRoute === null) {
                    bestRoute = routeData;
                    bestDistance = routeData.distance;
                    bestDeviation = deviation;
                }
                
                // Si on est assez proche, on s'arrête
                if (deviation < targetDistance * tolerance) {
                    console.log(`✅ Distance acceptable trouvée: ${routeData.distance.toFixed(1)}km`);
                    break;
                }
                
                // Délai entre les tentatives
                await this.delay(CONFIG.ROUTE_GENERATION.WAYPOINTS.DELAY_BETWEEN_API_CALLS);
                
            } catch (error) {
                console.warn(`Erreur tentative ${attempt}:`, error);
            }
        }
        
        if (!bestRoute) {
            throw new Error(CONFIG.MESSAGES.ERRORS.NO_ROUTE);
        }
        
        console.log(`🏆 Meilleur parcours en boucle: ${bestDistance.toFixed(1)}km (écart: ${bestDeviation.toFixed(1)}km)`);
        return bestRoute;
    }

    /**
     * Génère un parcours point à point
     * @param {Object} startPoint - Point de départ
     * @param {Object} endPoint - Point d'arrivée
     * @param {number} targetDistance - Distance cible
     * @param {string} mode - Mode de transport
     * @param {Object} options - Options
     * @returns {Promise<Object>} Données du parcours
     */
    async generatePointToPointRoute(startPoint, endPoint, targetDistance, mode, options = {}) {
        console.log(`Génération A→B: ${targetDistance}km`);
        
        try {
            // Intégrer les POI dans tous les cas
            const { pois = [] } = options;
            let basePoints = [startPoint, endPoint];
            
            if (pois.length > 0) {
                console.log(`Optimisation de ${pois.length} POI pour l'itinéraire A→B`);
                // Optimiser l'ordre des POI pour minimiser les détours
                const optimizedPOIs = RouteOptimizer.optimizePOIOrder(
                    startPoint,
                    endPoint,
                    pois,
                    false // Pas de retour au départ
                );
                // Convertir les POI optimisés et les insérer dans l'ordre optimal
                const poiPoints = optimizedPOIs.map(poi => ({ lat: poi.lat, lng: poi.lng }));
                basePoints = [startPoint, ...poiPoints, endPoint];
            }
            
            // Calculer d'abord la distance avec POI inclus
            const directRoute = await this.apiService.calculateRoute(basePoints, mode);
            const directDistance = directRoute.distance;
            
            console.log(`Distance directe: ${directDistance.toFixed(1)}km, cible: ${targetDistance}km`);
            
            // Si la distance directe est proche de la cible (±20%), l'utiliser
            if (Math.abs(directDistance - targetDistance) <= targetDistance * 0.20) {
                console.log('✅ Distance directe acceptable');
                return directRoute;
            }
            
            // Si la distance directe est trop courte, ajouter des détours
            if (directDistance < targetDistance) {
                console.log('🔄 Ajout de détours pour atteindre la distance cible');
                return await this.generateRouteWithDetours(startPoint, endPoint, targetDistance, mode, options);
            } else {
                console.log('ℹ️ Distance directe supérieure à la cible, utilisation du trajet direct');
                return directRoute;
            }
            
        } catch (error) {
            console.error('Erreur parcours A→B:', error);
            // Fallback vers le parcours direct avec POI
            const { pois = [] } = options;
            let fallbackPoints = [startPoint, endPoint];
            if (pois.length > 0) {
                const poiPoints = pois.map(poi => ({ lat: poi.lat, lng: poi.lng }));
                fallbackPoints = [startPoint, ...poiPoints, endPoint];
            }
            return await this.apiService.calculateRoute(fallbackPoints, mode);
        }
    }

    /**
     * Génère des points de passage intelligents
     * @param {Object} center - Point central
     * @param {number} targetDistance - Distance cible
     * @param {string} mode - Mode de transport
     * @param {number} radiusFactor - Facteur d'ajustement du rayon
     * @returns {Promise<Array>} Liste des points de passage
     */
    async generateWaypoints(center, targetDistance, mode, radiusFactor = 1.0) {
        const modeConfig = ConfigUtils.getModeConfig(mode);
        const waypoints = [];
        
        // Configuration adaptative selon le mode et la distance
        let baseRadius, numWaypoints, maxRadius;
        
        if (mode === 'cycling') {
            baseRadius = Math.min(targetDistance / 6, 15);
            numWaypoints = Math.min(6, Math.max(3, Math.floor(targetDistance / 12)));
            maxRadius = Math.min(targetDistance / 4, 20);
        } else if (mode === 'running' && targetDistance > 10) {
            baseRadius = Math.min(targetDistance / 5, 8);
            numWaypoints = Math.min(6, Math.max(3, Math.floor(targetDistance / 3)));
            maxRadius = Math.min(targetDistance / 3, 12);
        } else {
            baseRadius = targetDistance / 5;
            numWaypoints = Math.min(CONFIG.ROUTE_GENERATION.WAYPOINTS.MAX_POINTS, 
                                  Math.max(CONFIG.ROUTE_GENERATION.WAYPOINTS.MIN_POINTS, 
                                          Math.floor(targetDistance / 2)));
            maxRadius = targetDistance / 3;
        }
        
        const radiusKm = Math.min(baseRadius * radiusFactor, maxRadius);
        
        console.log(`Génération ${numWaypoints} points dans un rayon de ${radiusKm.toFixed(1)}km`);
        
        // Générer les points candidats
        const candidatePoints = [];
        for (let i = 0; i < numWaypoints; i++) {
            const angle = (i / numWaypoints) * 2 * Math.PI;
            
            // Variation du rayon
            const variation = 0.6 + (Math.random() * (targetDistance > 20 ? 1.0 : 0.8));
            const currentRadius = (radiusKm * variation) / 111; // Conversion en degrés
            
            // Variation angulaire
            const angleVariation = (Math.random() - 0.5) * Math.min(0.7, targetDistance / 50);
            const finalAngle = angle + angleVariation;
            
            const lat = center.lat + Math.cos(finalAngle) * currentRadius;
            const lng = center.lng + Math.sin(finalAngle) * currentRadius;
            
            candidatePoints.push({ lat, lng });
        }
        
        // Utiliser directement les points candidats comme waypoints
        // Google Maps Directions API s'occupe automatiquement de l'alignement sur les routes
        waypoints.push(...candidatePoints);
        
        console.log(`✅ ${waypoints.length} points de passage générés`);
        return waypoints;
    }

    /**
     * Génère un parcours avec détours pour augmenter la distance
     * @param {Object} startPoint - Point de départ
     * @param {Object} endPoint - Point d'arrivée
     * @param {number} targetDistance - Distance cible
     * @param {string} mode - Mode de transport
     * @returns {Promise<Object>} Données du parcours avec détours
     */
    async generateRouteWithDetours(startPoint, endPoint, targetDistance, mode, options = {}) {
        console.log('Génération de détours...');
        
        const maxAttempts = CONFIG.ROUTE_GENERATION.MAX_ATTEMPTS;
        let bestRoute = null;
        let bestDistance = 0;
        let bestDeviation = Infinity;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                // Point milieu entre départ et arrivée
                const midLat = (startPoint.lat + endPoint.lat) / 2;
                const midLng = (startPoint.lng + endPoint.lng) / 2;
                const midPoint = { lat: midLat, lng: midLng };
                
                // Générer des points de détour
                const detoursNeeded = Math.max(3, Math.floor(targetDistance / 15));
                const detourWaypoints = await this.generateDetourWaypoints(
                    midPoint, detoursNeeded, attempt, targetDistance, mode
                );
                
                if (detourWaypoints.length > 0) {
                    // Intégrer les POI dans les détours
                    const { pois = [] } = options;
                    let routePoints = [startPoint, ...detourWaypoints, endPoint];
                    
                    if (pois.length > 0) {
                        // Insérer les POI entre le départ et les détours
                        const poiPoints = pois.map(poi => ({ lat: poi.lat, lng: poi.lng }));
                        routePoints = [startPoint, ...poiPoints, ...detourWaypoints, endPoint];
                    }
                    
                    const routeData = await this.apiService.calculateRoute(routePoints, mode);
                    const deviation = Math.abs(routeData.distance - targetDistance);
                    
                    console.log(`Tentative détour ${attempt}: ${routeData.distance.toFixed(1)}km (écart: ${deviation.toFixed(1)}km)`);
                    
                    if (deviation < bestDeviation || bestRoute === null) {
                        bestRoute = routeData;
                        bestDistance = routeData.distance;
                        bestDeviation = deviation;
                    }
                    
                    // Tolérance adaptative
                    const tolerance = targetDistance >= 50 ? 0.25 : (targetDistance >= 20 ? 0.20 : 0.15);
                    
                    if (deviation <= targetDistance * tolerance) {
                        console.log(`✅ Distance acceptable avec détours`);
                        break;
                    }
                }
                
            } catch (error) {
                console.warn(`Erreur tentative détour ${attempt}:`, error);
            }
        }
        
        return bestRoute || await this.apiService.calculateRoute([startPoint, endPoint], mode);
    }

    /**
     * Génère des points de passage pour créer des détours
     * @param {Object} centerPoint - Point central
     * @param {number} count - Nombre de détours
     * @param {number} attempt - Numéro de la tentative
     * @param {number} targetDistance - Distance cible
     * @param {string} mode - Mode de transport
     * @returns {Promise<Array>} Points de détour
     */
    async generateDetourWaypoints(centerPoint, count, attempt, targetDistance, mode) {
        const waypoints = [];
        
        // Calculer un rayon approprié selon la distance cible
        let baseRadius;
        if (targetDistance >= 50) {
            baseRadius = targetDistance / 4;
        } else if (targetDistance >= 20) {
            baseRadius = targetDistance / 5;
        } else {
            baseRadius = targetDistance / 6;
        }
        
        const radiusKm = baseRadius + (attempt * baseRadius * 0.3);
        const maxWaypoints = Math.min(6, Math.max(3, Math.floor(targetDistance / 10)));
        
        console.log(`Génération détours tentative ${attempt}: rayon ${radiusKm.toFixed(1)}km`);
        
        for (let i = 0; i < Math.min(count, maxWaypoints); i++) {
            const angle = (i / maxWaypoints) * 2 * Math.PI + (attempt * 0.7);
            const variation = 0.7 + (Math.random() * 0.6);
            const currentRadius = (radiusKm * variation) / 111;
            
            const lat = centerPoint.lat + Math.cos(angle) * currentRadius;
            const lng = centerPoint.lng + Math.sin(angle) * currentRadius;
            
            // Utiliser directement les coordonnées calculées - Google Maps s'occupe de l'alignement
            waypoints.push({ lat, lng });
        }
        
        return waypoints;
    }

    /**
     * Calcule le facteur d'ajustement du rayon selon les tentatives
     * @param {number} attempt - Numéro de tentative
     * @param {number} bestDistance - Meilleure distance obtenue
     * @param {number} targetDistance - Distance cible
     * @returns {number} Facteur d'ajustement
     */
    calculateRadiusFactor(attempt, bestDistance, targetDistance) {
        if (attempt === 1) return 1.0;
        
        if (bestDistance > 0) {
            const ratio = targetDistance / bestDistance;
            
            switch (attempt) {
                case 2:
                    return Math.max(0.5, Math.min(2.0, ratio));
                case 3:
                    return Math.max(0.4, Math.min(2.5, ratio * 1.1));
                case 4:
                    return Math.max(0.3, Math.min(3.0, ratio * 1.3));
                default:
                    return Math.max(0.2, Math.min(4.0, ratio * 1.5));
            }
        }
        
        return 1.0 + (attempt - 1) * 0.3;
    }

    /**
     * Calcule la distance à vol d'oiseau entre deux points
     * @param {Object} point1 - Premier point {lat, lng}
     * @param {Object} point2 - Deuxième point {lat, lng}
     * @returns {number} Distance en kilomètres
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
     * Calcule la durée estimée d'un parcours
     * @param {number} distance - Distance en km
     * @param {string} mode - Mode de transport
     * @returns {number} Durée en minutes
     */
    calculateEstimatedDuration(distance, mode) {
        const speed = ConfigUtils.getModeConfig(mode).speed;
        return (distance / speed) * 60; // Conversion en minutes
    }

    /**
     * Génère un parcours de fallback en cas d'erreur API
     * @param {Object} startPoint - Point de départ
     * @param {number} targetDistance - Distance cible
     * @param {boolean} returnToStart - Retour au départ
     * @returns {Object} Parcours de fallback
     */
    generateFallbackRoute(startPoint, targetDistance, returnToStart = true) {
        console.log('🔄 Génération parcours de fallback');
        
        const route = [];
        const radiusKm = targetDistance / (2 * Math.PI);
        const radiusDeg = radiusKm / 111;
        const points = 8;
        
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            const lat = startPoint.lat + Math.cos(angle) * radiusDeg * 0.8;
            const lng = startPoint.lng + Math.sin(angle) * radiusDeg * 0.8;
            route.push({ lat, lng });
        }
        
        if (returnToStart) {
            route.push(startPoint);
        }
        
        return {
            route,
            distance: targetDistance, // Distance approximative
            duration: this.calculateEstimatedDuration(targetDistance, 'walking')
        };
    }

    /**
     * Obtient les métadonnées du dernier parcours généré
     * @returns {Object|null} Métadonnées du parcours
     */
    getLastRouteMetadata() {
        return this.lastRouteMetadata;
    }

    /**
     * Obtient le dernier parcours généré
     * @returns {Object|null} Données du parcours
     */
    getLastRoute() {
        return this.lastGeneratedRoute;
    }

    /**
     * Délai asynchrone
     * @param {number} ms - Délai en millisecondes
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Valide les paramètres de génération
     * @param {Object} startPoint - Point de départ
     * @param {number} targetDistance - Distance cible
     * @param {string} mode - Mode de transport
     * @throws {Error} Si les paramètres sont invalides
     */
    validateGenerationParams(startPoint, targetDistance, mode) {
        if (!startPoint || typeof startPoint.lat !== 'number' || typeof startPoint.lng !== 'number') {
            throw new Error('Point de départ invalide');
        }
        
        if (!targetDistance || targetDistance <= 0) {
            throw new Error('Distance cible invalide');
        }
        
        const modeConfig = ConfigUtils.getModeConfig(mode);
        if (targetDistance > modeConfig.limits.max) {
            throw new Error(`${CONFIG.MESSAGES.ERRORS.DISTANCE_TOO_HIGH}: maximum ${modeConfig.limits.max}km pour ${mode}`);
        }
        
        if (!CONFIG.SPEEDS[mode]) {
            throw new Error(`Mode de transport non supporté: ${mode}`);
        }
    }
}