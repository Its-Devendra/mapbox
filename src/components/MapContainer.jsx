"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { toast } from 'react-toastify';
import LandmarkCard from "./LandmarkCard";
import {
  createSVGImage,
  debounce,
  formatDistance,
  formatDuration,
  easeInOutCubic,
  getIconSize
} from "@/utils/mapUtils";
import { useMapboxDirections } from "@/hooks/useMapboxDirections";
import { MAPBOX_CONFIG, LAYER_IDS, SOURCE_IDS } from "@/constants/mapConfig";

// Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  "pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNfGX8wp_w";

/**
 * Convert various Mapbox style URL formats to the mapbox:// format
 * Supports:
 * - mapbox://styles/username/style-id (already correct)
 * - https://api.mapbox.com/styles/v1/username/style-id.html?... (HTML preview)
 * - https://api.mapbox.com/styles/v1/username/style-id?... (API URL)
 * - username/style-id (shorthand)
 */
function convertToMapboxStyleUrl(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  // Already in correct format
  if (trimmed.startsWith('mapbox://styles/')) {
    return trimmed;
  }

  // Handle https://api.mapbox.com/styles/v1/username/style-id format
  // This covers both .html and .json variants, and with query params
  const apiUrlMatch = trimmed.match(/api\.mapbox\.com\/styles\/v1\/([^\/]+)\/([^\.\/\?#]+)/);
  if (apiUrlMatch) {
    const username = apiUrlMatch[1];
    const styleId = apiUrlMatch[2];
    return `mapbox://styles/${username}/${styleId}`;
  }

  // Handle shorthand format: username/style-id
  const shorthandMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)$/);
  if (shorthandMatch) {
    return `mapbox://styles/${shorthandMatch[1]}/${shorthandMatch[2]}`;
  }

  // If it doesn't match any known format, return as-is (might be a valid mapbox:// URL)
  return trimmed;
}

export default function MapContainer({
  landmarks = [],
  nearbyPlaces = [],
  clientBuilding = null,
  project = null,
  introAudio = null,
  projectTheme = null,
  mapSettings = null,
  interactive = true
}) {
  // Default theme
  const [theme, setTheme] = useState({
    primary: '#1e3a8a',
    secondary: '#ffffff',
    tertiary: '#64748b',
    quaternary: '#f1f5f9',
    mapboxStyle: 'mapbox://styles/mapbox/dark-v11'
  });
  const [themeLoading, setThemeLoading] = useState(true);

  // Update theme when projectTheme changes
  useEffect(() => {
    if (projectTheme) {
      setTheme(projectTheme);
      setThemeLoading(false);
    } else {
      setThemeLoading(false);
    }
  }, [projectTheme]);

  // Refs
  const mapContainerRef = useRef();
  const mapRef = useRef();
  const markersRef = useRef([]);
  const popupsRef = useRef([])
    ;
  const routeRef = useRef(null);
  const activeLandmarkRef = useRef(null);
  const originalViewportRef = useRef(null);
  const loadedIconsRef = useRef(new Set());
  const eventHandlersRef = useRef([]);
  const nearbyPlacePopupRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isCreatingRouteRef = useRef(false); // Track when route is being created
  const routeGenerationRef = useRef(0); // Generation counter to track route creation attempts
  const audioRef = useRef(null); // Audio reference
  const introPlayedRef = useRef(false); // Track if intro has played
  const initialZoomDoneRef = useRef(false); // Track if initial zoom is done

  // Intro State
  const [showIntroButton, setShowIntroButton] = useState(false); // Show button if autoplay blocks
  const introAudioRef = useRef(introAudio); // Track introAudio prop for non-reactive access

  // Update introAudioRef when prop changes
  useEffect(() => {
    introAudioRef.current = introAudio;
  }, [introAudio]);

  // State
  const [selectedLandmark, setSelectedLandmark] = useState(null);
  const [showLandmarkCard, setShowLandmarkCard] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Custom hook for directions
  const { getDistanceAndDuration } = useMapboxDirections();

  /**
   * Get map settings with fallbacks
   */
  const getMapConfig = useCallback(() => {
    // Check if all bound values are valid numbers (not null/undefined)
    const hasBounds =
      mapSettings?.southWestLat != null &&
      mapSettings?.southWestLng != null &&
      mapSettings?.northEastLat != null &&
      mapSettings?.northEastLng != null;

    const config = {
      center: [
        mapSettings?.defaultCenterLng ?? MAPBOX_CONFIG.DEFAULT_CENTER.lng,
        mapSettings?.defaultCenterLat ?? MAPBOX_CONFIG.DEFAULT_CENTER.lat
      ],
      zoom: mapSettings?.defaultZoom ?? MAPBOX_CONFIG.DEFAULT_ZOOM,
      minZoom: mapSettings?.minZoom ?? 0, // Default to 0 (fully zoomed out) if not set
      maxZoom: mapSettings?.maxZoom ?? 22, // Default to 22 (fully zoomed in) if not set
      pitch: mapSettings?.enablePitch ? 60 : 0,
      bearing: 0,
      interactive: interactive,
      dragRotate: mapSettings?.enableRotation ?? true,
      pitchWithRotate: mapSettings?.enablePitch ?? true,
      maxBounds: hasBounds
        ? [
          [mapSettings.southWestLng, mapSettings.southWestLat], // Southwest coordinates
          [mapSettings.northEastLng, mapSettings.northEastLat]  // Northeast coordinates
        ]
        : undefined // Default to no bounds
    };
    return config;
  }, [mapSettings, interactive]);

  /**
   * Intro Sequence Logic
   */
  useEffect(() => {
    // Only run if map exists, style loaded, intro audio exists, and hasn't played yet
    if (!mapRef.current || !isMapLoaded || !introAudio || introPlayedRef.current || !clientBuilding) return;

    // Mark as played to prevent multiple runs
    introPlayedRef.current = true;

    // Create audio element
    const audio = new Audio(introAudio);
    audioRef.current = audio;

    // Zoom to client building when audio starts
    const playSequence = async () => {
      try {
        await audio.play();

        setShowIntroButton(false); // Hide button if it was shown

        // Fly to client building
        if (clientBuilding && clientBuilding.coordinates) {
          if (!mapRef.current) return;

          mapRef.current.flyTo({
            center: clientBuilding.coordinates,
            zoom: 17.5,
            pitch: 60,
            bearing: 45,
            duration: 3000, // Reduced from 4000 for snappier feel
            essential: true
          });
        }

        // On audio end, zoom back out
        audio.onended = () => {
          resetCamera();
        };

      } catch (err) {
        console.warn('Autoplay blocked:', err.message);
        setShowIntroButton(true);
      }
    };

    playSequence();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [introAudio, isMapLoaded, clientBuilding]);

  /**
   * Manual trigger for intro sequence
   */
  const handleStartIntro = () => {
    if (!audioRef.current) return;

    // Retry sequence
    audioRef.current.play().then(() => {
      setShowIntroButton(false);
      console.log('🎵 Manually started audio');

      if (clientBuilding && clientBuilding.coordinates) {
        mapRef.current.flyTo({
          center: clientBuilding.coordinates,
          zoom: 17.5,
          pitch: 60,
          bearing: 45,
          duration: 4000,
          essential: true
        });
      }

      audioRef.current.onended = () => {
        resetCamera();
      };
    }).catch(e => console.error('Manual play failed', e));
  };

  /**
   * Cleanup function for all map resources
   */
  const cleanup = useCallback(() => {
    if (!mapRef.current) return;

    console.log('Cleaning up map resources...');

    // Remove all popups
    popupsRef.current.forEach(popup => popup.remove());
    popupsRef.current = [];

    // Remove all HTML markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Remove event handlers
    eventHandlersRef.current.forEach(({ event, layer, handler }) => {
      if (layer) {
        mapRef.current.off(event, layer, handler);
      } else {
        mapRef.current.off(event, handler);
      }
    });
    eventHandlersRef.current = [];

    // Remove layers and sources if they exist
    const layersToRemove = [
      LAYER_IDS.ROUTE,
      LAYER_IDS.ROUTE_GLOW, // Add glow layer
      LAYER_IDS.NEARBY_PLACES_HOVER,
      LAYER_IDS.NEARBY_PLACES,
      LAYER_IDS.LANDMARKS,
      LAYER_IDS.CLIENT_BUILDING,
      LAYER_IDS.BUILDINGS_3D
    ];

    const sourcesToRemove = [
      SOURCE_IDS.ROUTE,
      SOURCE_IDS.NEARBY_PLACES,
      SOURCE_IDS.LANDMARKS,
      SOURCE_IDS.CLIENT_BUILDING
    ];

    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      layersToRemove.forEach(layerId => {
        if (mapRef.current.getLayer(layerId)) {
          mapRef.current.removeLayer(layerId);
        }
      });

      sourcesToRemove.forEach(sourceId => {
        if (mapRef.current.getSource(sourceId)) {
          mapRef.current.removeSource(sourceId);
        }
      });
    }

    routeRef.current = null;

    // Clear the loaded icons cache since we're cleaning up
    // Icons need to be reloaded when markers are recreated
    loadedIconsRef.current.clear();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);
  /**
   * Clear route and restore viewport
   */
  const clearRoute = useCallback(() => {
    // Clear even if route is being created
    if (!mapRef.current) return;
    if (!routeRef.current && !isCreatingRouteRef.current) return;

    console.log('clearRoute called, routeRef:', routeRef.current, 'isCreating:', isCreatingRouteRef.current);

    // FIRST: Cancel any ongoing animation to prevent race conditions
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Increment generation to invalidate any in-progress route creation
    routeGenerationRef.current += 1;

    // Cancel route creation flag
    isCreatingRouteRef.current = false;

    // Remove layers and source - try regardless of style loaded state
    try {
      if (mapRef.current.getLayer(LAYER_IDS.ROUTE)) {
        mapRef.current.removeLayer(LAYER_IDS.ROUTE);
      }
    } catch (e) {
      console.warn('Could not remove route layer:', e);
    }

    try {
      if (mapRef.current.getLayer(LAYER_IDS.ROUTE_GLOW)) {
        mapRef.current.removeLayer(LAYER_IDS.ROUTE_GLOW);
      }
    } catch (e) {
      console.warn('Could not remove route glow layer:', e);
    }

    try {
      if (mapRef.current.getSource(SOURCE_IDS.ROUTE)) {
        mapRef.current.removeSource(SOURCE_IDS.ROUTE);
      }
    } catch (e) {
      console.warn('Could not remove route source:', e);
    }

    routeRef.current = null;
    activeLandmarkRef.current = null;

    // Restore original viewport
    if (originalViewportRef.current && mapRef.current) {
      try {
        mapRef.current.flyTo({
          center: originalViewportRef.current.center,
          zoom: originalViewportRef.current.zoom,
          duration: MAPBOX_CONFIG.ROUTE_ANIMATION_DURATION
        });
      } catch (e) {
        console.warn('Could not fly to original viewport:', e);
      }
    }

    // Deselect landmark
    setSelectedLandmark(null);
    setShowLandmarkCard(false);
  }, []);

  /**
   * Load custom icons with error handling and caching
   */
  const loadCustomIcons = useCallback(async () => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

    const iconsToLoad = [];

    // Client building icon
    if (project?.clientBuildingIcon && !loadedIconsRef.current.has('client-building-icon')) {
      iconsToLoad.push({
        id: 'client-building-icon',
        svg: project.clientBuildingIcon,
        width: project.clientBuildingIconWidth || MAPBOX_CONFIG.DEFAULT_ICON_WIDTH,
        height: project.clientBuildingIconHeight || MAPBOX_CONFIG.DEFAULT_ICON_HEIGHT
      });
    }

    // Landmark icons
    landmarks.forEach(landmark => {
      const iconId = `landmark-icon-${landmark.id}`;
      if (landmark.icon && !loadedIconsRef.current.has(iconId)) {
        const { width, height } = getIconSize(landmark, landmark.category);
        iconsToLoad.push({
          id: iconId,
          svg: landmark.icon,
          width,
          height
        });
      }
    });

    // Nearby place icons
    nearbyPlaces.forEach(place => {
      const iconToUse = place.icon || place.categoryIcon;
      const iconId = `nearby-icon-${place.id}`;
      if (iconToUse && !loadedIconsRef.current.has(iconId)) {
        const { width, height } = getIconSize(place, place.category);
        iconsToLoad.push({
          id: iconId,
          svg: iconToUse,
          width,
          height
        });
      }
    });

    // Load all icons in parallel (with concurrency limit)
    const loadBatch = async (batch) => {
      const results = await Promise.allSettled(
        batch.map(async ({ id, svg, width, height }) => {
          try {
            const img = await createSVGImage(svg, width, height);
            if (mapRef.current && !mapRef.current.hasImage(id)) {
              mapRef.current.addImage(id, img, { pixelRatio: MAPBOX_CONFIG.ICON_PIXEL_RATIO });
              loadedIconsRef.current.add(id);
            } else if (mapRef.current && mapRef.current.hasImage(id)) {
              loadedIconsRef.current.add(id);
            }
          } catch (error) {
            console.warn(`Failed to load icon ${id}:`, error);
          }
        })
      );
      return results;
    };

    // Load in batches to avoid overwhelming the browser
    for (let i = 0; i < iconsToLoad.length; i += MAPBOX_CONFIG.MAX_CONCURRENT_ICON_LOADS) {
      const batch = iconsToLoad.slice(i, i + MAPBOX_CONFIG.MAX_CONCURRENT_ICON_LOADS);
      await loadBatch(batch);
    }
  }, [project, landmarks, nearbyPlaces]);

  /**
   * Get directions from client building to landmark
   */
  const getDirections = useCallback(async (destination) => {
    if (!mapRef.current || !clientBuilding) return;

    // Capture current generation - if this changes during execution, we should abort
    const currentGeneration = routeGenerationRef.current;

    // Mark that we're creating a route
    isCreatingRouteRef.current = true;

    // Helper to check if this route creation is still valid
    const isStillValid = () => {
      return routeGenerationRef.current === currentGeneration && isCreatingRouteRef.current;
    };

    try {
      // Store current viewport before showing route (if no route is currently active)
      if (!routeRef.current && !isCreatingRouteRef.current) {
        originalViewportRef.current = {
          center: mapRef.current.getCenter().toArray(),
          zoom: mapRef.current.getZoom()
        };
      }

      // Store viewport if not already stored
      if (!originalViewportRef.current) {
        originalViewportRef.current = {
          center: mapRef.current.getCenter().toArray(),
          zoom: mapRef.current.getZoom()
        };
      }

      // Remove existing route if any
      if (routeRef.current) {
        // Don't restore viewport when switching routes
        if (mapRef.current.isStyleLoaded()) {
          if (mapRef.current.getLayer(LAYER_IDS.ROUTE)) {
            mapRef.current.removeLayer(LAYER_IDS.ROUTE);
          }
          if (mapRef.current.getLayer(LAYER_IDS.ROUTE_GLOW)) {
            mapRef.current.removeLayer(LAYER_IDS.ROUTE_GLOW);
          }
          if (mapRef.current.getSource(SOURCE_IDS.ROUTE)) {
            mapRef.current.removeSource(SOURCE_IDS.ROUTE);
          }
        }
        routeRef.current = null;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      }

      const start = clientBuilding.coordinates;
      const end = destination.coordinates;

      // Use Mapbox Directions API
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch directions');
      }

      const apiData = await response.json();

      if (!apiData.routes || apiData.routes.length === 0) {
        throw new Error('No route found');
      }

      // Check if route creation was cancelled while fetching
      if (!isStillValid()) {
        return; // User clicked elsewhere, abort route creation
      }

      const route = apiData.routes[0];
      const data = {
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration
      };

      if (data && data.geometry) {
        // Check if cancelled before adding source
        if (!isStillValid()) {
          return;
        }

        // Add route to map
        if (!mapRef.current.getSource(SOURCE_IDS.ROUTE)) {
          mapRef.current.addSource(SOURCE_IDS.ROUTE, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: data.geometry
            }
          });
        }

        // Check if cancelled after adding source but before layers
        if (!isStillValid()) {
          // Clean up the source we just added
          try {
            if (mapRef.current.getSource(SOURCE_IDS.ROUTE)) {
              mapRef.current.removeSource(SOURCE_IDS.ROUTE);
            }
          } catch (e) { /* ignore */ }
          return;
        }

        const routeColor = mapSettings?.routeLineColor || MAPBOX_CONFIG.ROUTE_LINE_COLOR;
        const routeWidth = mapSettings?.routeLineWidth || MAPBOX_CONFIG.ROUTE_LINE_WIDTH;

        if (!mapRef.current.getLayer(LAYER_IDS.ROUTE)) {
          // Add Glow Layer (Underneath)
          mapRef.current.addLayer({
            id: LAYER_IDS.ROUTE_GLOW,
            type: 'line',
            source: SOURCE_IDS.ROUTE,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': routeColor,
              'line-width': routeWidth * 3, // Wider for glow
              'line-opacity': 0.2, // Low opacity
              'line-blur': 3 // Blur effect
            }
          }, LAYER_IDS.LANDMARKS); // Place below landmarks

          // Add Main Route Layer
          mapRef.current.addLayer({
            id: LAYER_IDS.ROUTE,
            type: 'line',
            source: SOURCE_IDS.ROUTE,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': routeColor,
              'line-width': routeWidth,
              'line-opacity': MAPBOX_CONFIG.ROUTE_LINE_OPACITY
            }
          }, LAYER_IDS.LANDMARKS);
        }

        // Check if cancelled after adding layers
        if (!isStillValid()) {
          // Clean up everything we just added
          try {
            if (mapRef.current.getLayer(LAYER_IDS.ROUTE)) {
              mapRef.current.removeLayer(LAYER_IDS.ROUTE);
            }
            if (mapRef.current.getLayer(LAYER_IDS.ROUTE_GLOW)) {
              mapRef.current.removeLayer(LAYER_IDS.ROUTE_GLOW);
            }
            if (mapRef.current.getSource(SOURCE_IDS.ROUTE)) {
              mapRef.current.removeSource(SOURCE_IDS.ROUTE);
            }
          } catch (e) { /* ignore */ }
          return;
        }

        // Store reference for cleanup
        routeRef.current = LAYER_IDS.ROUTE;
        activeLandmarkRef.current = destination;

        // Fit map to show the entire route
        const coordinates = data.geometry.coordinates;
        const bounds = coordinates.reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        mapRef.current.fitBounds(bounds, {
          padding: MAPBOX_CONFIG.ROUTE_PADDING,
          duration: 2000, // Match route animation duration
          essential: true // Force animation
        });

        // Animate the route drawing - capture generation for animation closure
        const animationGeneration = currentGeneration;
        const animateRoute = () => {
          const animationDuration = 2500; // 2.5 seconds for a smoother feel
          const startTime = performance.now();

          const animate = (currentTime) => {
            // Stop animation if route was cleared (generation changed OR refs cleared)
            if (routeGenerationRef.current !== animationGeneration || !routeRef.current) {
              return;
            }

            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / animationDuration, 1);
            const easedProgress = easeInOutCubic(progress);

            // Calculate how many coordinates to show
            // Ensure at least 2 coordinates to form a line
            const totalPoints = coordinates.length;
            const currentCount = Math.max(2, Math.ceil(totalPoints * easedProgress));
            const currentCoordinates = coordinates.slice(0, currentCount);

            const currentGeoJson = {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: currentCoordinates
              }
            };

            if (mapRef.current && mapRef.current.getSource(SOURCE_IDS.ROUTE)) {
              mapRef.current.getSource(SOURCE_IDS.ROUTE).setData(currentGeoJson);
            }

            if (progress < 1) {
              animationFrameRef.current = requestAnimationFrame(animate);
            }
          };

          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          animationFrameRef.current = requestAnimationFrame(animate);
        };

        animateRoute();
      }
    } catch (error) {
      console.error('Error getting directions:', error);
      isCreatingRouteRef.current = false;
    }
  }, [clientBuilding, mapSettings]);

  /**
   * Handle nearby place hover (raw function without debounce)
   */
  const handleNearbyPlaceHoverRaw = useCallback(async (e) => {
    if (!mapRef.current || !clientBuilding) {
      console.log('Hover debug: Map or client building not ready');
      return;
    }

    if (!e?.features?.length) {
      // console.log('Hover debug: No features found');
      return;
    }

    const feature = e.features[0];

    const placeId = feature.properties.id;

    // Avoid re-creating popup if already showing for this place
    if (nearbyPlacePopupRef.current && nearbyPlacePopupRef.current.placeId === placeId) {
      return;
    }

    const place = nearbyPlaces.find(p => p.id === placeId);

    if (!place) {
      console.log('Hover debug: Place not found for ID:', placeId);
      return;
    }

    console.log('Hover debug: Showing tooltip for:', place.title);

    try {
      // Remove existing popup first
      if (nearbyPlacePopupRef.current) {
        nearbyPlacePopupRef.current.remove();
        nearbyPlacePopupRef.current = null;
      }

      // Show initial popup without distance/duration
      const categoryColor = place.categoryColor || '#3b82f6'; // Default to blue if no color

      let popupContent = `
        <div class="min-w-[220px] overflow-hidden rounded-lg shadow-sm">
          <div class="h-1.5 w-full" style="background-color: ${categoryColor}"></div>
          <div class="p-3 bg-white">
            <div class="flex items-start justify-between gap-2 mb-1">
              <h3 class="font-bold text-sm text-gray-900 leading-tight">${place.title}</h3>
              <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase tracking-wider" style="color: ${categoryColor}; background-color: ${categoryColor}15">
                ${place.categoryName || 'Place'}
              </span>
            </div>
            
            <div id="popup-distance-${placeId}" class="mt-2 text-xs text-gray-500 flex items-center gap-2">
              <span class="w-3 h-3 border-2 border-gray-200 border-t-current rounded-full animate-spin" style="color: ${categoryColor}"></span>
              <span>Calculating distance...</span>
            </div>
          </div>
        </div>
      `;

      // Create and show popup immediately
      const popup = new mapboxgl.Popup({
        offset: MAPBOX_CONFIG.POPUP_OFFSET,
        closeButton: false,
        maxWidth: MAPBOX_CONFIG.POPUP_MAX_WIDTH,
        className: 'nearby-popup-premium'
      })
        .setLngLat(place.coordinates)
        .setHTML(popupContent)
        .addTo(mapRef.current);

      // Store placeId on the popup instance for the check above
      popup.placeId = placeId;
      nearbyPlacePopupRef.current = popup;
      popupsRef.current.push(popup);

      // Get distance and duration asynchronously and update popup
      try {
        const result = await getDistanceAndDuration(
          clientBuilding.coordinates,
          place.coordinates
        );

        const distance = result?.distance;
        const duration = result?.duration;

        // Update popup content with distance/duration if still open and matching ID
        if (nearbyPlacePopupRef.current === popup && distance && duration) {
          const updatedContent = `
            <div class="min-w-[220px] overflow-hidden rounded-lg shadow-sm">
              <div class="h-1.5 w-full" style="background-color: ${categoryColor}"></div>
              <div class="p-3 bg-white">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <h3 class="font-bold text-sm text-gray-900 leading-tight">${place.title}</h3>
                  <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider" style="color: ${categoryColor}; background-color: ${categoryColor}15">
                    ${place.categoryName || 'Place'}
                  </span>
                </div>
                
                <div class="flex items-center gap-2 text-xs font-medium">
                  <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 text-gray-700 border border-gray-100">
                    <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    ${formatDistance(distance)}
                  </div>
                  <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 text-gray-700 border border-gray-100">
                    <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ${formatDuration(duration)}
                  </div>
                </div>
              </div>
            </div>
          `;
          popup.setHTML(updatedContent);
        }
      } catch (distanceError) {
        console.error('Error calculating distance:', distanceError);
        // Popup already shows "Calculating..." which is fine, or we could update to "Error"
        if (nearbyPlacePopupRef.current === popup) {
          const errorContent = `
            <div class="min-w-[220px] overflow-hidden rounded-lg shadow-sm">
              <div class="h-1.5 w-full" style="background-color: ${categoryColor}"></div>
              <div class="p-3 bg-white">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <h3 class="font-bold text-sm text-gray-900 leading-tight">${place.title}</h3>
                  <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider" style="color: ${categoryColor}; background-color: ${categoryColor}15">
                    ${place.categoryName || 'Place'}
                  </span>
                </div>
                <p class="text-xs text-red-500 mt-2">Distance unavailable</p>
              </div>
            </div>
          `;
          popup.setHTML(errorContent);
        }
      }
    } catch (error) {
      console.error('Error showing nearby place tooltip:', error);
    }
  }, [nearbyPlaces, clientBuilding, getDistanceAndDuration]);



  /**
   * Handle nearby place mouse leave
   */
  const handleNearbyPlaceLeave = useCallback(() => {
    if (nearbyPlacePopupRef.current) {
      nearbyPlacePopupRef.current.remove();
      nearbyPlacePopupRef.current = null;
    }
  }, []);

  /**
   * Add 3D buildings layer to the map
   */
  const add3DBuildings = useCallback(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

    try {
      // Check if composite source exists (available in most Mapbox styles)
      if (mapRef.current.getSource('composite')) {
        // Only add if layer doesn't already exist
        if (!mapRef.current.getLayer(LAYER_IDS.BUILDINGS_3D)) {
          // Find a label layer to insert the 3D buildings layer before it
          const layers = mapRef.current.getStyle().layers;
          const labelLayerId = layers.find(layer =>
            layer.type === 'symbol' &&
            layer.layout &&
            layer.layout['text-field']
          )?.id;

          mapRef.current.addLayer({
            id: LAYER_IDS.BUILDINGS_3D,
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          }, labelLayerId);
        }
      }
    } catch (error) {
      console.warn('Could not add 3D buildings layer:', error);
    }
  }, []);

  /**
   * Initialize map
   */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || themeLoading) return;

    const config = getMapConfig();

    // Convert style URL to proper mapbox:// format
    const styleUrl = convertToMapboxStyleUrl(theme.mapboxStyle) || MAPBOX_CONFIG.DEFAULT_STYLE || 'mapbox://styles/mapbox/dark-v11';

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: config.center,
      zoom: MAPBOX_CONFIG.GLOBE_ZOOM, // Start with globe view
      minZoom: config.minZoom,
      maxZoom: config.maxZoom,
      pitch: config.pitch,
      bearing: config.bearing,
      dragRotate: config.dragRotate,
      pitchWithRotate: config.pitchWithRotate,
      maxBounds: config.maxBounds // Apply bounds on initialization
    });

    // Update bounds dynamically if they change later
    if (mapRef.current && config.maxBounds) {
      mapRef.current.setMaxBounds(config.maxBounds);
    } else if (mapRef.current) {
      mapRef.current.setMaxBounds(null); // Clear bounds if not set
    }

    // Animate to location after load
    mapRef.current.on('load', () => {
      setIsMapLoaded(true);

      // Add 3D buildings layer
      add3DBuildings();

      const duration = mapSettings?.initialAnimationDuration || MAPBOX_CONFIG.INITIAL_ANIMATION_DURATION;

      // Determine target center: prioritize client building, fallback to map center
      const targetCenter = clientBuilding
        ? clientBuilding.coordinates
        : config.center;

      // Store original viewport using client building location if available
      originalViewportRef.current = {
        center: targetCenter,
        zoom: config.zoom
      };

      // CRITICAL: If intro audio exists, skip the standard initial animation.
      // The intro sequence will handle the camera movement (Zoom from space -> Building)
      if (introAudioRef.current) {
        console.log('🎵 Intro audio detected, skipping default initial animation to allow intro sequence');
        return;
      }

      setTimeout(() => {
        mapRef.current.flyTo({
          center: targetCenter,
          zoom: config.zoom,
          duration: duration,
          essential: true
        });
      }, 500);


    });

    // Add map click listener to clear routes and deselect landmark
    const mapClickHandler = (e) => {
      // Check if the click was on any interactive layer (landmark, client building, nearby place)
      const interactiveLayers = [
        LAYER_IDS.LANDMARKS,
        LAYER_IDS.CLIENT_BUILDING,
        LAYER_IDS.NEARBY_PLACES
      ].filter(layerId => mapRef.current.getLayer(layerId));

      const features = mapRef.current.queryRenderedFeatures(e.point, {
        layers: interactiveLayers
      });

      // Only clear if clicking on empty map area (no features under click)
      if (features.length === 0) {
        // Clear route if one exists OR is being created
        if (routeRef.current || isCreatingRouteRef.current) {
          clearRoute();
        }
        setSelectedLandmark(null);
        setShowLandmarkCard(false);
      }
    };

    mapRef.current.on('click', mapClickHandler);
    eventHandlersRef.current.push({ event: 'click', handler: mapClickHandler });

    return () => {
      cleanup();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      loadedIconsRef.current.clear();
    };
  }, [theme.mapboxStyle, themeLoading, getMapConfig, mapSettings, clearRoute, cleanup, add3DBuildings]);

  /**
   * Update map style when theme changes
   */
  useEffect(() => {
    if (mapRef.current && !themeLoading && mapRef.current.isStyleLoaded()) {
      const styleUrl = convertToMapboxStyleUrl(theme.mapboxStyle) || theme.mapboxStyle;
      mapRef.current.setStyle(styleUrl);
      // Clear loaded icons cache as they need to be reloaded with new style
      // Icons are part of the map style, so changing style removes them
      loadedIconsRef.current.clear();

      // Re-add 3D buildings layer after style loads
      mapRef.current.once('load', () => {
        add3DBuildings();
      });
    }
  }, [theme.mapboxStyle, themeLoading, add3DBuildings]);

  /**
   * Update markers when data changes
   */
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    let retryCount = 0;
    const maxRetries = 50; // Max 5 seconds (50 * 100ms)

    const updateMarkers = async () => {
      console.log('updateMarkers called, style loaded:', mapRef.current?.isStyleLoaded(), 'map loaded:', isMapLoaded, 'retry:', retryCount);

      // Wait for style to load with polling instead of relying on styledata event
      if (!mapRef.current || !mapRef.current.isStyleLoaded()) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log('Style not loaded, retrying in 100ms...');
          setTimeout(updateMarkers, 100);
          return;
        } else {
          console.warn('Max retries reached, proceeding anyway');
        }
      }

      console.log('Style loaded, proceeding with marker update...');

      // Load custom icons first
      await loadCustomIcons();

      // Remove existing marker layers and sources before adding new ones
      // Do this inline instead of calling cleanup() to avoid clearing other state
      const layersToRemove = [
        LAYER_IDS.NEARBY_PLACES,
        LAYER_IDS.LANDMARKS,
        LAYER_IDS.CLIENT_BUILDING
      ];

      const sourcesToRemove = [
        SOURCE_IDS.NEARBY_PLACES,
        SOURCE_IDS.LANDMARKS,
        SOURCE_IDS.CLIENT_BUILDING
      ];

      layersToRemove.forEach(layerId => {
        if (mapRef.current.getLayer(layerId)) {
          mapRef.current.removeLayer(layerId);
        }
      });

      sourcesToRemove.forEach(sourceId => {
        if (mapRef.current.getSource(sourceId)) {
          mapRef.current.removeSource(sourceId);
        }
      });

      // Remove all HTML markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add client building marker
      if (clientBuilding) {
        const clientPopup = new mapboxgl.Popup({ offset: MAPBOX_CONFIG.POPUP_OFFSET })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-bold text-lg mb-2 text-blue-600">${clientBuilding.name}</h3>
              <p class="text-gray-600">${clientBuilding.description || 'Client Building'}</p>
            </div>
          `);

        if (project?.clientBuildingIcon && mapRef.current.hasImage('client-building-icon')) {
          // Use symbol layer for custom icon
          mapRef.current.addSource(SOURCE_IDS.CLIENT_BUILDING, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: clientBuilding.coordinates
              },
              properties: {
                name: clientBuilding.name,
                description: clientBuilding.description || 'Client Building'
              }
            }
          });

          mapRef.current.addLayer({
            id: LAYER_IDS.CLIENT_BUILDING,
            type: 'symbol',
            source: SOURCE_IDS.CLIENT_BUILDING,
            layout: {
              'icon-image': 'client-building-icon',
              'icon-size': MAPBOX_CONFIG.DEFAULT_MARKER_SIZE,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true
            }
          });

          // Click handler
          const clientClickHandler = () => {
            if (project?.clientBuildingUrl) {
              window.open(project.clientBuildingUrl, '_blank', 'noopener,noreferrer');
            } else {
              clientPopup.setLngLat(clientBuilding.coordinates).addTo(mapRef.current);
            }
          };

          // Hover handlers
          const clientEnterHandler = () => {
            mapRef.current.getCanvas().style.cursor = 'pointer';
          };

          const clientLeaveHandler = () => {
            mapRef.current.getCanvas().style.cursor = '';
          };

          mapRef.current.on('click', LAYER_IDS.CLIENT_BUILDING, clientClickHandler);
          mapRef.current.on('mouseenter', LAYER_IDS.CLIENT_BUILDING, clientEnterHandler);
          mapRef.current.on('mouseleave', LAYER_IDS.CLIENT_BUILDING, clientLeaveHandler);

          eventHandlersRef.current.push(
            { event: 'click', layer: LAYER_IDS.CLIENT_BUILDING, handler: clientClickHandler },
            { event: 'mouseenter', layer: LAYER_IDS.CLIENT_BUILDING, handler: clientEnterHandler },
            { event: 'mouseleave', layer: LAYER_IDS.CLIENT_BUILDING, handler: clientLeaveHandler }
          );
        } else {
          // Fallback to HTML marker
          const clientMarkerEl = document.createElement('div');
          clientMarkerEl.style.width = '20px';
          clientMarkerEl.style.height = '20px';
          clientMarkerEl.style.borderRadius = '50%';
          clientMarkerEl.style.backgroundColor = '#3b82f6';
          clientMarkerEl.style.border = '3px solid white';
          clientMarkerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
          clientMarkerEl.style.cursor = 'pointer';

          const clientMarker = new mapboxgl.Marker(clientMarkerEl)
            .setLngLat(clientBuilding.coordinates)
            .setPopup(clientPopup)
            .addTo(mapRef.current);

          if (project?.clientBuildingUrl) {
            clientMarkerEl.addEventListener('click', (e) => {
              e.stopPropagation();
              window.open(project.clientBuildingUrl, '_blank', 'noopener,noreferrer');
            });
          }

          markersRef.current.push(clientMarker);
        }
      }

      // Add landmarks
      if (landmarks.length > 0) {
        const landmarksGeoJSON = {
          type: 'FeatureCollection',
          features: landmarks.map(landmark => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: landmark.coordinates
            },
            properties: {
              id: landmark.id,
              title: landmark.title,
              description: landmark.description,
              hasIcon: !!landmark.icon
            }
          }))
        };

        mapRef.current.addSource(SOURCE_IDS.LANDMARKS, {
          type: 'geojson',
          data: landmarksGeoJSON
        });

        mapRef.current.addLayer({
          id: LAYER_IDS.LANDMARKS,
          type: 'symbol',
          source: SOURCE_IDS.LANDMARKS,
          layout: {
            'icon-image': [
              'case',
              ['get', 'hasIcon'],
              ['concat', 'landmark-icon-', ['get', 'id']],
              ''
            ],
            'icon-size': MAPBOX_CONFIG.DEFAULT_MARKER_SIZE,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          },
          filter: ['get', 'hasIcon']
        });

        // Click handler for landmarks
        const landmarkClickHandler = (e) => {
          const feature = e.features[0];
          const landmarkId = feature.properties.id;
          const landmark = landmarks.find(l => l.id === landmarkId);

          if (landmark) {
            e.originalEvent.preventDefault();
            setSelectedLandmark(landmark);
            setShowLandmarkCard(true);
            if (clientBuilding) {
              getDirections(landmark);
            }
          }
        };

        // Hover handlers
        const landmarkEnterHandler = () => {
          mapRef.current.getCanvas().style.cursor = 'pointer';
        };

        const landmarkLeaveHandler = () => {
          mapRef.current.getCanvas().style.cursor = '';
        };

        mapRef.current.on('click', LAYER_IDS.LANDMARKS, landmarkClickHandler);
        mapRef.current.on('mouseenter', LAYER_IDS.LANDMARKS, landmarkEnterHandler);
        mapRef.current.on('mouseleave', LAYER_IDS.LANDMARKS, landmarkLeaveHandler);

        eventHandlersRef.current.push(
          { event: 'click', layer: LAYER_IDS.LANDMARKS, handler: landmarkClickHandler },
          { event: 'mouseenter', layer: LAYER_IDS.LANDMARKS, handler: landmarkEnterHandler },
          { event: 'mouseleave', layer: LAYER_IDS.LANDMARKS, handler: landmarkLeaveHandler }
        );

        // Add HTML markers for landmarks without custom icons
        landmarks.forEach((landmark) => {
          if (!landmark.icon) {
            const marker = new mapboxgl.Marker()
              .setLngLat(landmark.coordinates)
              .addTo(mapRef.current);

            marker.getElement().addEventListener('click', (e) => {
              e.stopPropagation();
              setSelectedLandmark(landmark);
              setShowLandmarkCard(true);
              if (clientBuilding) {
                getDirections(landmark);
              }
            });

            markersRef.current.push(marker);
          }
        });
      }

      // Add nearby places
      if (nearbyPlaces.length > 0) {
        const nearbyGeoJSON = {
          type: 'FeatureCollection',
          features: nearbyPlaces.map(place => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: place.coordinates
            },
            properties: {
              id: place.id,
              title: place.title,
              categoryName: place.categoryName || '',
              hasIcon: !!(place.icon || place.categoryIcon)
            }
          }))
        };

        mapRef.current.addSource(SOURCE_IDS.NEARBY_PLACES, {
          type: 'geojson',
          data: nearbyGeoJSON
        });

        mapRef.current.addLayer({
          id: LAYER_IDS.NEARBY_PLACES,
          type: 'symbol',
          source: SOURCE_IDS.NEARBY_PLACES,
          layout: {
            'icon-image': [
              'case',
              ['get', 'hasIcon'],
              ['concat', 'nearby-icon-', ['get', 'id']],
              ''
            ],
            'icon-size': MAPBOX_CONFIG.DEFAULT_MARKER_SIZE * MAPBOX_CONFIG.NEARBY_PLACE_SIZE_FACTOR,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          },
          paint: {
            'icon-opacity': MAPBOX_CONFIG.NEARBY_PLACE_OPACITY
          },
          filter: ['get', 'hasIcon']
        });

        // Hover handlers for nearby places
        const nearbyEnterHandler = (e) => {
          mapRef.current.getCanvas().style.cursor = 'pointer';
          handleNearbyPlaceHoverRaw(e); // Trigger popup immediately on enter
        };

        const nearbyLeaveHandler = () => {
          mapRef.current.getCanvas().style.cursor = '';
          handleNearbyPlaceLeave(); // Hide popup on leave
        };

        mapRef.current.on('mouseenter', LAYER_IDS.NEARBY_PLACES, nearbyEnterHandler);
        mapRef.current.on('mouseleave', LAYER_IDS.NEARBY_PLACES, nearbyLeaveHandler);

        eventHandlersRef.current.push(
          { event: 'mouseenter', layer: LAYER_IDS.NEARBY_PLACES, handler: nearbyEnterHandler },
          { event: 'mouseleave', layer: LAYER_IDS.NEARBY_PLACES, handler: nearbyLeaveHandler }
        );

        // Add HTML markers for nearby places without custom icons
        nearbyPlaces.forEach((place) => {
          if (!place.icon && !place.categoryIcon) {
            const markerEl = document.createElement('div');
            markerEl.style.width = '12px';
            markerEl.style.height = '12px';
            markerEl.style.borderRadius = '50%';
            markerEl.style.backgroundColor = '#8b5cf6';
            markerEl.style.border = '2px solid white';
            markerEl.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
            markerEl.style.opacity = '0.7';
            markerEl.style.cursor = 'pointer';

            const marker = new mapboxgl.Marker(markerEl)
              .setLngLat(place.coordinates)
              .addTo(mapRef.current);

            // Add hover event to show popup
            markerEl.addEventListener('mouseenter', async () => {
              const { distance, duration } = await getDistanceAndDuration(
                clientBuilding.coordinates,
                place.coordinates
              );

              const popupContent = `
                <div class="p-3">
                  <h3 class="font-bold text-sm text-gray-900 mb-1">${place.title}</h3>
                  <p class="text-xs text-gray-600 mb-2">${place.categoryName || 'Nearby Place'}</p>
                  ${distance && duration ? `
                    <div class="flex items-center gap-3 text-xs text-gray-700">
                      <span>${formatDistance(distance)}</span>
                      <span>${formatDuration(duration)}</span>
                    </div>
                  ` : ''}
                </div>
              `;

              if (nearbyPlacePopupRef.current) {
                nearbyPlacePopupRef.current.remove();
              }

              const popup = new mapboxgl.Popup({
                offset: MAPBOX_CONFIG.POPUP_OFFSET,
                closeButton: false
              })
                .setLngLat(place.coordinates)
                .setHTML(popupContent)
                .addTo(mapRef.current);

              nearbyPlacePopupRef.current = popup;
              popupsRef.current.push(popup);
            });

            markerEl.addEventListener('mouseleave', () => {
              if (nearbyPlacePopupRef.current) {
                nearbyPlacePopupRef.current.remove();
                nearbyPlacePopupRef.current = null;
              }
            });

            markersRef.current.push(marker);
          }
        });
      }
    };

    updateMarkers();
  }, [landmarks, nearbyPlaces, clientBuilding, project, loadCustomIcons, getDirections, handleNearbyPlaceLeave, getDistanceAndDuration, isMapLoaded]);

  /**
   * Close landmark card handler
   */
  const handleCloseCard = useCallback(() => {
    setShowLandmarkCard(false);
    setSelectedLandmark(null);
    clearRoute();
  }, [clearRoute]);

  /**
   * Reset camera to default view (centered on client building if available)
   */
  const resetCamera = useCallback(() => {
    if (!mapRef.current) return;

    const config = getMapConfig();

    // Use client building as center if available, otherwise fall back to config center
    const targetCenter = clientBuilding?.coordinates || config.center;

    mapRef.current.flyTo({
      center: targetCenter,
      zoom: config.zoom,
      pitch: config.pitch,
      bearing: config.bearing,
      duration: 2000, // Reduced for snappier feel
      essential: true
    });
  }, [getMapConfig, clientBuilding]);

  /**
   * Expose functionality via refs or context if needed in future
   */

  return (
    <>
      <div
        ref={mapContainerRef}
        className="w-full h-full relative"
      />

      {/* Intro Button Overlay */}
      {showIntroButton && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300">
          <button
            onClick={handleStartIntro}
            className="bg-white text-black px-8 py-3 rounded-full font-bold text-lg shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            Start Experience
          </button>
        </div>
      )}
      <LandmarkCard
        landmark={selectedLandmark}
        clientBuilding={clientBuilding}
        onClose={handleCloseCard}
        isVisible={showLandmarkCard}
        theme={theme}
      />
    </>
  );
}
