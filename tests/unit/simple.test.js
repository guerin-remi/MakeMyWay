import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../assets/js/config.js';

describe('Configuration Tests', () => {
  it('devrait avoir les bonnes limites de distance', () => {
    expect(CONFIG.DISTANCE_LIMITS.walking.min).toBe(1);
    expect(CONFIG.DISTANCE_LIMITS.walking.max).toBe(15);
    expect(CONFIG.DISTANCE_LIMITS.running.min).toBe(1);
    expect(CONFIG.DISTANCE_LIMITS.running.max).toBe(30);
    expect(CONFIG.DISTANCE_LIMITS.cycling.min).toBe(2);
    expect(CONFIG.DISTANCE_LIMITS.cycling.max).toBe(80);
  });

  it('devrait avoir les bonnes vitesses moyennes', () => {
    expect(CONFIG.SPEEDS.walking).toBe(4.5);
    expect(CONFIG.SPEEDS.running).toBe(8.5);
    expect(CONFIG.SPEEDS.cycling).toBe(18);
  });

  it('devrait avoir les bons breakpoints responsive', () => {
    expect(CONFIG.UI.BREAKPOINTS.MOBILE).toBe(768);
    expect(CONFIG.UI.BREAKPOINTS.TABLET).toBe(1024);
    expect(CONFIG.UI.BREAKPOINTS.DESKTOP).toBe(1200);
  });
});

describe('Utility Functions', () => {
  // Test de fonctions utilitaires simples
  it('devrait calculer la distance haversine', () => {
    // Formule Haversine pour calculer la distance entre deux coordonnées
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Rayon de la Terre en km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // Test: Distance Paris - Lyon (environ 392 km)
    const distance = calculateDistance(48.8566, 2.3522, 45.7640, 4.8357);
    expect(distance).toBeCloseTo(392, 0);
  });

  it('devrait formater correctement les distances', () => {
    const formatDistance = (meters) => {
      if (meters < 1000) {
        return `${Math.round(meters)}m`;
      }
      return `${(meters / 1000).toFixed(1)}km`;
    };

    expect(formatDistance(500)).toBe('500m');
    expect(formatDistance(1500)).toBe('1.5km');
    expect(formatDistance(10250)).toBe('10.3km');
  });

  it('devrait formater correctement les durées', () => {
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes}min`;
      }
      return `${minutes}min`;
    };

    expect(formatDuration(300)).toBe('5min');
    expect(formatDuration(3900)).toBe('1h 5min');
    expect(formatDuration(7200)).toBe('2h 0min');
  });
});

describe('POI Categories', () => {
  it('devrait avoir les bonnes catégories de POI', () => {
    const categories = CONFIG.POI.CATEGORIES;
    
    expect(categories).toHaveProperty('nature');
    expect(categories.nature.queries).toEqual(['parc', 'jardin public', 'forêt', 'lac']);
    expect(categories.nature.icon).toBe('🌳');
    
    expect(categories).toHaveProperty('eau');
    expect(categories.eau.queries).toEqual(['fontaine', 'lac', 'rivière', 'canal']);
    expect(categories.eau.icon).toBe('💧');
    
    expect(categories).toHaveProperty('culture');
    expect(categories.culture.queries).toEqual(['musée', 'monument', 'église', 'théâtre']);
    expect(categories.culture.icon).toBe('🏛️');
  });

  it('devrait avoir les bons paramètres de recherche POI', () => {
    expect(CONFIG.POI.SEARCH_RADIUS).toBe(10);
    expect(CONFIG.POI.MAX_SEARCH_RESULTS).toBe(8);
    expect(CONFIG.POI.MIN_QUERY_LENGTH).toBe(3);
  });
});

describe('Route Generation Parameters', () => {
  it('devrait avoir les bons paramètres de génération', () => {
    expect(CONFIG.ROUTE_GENERATION.MAX_ATTEMPTS).toBe(8);
    expect(CONFIG.ROUTE_GENERATION.WAYPOINTS.MIN_POINTS).toBe(2);
    expect(CONFIG.ROUTE_GENERATION.WAYPOINTS.MAX_POINTS).toBe(10);
    expect(CONFIG.ROUTE_GENERATION.WAYPOINTS.BATCH_SIZE).toBe(3);
  });

  it('devrait avoir les bonnes tolérances de distance', () => {
    expect(CONFIG.ROUTE_GENERATION.DISTANCE_TOLERANCE.SHORT).toBe(0.05);
    expect(CONFIG.ROUTE_GENERATION.DISTANCE_TOLERANCE.MEDIUM).toBe(0.08);
    expect(CONFIG.ROUTE_GENERATION.DISTANCE_TOLERANCE.LONG).toBe(0.12);
    expect(CONFIG.ROUTE_GENERATION.DISTANCE_TOLERANCE.VERY_LONG).toBe(0.15);
  });

  it('devrait avoir les bons rayons de recherche par mode', () => {
    expect(CONFIG.ROUTE_GENERATION.SEARCH_RADIUS.walking.base).toBe(2);
    expect(CONFIG.ROUTE_GENERATION.SEARCH_RADIUS.walking.max).toBe(5);
    expect(CONFIG.ROUTE_GENERATION.SEARCH_RADIUS.running.base).toBe(3);
    expect(CONFIG.ROUTE_GENERATION.SEARCH_RADIUS.running.max).toBe(8);
    expect(CONFIG.ROUTE_GENERATION.SEARCH_RADIUS.cycling.base).toBe(5);
    expect(CONFIG.ROUTE_GENERATION.SEARCH_RADIUS.cycling.max).toBe(20);
  });
});