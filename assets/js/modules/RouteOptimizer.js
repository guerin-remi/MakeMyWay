/**
 * Optimiseur de parcours pour intégrer intelligemment les POI
 * Utilise des algorithmes d'optimisation pour minimiser la distance totale
 */
export class RouteOptimizer {
    constructor() {
        this.maxDetourPercent = 0.15; // Détour max de 15% de la distance directe
    }

    /**
     * Optimise l'ordre des POI pour minimiser la distance totale
     * Utilise une approche "nearest neighbor" améliorée
     * @param {Object} startPoint - Point de départ
     * @param {Object} endPoint - Point d'arrivée (optionnel)
     * @param {Array} pois - Liste des POI à visiter
     * @param {boolean} returnToStart - Si true, retour au point de départ
     * @returns {Array} POI ordonnés de manière optimale
     */
    optimizePOIOrder(startPoint, endPoint, pois, returnToStart = false) {
        if (!pois || pois.length === 0) return [];
        if (pois.length === 1) return pois;

        console.log(`🔄 Optimisation de l'ordre de ${pois.length} POI...`);

        // Pour un parcours en boucle
        if (returnToStart || !endPoint) {
            return this.optimizeLoopRoute(startPoint, pois);
        }

        // Pour un parcours A→B
        return this.optimizePointToPointRoute(startPoint, endPoint, pois);
    }

    /**
     * Optimise un parcours en boucle (retour au départ)
     * @param {Object} startPoint - Point de départ
     * @param {Array} pois - POI à visiter
     * @returns {Array} POI ordonnés
     */
    optimizeLoopRoute(startPoint, pois) {
        const orderedPOIs = [];
        const remainingPOIs = [...pois];
        let currentPoint = startPoint;

        // Stratégie : toujours choisir le POI le plus proche non visité
        while (remainingPOIs.length > 0) {
            const nearest = this.findNearestPOI(currentPoint, remainingPOIs);
            orderedPOIs.push(nearest);
            currentPoint = nearest;
            
            const index = remainingPOIs.indexOf(nearest);
            remainingPOIs.splice(index, 1);
        }

        // Optimisation finale : essayer de réduire les croisements
        return this.reduceCrossings(startPoint, orderedPOIs, true);
    }

    /**
     * Optimise un parcours point à point
     * @param {Object} startPoint - Point de départ
     * @param {Object} endPoint - Point d'arrivée
     * @param {Array} pois - POI à visiter
     * @returns {Array} POI ordonnés
     */
    optimizePointToPointRoute(startPoint, endPoint, pois) {
        // Stratégie 1 : Diviser les POI en zones selon leur position sur le trajet
        const zones = this.dividePOIsIntoZones(startPoint, endPoint, pois);
        
        // Stratégie 2 : Ordonner les POI dans chaque zone
        const orderedZones = zones.map(zone => {
            if (zone.length <= 1) return zone;
            return this.orderPOIsInZone(zone, startPoint, endPoint);
        });

        // Combiner toutes les zones
        const orderedPOIs = orderedZones.flat();

        console.log(`✅ POI optimisés : ${orderedPOIs.length} points ordonnés`);
        return orderedPOIs;
    }

    /**
     * Divise les POI en zones selon leur position relative au trajet
     * @param {Object} startPoint - Point de départ
     * @param {Object} endPoint - Point d'arrivée
     * @param {Array} pois - POI à diviser
     * @returns {Array} Tableau de zones avec POI
     */
    dividePOIsIntoZones(startPoint, endPoint, pois) {
        // Calculer la progression de chaque POI sur l'axe départ-arrivée
        const projections = pois.map(poi => ({
            poi,
            progression: this.calculateProgression(startPoint, endPoint, poi)
        }));

        // Trier par progression (0 = près du départ, 1 = près de l'arrivée)
        projections.sort((a, b) => a.progression - b.progression);

        // Diviser en zones (3 zones : début, milieu, fin)
        const zones = [[], [], []];
        projections.forEach(({ poi, progression }) => {
            if (progression < 0.33) {
                zones[0].push(poi);
            } else if (progression < 0.67) {
                zones[1].push(poi);
            } else {
                zones[2].push(poi);
            }
        });

        return zones.filter(zone => zone.length > 0);
    }

