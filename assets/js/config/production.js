/**
 * Configuration de production pour MakeMyWay
 * Utilise l'API hébergée sur Render
 */

export const PRODUCTION_CONFIG = {
    // API Backend hébergé sur Render
    API_BASE_URL: 'https://makemyway-backend.onrender.com',
    
    // URLs des différents services
    AUTH_API_URL: 'https://makemyway-backend.onrender.com/api/auth',
    MAPS_API_URL: 'https://makemyway-backend.onrender.com/api/maps',
    
    // Environnement
    ENVIRONMENT: 'production',
    
    // Debug
    DEBUG: false
};