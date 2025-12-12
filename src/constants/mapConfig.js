// Mapbox Configuration Constants
// Centralized configuration for consistent behavior across the application

export const MAPBOX_CONFIG = {
  // Default map settings (fallbacks if project settings not available)
  DEFAULT_CENTER: {
    lng: 77.08,
    lat: 28.49
  },
  DEFAULT_ZOOM: 12,
  MIN_ZOOM: 8,
  MAX_ZOOM: 18,
  GLOBE_ZOOM: 2,
  
  // Animation durations (in milliseconds)
  INITIAL_ANIMATION_DURATION: 3000,
  ROUTE_ANIMATION_DURATION: 1000,
  FLY_TO_DURATION: 1500,
  
  // Performance settings
  MAX_MARKERS_BEFORE_CLUSTERING: 50,
  ICON_CACHE_SIZE: 100,
  MAX_CONCURRENT_ICON_LOADS: 10,
  
  // Event optimization
  DEBOUNCE_DELAY: 300, // ms for hover events
  THROTTLE_DELAY: 100, // ms for scroll/zoom events
  
  // API settings
  API_TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // Base delay for exponential backoff
  
  // Cache settings
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 100,
  
  // Route settings
  ROUTE_LINE_WIDTH: 4,
  ROUTE_LINE_COLOR: '#3b82f6',
  ROUTE_LINE_OPACITY: 0.8,
  ROUTE_PADDING: 150,
  
  // Marker settings
  DEFAULT_MARKER_SIZE: 1,
  NEARBY_PLACE_OPACITY: 1.0,
  NEARBY_PLACE_SIZE_FACTOR: 0.8,
  
  // Popup settings
  POPUP_OFFSET: 25,
  POPUP_MAX_WIDTH: 300,
  HOVER_DELAY: 200, // Delay before showing hover tooltip
  
  // Icon settings
  DEFAULT_ICON_WIDTH: 32,
  DEFAULT_ICON_HEIGHT: 32,
  ICON_PIXEL_RATIO: 2,
  
  // Coordinate validation
  MIN_LONGITUDE: -180,
  MAX_LONGITUDE: 180,
  MIN_LATITUDE: -90,
  MAX_LATITUDE: 90
};

export const MAPBOX_STYLES = {
  DARK: 'mapbox://styles/mapbox/dark-v11',
  LIGHT: 'mapbox://styles/mapbox/light-v11',
  STREETS: 'mapbox://styles/mapbox/streets-v12',
  OUTDOORS: 'mapbox://styles/mapbox/outdoors-v12',
  SATELLITE: 'mapbox://styles/mapbox/satellite-v9',
  SATELLITE_STREETS: 'mapbox://styles/mapbox/satellite-streets-v12'
};

export const ERROR_MESSAGES = {
  PROJECT_NOT_FOUND: 'Project not found. Please check the project ID.',
  PROJECT_INACTIVE: 'This project is currently inactive.',
  API_ERROR: 'Failed to load data. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_COORDINATES: 'Invalid coordinates provided.',
  ICON_LOAD_ERROR: 'Failed to load custom icon.',
  NO_ROUTE_FOUND: 'No route could be calculated.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.'
};

export const LAYER_IDS = {
  CLIENT_BUILDING: 'client-building-layer',
  LANDMARKS: 'landmarks-layer',
  NEARBY_PLACES: 'nearby-places-layer',
  NEARBY_PLACES_HOVER: 'nearby-places-hover-layer',
  ROUTE: 'route',
  ROUTE_GLOW: 'route-glow',
  CLUSTERS: 'clusters',
  CLUSTER_COUNT: 'cluster-count',
  UNCLUSTERED_POINT: 'unclustered-point',
  BUILDINGS_3D: '3d-buildings'
};

export const SOURCE_IDS = {
  CLIENT_BUILDING: 'client-building',
  LANDMARKS: 'landmarks',
  NEARBY_PLACES: 'nearby-places',
  ROUTE: 'route'
};
