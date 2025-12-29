"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import MapContainer from '@/components/MapContainer';
import ProjectLogo from '@/components/ProjectLogo';
import FilterBar from '@/components/FilterBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import AspectRatioContainer from '@/components/AspectRatioContainer';
import { validateAndTransformMarker, fetchWithTimeout, retryWithBackoff } from '@/utils/mapUtils';
import { apiResponseCache } from '@/utils/cache';
import { MAPBOX_CONFIG, ERROR_MESSAGES } from '@/constants/mapConfig';
import { SyncProvider } from '@/context/SyncContext';
import { useFilterSync } from '@/hooks/useSyncHooks';
import { useAspectRatioSync } from '@/hooks/useAspectRatioSync';

function MapPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId;

  // Determine role from URL query param: ?role=receiver or ?role=controller
  const role = searchParams.get('role');
  const isReceiver = role === 'receiver';
  const isController = role === 'controller';
  const mapWrapperRef = useRef(null);

  const [project, setProject] = useState(null);
  const [projectTheme, setProjectTheme] = useState(null);
  const [filterTheme, setFilterTheme] = useState(null);
  const [mapSettings, setMapSettings] = useState(null);
  const [landmarks, setLandmarks] = useState([]);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState([]);

  // Filter sync - updates activeFilter when remote changes occur
  const { syncFilters } = useFilterSync({
    onFilterChange: setActiveFilter,
  });

  // Aspect ratio sync - receiver broadcasts, controller receives
  const { broadcastAspectRatio, broadcastWithCamera, receivedAspectRatio, receivedCamera } = useAspectRatioSync({
    isReceiver,
  });

  // Wrapper to sync filter changes to other screens
  const handleFilterChange = useCallback((newFilter) => {
    setActiveFilter(newFilter);
    syncFilters(newFilter);
  }, [syncFilters]);

  // Receiver: Broadcast aspect ratio when map wrapper dimensions are known
  useEffect(() => {
    if (!isReceiver || !mapWrapperRef.current) return;

    const broadcastDimensions = () => {
      const { offsetWidth, offsetHeight } = mapWrapperRef.current;
      if (offsetWidth > 0 && offsetHeight > 0) {
        broadcastAspectRatio(offsetWidth, offsetHeight);
      }
    };

    // Broadcast on mount
    broadcastDimensions();

    // Re-broadcast on resize
    const resizeObserver = new ResizeObserver(broadcastDimensions);
    resizeObserver.observe(mapWrapperRef.current);

    return () => resizeObserver.disconnect();
  }, [isReceiver, broadcastAspectRatio, loading]);

  // Callback for receiver to broadcast camera after initial animation
  const handleCameraReady = useCallback((camera) => {
    if (!isReceiver || !mapWrapperRef.current) return;
    const { offsetWidth, offsetHeight } = mapWrapperRef.current;
    if (offsetWidth > 0 && offsetHeight > 0) {
      console.log('📡 Page: Broadcasting viewport with camera:', camera);
      broadcastWithCamera(offsetWidth, offsetHeight, camera);
    }
  }, [isReceiver, broadcastWithCamera]);

  // Client building from project configuration or fallback to settings
  const CLIENT_BUILDING = React.useMemo(() => {
    if (!project) return null;

    // Use project's client building if configured
    if (project.clientBuildingLat && project.clientBuildingLng) {
      return {
        name: project.clientBuildingName || "Client Building",
        coordinates: [project.clientBuildingLng, project.clientBuildingLat],
        description: project.clientBuildingDescription || "Starting point for all directions"
      };
    }

    // Fallback to map settings if client building not configured
    if (mapSettings) {
      return {
        name: "Client Building",
        coordinates: [mapSettings.defaultCenterLng, mapSettings.defaultCenterLat],
        description: "Starting point for all directions"
      };
    }

    // Final fallback to default config
    return {
      name: "Client Building",
      coordinates: [MAPBOX_CONFIG.DEFAULT_CENTER.lng, MAPBOX_CONFIG.DEFAULT_CENTER.lat],
      description: "Starting point for all directions"
    };
  }, [project, mapSettings]);

  // Fetch project and its data based on projectId from URL
  useEffect(() => {
    const fetchProjectData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check cache first (but always refresh settings for latest values)
        const cacheKey = `project-data-${projectId}`;
        const cached = apiResponseCache.get(cacheKey);

        // Clear cache for fresh settings data (settings change frequently)
        if (cached) {
          console.log('🔄 Cache found, but refreshing for latest settings...');
          apiResponseCache.delete(cacheKey);
        }

        // Always fetch fresh data (removed early return from cache)

        // Parallel fetch with Promise.allSettled for graceful degradation
        const [
          projectRes,
          themesRes,
          landmarksRes,
          categoriesRes,
          nearbyRes,
          settingsRes
        ] = await Promise.allSettled([
          retryWithBackoff(() =>
            fetchWithTimeout(`/api/projects/${projectId}`)
          ),
          retryWithBackoff(() =>
            fetchWithTimeout(`/api/themes?projectId=${projectId}`)
          ),
          retryWithBackoff(() =>
            fetchWithTimeout(`/api/landmarks?projectId=${projectId}`)
          ),
          retryWithBackoff(() =>
            fetchWithTimeout(`/api/categories?projectId=${projectId}`)
          ),
          retryWithBackoff(() =>
            fetchWithTimeout(`/api/nearby?projectId=${projectId}`)
          ),
          retryWithBackoff(() =>
            fetchWithTimeout(`/api/mapSettings?projectId=${projectId}`)
          )
        ]);

        // Handle project fetch result (critical)
        if (projectRes.status === 'rejected' || !projectRes.value.ok) {
          if (projectRes.value?.status === 404) {
            setError(ERROR_MESSAGES.PROJECT_NOT_FOUND);
            return;
          }
          throw new Error('Failed to fetch project');
        }

        const projectData = await projectRes.value.json();

        // Check if project is active
        if (!projectData.isActive) {
          setError(ERROR_MESSAGES.PROJECT_INACTIVE);
          return;
        }

        setProject(projectData);

        // Handle themes (important but not critical)
        let activeTheme = null;
        let activeFilterTheme = null;
        if (themesRes.status === 'fulfilled' && themesRes.value.ok) {
          const themesResponse = await themesRes.value.json();
          const themesData = Array.isArray(themesResponse) ? themesResponse : (themesResponse.items || themesResponse.themes || []);
          const theme = themesData.find(t => t.isActive && t.projectId === projectId);
          if (theme) {
            // Landmark Theme (Standard fields + glass controls + nearby controls)
            activeTheme = {
              primary: theme.primary,
              secondary: theme.secondary,
              tertiary: theme.tertiary || '#ffffff',
              quaternary: theme.quaternary || '#f1f5f9',
              mapboxStyle: theme.mapboxStyle,
              // Landmark Glass Controls
              landmarkGlassEnabled: theme.landmarkGlassEnabled ?? true,
              landmarkGlassBlur: theme.landmarkGlassBlur ?? 50,
              landmarkGlassSaturation: theme.landmarkGlassSaturation ?? 200,
              landmarkGlassOpacity: theme.landmarkGlassOpacity ?? 25,
              landmarkBorderOpacity: theme.landmarkBorderOpacity ?? 35,
              primaryOpacity: theme.primaryOpacity ?? 100,
              secondaryOpacity: theme.secondaryOpacity ?? 100,
              tertiaryOpacity: theme.tertiaryOpacity ?? 100,
              // Nearby Tooltip Glass Controls
              nearbyGlassEnabled: theme.nearbyGlassEnabled ?? true,
              nearbyGlassBlur: theme.nearbyGlassBlur ?? 50,
              nearbyGlassSaturation: theme.nearbyGlassSaturation ?? 200,
              nearbyGlassOpacity: theme.nearbyGlassOpacity ?? 25,
              nearbyBorderOpacity: theme.nearbyBorderOpacity ?? 35,
              nearbyPrimaryOpacity: theme.nearbyPrimaryOpacity ?? 100,
              nearbySecondaryOpacity: theme.nearbySecondaryOpacity ?? 100,
              nearbyTertiaryOpacity: theme.nearbyTertiaryOpacity ?? 100,
              // Nearby Tooltip Colors
              nearbyPrimary: theme.nearbyPrimary || '#ffffff',
              nearbySecondary: theme.nearbySecondary || '#1e3a8a',
              nearbyTertiary: theme.nearbyTertiary || '#3b82f6',
            };

            // Filter Theme (Filter specific fields + glass controls)
            activeFilterTheme = {
              primary: theme.filterPrimary || theme.primary,
              secondary: theme.filterSecondary || theme.secondary,
              tertiary: theme.filterTertiary || theme.tertiary || '#ffffff',
              quaternary: theme.filterQuaternary || theme.quaternary || '#f1f5f9',
              // Filter Glass Controls
              filterGlassEnabled: theme.filterGlassEnabled ?? true,
              filterGlassBlur: theme.filterGlassBlur ?? 50,
              filterGlassSaturation: theme.filterGlassSaturation ?? 200,
              filterGlassOpacity: theme.filterGlassOpacity ?? 25,
              filterBorderOpacity: theme.filterBorderOpacity ?? 35,
              filterPrimaryOpacity: theme.filterPrimaryOpacity ?? 100,
              filterSecondaryOpacity: theme.filterSecondaryOpacity ?? 100,
              filterTertiaryOpacity: theme.filterTertiaryOpacity ?? 100,
            };

            setProjectTheme(activeTheme);
            setFilterTheme(activeFilterTheme);
          }
        } else {
          console.warn('Failed to load themes, using defaults');
        }

        // Handle map settings (important for coordinates)
        let settings = null;
        if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
          const settingsResponse = await settingsRes.value.json();
          const settingsData = Array.isArray(settingsResponse) ? settingsResponse : (settingsResponse.items || settingsResponse.settings || []);
          console.log('📋 All Map Settings:', settingsData);
          const activeSetting = settingsData.find(s => s.isActive && s.projectId === projectId);
          if (activeSetting) {
            console.log('✅ Active Map Setting Found:', {
              id: activeSetting.id,
              zoom: activeSetting.defaultZoom,
              center: [activeSetting.defaultCenterLng, activeSetting.defaultCenterLat],
              useDefaultCamera: activeSetting.useDefaultCameraAfterLoad,
              pitch: activeSetting.defaultPitch,
              bearing: activeSetting.defaultBearing,
              bounds: activeSetting.southWestLat ? 'Set' : 'None',
              maxPanDistanceKm: activeSetting.maxPanDistanceKm || 'Not set',
              panCenter: activeSetting.panCenterLat ? [activeSetting.panCenterLng, activeSetting.panCenterLat] : 'Using client building'
            });
            settings = activeSetting;
            setMapSettings(activeSetting);
          } else {
            console.warn('⚠️ No active map setting found for project:', projectId);
          }
        } else {
          console.warn('Failed to load settings, using defaults');
        }

        // Handle landmarks (can be empty)
        let transformedLandmarks = [];
        if (landmarksRes.status === 'fulfilled' && landmarksRes.value.ok) {
          const landmarksResponse = await landmarksRes.value.json();
          const landmarksData = Array.isArray(landmarksResponse) ? landmarksResponse : (landmarksResponse.landmarks || landmarksResponse.items || []);

          // Validate and transform landmarks
          transformedLandmarks = landmarksData
            .map(landmark => validateAndTransformMarker({
              ...landmark,
              category: typeof landmark.category === 'object'
                ? landmark.category?.name
                : landmark.category
            }))
            .filter(Boolean); // Remove null values

          setLandmarks(transformedLandmarks);
        } else {
          console.warn('Failed to load landmarks');
        }

        // Handle nearby places (can be empty)
        let transformedNearbyPlaces = [];
        if (nearbyRes.status === 'fulfilled' && nearbyRes.value.ok) {
          const nearbyResponse = await nearbyRes.value.json();
          const nearbyData = Array.isArray(nearbyResponse) ? nearbyResponse : (nearbyResponse.places || nearbyResponse.nearby || nearbyResponse.items || []);

          // Validate and transform nearby places
          transformedNearbyPlaces = nearbyData
            .map(place => validateAndTransformMarker({
              ...place,
              categoryName: typeof place.category === 'object'
                ? place.category?.name
                : place.category,
              categoryIcon: typeof place.category === 'object'
                ? place.category?.icon
                : null,
              categoryColor: place.color || (typeof place.category === 'object'
                ? place.category?.color
                : null)
            }))
            .filter(Boolean);

          setNearbyPlaces(transformedNearbyPlaces);
        } else {
          console.warn('Failed to load nearby places');
        }

        // Handle categories (can be empty)
        let categoriesDataParsed = [];
        if (categoriesRes.status === 'fulfilled' && categoriesRes.value.ok) {
          const categoriesResponse = await categoriesRes.value.json();
          const categoriesData = Array.isArray(categoriesResponse) ? categoriesResponse : (categoriesResponse.categories || categoriesResponse.items || []);
          categoriesDataParsed = categoriesData;
          setCategories(categoriesData);
        } else {
          console.warn('Failed to load categories');
        }

        // Cache the successful result
        apiResponseCache.set(cacheKey, {
          project: projectData,
          theme: activeTheme,
          filterTheme: activeFilterTheme,
          settings,
          landmarks: transformedLandmarks,
          nearbyPlaces: transformedNearbyPlaces,
          categories: categoriesDataParsed
        }, 60000); // Cache for 1 minute

      } catch (error) {
        console.error('Error fetching project data:', error);
        setError(error.message || ERROR_MESSAGES.API_ERROR);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectData();
    }
  }, [projectId, retryCount]);

  // Retry handler
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Derive unique category names from categories
  const categoryNames = [...new Set(categories.map((cat) => cat.name))];

  // Filter landmarks based on the active filter (now supports multi-select)
  const filteredLandmarks = React.useMemo(() => {
    if (!landmarks.length) return [];

    // HideAll: User explicitly clicked to hide all landmarks
    if (activeFilter.includes('HideAll')) {
      return [];
    }

    // Show all landmarks when no filter is active (default state)
    if (!activeFilter || activeFilter.length === 0) {
      return landmarks;
    }

    // Filter by selected categories
    const filtered = landmarks.filter((landmark) => {
      if (!landmark.category) return false;
      // Loose comparison just in case of formatting diffs
      const match = activeFilter.some(filterName =>
        String(filterName).trim().toLowerCase() === String(landmark.category).trim().toLowerCase()
      );
      return match;
    });

    return filtered;
  }, [activeFilter, landmarks]);

  // Filter nearby places based on the active filter
  const filteredNearbyPlaces = React.useMemo(() => {
    if (!nearbyPlaces.length) return [];

    // HideAll: User explicitly clicked to hide all landmarks
    if (activeFilter.includes('HideAll')) {
      return [];
    }

    // Show all nearby places when no filter is active (default state)
    if (!activeFilter || activeFilter.length === 0) {
      return nearbyPlaces;
    }

    return nearbyPlaces.filter((place) => {
      // nearbyPlaces use 'categoryName' instead of 'category'
      const category = place.categoryName || place.category;
      if (!category) return false;

      return activeFilter.some(filterName =>
        String(filterName).trim().toLowerCase() === String(category).trim().toLowerCase()
      );
    });
  }, [activeFilter, nearbyPlaces]);

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="flex flex-grow items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading map...</p>
          <p className="text-gray-500 text-sm mt-2">Fetching project data</p>
        </div>
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <div className="flex flex-grow items-center justify-center bg-gray-100">
        <div className="text-center max-w-md bg-white rounded-2xl shadow-lg p-8">
          <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
          <p className="text-gray-600 mb-6">Please check the project ID and try again.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-full transition-colors font-medium cursor-pointer inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-full transition-colors font-medium cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate target aspect ratio for controllers
  const targetAspectRatio = receivedAspectRatio?.ratio || null;

  // Debug logging for aspect ratio sync
  console.log('🎯 Aspect Ratio Debug:', {
    role,
    isReceiver,
    isController,
    receivedAspectRatio,
    receivedCamera,
    targetAspectRatio,
    shouldApply: isController && !!targetAspectRatio
  });

  // Visible debug overlay for controller (remove after testing)
  const debugOverlay = isController && (
    <div style={{
      position: 'fixed',
      top: 10,
      left: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'lime',
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      borderRadius: '5px',
      maxWidth: '300px'
    }}>
      <div>📐 Ratio: {receivedAspectRatio?.ratio?.toFixed(2) || 'null'}</div>
      <div>📍 Camera: {receivedCamera ? `z${receivedCamera.zoom?.toFixed(1)}` : 'null'}</div>
      <div>🎯 Target: {targetAspectRatio?.toFixed(2) || 'null'}</div>
    </div>
  );

  return (
    <div className="flex flex-grow h-screen">
      {debugOverlay}
      {/* Main map area - wrapped with aspect ratio container for controllers */}
      <div className="flex-1 relative" ref={mapWrapperRef}>
        <AspectRatioContainer
          targetAspectRatio={targetAspectRatio}
          enabled={isController && !!targetAspectRatio}
          backgroundColor="#1a1a2e"
        >
          <MapContainer
            landmarks={filteredLandmarks}
            nearbyPlaces={filteredNearbyPlaces}
            clientBuilding={CLIENT_BUILDING}
            project={project}
            introAudio={project.introAudio}
            projectTheme={projectTheme}
            mapSettings={mapSettings}
            syncedCamera={isController ? receivedCamera : null}
            isReceiver={isReceiver}
            onCameraReady={isReceiver ? handleCameraReady : null}
          />

          {/* Project Logo (Left) */}
          <ProjectLogo
            logo={project?.logo}
            width={project?.logoWidth}
            height={project?.logoHeight}
            position="left"
            theme={projectTheme}
          />

          {/* Secondary Logo (Right) */}
          <ProjectLogo
            logo={project?.secondaryLogo}
            width={project?.secondaryLogoWidth}
            height={project?.secondaryLogoHeight}
            position="right"
            theme={projectTheme}
          />
        </AspectRatioContainer>
      </div>

      {/* Filter Bar */}
      <FilterBar
        categories={categories}
        onFilterChange={handleFilterChange}
        activeFilter={activeFilter}
        theme={filterTheme || projectTheme} // Fallback to projectTheme if filterTheme not set
      />
    </div>
  );
}

// Wrap with Error Boundary and SyncProvider
export default function MapPage() {
  const params = useParams();
  const projectId = params.projectId;

  // Room ID for socket sync - all viewers of same project will be in same room
  const roomId = projectId ? `mapbox-${projectId}` : null;

  return (
    <ErrorBoundary
      title="Map Loading Error"
      message="Failed to load the map. This might be due to a network issue or invalid project data."
      showHomeButton={true}
    >
      <SyncProvider roomId={roomId} roomName={`Map: ${projectId}`}>
        <MapPageContent />
      </SyncProvider>
    </ErrorBoundary>
  );
}