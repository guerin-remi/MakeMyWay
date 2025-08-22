/**
 * Script pour supprimer temporairement les avertissements de dépréciation Google Maps
 * À utiliser uniquement pendant le développement
 */

// Supprimer les avertissements de console pour les API deprecated de Google Maps
(function() {
    const originalWarn = console.warn;
    const originalError = console.error;
    
    const suppressedMessages = [
        'google.maps.places.PlacesService',
        'google.maps.places.Autocomplete', 
        'google.maps.Marker is deprecated',
        'loading=async'
    ];
    
    console.warn = function(...args) {
        const message = args.join(' ');
        if (suppressedMessages.some(msg => message.includes(msg))) {
            return; // Supprimer ces avertissements
        }
        originalWarn.apply(console, args);
    };
    
    console.error = function(...args) {
        const message = args.join(' ');
        if (suppressedMessages.some(msg => message.includes(msg))) {
            return; // Supprimer ces erreurs
        }
        originalError.apply(console, args);
    };
})();

console.log('🔇 Suppressions des avertissements Google Maps activées (dev uniquement)');