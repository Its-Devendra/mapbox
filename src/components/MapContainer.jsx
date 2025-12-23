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
  getIconSize,
  easeInOutCubic
} from "@/utils/mapUtils";
import { bustCache } from '@/utils/cacheUtils';
import { useMapboxDirections } from "@/hooks/useMapboxDirections";
import { MAPBOX_CONFIG, SOURCE_IDS, LAYER_IDS } from "@/constants/mapConfig";
import useCinematicTour from "@/hooks/useCinematicTour";

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

/**
 * Calculate the Haversine distance between two geographic points
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
    mapboxStyle: 'mapbox://styles/mapbox/dark-v11',
    // Nearby tooltip defaults
    nearbyGlassEnabled: true,
    nearbyGlassBlur: 50,
    nearbyGlassSaturation: 200,
    nearbyGlassOpacity: 25,
    nearbyBorderOpacity: 35,
    nearbyPrimaryOpacity: 100,
    nearbySecondaryOpacity: 100,
    nearbyTertiaryOpacity: 100,
    nearbyPrimary: '#ffffff',
    nearbySecondary: '#1e3a8a',
    nearbyTertiary: '#3b82f6'
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

  // View Mode State (`tilted` | `top`)
  const [viewMode, setViewMode] = useState('tilted');
  const viewModeRef = useRef('tilted'); // Ref to access viewMode without causing effect re-runs
  const isFlyingRef = useRef(false); // Track if a cinematic flight is in progress

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

  // Cinematic Tour Hook
  const { startTour, stopTour, smoothFlyTo, isTourActive, currentStep, totalSteps } = useCinematicTour();

  /**
   * Get map settings with fallbacks
   */
  const getMapConfig = useCallback(() => {
    // Distance-based bounds - get max pan distance if configured
    const maxPanDistanceKm = mapSettings?.maxPanDistanceKm || null;

    const config = {
      center: [
        mapSettings?.defaultCenterLng ?? MAPBOX_CONFIG.DEFAULT_CENTER.lng,
        mapSettings?.defaultCenterLat ?? MAPBOX_CONFIG.DEFAULT_CENTER.lat
      ],
      zoom: mapSettings?.defaultZoom ?? MAPBOX_CONFIG.DEFAULT_ZOOM,
      minZoom: mapSettings?.minZoom ?? 0, // Default to 0 (fully zoomed out) if not set
      maxZoom: mapSettings?.maxZoom ?? 22, // Default to 22 (fully zoomed in) if not set
      pitch: mapSettings?.enablePitch ? 70 : 0, // Matched to 80 for Tilted Mode consistency
      bearing: 0,
      interactive: interactive,
      dragRotate: mapSettings?.enableRotation ?? true,
      pitchWithRotate: mapSettings?.enablePitch ?? true,
      // Distance-based bounds (no maxBounds - use event listener instead)
      maxPanDistanceKm: maxPanDistanceKm
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
            pitch: 70,
            bearing: 45,
            duration: 3000,
            essential: true
          });
        }

        // On audio end, start tour or zoom back out
        audio.onended = () => {
          if (landmarks && landmarks.length > 0 && clientBuilding) {
            startTour(mapRef.current, clientBuilding, landmarks);
          } else {
            resetCamera();
          }
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
          pitch: 70,
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
        const targetPitch = viewModeRef.current === 'tilted' ? 70 : 0;
        const targetBearing = viewModeRef.current === 'tilted' ? -20 : 0;

        mapRef.current.flyTo({
          center: originalViewportRef.current.center,
          zoom: originalViewportRef.current.zoom,
          pitch: targetPitch,
          bearing: targetBearing,
          duration: MAPBOX_CONFIG.ROUTE_ANIMATION_DURATION
        });
      } catch (e) {
        console.warn('Could not fly to original viewport:', e);
      }
    }

    // Deselect landmark
    setSelectedLandmark(null);
    setShowLandmarkCard(false);
  }, []); // No viewMode dependency - uses ref instead

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
        svg: bustCache(project.clientBuildingIcon),
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
          svg: bustCache(landmark.icon),
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
          svg: bustCache(iconToUse),
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
              geometry: {
                type: 'LineString',
                coordinates: []
              }
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

        // Cinematic flight to landmark instead of static fitBounds
        /*
        mapRef.current.fitBounds(bounds, {
          padding: MAPBOX_CONFIG.ROUTE_PADDING,
          duration: 2000, 
          essential: true 
        });
        */

        // Restore coordinates for animation usage
        const coordinates = data.geometry.coordinates;

        // Calculate cinematic bearing based on arrival path (last segment)
        // This ensures the camera looks "at" the building from the road we arrived on
        let bearingToLandmark = 0;
        if (coordinates && coordinates.length >= 2) {
          const last = coordinates[coordinates.length - 1];
          const prev = coordinates[coordinates.length - 2];
          // Standard Mapbox bearing: 0 = North, 90 = East
          // atan2(dx, dy) gives exactly this (angle from Y axis)
          bearingToLandmark = Math.atan2(last[0] - prev[0], last[1] - prev[1]) * 180 / Math.PI;
        } else if (destination.coordinates && clientBuilding.coordinates) {
          // Fallback to straight line bearing
          bearingToLandmark = Math.atan2(
            destination.coordinates[0] - clientBuilding.coordinates[0],
            destination.coordinates[1] - clientBuilding.coordinates[1]
          ) * 180 / Math.PI;
        }



        // Animate the route drawing - capture generation for animation closure
        const animationGeneration = currentGeneration;
        const animateRoute = () => {
          const animationDuration = viewModeRef.current === 'top' ? 2500 : 5000; // Slower in top view for better visibility
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

        // Always animate the route drawing
        animateRoute();

        // LOGIC BRANCH BASED ON VIEW MODE
        if (viewModeRef.current === 'top') {
          // TOP VIEW: Instant zoom to show both client building and landmark
          const bounds = new mapboxgl.LngLatBounds()
            .extend(clientBuilding.coordinates)
            .extend(destination.coordinates);

          mapRef.current.fitBounds(bounds, {
            padding: { top: 100, bottom: 350, left: 100, right: 100 },
            pitch: 0,
            bearing: 0,
            duration: 1000, // Smooth but quick animation
            essential: true
          });
        } else {
          // TILTED VIEW: Cinematic Flight Sequence
          isFlyingRef.current = true; // Mark flight as active

          // ═══════════════════════════════════════════════════════════════════
          // CINEMATIC FLIGHT: Professional drone-style camera movement
          // Inspired by real estate cinematography and film techniques
          // ═══════════════════════════════════════════════════════════════════

          // 1. Cinematic approach - smooth with parabolic arc (sweeping motion)
          // Duration: 5 seconds for premium, graceful feel
          await smoothFlyTo(mapRef.current, {
            center: destination.coordinates,
            zoom: 17,        // Good viewing distance
            pitch: 55,       // Dramatic but clear angle
            bearing: bearingToLandmark  // Arrive facing the landmark
          }, 5000);  // 5 seconds: Professional pacing

          // 2. Hold shot - let viewer appreciate the landmark
          // This is crucial for premium feel - never rush past content
          if (mapRef.current && routeGenerationRef.current === currentGeneration && isFlyingRef.current) {
            await new Promise(resolve => setTimeout(resolve, 1500));  // 1.5s pause
          }

          // 3. Graceful reveal - zoom out to show route context
          // Maintains 3D perspective for premium depth feel
          if (mapRef.current && routeGenerationRef.current === currentGeneration && clientBuilding?.coordinates && isFlyingRef.current) {
            isFlyingRef.current = false;

            const bounds = new mapboxgl.LngLatBounds()
              .extend(clientBuilding.coordinates)
              .extend(destination.coordinates);

            mapRef.current.fitBounds(bounds, {
              padding: { top: 140, bottom: 340, left: 140, right: 140 },
              pitch: 50,  // Maintain 3D depth for premium feel
              bearing: bearingToLandmark * 0.3,  // Subtle rotation adds visual interest
              duration: 3000,  // 3 seconds for smooth, elegant transition
              essential: true
            });
          }
          isFlyingRef.current = false;
        }
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

      // Theme Styles
      const isGlass = theme.nearbyGlassEnabled !== false; // Default true
      const bgOpacity = isGlass ? (theme.nearbyGlassOpacity ?? 25) : (theme.nearbyPrimaryOpacity ?? 100);
      const blur = theme.nearbyGlassBlur ?? 50;
      const saturation = theme.nearbyGlassSaturation ?? 200;
      const borderOpacity = isGlass ? (theme.nearbyBorderOpacity ?? 35) : (theme.nearbyTertiaryOpacity ?? 100);

      const bgColor = theme.nearbyPrimary || '#ffffff';
      const textColor = theme.nearbySecondary || '#1e3a8a';
      const accentColor = theme.nearbyTertiary || categoryColor;

      // Helper for RGBA
      const toRgba = (hex, alpha) => {
        if (!hex) return 'rgba(255,255,255,0.9)';
        let c;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
          c = hex.substring(1).split('');
          if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
          }
          c = '0x' + c.join('');
          return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + (alpha / 100) + ')';
        }
        return hex;
      };

      const popupStyle = `
        background-color: ${toRgba(bgColor, bgOpacity)} !important;
        backdrop-filter: ${isGlass ? `blur(${blur}px) saturate(${saturation}%)` : 'none'} !important;
        -webkit-backdrop-filter: ${isGlass ? `blur(${blur}px) saturate(${saturation}%)` : 'none'} !important;
        border: 1px solid ${toRgba(accentColor, borderOpacity)} !important;
        color: ${textColor} !important;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      `;

      // Create unique class for this popup instance to avoid conflicts if needed, though mostly uniform
      const popupClass = 'nearby-popup-theme';

      // CSS to override Mapbox defaults - cleaner than inline styling on elements
      const overrideStyles = `
        <style>
          .nearby-popup-theme .mapboxgl-popup-content {
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .nearby-popup-theme .mapboxgl-popup-tip {
            border-top-color: ${toRgba(accentColor, borderOpacity)} !important;
            opacity: ${isGlass ? (bgOpacity / 100) : 1} !important;
             /* Optional: Hide tip completely for pure glass look if prefered by user, but keeping it styled for now */
          }
           .nearby-popup-theme {
             z-index: 50 !important;
          }
        </style>
      `;

      let popupContent = `
        ${overrideStyles}
        <div class="nearby-popup-content" style="${popupStyle.replace(/\n/g, '')}">
          <div class="h-1.5" style="background-color: ${accentColor}"></div>
          <div class="p-4 pt-3">
             <div class="flex items-start justify-between gap-2 mb-1">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider leading-none" 
                      style="color: ${textColor}; background-color: ${toRgba(accentColor, 12)}; border: 1px solid ${toRgba(accentColor, 20)}">
                  ${place.categoryName || 'Place'}
                </span>
             </div>
            <h3 class="font-bold text-sm leading-tight mb-2" style="color: ${textColor}">${place.title}</h3>
            
            <div class="flex items-center gap-2 text-xs opacity-75" style="color: ${textColor}">
              <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span class="font-medium">Calculating...</span>
            </div>
          </div>
        </div>
      `;

      // Create and show popup immediately
      const popup = new mapboxgl.Popup({
        offset: MAPBOX_CONFIG.POPUP_OFFSET,
        closeButton: false,
        maxWidth: "300px",
        className: popupClass
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
            ${overrideStyles}
            <div class="nearby-popup-content" style="${popupStyle.replace(/\n/g, '')}">
              <div class="h-1.5" style="background-color: ${accentColor}"></div>
              <div class="p-4 pt-3">
                <div class="flex items-start justify-between gap-2 mb-1">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider leading-none" 
                          style="color: ${textColor}; background-color: ${toRgba(accentColor, 12)}; border: 1px solid ${toRgba(accentColor, 20)}">
                      ${place.categoryName || 'Place'}
                    </span>
                 </div>
                <h3 class="font-bold text-sm leading-tight mb-2.5" style="color: ${textColor}">${place.title}</h3>
                
                <div class="flex items-center gap-3 text-xs" style="color: ${textColor}; opacity: 0.9;">
                  <span class="flex items-center gap-1.5 bg-black/5 px-2 py-1 rounded-md">
                    <svg class="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <circle cx="12" cy="11" r="2" stroke-width="1.5"/>
                    </svg>
                    <span class="font-semibold">${formatDistance(distance)}</span>
                  </span>
                  <span class="flex items-center gap-1.5 bg-black/5 px-2 py-1 rounded-md">
                    <svg class="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" stroke-width="1.5"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6l4 2"/>
                    </svg>
                    <span class="font-semibold">${formatDuration(duration)}</span>
                  </span>
                </div>
              </div>
            </div>
          `;

          popup.setHTML(updatedContent);

          // Re-apply transparency fix as setHTML might reset content wrapper content? 
          // Actually setHTML updates innerHTML of content wrapper, wrapper itself stays.
          // But just in case.
        }
      } catch (distanceError) {
        console.error('Error calculating distance:', distanceError);
        // Popup already shows "Calculating..." which is fine, or we could update to "Error"
        if (nearbyPlacePopupRef.current === popup) {
          const errorContent = `
            ${overrideStyles}
            <div class="nearby-popup-content" style="${popupStyle.replace(/\n/g, '')}">
              <div class="h-1.5" style="background-color: ${accentColor}"></div>
              <div class="p-4 pt-3">
                <div class="flex items-start justify-between gap-2 mb-1">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider leading-none" 
                          style="color: ${accentColor}; background-color: ${toRgba(accentColor, 12)}; border: 1px solid ${toRgba(accentColor, 20)}">
                      ${place.categoryName || 'Place'}
                    </span>
                 </div>
                <h3 class="font-bold text-sm leading-tight" style="color: ${textColor}">${place.title}</h3>
              </div>
            </div>
          `;
          popup.setHTML(errorContent);
        }
      }
    } catch (error) {
      console.error('Error showing nearby place tooltip:', error);
    }
  }, [nearbyPlaces, clientBuilding, getDistanceAndDuration, theme]);



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

    // Check if 3D buildings are enabled in settings (default to true)
    const enable3D = mapSettings?.enable3DBuildings ?? true;

    // If disabled, remove layer if it exists and return
    if (!enable3D) {
      if (mapRef.current.getLayer(LAYER_IDS.BUILDINGS_3D)) {
        mapRef.current.removeLayer(LAYER_IDS.BUILDINGS_3D);
      }
      return;
    }

    // Get min zoom from settings (default to 15)
    // Mapbox data usually starts at 13-14, but we allow user to set it
    const minZoom = mapSettings?.buildings3DMinZoom ?? 15;

    try {
      // Check if composite source exists (available in most Mapbox styles)
      if (mapRef.current.getSource('composite')) {

        // If layer exists but with different zoom, remove it to re-add with new settings
        if (mapRef.current.getLayer(LAYER_IDS.BUILDINGS_3D)) {
          const currentLayer = mapRef.current.getLayer(LAYER_IDS.BUILDINGS_3D);
          if (currentLayer.minzoom !== minZoom) {
            mapRef.current.removeLayer(LAYER_IDS.BUILDINGS_3D);
          } else {
            // Layer exists and settings match, nothing to do
            return;
          }
        }

        // Only add if layer doesn't already exist (or was just removed)
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
            minzoom: minZoom,
            paint: {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                minZoom,
                0,
                minZoom + 0.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                minZoom,
                0,
                minZoom + 0.05,
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
  }, [mapSettings]);

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
      pitch: 0, // Start flat, animate to tilted during transition
      bearing: 0, // Start neutral, animate to final bearing during transition
      dragRotate: config.dragRotate,
      pitchWithRotate: config.pitchWithRotate
      // DO NOT apply maxBounds here - apply AFTER animation completes to prevent freeze
    });

    // Debug log map settings
    console.log('🗺️ Map Settings:', {
      center: config.center,
      zoom: config.zoom,
      minZoom: config.minZoom,
      maxZoom: config.maxZoom,
      maxBounds: config.maxBounds,
      useDefaultCamera: mapSettings?.useDefaultCameraAfterLoad
    });

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
        zoom: config.zoom,
        pitch: config.pitch || 70,
        bearing: config.bearing || -20
      };

      // Check if we should use default camera or standard animation
      const useDefaultCamera = mapSettings?.useDefaultCameraAfterLoad;

      // Debug: Log animation decision
      console.log('🚀 Animation Decision:', {
        useDefaultCamera,
        targetCenter,
        configZoom: config.zoom,
        duration: duration,
        hasMapSettings: !!mapSettings
      });

      // Distance-based bounds: Setup move event listener to restrict panning
      const setupDistanceBounds = () => {
        if (!config.maxPanDistanceKm || !clientBuilding?.coordinates) {
          console.log('📍 Distance bounds: Not configured or no client building');
          return;
        }

        const maxDistance = config.maxPanDistanceKm;
        // Use custom panCenter if configured, otherwise fall back to client building
        const centerLng = mapSettings?.panCenterLng ?? clientBuilding.coordinates[0];
        const centerLat = mapSettings?.panCenterLat ?? clientBuilding.coordinates[1];
        let isEnforcing = false; // Prevent recursive calls

        console.log('🔒 Setting up distance-based pan restriction:', maxDistance, 'km from', [centerLng, centerLat]);

        const enforceDistanceBound = () => {
          if (isEnforcing || !mapRef.current) return;

          const currentCenter = mapRef.current.getCenter();
          const distance = haversineDistance(centerLat, centerLng, currentCenter.lat, currentCenter.lng);

          if (distance > maxDistance) {
            isEnforcing = true;

            // Calculate the point on the boundary circle (edge of allowed area)
            const ratio = maxDistance / distance;
            const newLat = centerLat + (currentCenter.lat - centerLat) * ratio;
            const newLng = centerLng + (currentCenter.lng - centerLng) * ratio;

            // Instantly jump to the edge - no animation, hard boundary
            mapRef.current.jumpTo({ center: [newLng, newLat] });

            // Reset flag on next frame
            requestAnimationFrame(() => { isEnforcing = false; });
          }
        };

        // Listen to MOVE event (during pan) for hard boundary instead of moveend (after pan)
        mapRef.current.on('move', enforceDistanceBound);

        // Store handler for cleanup
        eventHandlersRef.current.push({ event: 'move', layer: null, handler: enforceDistanceBound });
      };

      // Convert duration to milliseconds if it's in seconds (less than 100 = seconds)
      const durationMs = duration < 100 ? duration * 1000 : duration;

      // If useDefaultCamera is enabled, fly to the configured default camera position
      if (useDefaultCamera && mapSettings) {
        console.log('🎥 Using default camera position from map settings');
        setTimeout(() => {
          if (!mapRef.current) return;
          mapRef.current.flyTo({
            center: [mapSettings.defaultCenterLng, mapSettings.defaultCenterLat],
            zoom: mapSettings.defaultZoom,
            pitch: mapSettings.defaultPitch || 70,
            bearing: mapSettings.defaultBearing || -20,
            duration: durationMs,
            essential: true
          });
          // Setup distance-based pan restriction after animation
          setTimeout(setupDistanceBounds, durationMs + 500);
        }, 500);
      } else {
        // ALWAYS play globe → client building animation (regardless of intro audio)
        console.log('📍 ANIMATING: Globe → Client Building', { center: targetCenter, zoom: config.zoom, durationMs });
        setTimeout(() => {
          if (!mapRef.current) return;
          mapRef.current.flyTo({
            center: targetCenter,
            zoom: config.zoom,
            pitch: 70,
            bearing: -20,
            duration: durationMs,
            essential: true
          });
          // Setup distance-based pan restriction after animation
          setTimeout(setupDistanceBounds, durationMs + 500);
        }, 500);
      }

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
        // SPECIAL LOGIC FOR TILTED MODE INTERRUPTION
        if (viewMode === 'tilted' && isFlyingRef.current) {
          console.log('Interrupted flight! Stopping and showing route.');
          // 1. Stop current flight/animation
          stopTour(mapRef.current);
          isFlyingRef.current = false;

          // 2. Immediately snap to Top View showing route
          if (activeLandmarkRef.current && clientBuilding?.coordinates) {
            const bounds = new mapboxgl.LngLatBounds()
              .extend(clientBuilding.coordinates)
              .extend(activeLandmarkRef.current.coordinates);

            mapRef.current.fitBounds(bounds, {
              padding: { top: 150, bottom: 350, left: 150, right: 150 },
              pitch: 0,
              bearing: 0,
              duration: 1000,
              essential: true
            });
          }
          return; // Stop here, do not clear route yet
        }

        // Standard Clear Logic (if not flying or in Top mode)
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
   * Handle View Mode Switching
   * NOTE: Skip on initial load - the initial flyTo handles the first animation
   */
  const hasInitialAnimationRun = useRef(false);

  useEffect(() => {
    // Keep ref in sync with state
    viewModeRef.current = viewMode;

    if (!mapRef.current || !isMapLoaded) return;

    // Skip the first run - let the initial flyTo handle the combined animation
    if (!hasInitialAnimationRun.current) {
      hasInitialAnimationRun.current = true;
      return;
    }

    if (viewMode === 'top') {
      // Switch to Top View (2D) - camera transitions from tilted to straight down
      mapRef.current.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1000,
        essential: true
      });
    } else {
      // Switch to Tilted View (3D) - camera transitions to dramatic angle
      mapRef.current.easeTo({
        pitch: 70,
        bearing: -20,
        duration: 1000,
        essential: true
      });
    }
  }, [viewMode, isMapLoaded]);

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
        LAYER_IDS.CLIENT_BUILDING,
        'client-building-core',
        'client-building-glow',
        'client-building-pulse-1',
        'client-building-pulse-2',
        'client-building-pulse-3'
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
            'icon-ignore-placement': true,
            'icon-anchor': 'bottom'
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
            'icon-ignore-placement': true,
            'icon-anchor': 'bottom'
          },
          paint: {
            'icon-opacity': MAPBOX_CONFIG.NEARBY_PLACE_OPACITY
          },
          filter: ['get', 'hasIcon']
        });

        // Hover handlers for nearby places (desktop)
        const nearbyEnterHandler = (e) => {
          mapRef.current.getCanvas().style.cursor = 'pointer';
          handleNearbyPlaceHoverRaw(e); // Trigger popup immediately on enter
        };

        const nearbyLeaveHandler = () => {
          mapRef.current.getCanvas().style.cursor = '';
          handleNearbyPlaceLeave(); // Hide popup on leave
        };

        // Click/tap handler for nearby places (touch devices + desktop)
        const nearbyClickHandler = (e) => {
          // On touch devices, e.originalEvent will exist
          // Toggle popup on tap - if popup is showing for this place, hide it, else show it
          const feature = e.features?.[0];
          if (!feature) return;

          const placeId = feature.properties.id;

          // If popup is already showing for this place, close it
          if (nearbyPlacePopupRef.current && nearbyPlacePopupRef.current.placeId === placeId) {
            handleNearbyPlaceLeave();
            return;
          }

          // Otherwise, show the popup (same as hover behavior)
          handleNearbyPlaceHoverRaw(e);
        };

        mapRef.current.on('mouseenter', LAYER_IDS.NEARBY_PLACES, nearbyEnterHandler);
        mapRef.current.on('mouseleave', LAYER_IDS.NEARBY_PLACES, nearbyLeaveHandler);
        mapRef.current.on('click', LAYER_IDS.NEARBY_PLACES, nearbyClickHandler);

        eventHandlersRef.current.push(
          { event: 'mouseenter', layer: LAYER_IDS.NEARBY_PLACES, handler: nearbyEnterHandler },
          { event: 'mouseleave', layer: LAYER_IDS.NEARBY_PLACES, handler: nearbyLeaveHandler },
          { event: 'click', layer: LAYER_IDS.NEARBY_PLACES, handler: nearbyClickHandler }
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

            // Shared function to show popup for this place
            const showPlacePopup = async () => {
              const categoryColor = place.categoryColor || '#8b5cf6';

              // Show loading popup immediately
              if (nearbyPlacePopupRef.current) {
                nearbyPlacePopupRef.current.remove();
              }

              let popupContent = `
                <div class="bg-white rounded-lg shadow-lg overflow-hidden" style="min-width: 200px; max-width: 280px;">
                  <div class="h-1.5" style="background-color: ${categoryColor}"></div>
                  <div class="p-4">
                    <h3 class="font-bold text-sm text-gray-900 leading-snug">${place.title}</h3>
                    <span class="inline-block text-[8px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide mt-1.5 mb-2.5" style="color: ${categoryColor}; background-color: ${categoryColor}10">
                      ${place.categoryName || 'Place'}
                    </span>
                    <div class="flex items-center gap-2 text-xs text-gray-400">
                      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="${categoryColor}" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                      <span>Calculating distance...</span>
                    </div>
                  </div>
                </div>
              `;

              const popup = new mapboxgl.Popup({
                offset: MAPBOX_CONFIG.POPUP_OFFSET,
                closeButton: true,
                closeOnClick: false,
                className: 'nearby-popup-premium'
              })
                .setLngLat(place.coordinates)
                .setHTML(popupContent)
                .addTo(mapRef.current);

              popup.placeId = place.id;
              nearbyPlacePopupRef.current = popup;
              popupsRef.current.push(popup);

              // Get distance asynchronously
              try {
                const result = await getDistanceAndDuration(
                  clientBuilding.coordinates,
                  place.coordinates
                );

                if (result?.distance && result?.duration && nearbyPlacePopupRef.current === popup) {
                  const updatedContent = `
                    <div class="bg-white rounded-lg shadow-lg overflow-hidden" style="min-width: 200px; max-width: 280px;">
                      <div class="h-1.5" style="background-color: ${categoryColor}"></div>
                      <div class="p-4">
                        <h3 class="font-bold text-sm text-gray-900 leading-snug">${place.title}</h3>
                        <span class="inline-block text-[8px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide mt-1.5 mb-2.5" style="color: ${categoryColor}; background-color: ${categoryColor}10">
                          ${place.categoryName || 'Place'}
                        </span>
                        <div class="flex items-center gap-4 text-xs text-gray-600">
                          <span class="flex items-center gap-1.5">
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                              <circle cx="12" cy="11" r="2" stroke-width="1.5"/>
                            </svg>
                            ${formatDistance(result.distance)}
                          </span>
                          <span class="flex items-center gap-1.5">
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="9" stroke-width="1.5"/>
                              <path d="M12 6v6l4 2" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            ${formatDuration(result.duration)}
                          </span>
                        </div>
                      </div>
                    </div>
                  `;
                  popup.setHTML(updatedContent);
                }
              } catch (err) {
                console.error('Error getting distance:', err);
              }
            };

            // Click/tap handler for touch devices
            markerEl.addEventListener('click', (e) => {
              e.stopPropagation();
              // Toggle: if popup is showing for this place, hide it, else show it
              if (nearbyPlacePopupRef.current && nearbyPlacePopupRef.current.placeId === place.id) {
                nearbyPlacePopupRef.current.remove();
                nearbyPlacePopupRef.current = null;
              } else {
                showPlacePopup();
              }
            });

            // Add hover event to show popup (desktop)
            markerEl.addEventListener('mouseenter', () => {
              showPlacePopup();
            });

            markerEl.addEventListener('mouseleave', () => {
              // Only hide on mouseleave if it's not a touch interaction
              // We check if the popup was opened recently to avoid closing on touch
              setTimeout(() => {
                if (nearbyPlacePopupRef.current && nearbyPlacePopupRef.current.placeId === place.id) {
                  nearbyPlacePopupRef.current.remove();
                  nearbyPlacePopupRef.current = null;
                }
              }, 100);
            });

            markersRef.current.push(marker);
          }
        });
      }

      // Add client building marker LAST so it appears on top of other markers (higher z-index)
      if (clientBuilding) {
        // Create hover tooltip popup with logo - positioned well above icon
        const clientHoverPopup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: 'client-building-tippy',
          anchor: 'bottom',
          offset: [0, -50] // Move up 50px to clear the icon height (prevents overlap)
        });

        // Build tooltip content with logo if available
        // Note: clientBuildingIcon is raw SVG text, not a URL. Use project.logo for image display.
        const logoUrl = project?.logo; // Use project logo URL for tooltip image
        const svgIcon = project?.clientBuildingIcon; // This is raw SVG, use for inline rendering if needed

        let tooltipContent;
        if (logoUrl) {
          // Premium White Card Background for Logo
          // Handles any logo shape (long/tall) with graceful padding and centering
          tooltipContent = `
            <div class="bg-white rounded-lg shadow-xl p-3 flex items-center justify-center border border-gray-100" style="min-width: 120px; min-height: 50px;">
              <img 
                src="${logoUrl}" 
                alt="${clientBuilding.name}" 
                style="
                  height: 40px;
                  width: auto;
                  max-width: 160px;
                  object-fit: contain;
                  display: block;
                " 
              />
            </div>
          `;
        } else if (svgIcon && svgIcon.includes('<svg')) {
          // Fallback SVG display in white card
          tooltipContent = `
            <div class="bg-white rounded-lg shadow-xl p-3 flex items-center justify-center border border-gray-100">
              <div style="height: 36px; width: 36px; display: flex; align-items: center; justify-content: center;">
                ${svgIcon}
              </div>
            </div>
          `;
        } else {
          // Text fallback
          tooltipContent = `
            <div class="bg-white rounded-lg shadow-xl p-3 px-4 border border-gray-100">
              <span class="font-bold text-gray-800 text-sm whitespace-nowrap">${clientBuilding.name}</span>
            </div>
          `;
        }




        // Premium client building implementation - stands out as center of attraction
        // 1. Pulsing circle on ground
        // 2. Larger icon than landmarks
        // 3. Subtle icon size animation

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

        // Premium "Golden Beacon" Effect
        // Concept: A radiating light source from the ground, making the building the "center of energy"

        // 1. Base Glow: Large, soft, static light on the ground (The Foundation)
        // Uses theme.primary for dynamic coloring
        mapRef.current.addLayer({
          id: 'client-building-glow',
          type: 'circle',
          source: SOURCE_IDS.CLIENT_BUILDING,
          paint: {
            'circle-radius': 35, // Large diffusion
            'circle-color': theme.primary || '#fbbf24', // Use primary theme color
            'circle-opacity': 0.15,
            'circle-blur': 1, // Maximum blur for soft light effect
            'circle-pitch-alignment': 'map'
          }
        });

        // 2. Core Hotspot: Intense small point at the center (The Source)
        mapRef.current.addLayer({
          id: 'client-building-core',
          type: 'circle',
          source: SOURCE_IDS.CLIENT_BUILDING,
          paint: {
            'circle-radius': 4,
            'circle-color': '#ffffff', // White hot center
            'circle-opacity': 0.8,
            'circle-blur': 0.5,
            'circle-pitch-alignment': 'map'
          }
        });

        // 3. Pulse Rings: 3 overlapping ripples for complex "breathing" motion
        // Ring 1 (Inner/Fast)
        mapRef.current.addLayer({
          id: 'client-building-pulse-1',
          type: 'circle',
          source: SOURCE_IDS.CLIENT_BUILDING,
          paint: {
            'circle-radius': 5,
            'circle-color': 'transparent',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': theme.primary || '#f59e0b', // Use primary theme color
            'circle-stroke-opacity': 0,
            'circle-pitch-alignment': 'map'
          }
        });

        // Ring 2 (Middle/Medium)
        mapRef.current.addLayer({
          id: 'client-building-pulse-2',
          type: 'circle',
          source: SOURCE_IDS.CLIENT_BUILDING,
          paint: {
            'circle-radius': 5,
            'circle-color': 'transparent',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': theme.primary || '#fbbf24', // Use primary theme color
            'circle-stroke-opacity': 0,
            'circle-pitch-alignment': 'map'
          }
        });

        // Ring 3 (Outer/Slow)
        mapRef.current.addLayer({
          id: 'client-building-pulse-3',
          type: 'circle',
          source: SOURCE_IDS.CLIENT_BUILDING,
          paint: {
            'circle-radius': 5,
            'circle-color': 'transparent',
            'circle-stroke-width': 2,
            'circle-stroke-color': theme.primary || '#d97706', // Use primary theme color
            'circle-stroke-opacity': 0,
            'circle-pitch-alignment': 'map'
          }
        });

        // Animation Loop - Premium "Radar" Logic
        // Uses performance.now() for smooth, frame-rate independent animation to prevent jitter

        const animatePremiumPulse = (timestamp) => {
          if (!mapRef.current || !mapRef.current.getLayer('client-building-pulse-1')) return;

          // Timestamp might be undefined on first call if manually invoked
          const safeTime = (timestamp || performance.now());
          if (isNaN(safeTime)) return;

          const time = safeTime / 1000; // Time in seconds

          // Helper for loop info: (progress 0-1)
          // Speed factor: 0.8 matches the desired "4" tempo roughly (1 cycle ~1.25s)
          const getProgress = (offset, speed) => {
            return ((time * speed) + offset) % 1;
          };

          // Easing function: Cubic ease-out for expanding (fast start, slow end)
          const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

          // Easing for opacity: Fade in quickly, long hold, fade out slowly
          const getOpacity = (t) => {
            if (t < 0.2) return t * 5; // Fade in
            if (t > 0.7) return (1 - t) * 3.33; // Fade out
            return 1; // Hold
          };

          // --- Ring 1 Configuration (Fast, frequent) ---
          const p1 = getProgress(0, 0.8);
          const r1 = 2 + (25 * easeOutCubic(p1));
          const o1 = 0.8 * getOpacity(p1);

          // --- Ring 2 Configuration (Medium, main wave) ---
          const p2 = getProgress(0.4, 0.5);
          const r2 = 2 + (40 * easeOutCubic(p2));
          const o2 = 0.6 * getOpacity(p2);

          // --- Ring 3 Configuration (Slow, distant echo) ---
          const p3 = getProgress(0.7, 0.3);
          const r3 = 2 + (55 * easeOutCubic(p3));
          const o3 = 0.4 * getOpacity(p3);

          try {
            // Apply updates
            mapRef.current.setPaintProperty('client-building-pulse-1', 'circle-radius', r1);
            mapRef.current.setPaintProperty('client-building-pulse-1', 'circle-stroke-opacity', o1);

            mapRef.current.setPaintProperty('client-building-pulse-2', 'circle-radius', r2);
            mapRef.current.setPaintProperty('client-building-pulse-2', 'circle-stroke-opacity', o2);

            mapRef.current.setPaintProperty('client-building-pulse-3', 'circle-radius', r3);
            mapRef.current.setPaintProperty('client-building-pulse-3', 'circle-stroke-opacity', o3);

            // Subtle breathe on the static glow
            const glowPulse = 35 + Math.sin(time * 2) * 2;
            mapRef.current.setPaintProperty('client-building-glow', 'circle-radius', glowPulse);

            // Icon "Breathing" Animation - Smooth Time-Based
            // Oscillates between 1.25 and 1.56 size (+25%)
            if (mapRef.current.getLayer(LAYER_IDS.CLIENT_BUILDING)) {
              const baseSize = MAPBOX_CONFIG.DEFAULT_MARKER_SIZE * 1.25;

              // Sine wave from 0 to 1
              // Speed 3 puts it in a nice "alert" rhythm
              const breathe = (Math.sin(time * 3) + 1) / 2;

              // Exact +25% scale as requested
              const newSize = baseSize + (baseSize * 0.25 * breathe);

              mapRef.current.setLayoutProperty(LAYER_IDS.CLIENT_BUILDING, 'icon-size', newSize);
            }

          } catch (e) { return; } // Safety

          requestAnimationFrame(animatePremiumPulse);
        };

        animatePremiumPulse();

        // Add symbol layer for the icon - anchor at BOTTOM so it sits above the pulse
        if (svgIcon && mapRef.current.hasImage('client-building-icon')) {
          mapRef.current.addLayer({
            id: LAYER_IDS.CLIENT_BUILDING,
            type: 'symbol',
            source: SOURCE_IDS.CLIENT_BUILDING,
            layout: {
              'icon-image': 'client-building-icon',
              'icon-size': MAPBOX_CONFIG.DEFAULT_MARKER_SIZE * 1.25,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-anchor': 'bottom', // Icon base at coordinate, pulse appears at ground
              'icon-offset': [0, 5] // Slight offset up so pulse is visible
            }
          });
        } else {
          // Fallback: use a more prominent circle
          mapRef.current.addLayer({
            id: LAYER_IDS.CLIENT_BUILDING,
            type: 'circle',
            source: SOURCE_IDS.CLIENT_BUILDING,
            paint: {
              'circle-radius': 12,
              'circle-color': '#f59e0b',
              'circle-stroke-width': 3,
              'circle-stroke-color': '#ffffff'
            }
          });
        }

        // Click handler
        const clientClickHandler = () => {
          if (project?.clientBuildingUrl) {
            window.open(project.clientBuildingUrl, '_blank', 'noopener,noreferrer');
          }
        };

        // Hover handlers - show tooltip with logo
        const clientEnterHandler = () => {
          mapRef.current.getCanvas().style.cursor = 'pointer';
          clientHoverPopup
            .setLngLat(clientBuilding.coordinates)
            .setHTML(tooltipContent)
            .addTo(mapRef.current);
        };

        const clientLeaveHandler = () => {
          mapRef.current.getCanvas().style.cursor = '';
          clientHoverPopup.remove();
        };

        // Register handlers on all layers
        mapRef.current.on('click', LAYER_IDS.CLIENT_BUILDING, clientClickHandler);
        mapRef.current.on('mouseenter', LAYER_IDS.CLIENT_BUILDING, clientEnterHandler);
        mapRef.current.on('mouseleave', LAYER_IDS.CLIENT_BUILDING, clientLeaveHandler);

        mapRef.current.on('click', 'client-building-core', clientClickHandler);
        mapRef.current.on('mouseenter', 'client-building-core', clientEnterHandler);
        mapRef.current.on('click', 'client-building-glow', clientClickHandler);
        mapRef.current.on('mouseenter', 'client-building-glow', clientEnterHandler);

        eventHandlersRef.current.push(
          { event: 'click', layer: LAYER_IDS.CLIENT_BUILDING, handler: clientClickHandler },
          { event: 'mouseenter', layer: LAYER_IDS.CLIENT_BUILDING, handler: clientEnterHandler },
          { event: 'mouseleave', layer: LAYER_IDS.CLIENT_BUILDING, handler: clientLeaveHandler },
          { event: 'click', layer: 'client-building-core', handler: clientClickHandler },
          { event: 'mouseenter', layer: 'client-building-core', handler: clientEnterHandler },
          { event: 'click', layer: 'client-building-glow', handler: clientClickHandler },
          { event: 'mouseenter', layer: 'client-building-glow', handler: clientEnterHandler }
        );
      }
    };

    updateMarkers();
  }, [landmarks, nearbyPlaces, clientBuilding, project, loadCustomIcons, getDirections, handleNearbyPlaceLeave, getDistanceAndDuration, isMapLoaded, theme]);

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
  /**
   * Reset camera to default view (centered on client building if available)
   */
  const resetCamera = useCallback(() => {
    if (!mapRef.current) return;

    const config = getMapConfig();

    // Use client building as center if available, otherwise fall back to config center
    const targetCenter = clientBuilding?.coordinates || config.center;

    // Determine pitch/bearing based on viewMode
    // If we're in 'tilted' mode, return to a nice 3D angle (60 pitch, -20 bearing)
    // If 'top', use standard or 0
    const targetPitch = viewModeRef.current === 'tilted' ? 70 : (config.pitch || 0);
    const targetBearing = viewModeRef.current === 'tilted' ? -20 : (config.bearing || 0);

    mapRef.current.flyTo({
      center: targetCenter,
      zoom: config.zoom,
      pitch: targetPitch,
      bearing: targetBearing,
      duration: 2000,
      essential: true
    });
  }, [getMapConfig, clientBuilding]); // No viewMode dependency - uses ref instead

  /**
   * Expose functionality via refs or context if needed in future
   */

  return (
    <>
      <div
        ref={mapContainerRef}
        className="w-full h-full relative"
      />

      {/* Cinematic Tour Controls */}
      {isTourActive && (
        <div className="absolute top-24 right-6 z-40 flex flex-col items-end gap-2 animate-fade-in">
          <div className="bg-black/60 backdrop-blur-md text-white px-5 py-3 rounded-xl border border-white/10 shadow-2xl">
            <div className="text-[10px] text-gray-300 uppercase tracking-[0.2em] mb-1 font-medium">Cinematic Tour</div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="font-mono text-xl font-bold tracking-wider">{currentStep} <span className="text-white/40 text-sm">/</span> {totalSteps}</span>
            </div>
          </div>

          <button
            onClick={() => stopTour(mapRef.current)}
            className="group flex items-center gap-2 bg-black/40 hover:bg-red-500/80 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-white/10 hover:border-red-500/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
          >
            <span className="text-xs font-semibold uppercase tracking-wider">Skip Tour</span>
            <svg className="w-3 h-3 text-white/70 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* View Mode Toggle - Uses filter glass theme controls */}
      <div
        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-40 flex rounded-lg p-1 border shadow-lg"
        style={{
          backgroundColor: theme.filterGlassEnabled !== false
            ? `${theme.filterTertiary || theme.tertiary || '#ffffff'}${Math.round((theme.filterGlassOpacity ?? 25) * 2.55).toString(16).padStart(2, '0')}`
            : `${theme.filterTertiary || theme.tertiary || '#ffffff'}${Math.round((theme.filterTertiaryOpacity ?? 100) * 2.55).toString(16).padStart(2, '0')}`,
          borderColor: `${theme.filterTertiary || theme.tertiary || '#ffffff'}${Math.round((theme.filterBorderOpacity ?? 35) * 2.55).toString(16).padStart(2, '0')}`,
          ...(theme.filterGlassEnabled !== false && {
            backdropFilter: `blur(${theme.filterGlassBlur ?? 50}px) saturate(${theme.filterGlassSaturation ?? 200}%)`,
            WebkitBackdropFilter: `blur(${theme.filterGlassBlur ?? 50}px) saturate(${theme.filterGlassSaturation ?? 200}%)`,
          }),
        }}
      >
        <button
          onClick={() => setViewMode('tilted')}
          className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer"
          style={{
            backgroundColor: viewMode === 'tilted' ? (theme.filterPrimary || theme.primary) : 'transparent',
            color: viewMode === 'tilted' ? (theme.filterSecondary || theme.secondary) : 'rgba(255,255,255,0.7)',
            boxShadow: viewMode === 'tilted' ? '0 2px 10px rgba(0, 0, 0, 0.15)' : 'none',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          3D Tilted
        </button>
        <button
          onClick={() => setViewMode('top')}
          className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer"
          style={{
            backgroundColor: viewMode === 'top' ? (theme.filterPrimary || theme.primary) : 'transparent',
            color: viewMode === 'top' ? (theme.filterSecondary || theme.secondary) : 'rgba(255,255,255,0.7)',
            boxShadow: viewMode === 'top' ? '0 2px 10px rgba(0, 0, 0, 0.15)' : 'none',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          2D Top
        </button>
      </div>

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
