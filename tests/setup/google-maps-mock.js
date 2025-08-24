/**
 * Mock Google Maps API pour les tests
 * Fournit une surface minimale compatible avec les modules existants
 */

// Mock des événements Google Maps
class MockEventManager {
  constructor() {
    this.listeners = new Map();
  }

  addListener(source, event, callback) {
    const key = `${source.constructor.name}-${event}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push({ source, callback });
    return { remove: () => this.removeListener(source, event, callback) };
  }

  removeListener(source, event, callback) {
    const key = `${source.constructor.name}-${event}`;
    const callbacks = this.listeners.get(key) || [];
    const index = callbacks.findIndex(item => item.callback === callback);
    if (index >= 0) {
      callbacks.splice(index, 1);
    }
  }

  trigger(source, event, data) {
    const key = `${source.constructor.name}-${event}`;
    const callbacks = this.listeners.get(key) || [];
    callbacks.forEach(({ callback }) => callback(data));
  }
}

const mockEventManager = new MockEventManager();

// Mock LatLng
class MockLatLng {
  constructor(lat, lng) {
    this._lat = lat;
    this._lng = lng;
  }

  lat() { return this._lat; }
  lng() { return this._lng; }
}

// Mock Map
class MockMap {
  constructor(element, options = {}) {
    this.element = element;
    this.options = options;
    this.center = options.center || { lat: 48.8566, lng: 2.3522 };
    this.zoom = options.zoom || 13;
  }

  addListener(event, callback) {
    return mockEventManager.addListener(this, event, callback);
  }

  setCenter(center) {
    this.center = center;
  }

  setZoom(zoom) {
    this.zoom = zoom;
  }

  getCenter() {
    return new MockLatLng(this.center.lat, this.center.lng);
  }

  getZoom() {
    return this.zoom;
  }

  // Helper pour simuler les clics dans les tests
  simulateClick(lat, lng) {
    const event = {
      latLng: new MockLatLng(lat, lng)
    };
    mockEventManager.trigger(this, 'click', event);
  }
}

// Mock Marker
class MockMarker {
  constructor(options = {}) {
    this.position = options.position || null;
    this.map = options.map || null;
    this.draggable = options.draggable || false;
    this.title = options.title || '';
    this.icon = options.icon || null;
    this.visible = true;
  }

  addListener(event, callback) {
    return mockEventManager.addListener(this, event, callback);
  }

  setPosition(position) {
    this.position = position;
  }

  getPosition() {
    return this.position ? new MockLatLng(this.position.lat, this.position.lng) : null;
  }

  setMap(map) {
    this.map = map;
    this.visible = map !== null;
  }

  getMap() {
    return this.map;
  }

  setDraggable(draggable) {
    this.draggable = draggable;
  }

  getDraggable() {
    return this.draggable;
  }

  setVisible(visible) {
    this.visible = visible;
  }

  getVisible() {
    return this.visible;
  }

  // Helper pour simuler le drag dans les tests
  simulateDragEnd(lat, lng) {
    this.setPosition({ lat, lng });
    const event = {
      latLng: new MockLatLng(lat, lng)
    };
    mockEventManager.trigger(this, 'dragend', event);
  }

  // Helper pour simuler double-click
  simulateDoubleClick() {
    // Simuler deux clics consécutifs pour le double-tap mobile
    mockEventManager.trigger(this, 'click', {});
    setTimeout(() => {
      mockEventManager.trigger(this, 'click', {});
    }, 50); // Délai court entre les clics
  }

  // Helper pour simuler right-click
  simulateRightClick() {
    mockEventManager.trigger(this, 'rightclick', {});
  }
}

// Mock InfoWindow
class MockInfoWindow {
  constructor(options = {}) {
    this.content = options.content || '';
    this.position = options.position || null;
    this.isOpen = false;
  }

  addListener(event, callback) {
    return mockEventManager.addListener(this, event, callback);
  }

  open(map, anchor) {
    this.isOpen = true;
    this.map = map;
    this.anchor = anchor;
  }

  close() {
    this.isOpen = false;
  }

  setContent(content) {
    this.content = content;
  }

  getContent() {
    return this.content;
  }
}

// Mock Geocoder
class MockGeocoder {
  geocode(request, callback) {
    // Simuler une réponse de géocodage
    setTimeout(() => {
      if (request.location) {
        // Géocodage inversé - retourner une adresse formatée
        const { lat, lng } = request.location;
        const results = [{
          formatted_address: `Mock Address (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          types: ['street_address'],
          geometry: {
            location: new MockLatLng(lat, lng)
          }
        }];
        callback(results, 'OK');
      } else if (request.address) {
        // Géocodage direct - retourner des coordonnées
        const results = [{
          formatted_address: request.address,
          geometry: {
            location: new MockLatLng(48.8566, 2.3522)
          },
          types: ['street_address']
        }];
        callback(results, 'OK');
      } else {
        callback([], 'ZERO_RESULTS');
      }
    }, 0);
  }
}

