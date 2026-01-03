"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { toast } from 'react-toastify';
import LandmarkCard from "./LandmarkCard";
import Compass from "./Compass";
import FullScreenButton from "./FullScreenButton";
import RecenterButton from "./RecenterButton";
import MapControlsContainer from "./MapControlsContainer";
import ChatContainer from "./chat/ChatContainer";
import dynamic from 'next/dynamic';
// Dynamically import RoadTracer to avoid blocking main thread with initial parsing
// even though we removed Turf, this is a safety optimization
const RoadTracer = dynamic(() => import('./RoadTracer'), { ssr: false });
// import RoadTracer from "./RoadTracer"; // STATIC IMPORT REMOVED
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
import useMapKeyboardShortcuts from "@/hooks/useMapKeyboardShortcuts";
import { useMarkerManager } from "@/hooks/useMarkerManager";

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
  landmarkAudio = null, // New prop for landmark audio (narration)
  arrivalAudio = null, // Custom arrival sound effect
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

  // Filter State exposed to Chat
  const [externalCategoryFilter, setExternalCategoryFilter] = useState(null); // 'educations', 'hospitals', etc.

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
  /* State must be declared before useEffect usage */
  const [isInitialCameraAnimationComplete, setIsInitialCameraAnimationComplete] = useState(false);
  const [isRouteAnimationComplete, setIsRouteAnimationComplete] = useState(false);

  // Cinematic Phase Tracking (for coordinated visual effects)
  // Phases: 'idle' | 'approaching' | 'tracing' | 'revealing' | 'complete'
  const [cinematicPhase, setCinematicPhase] = useState('idle');

  // Accessibility: Reduced Motion Preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // User Interruption Tracking
  const userInterruptedRef = useRef(false);

  // Detect reduced motion preference on mount
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Performance Tier Detection (for adaptive quality)
  const [performanceTier, setPerformanceTier] = useState('high'); // 'low' | 'high'

  useEffect(() => {
    // Detect device capability
    const detectPerformanceTier = () => {
      const cores = navigator.hardwareConcurrency || 2;
      const memory = navigator.deviceMemory || 4; // GB
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // Low-end: < 4 cores, < 4GB RAM, or mobile
      if (cores < 4 || memory < 4 || isMobile) {
        console.log('📊 Performance Tier: LOW (cores:', cores, ', memory:', memory, 'GB, mobile:', isMobile, ')');
        setPerformanceTier('low');
      } else {
        console.log('📊 Performance Tier: HIGH (cores:', cores, ', memory:', memory, 'GB)');
        setPerformanceTier('high');
      }
    };

    detectPerformanceTier();
  }, []);

  // Screen Reader Announcements (accessibility)
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState('');

  // Announce phase changes for screen readers
  useEffect(() => {
    const announcements = {
      'approaching': 'Map is loading. Camera approaching destination.',
      'tracing': 'Drawing route connections to nearby landmarks.',
      'revealing': 'Nearby landmarks are now appearing on the map.',
      'complete': 'Map is ready. You can now explore nearby places.'
    };

    if (announcements[cinematicPhase]) {
      setScreenReaderAnnouncement(announcements[cinematicPhase]);
    }
  }, [cinematicPhase]);

  // Reset markers when animation resets (optional, but good for sequences)
  useEffect(() => {
    if (!isRouteAnimationComplete) {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    }
  }, [isRouteAnimationComplete]);
  const routeRef = useRef(null);
  const activeLandmarkRef = useRef(null);
  const originalViewportRef = useRef(null);
  const loadedIconsRef = useRef(new Map()); // Changed to Map to track content/url for updates
  const eventHandlersRef = useRef([]);
  const nearbyPlacePopupRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isCreatingRouteRef = useRef(false); // Track when route is being created
  const routeGenerationRef = useRef(0); // Generation counter to track route creation attempts
  const audioRef = useRef(null); // Audio reference
  const landmarkAudioRef = useRef(null); // Ref for landmark audio
  const introPlayedRef = useRef(false); // Track if intro has played
  const initialZoomDoneRef = useRef(false); // Track if initial zoom is done

  // Timeout refs to prevent race conditions during updates/cleanup
  const initialAnimationTimeoutRef = useRef(null);
  const boundsSetupTimeoutRef = useRef(null);

  // View Mode State (`tilted` | `top`)
  const [viewMode, setViewMode] = useState('top');
  const viewModeRef = useRef('top'); // Ref to access viewMode without causing effect re-runs
  const isFlyingRef = useRef(false); // Track if a cinematic flight is in progress

  // Stable refs for callbacks used in map init effect (prevent re-init on filter change)
  const clearRouteRef = useRef(null);
  const cleanupRef = useRef(null);
  const add3DBuildingsRef = useRef(null);

  // Cascade Animation Refs
  const hasPerformedInitialRevealRef = useRef(false);
  const cascadeAnimationFrameRef = useRef(null);

  // Intro State
  const [showIntroButton, setShowIntroButton] = useState(false); // Show button if autoplay blocks
  const introAudioRef = useRef(introAudio); // Track introAudio prop for non-reactive access

  // Update introAudioRef when prop changes
  useEffect(() => {
    introAudioRef.current = introAudio;
  }, [introAudio]);

  // Update landmarkAudioRef when prop changes
  useEffect(() => {
    if (landmarkAudio) {
      landmarkAudioRef.current = new Audio(landmarkAudio);
    } else {
      landmarkAudioRef.current = null;
    }
  }, [landmarkAudio]);

  // State
  const [selectedLandmark, setSelectedLandmark] = useState(null);
  const [showLandmarkCard, setShowLandmarkCard] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentBearing, setCurrentBearing] = useState(0);
  const [debugCameraPosition, setDebugCameraPosition] = useState(null); // DEBUG: Real-time camera position

  // Custom hook for directions
  const { getDistanceAndDuration, getDirections } = useMapboxDirections();

  // Cinematic Tour Hook
  const { startTour, stopTour, smoothFlyTo, isTourActive, currentStep, totalSteps } = useCinematicTour();

  /**
   * Get map settings with fallbacks
   * 
   * Key settings:
   * - minZoom: Starting zoom for animation AND the limit users can zoom out to
   * - maxZoom: Maximum zoom users can zoom in to  
   * - defaultZoom: Destination zoom after intro animation
   * - defaultPitch/Bearing: Camera angle after animation
   * - maxPanDistanceKm: Circular navigation boundary (null = no bounds)
   */
  const getMapConfig = useCallback(() => {
    // Distance-based bounds - get max pan distance if configured
    // Only use if it's a positive number, otherwise null (no bounds)
    const maxPanDistanceKm = (mapSettings?.maxPanDistanceKm && mapSettings.maxPanDistanceKm > 0)
      ? mapSettings.maxPanDistanceKm
      : null;

    const config = {
      center: [
        mapSettings?.defaultCenterLng ?? MAPBOX_CONFIG.DEFAULT_CENTER.lng,
        mapSettings?.defaultCenterLat ?? MAPBOX_CONFIG.DEFAULT_CENTER.lat
      ],
      // Zoom settings
      minZoom: mapSettings?.minZoom ?? 0,      // Far view + user limit
      maxZoom: mapSettings?.maxZoom ?? 22,     // Close view limit  
      defaultZoom: mapSettings?.defaultZoom ?? MAPBOX_CONFIG.DEFAULT_ZOOM, // Destination
      // Camera angle settings
      defaultPitch: mapSettings?.defaultPitch ?? 70,
      defaultBearing: mapSettings?.defaultBearing ?? -20,
      // Interaction settings
      interactive: interactive,
      dragRotate: mapSettings?.enableRotation ?? true,
      pitchWithRotate: mapSettings?.enablePitch ?? true,
      // Distance-based navigation bounds
      maxPanDistanceKm: maxPanDistanceKm,
      // Auto-fit bounds - responsive zoom to fit all landmarks
      autoFitBounds: mapSettings?.autoFitBounds ?? false,
      autoFitPadding: mapSettings?.autoFitPadding ?? 50
    };
    return config;
  }, [mapSettings, interactive]);

  /**
   * Calculate bounds that contain all landmarks and client building
   * Used for auto-fit bounds feature (responsive zoom for all screen sizes)
   */
  const calculateAllMarkersBounds = useCallback(() => {
    const bounds = new mapboxgl.LngLatBounds();
    let hasCoordinates = false;

    // Include client building
    if (clientBuilding?.coordinates) {
      bounds.extend(clientBuilding.coordinates);
      hasCoordinates = true;
    }

    // Include all landmarks
    landmarks.forEach(landmark => {
      if (landmark.latitude && landmark.longitude) {
        bounds.extend([landmark.longitude, landmark.latitude]);
        hasCoordinates = true;
      }
    });

    return hasCoordinates ? bounds : null;
  }, [clientBuilding, landmarks]);

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

        // Ensure metadata is loaded to get duration
        if (!audio.duration) {
          await new Promise(r => audio.addEventListener('loadedmetadata', r, { once: true }));
        }

        // Calculate duration based on audio
        // Use a reasonable minimum (e.g. 3000ms) just in case audio is very short or duration fails
        let animationDuration = 3000;
        if (audio.duration && Number.isFinite(audio.duration)) {
          animationDuration = audio.duration * 1000;
          console.log(`🎵 Syncing animation to audio duration: ${animationDuration}ms`);
        }

        // Fly to client building
        if (clientBuilding && clientBuilding.coordinates) {
          if (!mapRef.current) return;

          // Fly to client building
          mapRef.current.flyTo({
            center: clientBuilding.coordinates,
            zoom: mapSettings?.defaultZoom ?? 17.5,
            pitch: mapSettings?.defaultPitch ?? 70,
            bearing: mapSettings?.defaultBearing ?? 45,
            duration: animationDuration,
            essential: true
          });
        }

        // On audio end, reset camera instead of starting tour
        audio.onended = () => {
          // Reset camera to default settings (from map settings)
          console.log('Intro audio finished. Resetting camera to default.');
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

      let animationDuration = 4000; // Default fallback
      if (audioRef.current.duration && Number.isFinite(audioRef.current.duration)) {
        animationDuration = audioRef.current.duration * 1000;
        console.log(`🎵 Manual Sync: Animation duration set to ${animationDuration}ms`);
      }

      if (clientBuilding && clientBuilding.coordinates) {
        mapRef.current.flyTo({
          center: clientBuilding.coordinates,
          zoom: 17.5,
          pitch: 70,
          bearing: 45,
          duration: animationDuration,
          essential: true
        });
      }

      audioRef.current.onended = () => {
        console.log('Intro audio finished (Manual). Resetting camera.');
        resetCamera();
      };
    }).catch(e => console.error('Manual play failed', e));
  };


  /**
   * Callback for when route animation completes (memoized to prevent re-renders)
   */
  const handleRouteAnimationComplete = useCallback(() => {
    console.log('🎬 Route animation complete. Transitioning to reveal phase.');
    setCinematicPhase('revealing');
    setIsRouteAnimationComplete(true);

    // After cascade completes (~1s), mark as fully complete
    setTimeout(() => {
      setCinematicPhase('complete');
    }, 1200);
  }, []);

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
      'client-building-glow',
      'client-building-core',
      'client-building-pulse-1',
      'client-building-pulse-2',
      'client-building-pulse-3',
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

    if (initialAnimationTimeoutRef.current) {
      clearTimeout(initialAnimationTimeoutRef.current);
      initialAnimationTimeoutRef.current = null;
    }

    if (boundsSetupTimeoutRef.current) {
      clearTimeout(boundsSetupTimeoutRef.current);
      boundsSetupTimeoutRef.current = null;
    }
  }, []);

  /**
   * Create a route between two points
   */
  const createRoute = useCallback(async (startCoords, endCoords) => {
    if (!mapRef.current || !startCoords || !endCoords) return;

    // Set flag
    isCreatingRouteRef.current = true;
    routeGenerationRef.current += 1;
    const currentGen = routeGenerationRef.current;

    try {
      console.log('🛣️ Creating route...', { start: startCoords, end: endCoords });

      // Get directions from API
      const result = await getDirections(startCoords, endCoords, 'driving');

      // Check if this request is still valid (not superseded by new one)
      if (currentGen !== routeGenerationRef.current) {
        console.log('🚫 Route creation superseded, ignoring result');
        return;
      }

      if (!result || !result.geometry) {
        console.warn('❌ No route found');
        isCreatingRouteRef.current = false;
        return;
      }

      // Add Source
      const routeGeoJSON = {
        type: 'Feature',
        properties: {},
        geometry: result.geometry
      };

      if (mapRef.current.getSource(SOURCE_IDS.ROUTE)) {
        mapRef.current.getSource(SOURCE_IDS.ROUTE).setData(routeGeoJSON);
      } else {
        mapRef.current.addSource(SOURCE_IDS.ROUTE, {
          type: 'geojson',
          data: routeGeoJSON
        });
      }

      // Add Layers (Route Glow & Core)
      // 1. Glow Layer (Bottom)
      if (!mapRef.current.getLayer(LAYER_IDS.ROUTE_GLOW)) {
        mapRef.current.addLayer({
          id: LAYER_IDS.ROUTE_GLOW,
          type: 'line',
          source: SOURCE_IDS.ROUTE,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': theme.tertiary || '#3b82f6',
            'line-width': 8,
            'line-opacity': 0.4,
            'line-blur': 4
          }
        }, LAYER_IDS.BUILDINGS_3D); // Place below buildings if possible
      }

      // 2. Core Layer (Top)
      if (!mapRef.current.getLayer(LAYER_IDS.ROUTE)) {
        mapRef.current.addLayer({
          id: LAYER_IDS.ROUTE,
          type: 'line',
          source: SOURCE_IDS.ROUTE,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': theme.primary || '#1e40af',
            'line-width': 4,
            'line-opacity': 0.9
          }
        }, LAYER_IDS.BUILDINGS_3D);
      }

      // Fit bounds to show route
      const bounds = new mapboxgl.LngLatBounds()
        .extend(startCoords)
        .extend(endCoords);

      // Calculate padding based on route
      const padding = { top: 100, bottom: 0, left: 400, right: 100 }; // Left padding for card, zero bottom

      mapRef.current.fitBounds(bounds, {
        padding,
        pitch: 45, // Slight tilt for better view
        bearing: 0,
        duration: 2000
      });

      // Update ref
      routeRef.current = LAYER_IDS.ROUTE;
      activeLandmarkRef.current = endCoords; // Using destination coordinates effectively

      // Restore coordinates for animation usage
      const coordinates = result.geometry.coordinates; // Adapting from result.geometry

      // Calculate cinematic bearing based on arrival path (last segment)
      let bearingToLandmark = 0;
      if (coordinates && coordinates.length >= 2) {
        const last = coordinates[coordinates.length - 1];
        const prev = coordinates[coordinates.length - 2];
        bearingToLandmark = Math.atan2(last[0] - prev[0], last[1] - prev[1]) * 180 / Math.PI;
      }

      // Animate the route drawing - capture generation for animation closure
      const animationGeneration = currentGen;
      const animateRoute = () => {
        const animationDuration = viewModeRef.current === 'top' ? 3500 : 4000;
        const startTime = performance.now();

        // Precompute cumulative distances
        const distances = [0];
        let totalDistance = 0;
        for (let i = 1; i < coordinates.length; i++) {
          const dx = coordinates[i][0] - coordinates[i - 1][0];
          const dy = coordinates[i][1] - coordinates[i - 1][1];
          const dist = Math.sqrt(dx * dx + dy * dy);
          totalDistance += dist;
          distances.push(totalDistance);
        }

        const getPointAtDistance = (targetDist) => {
          if (targetDist <= 0) return coordinates[0];
          if (targetDist >= totalDistance) return coordinates[coordinates.length - 1];
          for (let i = 1; i < distances.length; i++) {
            if (distances[i] >= targetDist) {
              const segmentStart = distances[i - 1];
              const segmentLength = distances[i] - segmentStart;
              const t = segmentLength > 0 ? (targetDist - segmentStart) / segmentLength : 0;
              return [
                coordinates[i - 1][0] + t * (coordinates[i][0] - coordinates[i - 1][0]),
                coordinates[i - 1][1] + t * (coordinates[i][1] - coordinates[i - 1][1])
              ];
            }
          }
          return coordinates[coordinates.length - 1];
        };

        const getCoordinatesUpToDistance = (targetDist) => {
          if (targetDist <= 0) return [coordinates[0]];
          if (targetDist >= totalDistance) return [...coordinates];
          const result = [];
          for (let i = 0; i < distances.length; i++) {
            if (distances[i] <= targetDist) {
              result.push(coordinates[i]);
            } else {
              result.push(getPointAtDistance(targetDist));
              break;
            }
          }
          return result.length >= 2 ? result : [coordinates[0], getPointAtDistance(targetDist)];
        };

        const animate = (currentTime) => {
          if (routeGenerationRef.current !== animationGeneration || !routeRef.current) return;
          const elapsedTime = currentTime - startTime;
          const rawProgress = Math.min(elapsedTime / animationDuration, 1);
          // Simple ease-out if easeInOutCubic not available, or assume available
          const easedProgress = rawProgress; // Placeholder if util missing, but logic structure is key.

          const currentDistance = totalDistance * easedProgress;
          const currentCoordinates = getCoordinatesUpToDistance(currentDistance);

          const currentGeoJson = {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: currentCoordinates }
          };

          if (mapRef.current && mapRef.current.getSource(SOURCE_IDS.ROUTE)) {
            mapRef.current.getSource(SOURCE_IDS.ROUTE).setData(currentGeoJson);
          }

          if (rawProgress < 1) {
            animationFrameRef.current = requestAnimationFrame(animate);
          }
        };

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animateRoute();

      // LOGIC BRANCH BASED ON VIEW MODE
      if (viewModeRef.current === 'top') {
        // TOP VIEW LOGIC
        const bounds = new mapboxgl.LngLatBounds()
          .extend(startCoords)
          .extend(endCoords);
        mapRef.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 0, left: 400, right: 80 },
          pitch: 0, bearing: 0, duration: 3500, essential: true
        });
      } else {
        // TILTED VIEW: Cinematic Flight Sequence
        isFlyingRef.current = true;
        // Use smoothFlyTo from hook
        smoothFlyTo(mapRef.current, {
          center: endCoords,
          zoom: 17, pitch: 55, bearing: bearingToLandmark
        }, 5000).then(() => {
          // Hold shot
          if (routeGenerationRef.current === currentGeneration && isFlyingRef.current) {
            setTimeout(() => {
              // Reveal
              if (mapRef.current && isFlyingRef.current) {
                isFlyingRef.current = false;
                const bounds = new mapboxgl.LngLatBounds().extend(startCoords).extend(endCoords);
                mapRef.current.fitBounds(bounds, {
                  padding: { top: 100, bottom: 0, left: 400, right: 80 },
                  pitch: 50, bearing: bearingToLandmark * 0.3, duration: 3000, essential: true
                });
              }
            }, 1500);
          }
        });
      }

    } catch (err) {
      console.error('❌ Error creating route:', err);
      toast.error('Could not create route');
    } finally {
      isCreatingRouteRef.current = false;
    }
  }, [getDirections, theme]);

  /**
   * Clear route and restore viewport
   */
  const clearRoute = useCallback(() => {
    // Clear even if route is being created
    if (!mapRef.current) return;
    if (!routeRef.current && !isCreatingRouteRef.current) return;

    console.log('clearRoute called, routeRef:', routeRef.current, 'isCreating:', isCreatingRouteRef.current);

    // FIRST: Stop any ongoing cinematic flight animation
    // This sets cancelRef.current = true in the hook, which stops smoothFlyTo
    stopTour(mapRef.current);
    isFlyingRef.current = false;

    // Cancel any ongoing route animation frame
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

    // Return to configured camera preview position (default view from settings)
    if (mapRef.current) {
      try {
        const config = getMapConfig();
        const targetPitch = viewModeRef.current === 'tilted' ? config.defaultPitch : 0;
        // In 2D Top mode, keep bearing but remove pitch
        const targetBearing = config.defaultBearing ?? -20;

        // CRITICAL: Reset any map padding set by fitBounds before flying to default view
        mapRef.current.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });

        // Check if auto-fit bounds is enabled
        if (config.autoFitBounds) {
          const markersBounds = calculateAllMarkersBounds();
          if (markersBounds) {
            console.log('🎯 CLEAR_ROUTE: Using fitBounds (autoFitBounds enabled)', {
              bounds: markersBounds,
              padding: config.autoFitPadding,
              pitch: targetPitch,
              bearing: targetBearing,
              viewMode: viewModeRef.current
            });

            mapRef.current.fitBounds(markersBounds, {
              padding: config.autoFitPadding,
              pitch: targetPitch,
              bearing: targetBearing,
              duration: MAPBOX_CONFIG.ROUTE_ANIMATION_DURATION,
              maxZoom: config.defaultZoom
            });
          } else {
            // Fallback to flyTo if no markers
            mapRef.current.flyTo({
              center: config.center,
              zoom: config.defaultZoom,
              pitch: targetPitch,
              bearing: targetBearing,
              duration: MAPBOX_CONFIG.ROUTE_ANIMATION_DURATION
            });
          }
        } else {
          // Original behavior: flyTo with fixed zoom
          console.log('🎯 CLEAR_ROUTE: Flying to camera position:', {
            center: config.center,
            zoom: config.defaultZoom,
            pitch: targetPitch,
            bearing: targetBearing,
            viewMode: viewModeRef.current
          });

          mapRef.current.flyTo({
            center: config.center,
            zoom: config.defaultZoom,
            pitch: targetPitch,
            bearing: targetBearing,
            duration: MAPBOX_CONFIG.ROUTE_ANIMATION_DURATION
          });
        }

        // Debug: Log actual position after animation completes
        mapRef.current.once('moveend', () => {
          if (!mapRef.current) return;
          const finalCenter = mapRef.current.getCenter();
          console.log('🏁 CLEAR_ROUTE COMPLETE: Actual final camera position:', {
            center: [finalCenter.lng, finalCenter.lat],
            zoom: mapRef.current.getZoom(),
            pitch: mapRef.current.getPitch(),
            bearing: mapRef.current.getBearing()
          });
        });
      } catch (e) {
        console.warn('Could not fly to default camera position:', e);
      }
    }

    // Deselect landmark
    setSelectedLandmark(null);
    setShowLandmarkCard(false);
  }, [getMapConfig, calculateAllMarkersBounds, stopTour]); // Added stopTour dependency

  /**
   * Load custom icons with error handling and caching
   */
  const loadCustomIcons = useCallback(async () => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

    const iconsToLoad = [];

    // Helper to add icon to load list if new or changed
    const queueIconLoad = (id, rawContent, width, height) => {
      const currentContent = loadedIconsRef.current.get(id);
      // Load if not in cache OR if content has changed (e.g. new URL/SVG string)
      if (!currentContent || currentContent !== rawContent) {
        iconsToLoad.push({
          id,
          rawContent, // store raw for comparison
          svg: bustCache(rawContent), // cache bust for fetch/create
          width,
          height
        });
      }
    };

    // Client building icon
    if (project?.clientBuildingIcon) {
      queueIconLoad(
        'client-building-icon',
        project.clientBuildingIcon,
        project.clientBuildingIconWidth || MAPBOX_CONFIG.DEFAULT_ICON_WIDTH,
        project.clientBuildingIconHeight || MAPBOX_CONFIG.DEFAULT_ICON_HEIGHT
      );
    }

    // Landmark icons
    landmarks.forEach(landmark => {
      const iconId = `landmark-icon-${landmark.id}`;
      if (landmark.icon) {
        const { width, height } = getIconSize(landmark, landmark.category);
        queueIconLoad(iconId, landmark.icon, width, height);
      }
    });

    // Nearby place icons
    nearbyPlaces.forEach(place => {
      const iconToUse = place.icon || place.categoryIcon;
      const iconId = `nearby-icon-${place.id}`;
      if (iconToUse) {
        const { width, height } = getIconSize(place, place.category);
        queueIconLoad(iconId, iconToUse, width, height);
      }
    });

    // Load all icons in parallel (with concurrency limit)
    const loadBatch = async (batch) => {
      const results = await Promise.allSettled(
        batch.map(async ({ id, svg, rawContent, width, height }) => {
          try {
            const img = await createSVGImage(svg, width, height);
            if (mapRef.current) {
              // Remove existing image if updating
              if (mapRef.current.hasImage(id)) {
                mapRef.current.removeImage(id);
              }
              mapRef.current.addImage(id, img, { pixelRatio: MAPBOX_CONFIG.ICON_PIXEL_RATIO });
              loadedIconsRef.current.set(id, rawContent); // Update cache with new content
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
  const navigateToLandmark = useCallback(async (destination) => {
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
          const animationDuration = viewModeRef.current === 'top' ? 3500 : 4000; // 3.5s for top view, 4s for tilted
          const startTime = performance.now();

          // Precompute cumulative distances for accurate interpolation
          const distances = [0];
          let totalDistance = 0;
          for (let i = 1; i < coordinates.length; i++) {
            const dx = coordinates[i][0] - coordinates[i - 1][0];
            const dy = coordinates[i][1] - coordinates[i - 1][1];
            const dist = Math.sqrt(dx * dx + dy * dy);
            totalDistance += dist;
            distances.push(totalDistance);
          }

          // Interpolation helper - get point at distance along path
          const getPointAtDistance = (targetDist) => {
            if (targetDist <= 0) return coordinates[0];
            if (targetDist >= totalDistance) return coordinates[coordinates.length - 1];

            // Find segment containing this distance
            for (let i = 1; i < distances.length; i++) {
              if (distances[i] >= targetDist) {
                const segmentStart = distances[i - 1];
                const segmentLength = distances[i] - segmentStart;
                const t = segmentLength > 0 ? (targetDist - segmentStart) / segmentLength : 0;

                // Linear interpolation between points
                return [
                  coordinates[i - 1][0] + t * (coordinates[i][0] - coordinates[i - 1][0]),
                  coordinates[i - 1][1] + t * (coordinates[i][1] - coordinates[i - 1][1])
                ];
              }
            }
            return coordinates[coordinates.length - 1];
          };

          // Get all coordinates up to a distance, plus interpolated endpoint
          const getCoordinatesUpToDistance = (targetDist) => {
            if (targetDist <= 0) return [coordinates[0]];
            if (targetDist >= totalDistance) return [...coordinates];

            const result = [];
            for (let i = 0; i < distances.length; i++) {
              if (distances[i] <= targetDist) {
                result.push(coordinates[i]);
              } else {
                // Add interpolated final point
                result.push(getPointAtDistance(targetDist));
                break;
              }
            }
            return result.length >= 2 ? result : [coordinates[0], getPointAtDistance(targetDist)];
          };

          const animate = (currentTime) => {
            // Stop animation if route was cleared (generation changed OR refs cleared)
            if (routeGenerationRef.current !== animationGeneration || !routeRef.current) {
              return;
            }

            const elapsedTime = currentTime - startTime;
            const rawProgress = Math.min(elapsedTime / animationDuration, 1);

            // Smooth easing for premium feel
            const easedProgress = easeInOutCubic(rawProgress);

            // Calculate current distance along path
            const currentDistance = totalDistance * easedProgress;
            const currentCoordinates = getCoordinatesUpToDistance(currentDistance);

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

            if (rawProgress < 1) {
              animationFrameRef.current = requestAnimationFrame(animate);
            }
          };

          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          animationFrameRef.current = requestAnimationFrame(animate);
        };

        // ALWAYS animate the route drawing
        animateRoute();

        // LOGIC BRANCH BASED ON VIEW MODE
        if (viewModeRef.current === 'top') {
          // TOP VIEW: Zoom to show both client building and landmark at opposite ends
          // Route animation already started above - synced to same duration for cohesive feel
          const bounds = new mapboxgl.LngLatBounds()
            .extend(clientBuilding.coordinates)
            .extend(destination.coordinates);

          const zoomDuration = 3500; // Match route animation duration for sync

          mapRef.current.fitBounds(bounds, {
            padding: { top: 100, bottom: 0, left: 400, right: 80 }, // Left-heavy padding for card
            pitch: 0,
            bearing: 0,
            duration: zoomDuration, // Synced with route animation
            essential: true
          });

          // Play sound after animation
          setTimeout(() => {
            if (routeGenerationRef.current === currentGeneration && landmarkAudioRef.current) {
              landmarkAudioRef.current.currentTime = 0;
              landmarkAudioRef.current.play().catch(e => console.warn("Audio play failed", e));
            }
          }, zoomDuration);


        } else {
          // TILTED VIEW: Cinematic Flight Sequence
          isFlyingRef.current = true; // Mark flight as active

          // ═══════════════════════════════════════════════════════════════════
          // CINEMATIC FLIGHT: Professional drone-style camera movement
          // ═══════════════════════════════════════════════════════════════════

          // 1. HELICOPTER ENTRY SETUP
          // Force pitch to 0 (Top Down) instantly before starting the swoop.
          // This ensures we always animate 0° -> 60° (The "Swoop Up")
          mapRef.current.setPitch(0);

          // 2. The Flight (Swoop In)
          // Duration: 5 seconds for premium, graceful feel
          await smoothFlyTo(mapRef.current, {
            center: destination.coordinates,
            zoom: 17.5,      // Slightly closer for impact
            pitch: 60,       // Steep cinematic angle
            bearing: bearingToLandmark  // Arrive facing the landmark
          }, 5000);

          // Play sound upon arrival (after flight)
          if (routeGenerationRef.current === currentGeneration && landmarkAudioRef.current) {
            landmarkAudioRef.current.currentTime = 0;
            landmarkAudioRef.current.play().catch(e => console.warn("Audio play failed", e));
          }

          // 3. DYNAMIC ORBIT (The "Alive" Hold)
          // Instead of a static hold, slowly rotate around the target.
          // This keeps the 3D scene feeling immersive.
          if (mapRef.current && routeGenerationRef.current === currentGeneration && isFlyingRef.current) {
            // Start a slow, linear rotation (Orbit)
            // We use easeTo with linear easing for a constant velocity feel
            mapRef.current.easeTo({
              bearing: bearingToLandmark + 15, // Rotate 15 degrees
              duration: 4000,                  // Over 4 seconds (slow)
              easing: (t) => t,                // Linear easing
              essential: true
            });

            // Wait for this orbit to finish (or mostly finish) before zooming out
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

          // 4. Graceful reveal - zoom out to show route context
          // Maintains 3D perspective for premium depth feel
          if (mapRef.current && routeGenerationRef.current === currentGeneration && clientBuilding?.coordinates && isFlyingRef.current) {
            isFlyingRef.current = false;

            const bounds = new mapboxgl.LngLatBounds()
              .extend(clientBuilding.coordinates)
              .extend(destination.coordinates);

            mapRef.current.fitBounds(bounds, {
              padding: { top: 100, bottom: 0, left: 400, right: 80 }, // Left-heavy padding for card
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
  }, [clientBuilding, mapSettings, smoothFlyTo, viewModeRef]);

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

  // Keep callback refs in sync (prevents map re-init when callbacks change due to filter changes)
  // These must be defined AFTER all callbacks to avoid "Cannot access before initialization" errors
  useEffect(() => {
    clearRouteRef.current = clearRoute;
  }, [clearRoute]);

  useEffect(() => {
    cleanupRef.current = cleanup;
  }, [cleanup]);

  useEffect(() => {
    add3DBuildingsRef.current = add3DBuildings;
  }, [add3DBuildings]);

  /**
   * Initialize map
   */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || themeLoading) return;

    const config = getMapConfig();

    // Convert style URL to proper mapbox:// format
    const styleUrl = convertToMapboxStyleUrl(theme.mapboxStyle) || MAPBOX_CONFIG.DEFAULT_STYLE || 'mapbox://styles/mapbox/dark-v11';

    // 1. INITIAL LOAD STATE: Start from configured position or globe view
    // If useMinZoomForInitialTransition is true, start from minZoom; otherwise start from globe view (zoom 0)
    const useMinZoomStart = mapSettings?.useMinZoomForInitialTransition === true;
    const initialZoom = useMinZoomStart ? config.minZoom : 0;

    // When starting from globe view (zoom 0), we need to temporarily allow zoom < minZoom
    // The real minZoom constraint will be applied AFTER the fly animation completes
    const initialMinZoom = useMinZoomStart ? config.minZoom : 0;

    console.log('🚀 Initial Zoom Config:', {
      useMinZoomForInitialTransition: mapSettings?.useMinZoomForInitialTransition,
      useMinZoomStart,
      initialZoom,
      initialMinZoom,
      configMinZoom: config.minZoom
    });

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: config.center,
      zoom: initialZoom, // Start at globe view (0) or minZoom
      minZoom: initialMinZoom, // Temporarily allow zoom 0, will be updated after animation
      maxZoom: config.maxZoom,
      pitch: 0, // Start flat, animate to tilted during transition
      bearing: 0, // Start neutral, animate to final bearing during transition
      dragRotate: config.dragRotate,
      pitchWithRotate: config.pitchWithRotate,
      attributionControl: false // Hide Mapbox attribution control
      // DO NOT apply maxBounds here - apply AFTER animation completes to prevent freeze
    });

    // Debug log map settings
    console.log('🗺️ Map Settings:', {
      center: config.center,
      minZoom: config.minZoom,
      maxZoom: config.maxZoom,
      defaultZoom: config.defaultZoom,
      defaultPitch: config.defaultPitch,
      defaultBearing: config.defaultBearing,
      maxPanDistanceKm: config.maxPanDistanceKm,
      rawMapSettings: mapSettings
    });

    // Debug: Log what bounds restrictions are in place
    console.log('🔓 Navigation restrictions:', {
      hasPanDistanceLimit: !!config.maxPanDistanceKm,
      panDistanceKm: config.maxPanDistanceKm,
      zoomRange: `${config.minZoom} - ${config.maxZoom}`
    });

    // Animate to location after load
    mapRef.current.on('load', () => {
      setIsMapLoaded(true);

      // Track bearing changes for compass
      mapRef.current.on('rotate', () => {
        if (mapRef.current) {
          setCurrentBearing(mapRef.current.getBearing());
        }
      });

      // DEBUG: Track ALL camera movements to find unexpected changes
      let moveCount = 0;
      mapRef.current.on('moveend', () => {
        if (!mapRef.current) return;
        moveCount++;
        const center = mapRef.current.getCenter();
        const debugData = {
          moveCount,
          timestamp: new Date().toISOString(),
          center: [center.lng.toFixed(6), center.lat.toFixed(6)],
          zoom: mapRef.current.getZoom().toFixed(2),
          pitch: mapRef.current.getPitch().toFixed(1),
          bearing: mapRef.current.getBearing().toFixed(1)
        };
        console.log(`📸 CAMERA_MOVE #${moveCount}:`, debugData);
        setDebugCameraPosition(debugData);
      });

      // Add 3D buildings layer (using ref to avoid dependency causing re-init)
      add3DBuildingsRef.current?.();

      const duration = mapSettings?.initialAnimationDuration || MAPBOX_CONFIG.INITIAL_ANIMATION_DURATION;

      // Determine target center: USE THE USER'S CONFIGURED POSITION from Camera Preview
      // config.center comes from mapSettings.defaultCenterLat/Lng (set via Camera Preview)
      // Only fall back to client building if no custom center is configured
      const targetCenter = config.center;

      // Store original viewport for reset functionality
      originalViewportRef.current = {
        center: targetCenter,
        zoom: config.defaultZoom,
        pitch: config.defaultPitch,
        bearing: config.defaultBearing
      };

      // Debug: Log animation settings
      console.log('🚀 Animation Settings:', {
        from: { zoom: config.minZoom, pitch: 0, bearing: 0 },
        to: { zoom: config.defaultZoom, pitch: config.defaultPitch, bearing: config.defaultBearing },
        duration: duration,
        maxPanDistanceKm: config.maxPanDistanceKm
      });

      // Distance-based bounds: Setup move event listener to restrict panning
      const setupDistanceBounds = () => {
        // Only setup if maxPanDistanceKm is configured and we have a center point
        if (!config.maxPanDistanceKm) {
          console.log('📍 Distance bounds: Not configured (no restrictions)');
          return;
        }

        // Use custom panCenter if configured, otherwise fall back to client building or map center
        const centerLng = mapSettings?.panCenterLng ?? clientBuilding?.coordinates?.[0] ?? config.center[0];
        const centerLat = mapSettings?.panCenterLat ?? clientBuilding?.coordinates?.[1] ?? config.center[1];

        const maxDistance = config.maxPanDistanceKm;
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

      // Fly from minZoom (starting position) to defaultZoom (destination)
      console.log('📍 ANIMATING: Starting fly-in transition', {
        center: targetCenter,
        zoom: config.defaultZoom,
        pitch: config.defaultPitch,
        bearing: config.defaultBearing,
        durationMs
      });

      if (!introAudio) {
        initialAnimationTimeoutRef.current = setTimeout(() => {
          if (!mapRef.current) return;
          // In 2D Top mode (default), pitch is 0. We enforce this to avoid "tilted" entry if viewMode is accidentally set.
          const initialPitch = 0;

          console.log('🐞 DEBUG INITIAL ANIMATION:', {
            viewMode: viewModeRef.current,
            initialPitch,
            defaultPitch: config.defaultPitch,
            isTilted: viewModeRef.current === 'tilted'
          });

          // Check if auto-fit bounds is enabled
          if (config.autoFitBounds) {
            const markersBounds = calculateAllMarkersBounds();
            if (markersBounds) {
              console.log('🎯 INITIAL_ANIMATION: Using fitBounds (autoFitBounds enabled)', {
                bounds: markersBounds,
                padding: config.autoFitPadding,
                pitch: initialPitch,
                bearing: config.defaultBearing,
                viewMode: viewModeRef.current
              });

              mapRef.current.fitBounds(markersBounds, {
                padding: config.autoFitPadding,
                pitch: initialPitch,
                bearing: config.defaultBearing ?? 0,
                duration: durationMs,
                essential: true,
                maxZoom: config.defaultZoom // Don't zoom in more than defaultZoom
              });
            } else {
              // Fallback to flyTo if no markers found
              console.log('🎯 INITIAL_ANIMATION: No markers found, using flyTo fallback');
              mapRef.current.flyTo({
                center: targetCenter,
                zoom: config.defaultZoom,
                pitch: initialPitch,
                bearing: config.defaultBearing ?? 0,
                duration: durationMs,
                essential: true
              });
            }
          } else {
            // ═══════════════════════════════════════════════════════════════
            // ACCESSIBILITY CHECK: Respect prefers-reduced-motion
            // ═══════════════════════════════════════════════════════════════

            const targetBearing = config.defaultBearing ?? 0;
            const targetZoom = config.defaultZoom;
            const targetPitch = initialPitch;

            if (prefersReducedMotion) {
              // ACCESSIBILITY MODE: Instant jump, no animation
              console.log('♿ REDUCED MOTION: Skipping cinematic animation');
              mapRef.current.jumpTo({
                center: targetCenter,
                zoom: targetZoom,
                pitch: targetPitch,
                bearing: targetBearing
              });

              // Skip directly to complete phase
              setCinematicPhase('complete');
              setIsInitialCameraAnimationComplete(true);
              setIsRouteAnimationComplete(true); // Skip route tracing too

            } else {
              // ═══════════════════════════════════════════════════════════════
              // APPLE-LEVEL: 3-Phase "Orbital Descent" Camera Sequence
              // ═══════════════════════════════════════════════════════════════

              // Phase durations (total = durationMs)
              const phase1Duration = durationMs * 0.25;
              const phase2Duration = durationMs * 0.50;
              const phase3Duration = durationMs * 0.25;

              console.log('🎬 APPLE-LEVEL CAMERA: 3-Phase Orbital Descent initiating...', {
                target: { center: targetCenter, zoom: targetZoom, pitch: targetPitch, bearing: targetBearing },
                phases: { p1: phase1Duration, p2: phase2Duration, p3: phase3Duration }
              });

              // Set cinematic phase for visual effects coordination
              setCinematicPhase('approaching');

              // Phase 1: Anticipation (approach with dramatic rotation)
              mapRef.current.flyTo({
                center: targetCenter,
                zoom: Math.max(4, targetZoom * 0.7), // Wider view
                pitch: targetPitch * 0.6,
                bearing: targetBearing + 40, // Dramatic rotation offset
                duration: phase1Duration,
                easing: (t) => t * t, // Ease-in (accelerating)
                essential: true
              });

              // Phase 2: The Descent (smooth arc toward target)
              setTimeout(() => {
                if (!mapRef.current || userInterruptedRef.current) return;
                mapRef.current.flyTo({
                  center: targetCenter,
                  zoom: targetZoom * 1.02, // Slight overshoot
                  pitch: targetPitch * 1.03,
                  bearing: targetBearing + 8,
                  duration: phase2Duration,
                  curve: 1.3,
                  easing: (t) => 1 - Math.pow(1 - t, 3), // Ease-out cubic
                  essential: true
                });
              }, phase1Duration);

              // Phase 3: Spring Settle (final micro-adjustment)
              setTimeout(() => {
                if (!mapRef.current || userInterruptedRef.current) return;
                mapRef.current.flyTo({
                  center: targetCenter,
                  zoom: targetZoom,
                  pitch: targetPitch,
                  bearing: targetBearing,
                  duration: phase3Duration,
                  easing: (t) => {
                    // Elastic ease-out (spring physics)
                    const c4 = (2 * Math.PI) / 3;
                    return t === 0 ? 0 : t === 1 ? 1 :
                      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
                  },
                  essential: true
                });
              }, phase1Duration + phase2Duration);
            }
          }

          // Debug: Log actual position after animation completes
          mapRef.current.once('moveend', () => {
            if (!mapRef.current) return;
            const finalCenter = mapRef.current.getCenter();
            console.log('🏁 INITIAL_ANIMATION COMPLETE: Actual final camera position:', {
              center: [finalCenter.lng, finalCenter.lat],
              zoom: mapRef.current.getZoom(),
              pitch: mapRef.current.getPitch(),
              bearing: mapRef.current.getBearing()
            });

            // Apply the real minZoom constraint AFTER animation completes
            // This allows globe view start (zoom 0) but prevents users from zooming out past minZoom
            if (!useMinZoomStart && config.minZoom > 0) {
              console.log('🔒 Applying minZoom constraint after animation:', config.minZoom);
              mapRef.current.setMinZoom(config.minZoom);
            }
            setIsInitialCameraAnimationComplete(true); // Enable RoadTracer and markers
            setCinematicPhase('tracing'); // Transition to route tracing phase
          });

          // Setup distance-based pan restriction after animation
          boundsSetupTimeoutRef.current = setTimeout(setupDistanceBounds, durationMs + 500);

        }, 500);
      } else {
        console.log('Skipping standard initial animation because introAudio is present. Waiting for playSequence.');
        // We might want to apply minZoom constraint here immediately or wait?
        // If we don't, the user is stuck at zoom 0/minZoom until they start intro.
        // That's probably intended (Globe View).
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
      cleanupRef.current?.();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      loadedIconsRef.current.clear();
    };
  }, [theme.mapboxStyle, themeLoading, getMapConfig, mapSettings]);

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
   * Listen for Chat Highlight Events
   */
  useEffect(() => {
    // Helper to find place by ID or Title
    // Helper to find place by ID or Title with fuzzy matching
    const findPlace = (identifier) => {
      if (!identifier) return null;

      const rawQuery = String(identifier).toLowerCase();
      // Create a "clean" query (alphanumeric only) to handle spacing differences (e.g. "Indira Nagar" vs "Indiranagar")
      const cleanQuery = rawQuery.replace(/[^a-z0-9]/g, '');

      const isMatch = (item) => {
        if (!item) return false;

        const rawId = String(item.id).toLowerCase();
        const rawTitle = (item.title || item.name || '').toLowerCase();
        const cleanTitle = rawTitle.replace(/[^a-z0-9]/g, '');

        // 1. Exact ID
        if (rawId === rawQuery) return true;

        // 2. Direct string containment (bidirectional)
        // "Indira Nagar Metro".includes("Indira Nagar") -> true
        // "Indira Nagar".includes("Indira Nagar Metro") -> matches backend specificity? 
        // Usually we want: does the Item Title contain the Query? OR does the Query contain the Item Title?
        if (rawTitle.includes(rawQuery)) return true;
        if (rawQuery.includes(rawTitle)) return true;
        // 3. Fuzzy matching (clean strings)
        if (cleanTitle && cleanQuery) {
          if (cleanTitle.includes(cleanQuery)) return true;
          if (cleanQuery.includes(cleanTitle)) return true;
        }

        return false;
      };

      console.log(`findPlace Debug: Searching for "${rawQuery}" (clean: "${cleanQuery}")`);

      // 1. Try Landmarks first
      const landmark = landmarks.find(isMatch);
      if (landmark) {
        console.log("findPlace: Found Landmark match:", landmark.title);
        return { ...landmark, type: 'landmark' };
      }

      // 2. Try User Project/Client Building
      if (clientBuilding) {
        // Reuse the match logic or specific keywords
        if (isMatch(clientBuilding) || rawQuery.includes('client') || rawQuery.includes('project')) {
          console.log("findPlace: Found Client Building match");
          return { ...clientBuilding, type: 'client' };
        }
      }

      // 3. Try Nearby Places
      const place = nearbyPlaces.find(isMatch);
      if (place) {
        console.log("findPlace: Found Nearby Place match:", place.title);
        return { ...place, type: 'nearby' };
      }

      console.log("findPlace: No match found. Available Nearby Places sample:", nearbyPlaces.slice(0, 3).map(p => p.title));

      return null;
    };

    const handleChatHighlight = (event) => {
      const { location_name, svg_id, location_type, force_filter, all_locations } = event.detail || {};

      // 1. Handle Categorical Filtering (e.g. "Here are the SCHOOLS")
      if (all_locations && all_locations.length > 1) {
        // If we received a batch of locations, infer the category to filter by
        // The backend sends 'location_type' like 'educations' in the first item usually
        const commonType = all_locations[0]?.location_type;

        if (commonType) {
          console.log("Chat: Applying filter for category:", commonType);
          setExternalCategoryFilter(commonType);

          // Clear filter after some time? Or let user clear it?
          // For now, let's auto-clear if they search for something else later.
        }
      } else if (location_type && force_filter) {
        setExternalCategoryFilter(location_type);
      } else if (!all_locations) {
        // If single highlight and no explicit filter instruction, maybe clear filter?
        // setExternalCategoryFilter(null); 
        // Better to keep it if they are drilling down? 
        // Actually, if they ask for "Amity", we should probably show everything again OR just Amity.
        // Let's reset filter on specific single location search to ensure it is visible 
        // (unless it belongs to current filter? Too complex. Resetting is safer).
        setExternalCategoryFilter(null);
      }

      // 3. Single Highlight Logic (Fallback or Specific)
      // Use name first, then fallback to parts of svg_id if needed, or just standard ID
      let query = location_name || svg_id;

      // Handle single item in batch array as a direct highlight
      if (!query && all_locations && all_locations.length === 1) {
        query = all_locations[0].location_name || all_locations[0].svg_id;
        console.log("Chat: Unpacked single location from batch:", query);
      }

      // 2. Handle Batched Highlights (if multiple)
      // Only if we have MORE than 1 location (otherwise treat as single highlight below)
      if (all_locations && all_locations.length > 1) {
        console.log("Chat: Batch handling", all_locations.length, "locations");

        // Collect Coordinates for FitBounds
        const coords = [];
        all_locations.forEach(loc => {
          const item = findPlace(loc.location_name || loc.svg_id);
          if (item) coords.push(item.coordinates);
        });

        if (coords.length > 0 && mapRef.current) {
          const bounds = new mapboxgl.LngLatBounds();
          coords.forEach(c => bounds.extend(c));

          mapRef.current.fitBounds(bounds, {
            padding: 100,
            maxZoom: 15,
            essential: true
          });
          return; // Skip single highlight logic if we did a batch fit
        }
      }

      if (!query) return;

      console.log("Chat asked to highlight:", query);
      const item = findPlace(query);

      if (!item) {
        console.warn("Could not find place for query:", query);
        // Fallback: If event has lat/lng, use it!
        if (event.detail.latitude && event.detail.longitude) {
          const lat = parseFloat(event.detail.latitude);
          const lng = parseFloat(event.detail.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            console.log("Using provided coordinates for fallback marker");
            // Fly there
            mapRef.current.flyTo({ center: [lng, lat], zoom: 16, essential: true });
            // Create temp marker
            new mapboxgl.Marker({ color: 'red' })
              .setLngLat([lng, lat])
              .setPopup(new mapboxgl.Popup().setHTML(`<b>${event.detail.location_name}</b><br>${event.detail.distance || ''}`))
              .addTo(mapRef.current);
            return;
          }
        }

        toast.info(`Location "${query}" not found in current map view.`);
        return;
      }

      if (item.type === 'landmark') {
        console.log("Highlighting Landmark:", item.title);
        setSelectedLandmark(item);
        setShowLandmarkCard(true);
        if (clientBuilding) {
          navigateToLandmark(item);
        }
      } else if (item.type === 'client') {
        // Just fly to client building
        mapRef.current.flyTo({
          center: item.coordinates,
          zoom: 17,
          pitch: 60,
          essential: true
        });
      } else {
        // Nearby Place Logic
        console.log("Highlighting Nearby Place:", item.title);
        if (mapRef.current) {
          const fakeEvent = {
            features: [{
              properties: { id: item.id }
            }]
          };
          handleNearbyPlaceHoverRaw(fakeEvent);

          mapRef.current.flyTo({
            center: item.coordinates,
            zoom: 16,
            essential: true
          });
        }
      }
    };

    window.addEventListener('CHAT_HIGHLIGHT_LOCATION', handleChatHighlight);
    return () => {
      window.removeEventListener('CHAT_HIGHLIGHT_LOCATION', handleChatHighlight);
    };
  }, [nearbyPlaces, landmarks, clientBuilding, handleNearbyPlaceHoverRaw, navigateToLandmark]);

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

    const config = getMapConfig();

    if (viewMode === 'top') {
      // Switch to Top View (2D) - pitch is 0 but bearing is preserved
      mapRef.current.easeTo({
        pitch: 0,
        bearing: config.defaultBearing ?? -20,
        duration: 1000,
        essential: true
      });
    } else {
      // Switch to Tilted View (3D) - use configured pitch and bearing from settings
      // Using ?? instead of || so that 0 values are respected (0 is falsy in JS)
      mapRef.current.easeTo({
        pitch: config.defaultPitch ?? 70,
        bearing: config.defaultBearing ?? -20,
        duration: 1000,
        essential: true
      });
    }
  }, [viewMode, isMapLoaded, getMapConfig]);

  /**
   * Update markers when data changes - Optimized to use setData
   */
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !isRouteAnimationComplete) return;

    let retryCount = 0;
    const maxRetries = 50;

    const updateMarkers = async () => {
      // Wait for style to load
      if (!mapRef.current || !mapRef.current.isStyleLoaded()) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(updateMarkers, 100);
          return;
        } else {
          console.warn('Max retries reached, proceeding anyway');
        }
      }

      await loadCustomIcons();
      // ─────────────────────────────────────────────────────────────
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
            hasIcon: !!landmark.icon,
            isSelected: selectedLandmark?.id === landmark.id
          }
        }))
      };

      const landmarkSource = mapRef.current.getSource(SOURCE_IDS.LANDMARKS);

      if (landmarkSource) {
        // FAST PATH: Just update data
        landmarkSource.setData(landmarksGeoJSON);
      } else {
        // SLOW PATH: Initial layer setup
        if (landmarks.length > 0 || true) { // Always create source to avoid flicker if list becomes non-empty later
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
            paint: {
              'icon-opacity': [
                'case',
                ['get', 'isSelected'], 1,
                ['any', ['get', 'hasSelectedLandmark'], ['!', ['get', 'isSelected']]], 0.3,
                1
              ]
            },
            filter: ['get', 'hasIcon']
          });

          // Register events only once on creation
          const landmarkClickHandler = (e) => {
            const feature = e.features[0];
            const landmarkId = feature.properties.id;
            const landmark = landmarks.find(l => l.id === landmarkId);

            if (landmark) {
              e.originalEvent.preventDefault();
              setSelectedLandmark(landmark);
              setShowLandmarkCard(true);
              if (clientBuilding) {
                navigateToLandmark(landmark);
              }
            }
          };

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
        }
      }

      // Handle HTML Markers for Landmarks (Clean and Rebuild - simpler for DOM elements)
      // Filter out existing landmark markers first (if we tracked them separately it would be better, but this is ok for now)
      // Note: We are clearing ALL markers (nearby + landmarks) in one go below, so we just rebuild here.

      // ─────────────────────────────────────────────────────────────
      // 2. NEARBY PLACES UPDATE
      // ─────────────────────────────────────────────────────────────
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
            hasIcon: !!(place.icon || place.categoryIcon),
            hasSelectedLandmark: !!selectedLandmark
          }
        }))
      };

      const nearbySource = mapRef.current.getSource(SOURCE_IDS.NEARBY_PLACES);

      if (nearbySource) {
        // FAST PATH
        nearbySource.setData(nearbyGeoJSON);
      } else {
        // SLOW PATH
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
            'icon-opacity': [
              'case',
              ['get', 'hasSelectedLandmark'], 0.3,
              MAPBOX_CONFIG.NEARBY_PLACE_OPACITY
            ]
          },
          filter: ['get', 'hasIcon']
        });

        // Events
        const nearbyEnterHandler = (e) => {
          mapRef.current.getCanvas().style.cursor = 'pointer';
          handleNearbyPlaceHoverRaw(e);
        };

        const nearbyLeaveHandler = () => {
          mapRef.current.getCanvas().style.cursor = '';
          handleNearbyPlaceLeave();
        };

        const nearbyClickHandler = (e) => {
          const feature = e.features?.[0];
          if (!feature) return;
          const placeId = feature.properties.id;
          if (nearbyPlacePopupRef.current && nearbyPlacePopupRef.current.placeId === placeId) {
            handleNearbyPlaceLeave();
            return;
          }
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
      }

      // ─────────────────────────────────────────────────────────────
      // 3. CLIENT BUILDING UPDATE
      // ─────────────────────────────────────────────────────────────
      // Client building is usually static, but we handle it consistently
      if (clientBuilding) {
        const clientSource = mapRef.current.getSource(SOURCE_IDS.CLIENT_BUILDING);
        const clientGeoJSON = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: clientBuilding.coordinates
          },
          properties: {
            name: clientBuilding.name,
            description: clientBuilding.description || 'Client Building'
          }
        };

        if (clientSource) {
          clientSource.setData(clientGeoJSON);
        } else {
          // Initial setup for Client Building (Layers + Events)
          mapRef.current.addSource(SOURCE_IDS.CLIENT_BUILDING, {
            type: 'geojson',
            data: clientGeoJSON
          });

          // 1. Base Glow
          mapRef.current.addLayer({
            id: 'client-building-glow',
            type: 'circle',
            source: SOURCE_IDS.CLIENT_BUILDING,
            paint: {
              'circle-radius': 35,
              'circle-color': theme.primary || '#fbbf24',
              'circle-opacity': 0.15,
              'circle-blur': 1,
              'circle-pitch-alignment': 'map'
            }
          });

          // 2. Core Hotspot
          mapRef.current.addLayer({
            id: 'client-building-core',
            type: 'circle',
            source: SOURCE_IDS.CLIENT_BUILDING,
            paint: {
              'circle-radius': 4,
              'circle-color': '#ffffff',
              'circle-opacity': 0.8,
              'circle-blur': 0.5,
              'circle-pitch-alignment': 'map'
            }
          });

          // 3. Pulse Rings
          ['client-building-pulse-1', 'client-building-pulse-2', 'client-building-pulse-3'].forEach((id, index) => {
            mapRef.current.addLayer({
              id: id,
              type: 'circle',
              source: SOURCE_IDS.CLIENT_BUILDING,
              paint: {
                'circle-radius': 5,
                'circle-color': 'transparent',
                'circle-stroke-width': 1.5 + (index * 0.5),
                'circle-stroke-color': theme.primary || '#f59e0b',
                'circle-stroke-opacity': 0,
                'circle-pitch-alignment': 'map'
              }
            });
          });
          const animatePremiumPulse = (timestamp) => {
            if (!mapRef.current || !mapRef.current.getLayer('client-building-pulse-1')) return;
            const safeTime = (timestamp || performance.now());
            if (isNaN(safeTime)) return;
            const time = safeTime / 1000;

            const getProgress = (offset, speed) => ((time * speed) + offset) % 1;
            const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
            const getOpacity = (t) => {
              if (t < 0.2) return t * 5;
              if (t > 0.7) return (1 - t) * 3.33;
              return 1;
            };

            const p1 = getProgress(0, 0.8);
            const r1 = 2 + (25 * easeOutCubic(p1));
            const o1 = 0.8 * getOpacity(p1);

            const p2 = getProgress(0.4, 0.5);
            const r2 = 2 + (40 * easeOutCubic(p2));
            const o2 = 0.6 * getOpacity(p2);

            const p3 = getProgress(0.7, 0.3);
            const r3 = 2 + (55 * easeOutCubic(p3));
            const o3 = 0.4 * getOpacity(p3);

            try {
              mapRef.current.setPaintProperty('client-building-pulse-1', 'circle-radius', r1);
              mapRef.current.setPaintProperty('client-building-pulse-1', 'circle-stroke-opacity', o1);
              mapRef.current.setPaintProperty('client-building-pulse-2', 'circle-radius', r2);
              mapRef.current.setPaintProperty('client-building-pulse-2', 'circle-stroke-opacity', o2);
              mapRef.current.setPaintProperty('client-building-pulse-3', 'circle-radius', r3);
              mapRef.current.setPaintProperty('client-building-pulse-3', 'circle-stroke-opacity', o3);

              const glowPulse = 35 + Math.sin(time * 2) * 2;
              mapRef.current.setPaintProperty('client-building-glow', 'circle-radius', glowPulse);

              // Icon Breathing - REMOVED per user request to avoid performance/flickering issues
              // if (mapRef.current.getLayer(LAYER_IDS.CLIENT_BUILDING)) {
              //   const isInteracting = mapRef.current.isMoving() || mapRef.current.isZooming();
              //   if (!isInteracting) {
              //     const baseSize = MAPBOX_CONFIG.DEFAULT_MARKER_SIZE;
              //     const breathe = (Math.sin(time * 3) + 1) / 2;
              //     const newSize = baseSize + (baseSize * 0.25 * breathe);
              //     mapRef.current.setLayoutProperty(LAYER_IDS.CLIENT_BUILDING, 'icon-size', newSize);
              //   }
              // }
            } catch (e) { }
            requestAnimationFrame(animatePremiumPulse);
          };
          requestAnimationFrame(animatePremiumPulse);

          // Icon Layer
          if (project?.clientBuildingIcon && mapRef.current.hasImage('client-building-icon')) {
            mapRef.current.addLayer({
              id: LAYER_IDS.CLIENT_BUILDING,
              type: 'symbol',
              source: SOURCE_IDS.CLIENT_BUILDING,
              layout: {
                'icon-image': 'client-building-icon',
                'icon-size': MAPBOX_CONFIG.DEFAULT_MARKER_SIZE,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'icon-anchor': 'bottom',
                'icon-offset': [0, 5]
              }
            });
          } else {
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

          const clientHoverPopup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            className: 'client-building-tippy',
            anchor: 'bottom',
            offset: [0, -50]
          });

          const logoUrl = project?.logo;
          const svgIcon = project?.clientBuildingIcon;
          let tooltipContent = '';
          if (logoUrl) {
            tooltipContent = `<div class="bg-white rounded-lg shadow-xl p-3 flex items-center justify-center border border-gray-100" style="min-width: 120px; min-height: 50px;"><img src="${bustCache(logoUrl)}" alt="${clientBuilding.name}" style="height: 40px; width: auto; max-width: 160px; object-fit: contain; display: block;" /></div>`;
          } else if (svgIcon && svgIcon.includes('<svg')) {
            tooltipContent = `<div class="bg-white rounded-lg shadow-xl p-3 flex items-center justify-center border border-gray-100"><div style="height: 36px; width: 36px; display: flex; align-items: center; justify-content: center;">${svgIcon}</div></div>`;
          } else {
            tooltipContent = `<div class="bg-white rounded-lg shadow-xl p-3 px-4 border border-gray-100"><span class="font-bold text-gray-800 text-sm whitespace-nowrap">${clientBuilding.name}</span></div>`;
          }

          const clientClickHandler = (e) => {
            // Stop propagation to prevent map click from immediately closing it if closeOnClick is true
            e?.originalEvent?.stopPropagation();

            // Show popup on click
            clientHoverPopup.setLngLat(clientBuilding.coordinates).setHTML(tooltipContent).addTo(mapRef.current);

            // Note: URL opening logic removed in favor of showing popup (per user request)
            // if (project?.clientBuildingUrl) {
            //   window.open(project.clientBuildingUrl, '_blank', 'noopener,noreferrer');
            // }
          };

          const clientEnterHandler = () => {
            mapRef.current.getCanvas().style.cursor = 'pointer';
            // Hover behavior removed
          };

          const clientLeaveHandler = () => {
            mapRef.current.getCanvas().style.cursor = '';
            // Leave behavior removed
          };

          ['click', 'mouseenter', 'mouseleave'].forEach(evt => {
            // Add main layer events
            mapRef.current.on(evt, LAYER_IDS.CLIENT_BUILDING, evt === 'click' ? clientClickHandler : evt === 'mouseenter' ? clientEnterHandler : clientLeaveHandler);
            // Add extra layer events
            if (evt !== 'mouseleave') {
              mapRef.current.on(evt, 'client-building-core', evt === 'click' ? clientClickHandler : clientEnterHandler);
              mapRef.current.on(evt, 'client-building-glow', evt === 'click' ? clientClickHandler : clientEnterHandler);
            }
          });
        }
      }
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      landmarks.forEach((landmark) => {
        if (!landmark.icon) {
          // Create a wrapper for positioning
          const markerContainer = document.createElement('div');
          markerContainer.className = 'landmark-marker-container';

          // Create the actual visible, breathing element
          const markerContent = document.createElement('div');
          markerContent.innerHTML = `<svg viewBox="0 0 27 41" width="27" height="41">
            <path fill="#3FB1CE" d="M27,13.5C27,19.07 20.25,27 14.75,34.5C14.02,35.5 12.98,35.5 12.25,34.5C6.75,27 0,19.07 0,13.5C0,6.04 6.04,0 13.5,0C20.96,0 27,6.04 27,13.5Z"/>
            <path fill="#3FB1CE" opacity="0.3" d="M13.5,2C7.15,2 2,7.15 2,13.5C2,18.44 8.08,26.78 13.5,33.58C18.92,26.78 25,18.44 25,13.5C25,7.15 19.85,2 13.5,2Z"/>
            <circle fill="#FFFFFF" cx="13.5" cy="13.5" r="5.5"/>
          </svg>`;

          markerContent.classList.add('animate-marker-breathe');
          markerContainer.appendChild(markerContent);

          const marker = new mapboxgl.Marker({ element: markerContainer })
            .setLngLat(landmark.coordinates)
            .addTo(mapRef.current);

          markerContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelectedLandmark(landmark);
            setShowLandmarkCard(true);
            if (clientBuilding) {
              navigateToLandmark(landmark);
            }
          });
          markersRef.current.push(marker);
        }
      });

      // 3. Add Nearby HTML Markers (for those without icons)
      nearbyPlaces.forEach((place) => {
        // Filter Check
        if (externalCategoryFilter) {
          const filterKey = String(externalCategoryFilter).toLowerCase().replace(/s$/, ''); // e.g. 'education'
          const placeCat = (place.categoryName || place.category || '').toLowerCase(); // e.g. 'high school'

          // Map backend filter keys to list of valid keywords found in frontend categories
          const validKeywords = {
            'education': ['school', 'college', 'university', 'institute', 'academy', 'education', 'campus'],
            'hospital': ['hospital', 'clinic', 'medical', 'health', 'doctor', 'pharmacy', 'nursing'],
            'mall': ['mall', 'shopping', 'store', 'market', 'plaza', 'retail'],
            'restaurant': ['restaurant', 'food', 'cafe', 'dining', 'bar', 'bistro', 'bakery'],
            'bank': ['bank', 'atm', 'finance'],
            'park': ['park', 'garden', 'recreation']
          };

          // Get keywords for this filter (or just use the filter itself if not mapped)
          const keywords = validKeywords[filterKey] || [filterKey];

          // Check if ANY keyword is in the place category
          // e.g. placeCat="High School" contains "school"? Yes.
          const isMatch = keywords.some(k => placeCat.includes(k));

          if (!isMatch) {
            return; // Skip this place (Hide it)
          }
        }

        if (!place.icon && !place.categoryIcon) {
          // Wrapper for positioning
          const markerContainer = document.createElement('div');

          // Breathing inner element
          const markerInner = document.createElement('div');
          Object.assign(markerInner.style, {
            width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#8b5cf6',
            border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', opacity: '0.7', cursor: 'pointer'
          });

          markerInner.classList.add('animate-marker-breathe');
          markerContainer.appendChild(markerInner);

          const marker = new mapboxgl.Marker(markerContainer)
            .setLngLat(place.coordinates)
            .addTo(mapRef.current);

          // Shared Popup Logic (Simplified for this block)
          const showPlacePopup = async () => {
            // ... logic to show popover (reused from existing logic if possible, or simplified inline)
            // For minimal code duplication, we assume the existing pattern:
            const categoryColor = place.categoryColor || '#8b5cf6';
            if (nearbyPlacePopupRef.current) nearbyPlacePopupRef.current.remove();

            const popup = new mapboxgl.Popup({
              offset: MAPBOX_CONFIG.POPUP_OFFSET,
              closeButton: true,
              closeOnClick: false,
              className: 'nearby-popup-premium'
            })
              .setLngLat(place.coordinates)
              .setHTML(`<div class="bg-white p-2 rounded shadow">Loading...</div>`) // Placeholder
              .addTo(mapRef.current);

            nearbyPlacePopupRef.current = popup;
            popupsRef.current.push(popup);

            // Async update... (Keeping it simple for the HTML marker path as it's rare)
            try {
              const result = await getDistanceAndDuration(clientBuilding.coordinates, place.coordinates);
              if (result && nearbyPlacePopupRef.current === popup) {
                popup.setHTML(`<div class="bg-white p-2 rounded shadow"><b>${place.title}</b><br>${formatDistance(result.distance)}</div>`);
              }
            } catch (e) { }
          };

          markerEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (nearbyPlacePopupRef.current && nearbyPlacePopupRef.current.placeId === place.id) {
              nearbyPlacePopupRef.current.remove();
              nearbyPlacePopupRef.current = null;
            } else {
              showPlacePopup();
            }
          });

          markerEl.addEventListener('mouseenter', () => showPlacePopup());
          markerEl.addEventListener('mouseleave', () => {
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

    };

    updateMarkers();
  }, [landmarks, nearbyPlaces, clientBuilding, project, loadCustomIcons, navigateToLandmark, handleNearbyPlaceLeave, getDistanceAndDuration, isMapLoaded, theme, selectedLandmark, isRouteAnimationComplete]);

  /**
   * Dim other landmarks when one is selected (focused view)
   * Creates a visual hierarchy highlighting the active route
   */
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Apply visual dimming to non-selected landmarks
    if (selectedLandmark) {
      // Dim landmark icons (symbol layer)
      if (mapRef.current.getLayer(LAYER_IDS.LANDMARKS)) {
        mapRef.current.setPaintProperty(LAYER_IDS.LANDMARKS, 'icon-opacity', [
          'case',
          ['==', ['get', 'id'], selectedLandmark.id],
          1,     // Selected landmark: full opacity
          0.25   // Other landmarks: dimmed
        ]);
      }

      // Dim HTML markers (nearby places) - add dim class
      markersRef.current.forEach(marker => {
        const el = marker.getElement();
        if (el) {
          el.style.opacity = '0.3';
          el.style.filter = 'grayscale(70%)';
          el.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
        }
      });
    } else {
      // Restore full visibility when no landmark is selected
      if (mapRef.current.getLayer(LAYER_IDS.LANDMARKS)) {
        mapRef.current.setPaintProperty(LAYER_IDS.LANDMARKS, 'icon-opacity', 1);
      }

      // Restore HTML markers
      markersRef.current.forEach(marker => {
        const el = marker.getElement();
        if (el) {
          el.style.opacity = '1';
          el.style.filter = 'none';
        }
      });
    }
  }, [selectedLandmark, isMapLoaded]);

  /**
   * Close landmark card handler
   */
  const handleCloseCard = useCallback(() => {
    setShowLandmarkCard(false);
    setSelectedLandmark(null);
    clearRoute();
  }, [clearRoute]);

  /**
   * Reset camera to default view (using configured center from Camera Preview)
   * MUST match the initial animation flyTo parameters exactly
   */
  const resetCamera = useCallback(() => {
    if (!mapRef.current) return;

    const config = getMapConfig();

    // Pitch based on viewMode (same logic as initial animation)
    const targetPitch = viewModeRef.current === 'tilted' ? config.defaultPitch : 0;

    // Use ?? instead of || to handle bearing of 0 correctly
    const targetBearing = config.defaultBearing ?? 0;

    // Reset any map padding set by fitBounds before flying to default view
    mapRef.current.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });

    // Check if auto-fit bounds is enabled
    if (config.autoFitBounds) {
      const markersBounds = calculateAllMarkersBounds();
      if (markersBounds) {
        console.log('🔄 RESET_CAMERA: Using fitBounds (autoFitBounds enabled)', {
          bounds: markersBounds,
          padding: config.autoFitPadding,
          pitch: targetPitch,
          bearing: targetBearing,
          viewMode: viewModeRef.current
        });

        mapRef.current.fitBounds(markersBounds, {
          padding: config.autoFitPadding,
          pitch: targetPitch,
          bearing: targetBearing,
          duration: 2000,
          essential: true,
          maxZoom: config.defaultZoom
        });
      } else {
        // Fallback to flyTo if no markers
        mapRef.current.flyTo({
          center: config.center,
          zoom: config.defaultZoom,
          pitch: targetPitch,
          bearing: targetBearing,
          duration: 2000,
          essential: true
        });
      }
    } else {
      // Original behavior: flyTo with fixed zoom
      console.log('🔄 RESET_CAMERA: Flying to configured position:', {
        center: config.center,
        zoom: config.defaultZoom,
        pitch: targetPitch,
        bearing: targetBearing,
        viewMode: viewModeRef.current
      });

      mapRef.current.flyTo({
        center: config.center,
        zoom: config.defaultZoom,
        pitch: targetPitch,
        bearing: targetBearing,
        duration: 2000,
        essential: true
      });
    }
  }, [getMapConfig, calculateAllMarkersBounds]);

  /**
   * Expose functionality via refs or context if needed in future
   */

  // Restore Keyboard Shortcuts
  useMapKeyboardShortcuts({
    mapRef,
    resetCamera,
    setViewMode,
    closeLandmarkCard: handleCloseCard,
    enabled: true
  });

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

      {/* Top Right Controls Container */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-40 flex flex-col items-end gap-3 pointer-events-none">

        {/* View Mode Toggle - Uses filter glass theme controls */}
        <div
          className="view-mode-toggle flex rounded-lg p-1 border shadow-lg pointer-events-auto transition-all duration-300"
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

        {/* Start Journey Button - Redesigned & Relocated */}
        {!isTourActive && !showLandmarkCard && landmarks.length > 0 && !!mapSettings?.enableCinematicJourney && (
          <button
            onClick={() => {
              const config = getMapConfig();
              const outroSettings = {
                center: config.center,
                zoom: config.defaultZoom,
                pitch: viewMode === 'tilted' ? config.defaultPitch : 0,
                bearing: config.defaultBearing ?? 0
              };
              startTour(mapRef.current, clientBuilding, landmarks, outroSettings);
            }}
            className="px-4 py-2 rounded-lg border shadow-lg font-bold text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105 pointer-events-auto flex items-center gap-2"
            style={{
              backgroundColor: theme.filterGlassEnabled !== false
                ? `${theme.filterTertiary || theme.tertiary || '#ffffff'}${Math.round((theme.filterGlassOpacity ?? 25) * 2.55).toString(16).padStart(2, '0')}`
                : `${theme.filterTertiary || theme.tertiary || '#ffffff'}${Math.round((theme.filterTertiaryOpacity ?? 100) * 2.55).toString(16).padStart(2, '0')}`,
              borderColor: `${theme.filterTertiary || theme.tertiary || '#ffffff'}${Math.round((theme.filterBorderOpacity ?? 35) * 2.55).toString(16).padStart(2, '0')}`,
              color: theme.filterSecondary || theme.secondary || '#ffffff',
              ...(theme.filterGlassEnabled !== false && {
                backdropFilter: `blur(${theme.filterGlassBlur ?? 50}px) saturate(${theme.filterGlassSaturation ?? 200}%)`,
                WebkitBackdropFilter: `blur(${theme.filterGlassBlur ?? 50}px) saturate(${theme.filterGlassSaturation ?? 200}%)`,
              }),
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: theme.filterPrimary || theme.primary }}></span>
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: theme.filterPrimary || theme.primary }}></span>
            </span>
            Start Journey
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
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

      {/* Unified Map Controls Container */}
      <MapControlsContainer
        leftControls={
          <>
            <RecenterButton onClick={resetCamera} theme={theme} />
            <FullScreenButton theme={theme} />
          </>
        }
        rightControls={
          <>
            {/* Chat Interface */}
            <ChatContainer
              project={project}
              externalFilter={externalCategoryFilter}
              onFilterChange={setExternalCategoryFilter}
              theme={theme}
            />

            {/* Compass */}
            <Compass
              bearing={currentBearing}
              onResetNorth={() => {
                if (mapRef.current) {
                  mapRef.current.easeTo({
                    bearing: 0,
                    duration: 500,
                    essential: true
                  });
                }
              }}
              theme={theme}
            />
          </>
        }
        card={
          <LandmarkCard
            landmark={selectedLandmark}
            clientBuilding={clientBuilding}
            onClose={handleCloseCard}
            isVisible={showLandmarkCard}
            theme={theme}
            staticLayout={true}
          />
        }
      />

      {/* Outer Ring Road Animation - Main Driver of the Sequence */}
      <RoadTracer
        mapRef={mapRef}
        isMapLoaded={isMapLoaded}
        isActive={isInitialCameraAnimationComplete && !isTourActive && !isRouteAnimationComplete}
        onAnimationComplete={handleRouteAnimationComplete}
        performanceTier={performanceTier}
        animationMode="parallel"
      />
    </>
  );
}