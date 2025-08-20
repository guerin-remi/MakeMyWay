const express = require('express');
const axios = require('axios');

const router = express.Router();

// Route proxy pour l'API Google Maps Directions
router.post('/directions', async (req, res) => {
    try {
        const { points, mode } = req.body;
        
        console.log(`🗺️ Proxy Google Directions: ${points?.length} points, mode: ${mode}`);
        
        // Validation des paramètres
        if (!points || !Array.isArray(points) || points.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Au moins 2 points sont requis pour calculer un itinéraire'
            });
        }
        
        if (!mode || !['walking', 'running', 'cycling'].includes(mode)) {
            return res.status(400).json({
                success: false,
                message: 'Mode de transport invalide (walking, running, cycling)'
            });
        }
        
        // Validation des points
        const validPoints = points.every(point => 
            point && 
            typeof point.lat === 'number' && 
            typeof point.lng === 'number' &&
            point.lat >= -90 && point.lat <= 90 &&
            point.lng >= -180 && point.lng <= 180
        );
        
        if (!validPoints) {
            return res.status(400).json({
                success: false,
                message: 'Points de coordonnées invalides'
            });
        }
        
        // Préparation des paramètres pour l'API Google
        const origin = `${points[0].lat},${points[0].lng}`;
        const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;
        
        // Points intermédiaires (waypoints)
        let waypoints = '';
        if (points.length > 2) {
            const waypointsList = points
                .slice(1, -1)
                .map(point => `${point.lat},${point.lng}`)
                .join('|');
            waypoints = `&waypoints=optimize:true|${waypointsList}`;
        }
        
        // Mapping des modes de transport
        const travelModeMapping = {
            'walking': 'walking',
            'running': 'walking', // Google Maps n'a pas de mode running spécifique
            'cycling': 'bicycling'
        };
        
        const travelMode = travelModeMapping[mode];
        
        // Construction de l'URL de l'API Google Directions
        const googleApiUrl = `https://maps.googleapis.com/maps/api/directions/json?` +
            `origin=${encodeURIComponent(origin)}` +
            `&destination=${encodeURIComponent(destination)}` +
            `${waypoints}` +
            `&mode=${travelMode}` +
            `&units=metric` +
            `&language=fr` +
            `&region=fr` +
            `&avoid=tolls` +
            `${(mode === 'walking' || mode === 'running') ? '&avoid=highways' : ''}` +
            `&key=${process.env.MAPS_API_KEY}`;
        
        console.log(`📡 Appel Google Directions API: ${points.length} points`);
        
        // Appel à l'API Google Maps
        const response = await axios.get(googleApiUrl, {
            timeout: 10000, // 10 secondes
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'MakeMyWay/1.0'
            }
        });
        
        // Vérification du statut de la réponse Google
        if (response.data.status !== 'OK') {
            console.error('❌ Erreur API Google:', response.data.status, response.data.error_message);
            
            const errorMessages = {
                'NOT_FOUND': 'Itinéraire introuvable pour ces points',
                'ZERO_RESULTS': 'Aucun itinéraire trouvé entre ces points',
                'MAX_WAYPOINTS_EXCEEDED': 'Trop de points de passage (maximum 25)',
                'INVALID_REQUEST': 'Paramètres de requête invalides',
                'OVER_DAILY_LIMIT': 'Limite quotidienne API dépassée',
                'OVER_QUERY_LIMIT': 'Limite de requêtes dépassée',
                'REQUEST_DENIED': 'Requête refusée par l\'API',
                'UNKNOWN_ERROR': 'Erreur inconnue de l\'API'
            };
            
            return res.status(400).json({
                success: false,
                message: errorMessages[response.data.status] || 'Erreur de l\'API Google Maps',
                googleStatus: response.data.status
            });
        }
        
        // Formatage de la réponse pour le frontend
        const route = response.data.routes[0];
        const legs = route.legs;
        
        // Extraction des points de l'itinéraire
        const routePoints = [];
        legs.forEach(leg => {
            leg.steps.forEach(step => {
                // Point de départ du step
                routePoints.push({
                    lat: step.start_location.lat,
                    lng: step.start_location.lng
                });
                
                // Points intermédiaires du polyline décodé
                if (step.polyline && step.polyline.points) {
                    const decoded = decodePolyline(step.polyline.points);
                    routePoints.push(...decoded);
                }
            });
        });
        
        // Ajouter le dernier point
        if (legs.length > 0) {
            const lastLeg = legs[legs.length - 1];
            routePoints.push({
                lat: lastLeg.end_location.lat,
                lng: lastLeg.end_location.lng
            });
        }
        
        // Calcul des totaux
        let totalDistance = 0; // en mètres
        let totalDuration = 0; // en secondes
        
        legs.forEach(leg => {
            totalDistance += leg.distance.value;
            totalDuration += leg.duration.value;
        });
        
        const formattedResponse = {
            success: true,
            route: routePoints,
            distance: totalDistance / 1000, // Conversion en km
            duration: totalDuration / 60,   // Conversion en minutes
            summary: route.summary,
            bounds: route.bounds,
            warnings: route.warnings || [],
            googleResponse: response.data // Réponse complète pour debug
        };
        
        console.log(`✅ Itinéraire calculé: ${routePoints.length} points, ${(totalDistance/1000).toFixed(1)}km`);
        
        res.json(formattedResponse);
        
    } catch (error) {
        console.error('❌ Erreur proxy Google Maps:', error);
        
        if (error.response) {
            // Erreur de l'API Google
            return res.status(error.response.status || 500).json({
                success: false,
                message: 'Erreur de l\'API Google Maps',
                details: error.response.data?.error_message || error.message
            });
        } else if (error.code === 'ECONNABORTED') {
            // Timeout
            return res.status(408).json({
                success: false,
                message: 'Timeout de l\'API Google Maps'
            });
        } else {
            // Erreur interne
            return res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur proxy'
            });
        }
    }
});

// Route de test de l'API Maps
router.get('/test', (req, res) => {
    res.json({
        message: 'API Maps proxy fonctionnelle',
        hasApiKey: !!process.env.MAPS_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// Fonction utilitaire pour décoder les polylines Google
function decodePolyline(encoded) {
    const points = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;
    
    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charAt(index++).charCodeAt(0) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        
        const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        
        shift = 0;
        result = 0;
        do {
            b = encoded.charAt(index++).charCodeAt(0) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        
        const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        
        points.push({
            lat: lat / 1e5,
            lng: lng / 1e5
        });
    }
    
    return points;
}

module.exports = router;