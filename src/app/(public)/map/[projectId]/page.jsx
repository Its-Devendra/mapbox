"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MapContainer from '@/components/MapContainer';
import ProjectLogo from '@/components/ProjectLogo';
import FilterBar from '@/components/FilterBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { validateAndTransformMarker, fetchWithTimeout, retryWithBackoff } from '@/utils/mapUtils';
import { apiResponseCache } from '@/utils/cache';
import { MAPBOX_CONFIG, ERROR_MESSAGES } from '@/constants/mapConfig';

function MapPageContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId;

  const [project, setProject] = useState(null);
  const [projectTheme, setProjectTheme] = useState(null);
  const [mapSettings, setMapSettings] = useState(null);
  const [landmarks, setLandmarks] = useState([]);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState([]);

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
        // Check cache first
        const cacheKey = `project-data-${projectId}`;
        const cached = apiResponseCache.get(cacheKey);

        if (cached) {
          setProject(cached.project);
          setProjectTheme(cached.theme);
          setMapSettings(cached.settings);
          setLandmarks(cached.landmarks);
          setNearbyPlaces(cached.nearbyPlaces);
          setCategories(cached.categories);
          setLoading(false);
          return;
        }

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
        if (themesRes.status === 'fulfilled' && themesRes.value.ok) {
          const themesResponse = await themesRes.value.json();
          const themesData = Array.isArray(themesResponse) ? themesResponse : (themesResponse.items || themesResponse.themes || []);
          const theme = themesData.find(t => t.isActive && t.projectId === projectId);
          if (theme) {
            activeTheme = {
              primary: theme.primary,
              secondary: theme.secondary,
              tertiary: '#64748b',
              quaternary: '#f1f5f9',
              mapboxStyle: theme.mapboxStyle
            };
            setProjectTheme(activeTheme);
          }
        } else {
          console.warn('Failed to load themes, using defaults');
        }

        // Handle map settings (important for coordinates)
        let settings = null;
        if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
          const settingsResponse = await settingsRes.value.json();
          const settingsData = Array.isArray(settingsResponse) ? settingsResponse : (settingsResponse.items || settingsResponse.settings || []);
          const activeSetting = settingsData.find(s => s.isActive && s.projectId === projectId);
          if (activeSetting) {
            settings = activeSetting;
            setMapSettings(activeSetting);
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

    if (!activeFilter || activeFilter.length === 0 || (activeFilter.length === 1 && activeFilter[0] === 'All')) {
      return landmarks;
    }

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

    if (!activeFilter || activeFilter.length === 0 || (activeFilter.length === 1 && activeFilter[0] === 'All')) {
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

  return (
    <div className="flex flex-grow h-screen">
      {/* Main map area */}
      <div className="flex-1 relative">
        <MapContainer
          landmarks={filteredLandmarks}
          nearbyPlaces={filteredNearbyPlaces}
          clientBuilding={CLIENT_BUILDING}
          project={project}
          projectTheme={projectTheme}
          mapSettings={mapSettings}
        />

        {/* Project Logo */}
        <ProjectLogo
          logo={project?.logo}
          width={project?.logoWidth}
          height={project?.logoHeight}
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        categories={categories}
        onFilterChange={setActiveFilter}
        activeFilter={activeFilter}
        theme={projectTheme}
      />
    </div>
  );
}

// Wrap with Error Boundary
export default function MapPage() {
  return (
    <ErrorBoundary
      title="Map Loading Error"
      message="Failed to load the map. This might be due to a network issue or invalid project data."
      showHomeButton={true}
    >
      <MapPageContent />
    </ErrorBoundary>
  );
}