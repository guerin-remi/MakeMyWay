import { describe, it, expect, beforeEach } from 'vitest';
import { MapManager } from '../../assets/js/modules/MapManager.js';

// Mock Google Maps minimal
const mockMarker = {
  setMap: () => {},
  addListener: () => {}
};

const mockGoogleMaps = {
  Map: class {
    constructor() {}
  },
  Marker: class {
    constructor(opts) {
      this.opts = opts;
      return mockMarker;
    }
  },
  InfoWindow: class {
    open() {}
  },
  SymbolPath: {
    CIRCLE: 'circle'
  },
  event: {
    trigger() {}
  }
};

describe('MapManager markers', () => {
  let mapManager;

  beforeEach(() => {
    window.google = { maps: mockGoogleMaps };
    mapManager = new MapManager();
    mapManager.map = {}; // Simuler map initialisée
  });

  it('devrait créer et supprimer un marqueur de fin', () => {
    // Act: setEndMarker puis removeEndMarker
    mapManager.setEndMarker({ lat: 1, lng: 2 });
    expect(mapManager.markers.end).toBe(mockMarker);
    
    mapManager.removeEndMarker();
    expect(mapManager.markers.end).toBe(null);
  });
});