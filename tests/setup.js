// Configuration globale pour les tests
import { vi } from 'vitest';

// Mock de l'API Google Maps
global.google = {
  maps: {
    Map: vi.fn(() => ({
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      addListener: vi.fn()
    })),
    Marker: vi.fn(() => ({
      setMap: vi.fn(),
      setPosition: vi.fn(),
      addListener: vi.fn()
    })),
    DirectionsService: vi.fn(() => ({
      route: vi.fn()
    })),
    DirectionsRenderer: vi.fn(() => ({
      setMap: vi.fn(),
      setDirections: vi.fn()
    })),
    places: {
      PlacesService: vi.fn(() => ({
        nearbySearch: vi.fn(),
        getDetails: vi.fn()
      })),
      Autocomplete: vi.fn(() => ({
        addListener: vi.fn(),
        getPlace: vi.fn()
      }))
    },
    Geocoder: vi.fn(() => ({
      geocode: vi.fn()
    })),
    LatLng: vi.fn((lat, lng) => ({ lat, lng })),
    TravelMode: {
      WALKING: 'WALKING',
      BICYCLING: 'BICYCLING',
      DRIVING: 'DRIVING'
    },
    DirectionsStatus: {
      OK: 'OK',
      ZERO_RESULTS: 'ZERO_RESULTS',
      OVER_QUERY_LIMIT: 'OVER_QUERY_LIMIT'
    },
    PlacesServiceStatus: {
      OK: 'OK',
      ZERO_RESULTS: 'ZERO_RESULTS'
    }
  }
};

// Mock de localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock de fetch
global.fetch = vi.fn();

// Mock de navigator.geolocation
global.navigator.geolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn()
};