    /**
     * Calcule la progression d'un point sur l'axe départ-arrivée
     * @param {Object} start - Point de départ
     * @param {Object} end - Point d'arrivée
     * @param {Object} point - Point à projeter
     * @returns {number} Progression (0 à 1)
     */
    calculateProgression(start, end, point) {
        // Vecteur départ-arrivée
        const dx = end.lng - start.lng;
        const dy = end.lat - start.lat;
        
        // Vecteur départ-point
        const dpx = point.lng - start.lng;
        const dpy = point.lat - start.lat;
        
        // Produit scalaire normalisé
        const dotProduct = (dpx * dx + dpy * dy);
        const magnitude = (dx * dx + dy * dy);
        
        if (magnitude === 0) return 0;
        
        const progression = dotProduct / magnitude;
        
        // Limiter entre 0 et 1
        return Math.max(0, Math.min(1, progression));
    }

    /**
     * Ordonne les POI dans une zone pour minimiser les détours
     * @param {Array} pois - POI de la zone
     * @param {Object} start - Point de départ global
     * @param {Object} end - Point d'arrivée global
     * @returns {Array} POI ordonnés
     */
    orderPOIsInZone(pois, start, end) {
        if (pois.length <= 2) return pois;

        // Calculer le centre de la zone
        const center = this.calculateCenter(pois);
        
        // Ordonner par angle autour du centre (sens horaire)
        const ordered = pois.sort((a, b) => {
            const angleA = Math.atan2(a.lat - center.lat, a.lng - center.lng);
            const angleB = Math.atan2(b.lat - center.lat, b.lng - center.lng);
            return angleA - angleB;
        });

        return ordered;
    }

    /**
     * Trouve le POI le plus proche d'un point
     * @param {Object} point - Point de référence
     * @param {Array} pois - POI disponibles
     * @returns {Object} POI le plus proche
     */
    findNearestPOI(point, pois) {
        let nearest = null;
        let minDistance = Infinity;

        pois.forEach(poi => {
            const distance = this.calculateDistance(point, poi);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = poi;
            }
        });