// Mock DirectionsService
class MockDirectionsService {
  route(request, callback) {
    setTimeout(() => {
      const result = {
        routes: [{
          legs: [{
            distance: { text: '5.2 km', value: 5200 },
            duration: { text: '1 hour 5 mins', value: 3900 }
          }]
        }]
      };
      callback(result, 'OK');
    }, 0);
  }
}

// Mock PlacesService
class MockPlacesService {
  constructor(map) {
    this.map = map;
  }

  getDetails(request, callback) {
    setTimeout(() => {
      const result = {
        place_id: request.placeId,
        formatted_address: 'Mocked Place Address',
        geometry: {
          location: new MockLatLng(48.8566, 2.3522)
        },
        name: 'Mocked Place'
      };
      callback(result, 'OK');
    }, 0);
  }

  nearbySearch(request, callback) {
    setTimeout(() => {
      const results = [{
        place_id: 'mock_place_1',
        name: 'Mock POI',
        geometry: {
          location: new MockLatLng(48.8566, 2.3522)
        },
        types: ['establishment']
      }];
      callback(results, 'OK');
    }, 0);
  }
}

// Mock Autocomplete
class MockAutocomplete {
  constructor(input, options = {}) {
    this.input = input;
    this.options = options;
    this.place = null;
  }

  addListener(event, callback) {
    return mockEventManager.addListener(this, event, callback);
  }

  getPlace() {
    return this.place;
  }

  // Helper pour simuler une sélection
  simulatePlaceChanged(place) {
    this.place = place;
    mockEventManager.trigger(this, 'place_changed', {});
  }
}

// Configuration du mock global Google Maps
const mockGoogle = {
  maps: {
    Map: MockMap,
    Marker: MockMarker,
    InfoWindow: MockInfoWindow,
    LatLng: MockLatLng,
    Geocoder: MockGeocoder,
    DirectionsService: MockDirectionsService,
    
    // Constants
    MapTypeId: {
      ROADMAP: 'roadmap',
      SATELLITE: 'satellite',
      HYBRID: 'hybrid',
      TERRAIN: 'terrain'
    },

    SymbolPath: {
      CIRCLE: 0,
      FORWARD_CLOSED_ARROW: 1,
      FORWARD_OPEN_ARROW: 2,
      BACKWARD_CLOSED_ARROW: 3,
      BACKWARD_OPEN_ARROW: 4
    },

    // Events
    event: {
      addListener: (source, event, callback) => mockEventManager.addListener(source, event, callback),
      removeListener: (listener) => listener?.remove(),
      trigger: (source, event, data) => mockEventManager.trigger(source, event, data)
    },

    // Places
    places: {
      PlacesService: MockPlacesService,
      Autocomplete: MockAutocomplete,
      PlacesServiceStatus: {
        OK: 'OK',
        UNKNOWN_ERROR: 'UNKNOWN_ERROR'
      }
    },

    // Directions
    DirectionsService: MockDirectionsService,
    DirectionsStatus: {
      OK: 'OK',
      NOT_FOUND: 'NOT_FOUND'
    },

    // Geocoding
    GeocoderStatus: {
      OK: 'OK',
      ERROR: 'ERROR'
    }
  }
};

// Helpers pour les tests
export const googleMapsMockHelpers = {
  // Simuler un clic sur la carte
  simulateMapClick: (mapInstance, lat, lng) => {
    mapInstance.simulateClick(lat, lng);
  },

  // Simuler le drag d'un marqueur
  simulateMarkerDrag: (markerInstance, lat, lng) => {
    markerInstance.simulateDragEnd(lat, lng);
  },

  // Simuler une sélection d'autocomplétion
  simulateAutocompleteSelection: (autocompleteInstance, place) => {
    autocompleteInstance.simulatePlaceChanged(place);
  },

  // Créer un mock place pour les tests
  createMockPlace: (name, lat, lng) => ({
    place_id: `mock_${Date.now()}`,
    formatted_address: `${name}, Mocked Address`,
    geometry: {
      location: new MockLatLng(lat, lng)
    },
    name
  }),

  // Nettoyer les listeners entre les tests
  clearAllListeners: () => {
    mockEventManager.listeners.clear();
  }
};

// Installation du mock global
if (typeof global !== 'undefined') {
  global.google = mockGoogle;
} else if (typeof window !== 'undefined') {
  window.google = mockGoogle;
}

// Export pour utilisation dans les tests
export { mockGoogle };