        return nearest;
    }

    /**
     * Réduit les croisements dans un parcours (optimisation 2-opt simplifiée)
     * @param {Object} start - Point de départ
     * @param {Array} pois - POI ordonnés
     * @param {boolean} loop - Si true, parcours en boucle
     * @returns {Array} POI réordonnés
     */
    reduceCrossings(start, pois, loop = false) {
        if (pois.length <= 3) return pois;

        let improved = true;
        let currentOrder = [...pois];
        let iterations = 0;
        const maxIterations = 10;

        while (improved && iterations < maxIterations) {
            improved = false;
            iterations++;

            // Essayer d'échanger des paires de POI
            for (let i = 0; i < currentOrder.length - 1; i++) {
                for (let j = i + 2; j < currentOrder.length; j++) {
                    // Calculer la distance actuelle
                    const currentDistance = this.calculateSegmentDistance(
                        i > 0 ? currentOrder[i-1] : start,
                        currentOrder[i],
                        currentOrder[j],
                        j < currentOrder.length - 1 ? currentOrder[j+1] : (loop ? start : currentOrder[j])
                    );

                    // Essayer l'échange
                    const newOrder = [...currentOrder];
                    [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];

                    // Calculer la nouvelle distance
                    const newDistance = this.calculateSegmentDistance(
                        i > 0 ? newOrder[i-1] : start,
                        newOrder[i],
                        newOrder[j],
                        j < newOrder.length - 1 ? newOrder[j+1] : (loop ? start : newOrder[j])
                    );

                    // Si amélioration, garder le changement
                    if (newDistance < currentDistance) {
                        currentOrder = newOrder;
                        improved = true;
                        break;
                    }
                }
                if (improved) break;
            }
        }

        return currentOrder;
    }

    /**
     * Calcule la distance totale d'un segment de parcours
     * @param {Object} p1 - Point 1
     * @param {Object} p2 - Point 2
     * @param {Object} p3 - Point 3
     * @param {Object} p4 - Point 4
     * @returns {number} Distance totale
     */
    calculateSegmentDistance(p1, p2, p3, p4) {
        return this.calculateDistance(p1, p2) + 
               this.calculateDistance(p2, p3) + 
               this.calculateDistance(p3, p4);
    }

    /**
     * Calcule le centre géographique d'un ensemble de points
     * @param {Array} points - Points
     * @returns {Object} Centre {lat, lng}
     */
    calculateCenter(points) {
        const sum = points.reduce((acc, point) => ({
            lat: acc.lat + point.lat,
            lng: acc.lng + point.lng
        }), { lat: 0, lng: 0 });

        return {
            lat: sum.lat / points.length,
            lng: sum.lng / points.length
        };
    }

    /**
     * Calcule la distance entre deux points (Haversine)
     * @param {Object} point1 - Premier point
     * @param {Object} point2 - Deuxième point
     * @returns {number} Distance en km
     */
    calculateDistance(point1, point2) {
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
     * Évalue si un POI cause un détour acceptable
     * @param {Object} poi - POI à évaluer
     * @param {Object} start - Point de départ
     * @param {Object} end - Point d'arrivée
     * @returns {boolean} True si le détour est acceptable
     */
    isDetourAcceptable(poi, start, end) {
        const directDistance = this.calculateDistance(start, end);
        const detourDistance = this.calculateDistance(start, poi) + this.calculateDistance(poi, end);
        const detourPercent = (detourDistance - directDistance) / directDistance;
        
        return detourPercent <= this.maxDetourPercent;
    }

    /**
     * Filtre les POI trop éloignés du parcours
     * @param {Array} pois - POI à filtrer
     * @param {Object} start - Point de départ
     * @param {Object} end - Point d'arrivée (optionnel)
     * @param {number} maxDistance - Distance max en km
     * @returns {Array} POI filtrés
     */
    filterPOIsByDistance(pois, start, end, maxDistance = 2) {
        return pois.filter(poi => {
            // Distance au point de départ
            const distFromStart = this.calculateDistance(start, poi);
            if (distFromStart <= maxDistance) return true;

            // Si point d'arrivée, vérifier aussi la distance
            if (end) {
                const distFromEnd = this.calculateDistance(end, poi);
                if (distFromEnd <= maxDistance) return true;

                // Vérifier si le POI est proche du trajet
                const distanceToRoute = this.calculateDistanceToLine(poi, start, end);
                return distanceToRoute <= maxDistance;
            }

            return false;
        });
    }

    /**
     * Calcule la distance d'un point à une ligne (approximation)
     * @param {Object} point - Point
     * @param {Object} lineStart - Début de la ligne
     * @param {Object} lineEnd - Fin de la ligne
     * @returns {number} Distance en km
     */
    calculateDistanceToLine(point, lineStart, lineEnd) {
        // Simplification : on utilise la moyenne des distances aux extrémités
        // Pour une vraie distance perpendiculaire, il faudrait une formule plus complexe
        const d1 = this.calculateDistance(point, lineStart);
        const d2 = this.calculateDistance(point, lineEnd);
        const dMid = this.calculateDistance(point, {
            lat: (lineStart.lat + lineEnd.lat) / 2,
            lng: (lineStart.lng + lineEnd.lng) / 2
        });
        
        return Math.min(d1, d2, dMid);
    }
}

// Export singleton
export default new RouteOptimizer();