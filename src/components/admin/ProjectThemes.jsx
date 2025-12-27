'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useTheme } from '@/context/ThemeContext';
import { Plus, Edit, Trash2, Palette, CheckCircle2, XCircle, Eye, MapPin, X, ChevronLeft, ChevronRight, Folder, Utensils, Car, Building, Wand2 } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import StyleBuilderAgent from './StyleBuilderAgent';
import LandmarkCard from '../LandmarkCard';
import FilterBar from '../FilterBar';

// Mock Data for Preview
const MOCK_LANDMARK = {
  id: 'preview-1',
  title: 'Example Landmark',
  description: 'This preview demonstrates the glassmorphism effects. Adjust blur, saturation, and opacity to see changes in real-time.',
  image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
  category: { name: 'Office' },
  coordinates: [0, 0] // Dummy coordinates
};

const MOCK_CATEGORIES = [
  { name: 'Offices', icon: '🏢' },
  { name: 'Dining', icon: '🍽️' },
  { name: 'Parking', icon: '🚗' },
  { name: 'Gym', icon: '💪' }
];

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  "pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNfGX8wp_w";

export default function ProjectThemes({ projectId }) {
  const { theme } = useTheme();
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [showStyleAgent, setShowStyleAgent] = useState(false);

  const [formData, setFormData] = useState({
    primary: '#1e3a8a',
    secondary: '#ffffff',
    tertiary: '#ffffff',
    quaternary: '#f1f5f9',
    filterPrimary: '#1e3a8a',
    filterSecondary: '#ffffff',
    filterTertiary: '#ffffff',
    mapboxStyle: 'mapbox://styles/mapbox/streets-v12',
    customStyle: '',
    isActive: false,
    // Filter Section Glass Controls
    filterGlassEnabled: true,
    filterGlassBlur: 50,
    filterGlassSaturation: 200,
    filterGlassOpacity: 25,
    filterBorderOpacity: 35,
    filterPrimaryOpacity: 100,
    filterSecondaryOpacity: 100,
    filterTertiaryOpacity: 100,
    // Landmark Card Glass Controls
    landmarkGlassEnabled: true,
    landmarkGlassBlur: 50,
    landmarkGlassSaturation: 200,
    landmarkGlassOpacity: 25,
    landmarkBorderOpacity: 35,
    primaryOpacity: 100,
    secondaryOpacity: 100,
    tertiaryOpacity: 100,
    // Nearby Tooltip Glass Controls
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
    nearbyTertiary: '#3b82f6',
  });

  useEffect(() => {
    fetchThemes();
  }, [projectId]);

  const fetchThemes = async () => {
    try {
      const response = await fetch('/api/themes');
      if (response.ok) {
        const data = await response.json();
        const projectThemes = data.filter(t => t.projectId === projectId);
        setThemes(projectThemes);
      }
    } catch (error) {
      console.error('Error fetching themes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingTheme ? `/api/themes/${editingTheme.id}` : '/api/themes';
      const method = editingTheme ? 'PUT' : 'POST';

      let finalMapboxStyle = formData.mapboxStyle;

      if (formData.mapboxStyle === 'custom') {
        // Convert the custom style URL to the correct format
        finalMapboxStyle = convertToMapboxStyleUrl(formData.customStyle);

        if (!finalMapboxStyle) {
          toast.error('Invalid Mapbox style URL. Please enter a valid URL in the format: mapbox://styles/username/style-id or paste an API URL');
          return;
        }
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary: formData.primary,
          secondary: formData.secondary,
          tertiary: formData.tertiary,
          quaternary: formData.quaternary,
          filterPrimary: formData.filterPrimary || formData.primary,
          filterSecondary: formData.filterSecondary || formData.secondary,
          filterTertiary: formData.filterTertiary || formData.tertiary,
          filterQuaternary: formData.quaternary,
          mapboxStyle: finalMapboxStyle,
          isActive: formData.isActive,
          projectId: projectId,
          // Filter Section Glass Controls
          filterGlassEnabled: formData.filterGlassEnabled,
          filterGlassBlur: parseInt(formData.filterGlassBlur) || 50,
          filterGlassSaturation: parseInt(formData.filterGlassSaturation) || 200,
          filterGlassOpacity: parseInt(formData.filterGlassOpacity) || 25,
          filterBorderOpacity: parseInt(formData.filterBorderOpacity) || 35,
          filterPrimaryOpacity: parseInt(formData.filterPrimaryOpacity) || 100,
          filterSecondaryOpacity: parseInt(formData.filterSecondaryOpacity) || 100,
          filterTertiaryOpacity: parseInt(formData.filterTertiaryOpacity) || 100,
          // Landmark Card Glass Controls
          landmarkGlassEnabled: formData.landmarkGlassEnabled,
          landmarkGlassBlur: parseInt(formData.landmarkGlassBlur) || 50,
          landmarkGlassSaturation: parseInt(formData.landmarkGlassSaturation) || 200,
          landmarkGlassOpacity: parseInt(formData.landmarkGlassOpacity) || 25,
          landmarkBorderOpacity: parseInt(formData.landmarkBorderOpacity) || 35,
          primaryOpacity: parseInt(formData.primaryOpacity) || 100,
          primaryOpacity: parseInt(formData.primaryOpacity) || 100,
          secondaryOpacity: parseInt(formData.secondaryOpacity) || 100,
          tertiaryOpacity: parseInt(formData.tertiaryOpacity) || 100,
          // Nearby Tooltip Glass Controls
          nearbyGlassEnabled: formData.nearbyGlassEnabled,
          nearbyGlassBlur: parseInt(formData.nearbyGlassBlur) || 50,
          nearbyGlassSaturation: parseInt(formData.nearbyGlassSaturation) || 200,
          nearbyGlassOpacity: parseInt(formData.nearbyGlassOpacity) || 25,
          nearbyBorderOpacity: parseInt(formData.nearbyBorderOpacity) || 35,
          nearbyPrimaryOpacity: parseInt(formData.nearbyPrimaryOpacity) || 100,
          nearbySecondaryOpacity: parseInt(formData.nearbySecondaryOpacity) || 100,
          nearbyTertiaryOpacity: parseInt(formData.nearbyTertiaryOpacity) || 100,
          nearbyPrimary: formData.nearbyPrimary || '#ffffff',
          nearbySecondary: formData.nearbySecondary || '#1e3a8a',
          nearbyTertiary: formData.nearbyTertiary || '#3b82f6',
        }),
      });

      if (response.ok) {
        toast.success(editingTheme ? 'Theme updated successfully!' : 'Theme created successfully!');
        fetchThemes();
        setShowModal(false);
        setEditingTheme(null);
        resetForm();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to save theme');
      }
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Error saving theme');
    }
  };

  const handleEdit = (theme) => {
    setEditingTheme(theme);
    const isCustomStyle = !MAPBOX_STYLES.some(s => s.value === theme.mapboxStyle);
    setFormData({
      primary: theme.primary,
      secondary: theme.secondary,
      tertiary: theme.tertiary || '#ffffff',
      quaternary: theme.quaternary || '#f1f5f9',
      filterPrimary: theme.filterPrimary || theme.primary,
      filterSecondary: theme.filterSecondary || theme.secondary,
      filterTertiary: theme.filterTertiary || theme.tertiary || '#ffffff',
      mapboxStyle: isCustomStyle ? 'custom' : theme.mapboxStyle,
      customStyle: isCustomStyle ? theme.mapboxStyle : '',
      isActive: theme.isActive,
      // Filter Section Glass Controls
      filterGlassEnabled: theme.filterGlassEnabled ?? true,
      filterGlassBlur: theme.filterGlassBlur ?? 50,
      filterGlassSaturation: theme.filterGlassSaturation ?? 200,
      filterGlassOpacity: theme.filterGlassOpacity ?? 25,
      filterBorderOpacity: theme.filterBorderOpacity ?? 35,
      filterPrimaryOpacity: theme.filterPrimaryOpacity ?? 100,
      filterSecondaryOpacity: theme.filterSecondaryOpacity ?? 100,
      filterTertiaryOpacity: theme.filterTertiaryOpacity ?? 100,
      // Landmark Card Glass Controls
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
      nearbyPrimary: theme.nearbyPrimary || '#ffffff',
      nearbySecondary: theme.nearbySecondary || '#1e3a8a',
      nearbyTertiary: theme.nearbyTertiary || '#3b82f6',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this theme?')) {
      try {
        const response = await fetch(`/api/themes/${id}`, { method: 'DELETE' });
        if (response.ok) {
          toast.success('Theme deleted successfully!');
          fetchThemes();
        } else {
          toast.error('Failed to delete theme');
        }
      } catch (error) {
        console.error('Error deleting theme:', error);
        toast.error('Error deleting theme');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      primary: '#1e3a8a',
      secondary: '#ffffff',
      tertiary: '#ffffff',
      quaternary: '#f1f5f9',
      filterPrimary: '#1e3a8a',
      filterSecondary: '#ffffff',
      filterTertiary: '#ffffff',
      mapboxStyle: 'mapbox://styles/mapbox/streets-v12',
      customStyle: '',
      isActive: false,
      // Filter Section Glass Controls
      filterGlassEnabled: true,
      filterGlassBlur: 50,
      filterGlassSaturation: 200,
      filterGlassOpacity: 25,
      filterBorderOpacity: 35,
      filterPrimaryOpacity: 100,
      filterSecondaryOpacity: 100,
      filterTertiaryOpacity: 100,
      // Landmark Card Glass Controls
      landmarkGlassEnabled: true,
      landmarkGlassBlur: 50,
      landmarkGlassSaturation: 200,
      landmarkGlassOpacity: 25,
      landmarkBorderOpacity: 35,
      primaryOpacity: 100,
      secondaryOpacity: 100,
      tertiaryOpacity: 100,
      // Nearby Tooltip Glass Controls
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
      nearbyTertiary: '#3b82f6',
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Themes</h3>
          <p className="text-sm text-gray-500 mt-1">Customize map colors and visual styles</p>
        </div>
        <button
          onClick={() => { setEditingTheme(null); resetForm(); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-full transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          New Theme
        </button>
      </div>

      {/* AI Style Builder Agent Modal */}
      {showStyleAgent && (
        <StyleBuilderAgent
          onStyleGenerated={(styleConfig) => {
            setFormData(prev => ({
              ...prev,
              primary: styleConfig.primary || prev.primary,
              secondary: styleConfig.secondary || prev.secondary,
              mapboxStyle: styleConfig.mapboxStyle || prev.mapboxStyle
            }));
            setShowStyleAgent(false);
            setShowModal(true);
            toast.success('Style generated! Review and save your theme.');
          }}
          onClose={() => setShowStyleAgent(false)}
        />
      )}

      {themes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <div key={theme.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex -space-x-2 flex-shrink-0">
                    <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: theme.primary }} />
                    <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: theme.secondary }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm">Theme</h4>
                    <p className="text-xs text-gray-500 truncate" title={theme.mapboxStyle}>
                      {theme.mapboxStyle.replace('mapbox://styles/mapbox/', '').replace('mapbox://styles/', '')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(theme)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-pointer">
                    <Edit className="w-4 h-4" strokeWidth={2} />
                  </button>
                  <button onClick={() => handleDelete(theme.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Primary</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: theme.primary }} />
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{theme.primary}</code>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Secondary</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: theme.secondary }} />
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{theme.secondary}</code>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                {theme.isActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                    <XCircle className="w-3 h-3" strokeWidth={2} /> Inactive
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Palette className="w-12 h-12 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
          <h4 className="text-sm font-semibold text-gray-900 mb-2">No themes yet</h4>
          <p className="text-sm text-gray-500 mb-4">Create your first theme to customize the map appearance</p>
          <button
            onClick={() => { setEditingTheme(null); resetForm(); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-full transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2} /> Create Theme
          </button>
        </div>
      )}

      {/* Advanced Theme Editor Modal */}
      {showModal && (
        <ThemeEditorModal
          formData={formData}
          setFormData={setFormData}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          editingTheme={editingTheme}
          onClose={() => { setShowModal(false); setEditingTheme(null); resetForm(); }}
        />
      )}
    </div>
  );
}

// Mapbox style options
const MAPBOX_STYLES = [
  { value: 'mapbox://styles/mapbox/streets-v12', label: 'Streets' },
  { value: 'mapbox://styles/mapbox/satellite-v9', label: 'Satellite' },
  { value: 'mapbox://styles/mapbox/satellite-streets-v12', label: 'Satellite Streets' },
  { value: 'mapbox://styles/mapbox/light-v11', label: 'Light' },
  { value: 'mapbox://styles/mapbox/dark-v11', label: 'Dark' },
  { value: 'mapbox://styles/mapbox/outdoors-v12', label: 'Outdoors' },
  { value: 'mapbox://styles/mapbox/navigation-day-v1', label: 'Navigation Day' },
  { value: 'mapbox://styles/mapbox/navigation-night-v1', label: 'Navigation Night' },
  { value: 'custom', label: 'Custom Style URL' },
];

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

  // If it doesn't match any known format, return null
  return null;
}


/**
 * Theme Editor Modal Component
 * Features:
 * - Two swipeable preview cards (Landmark/Filter and Map)
 * - Auto-switch based on focused input
 * - Custom style URL support
 * - Live preview updates
 */
function ThemeEditorModal({ formData, setFormData, handleInputChange, handleSubmit, editingTheme, onClose }) {
  const [activePreview, setActivePreview] = useState(0); // 0 = Landmark, 1 = Filter, 2 = Nearby, 3 = Map

  // Refs for map preview
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const zoomIntervalRef = useRef(null);

  // Initialize map when switching to map preview
  useEffect(() => {
    if (activePreview === 3 && mapContainerRef.current && !mapRef.current) {
      const rawStyleUrl = formData.mapboxStyle === 'custom' ? formData.customStyle : formData.mapboxStyle;
      // Convert to proper mapbox:// format
      const styleUrl = convertToMapboxStyleUrl(rawStyleUrl) || rawStyleUrl;

      try {
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: styleUrl,
          center: [-74.006, 40.7128], // Default to NYC
          zoom: 12,
          attributionControl: false,
          interactive: false // Static preview
        });

        mapRef.current = map;

        map.on('load', () => {
          setMapLoaded(true);
          setMapError(false);

          // Add 3D buildings layer
          if (!map.getLayer('3d-buildings')) {
            map.addLayer({
              'id': '3d-buildings',
              'source': 'composite',
              'source-layer': 'building',
              'filter': ['==', 'extrude', 'true'],
              'type': 'fill-extrusion',
              'minzoom': 15,
              'paint': {
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
            });
          }

          // Simulate continuous slow zoom/pan for "alive" feel
          let direction = 1;
          let currentZoom = 12;

          zoomIntervalRef.current = setInterval(() => {
            // Simple gentle rotate
            const currentBearing = map.getBearing();
            map.easeTo({
              bearing: currentBearing + 0.1,
              duration: 100,
              easing: (t) => t
            });
          }, 100);

        });

        map.on('error', (e) => {
          console.error('Mapbox Preview Error:', e);
          setMapError(true);
        });

      } catch (err) {
        console.error('Map Init Error:', err);
        setMapError(true);
      }
    }

    // Cleanup zoom interval when leaving map preview
    if (activePreview !== 3 && zoomIntervalRef.current) {
      clearInterval(zoomIntervalRef.current);
      zoomIntervalRef.current = null;
    }

    return () => {
      // Only destroy map if component unmounts, or ideally keep it alive but we want to save resources
      // For now, we'll let it stay mounted in ref but pause animations
    };
  }, [activePreview]);

  // Update map style when form changes
  useEffect(() => {
    if (mapRef.current && activePreview === 3) {
      const rawStyleUrl = formData.mapboxStyle === 'custom' ? formData.customStyle : formData.mapboxStyle;
      const styleUrl = convertToMapboxStyleUrl(rawStyleUrl) || rawStyleUrl;

      if (styleUrl && styleUrl.includes('mapbox://')) {
        mapRef.current.setStyle(styleUrl);
      }
    }
  }, [formData.mapboxStyle, formData.customStyle, activePreview]);


  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (zoomIntervalRef.current) {
        clearInterval(zoomIntervalRef.current);
        zoomIntervalRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle color input focus - switch to landmark preview
  const handleColorFocus = () => {
    setActivePreview(0);
  };

  // Handle filter input focus - switch to filter preview
  const handleFilterFocus = () => {
    setActivePreview(1);
  };

  // Handle nearby input focus - switch to nearby preview
  const handleNearbyFocus = () => {
    setActivePreview(2);
  };

  // Handle map style focus - switch to map preview
  const handleMapStyleFocus = () => {
    setActivePreview(3);
  };

  // Handle map style change
  const handleMapStyleChange = (e) => {
    handleInputChange(e);
    setActivePreview(3);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] overflow-hidden shadow-2xl flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>

        {/* Left: Form */}
        <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-gray-100">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {editingTheme ? 'Edit Theme' : 'Create New Theme'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">Customize your map theme colors and style</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Landmark Section */}
            <div className="space-y-6 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-600" /> Landmark Card
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="landmarkGlassEnabled"
                    checked={formData.landmarkGlassEnabled}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="text-xs font-medium text-gray-600">Glass Effect</span>
                </label>
              </div>

              {/* Colors */}
              <div className="space-y-4">
                {/* Primary Color */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Primary Background</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <input
                        type="color"
                        name="primary"
                        value={formData.primary}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(0)}
                        className="h-10 w-10 cursor-pointer opacity-0 absolute inset-0 z-10"
                      />
                      <div
                        className="h-10 w-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                        style={{ backgroundColor: formData.primary }}
                      />
                    </div>
                    <input
                      type="text"
                      name="primary"
                      value={formData.primary}
                      onChange={handleInputChange}
                      onFocus={() => setActivePreview(0)}
                      className="flex-1 px-3 py-2 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:border-purple-500 focus:ring-0 text-sm font-mono transition-all"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Text & Icons</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <input
                        type="color"
                        name="secondary"
                        value={formData.secondary}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(0)}
                        className="h-10 w-10 cursor-pointer opacity-0 absolute inset-0 z-10"
                      />
                      <div
                        className="h-10 w-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                        style={{ backgroundColor: formData.secondary }}
                      />
                    </div>
                    <input
                      type="text"
                      name="secondary"
                      value={formData.secondary}
                      onChange={handleInputChange}
                      onFocus={() => setActivePreview(0)}
                      className="flex-1 px-3 py-2 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:border-purple-500 focus:ring-0 text-sm font-mono transition-all"
                    />
                  </div>
                </div>

                {/* Tertiary Color (Border/Accent) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Border / Accent</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <input
                        type="color"
                        name="tertiary"
                        value={formData.tertiary}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(0)}
                        className="h-10 w-10 cursor-pointer opacity-0 absolute inset-0 z-10"
                      />
                      <div
                        className="h-10 w-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                        style={{ backgroundColor: formData.tertiary }}
                      />
                    </div>
                    <input
                      type="text"
                      name="tertiary"
                      value={formData.tertiary}
                      onChange={handleInputChange}
                      onFocus={() => setActivePreview(0)}
                      className="flex-1 px-3 py-2 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:border-purple-500 focus:ring-0 text-sm font-mono transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Glass Settings */}
              {formData.landmarkGlassEnabled && (
                <div className="pt-4 border-t border-gray-100 space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Blur ({formData.landmarkGlassBlur}px)</label>
                      <input
                        type="range"
                        name="landmarkGlassBlur"
                        min="0"
                        max="100"
                        value={formData.landmarkGlassBlur}
                        onChange={handleInputChange}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Saturation ({formData.landmarkGlassSaturation}%)</label>
                      <input
                        type="range"
                        name="landmarkGlassSaturation"
                        min="100"
                        max="300"
                        value={formData.landmarkGlassSaturation}
                        onChange={handleInputChange}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">BG Opacity ({formData.landmarkGlassOpacity}%)</label>
                      <input
                        type="range"
                        name="landmarkGlassOpacity"
                        min="0"
                        max="100"
                        value={formData.landmarkGlassOpacity}
                        onChange={handleInputChange}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Border Opacity ({formData.landmarkBorderOpacity}%)</label>
                      <input
                        type="range"
                        name="landmarkBorderOpacity"
                        min="0"
                        max="100"
                        value={formData.landmarkBorderOpacity}
                        onChange={handleInputChange}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Section */}
            <div className="space-y-6 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-blue-600" /> Filter Bar
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="filterGlassEnabled"
                    checked={formData.filterGlassEnabled}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-xs font-medium text-gray-600">Glass Effect</span>
                </label>
              </div>

              {/* Colors */}
              <div className="space-y-4">
                {/* Active Background */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Active Background</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <input
                        type="color"
                        name="filterPrimary"
                        value={formData.filterPrimary}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(1)}
                        className="h-10 w-10 cursor-pointer opacity-0 absolute inset-0 z-10"
                      />
                      <div
                        className="h-10 w-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                        style={{ backgroundColor: formData.filterPrimary }}
                      />
                    </div>
                    <input
                      type="text"
                      name="filterPrimary"
                      value={formData.filterPrimary}
                      onChange={handleInputChange}
                      onFocus={() => setActivePreview(1)}
                      className="flex-1 px-3 py-2 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-0 text-sm font-mono transition-all"
                    />
                  </div>
                </div>

                {/* Active Text */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Active Text</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <input
                        type="color"
                        name="filterSecondary"
                        value={formData.filterSecondary}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(1)}
                        className="h-10 w-10 cursor-pointer opacity-0 absolute inset-0 z-10"
                      />
                      <div
                        className="h-10 w-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                        style={{ backgroundColor: formData.filterSecondary }}
                      />
                    </div>
                    <input
                      type="text"
                      name="filterSecondary"
                      value={formData.filterSecondary}
                      onChange={handleInputChange}
                      onFocus={() => setActivePreview(1)}
                      className="flex-1 px-3 py-2 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-0 text-sm font-mono transition-all"
                    />
                  </div>
                </div>

                {/* Inactive/Glass Color */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Glass / Inactive Base</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <input
                        type="color"
                        name="filterTertiary"
                        value={formData.filterTertiary}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(1)}
                        className="h-10 w-10 cursor-pointer opacity-0 absolute inset-0 z-10"
                      />
                      <div
                        className="h-10 w-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                        style={{ backgroundColor: formData.filterTertiary }}
                      />
                    </div>
                    <input
                      type="text"
                      name="filterTertiary"
                      value={formData.filterTertiary}
                      onChange={handleInputChange}
                      onFocus={() => setActivePreview(1)}
                      className="flex-1 px-3 py-2 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-0 text-sm font-mono transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Glass Settings */}
              {formData.filterGlassEnabled && (
                <div className="pt-4 border-t border-gray-100 space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Blur ({formData.filterGlassBlur}px)</label>
                      <input
                        type="range"
                        name="filterGlassBlur"
                        min="0"
                        max="100"
                        value={formData.filterGlassBlur}
                        onChange={handleInputChange}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Saturation ({formData.filterGlassSaturation}%)</label>
                      <input
                        type="range"
                        name="filterGlassSaturation"
                        min="100"
                        max="300"
                        value={formData.filterGlassSaturation}
                        onChange={handleInputChange}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">BG Opacity ({formData.filterGlassOpacity}%)</label>
                      <input
                        type="range"
                        name="filterGlassOpacity"
                        min="0"
                        max="100"
                        value={formData.filterGlassOpacity}
                        onChange={handleInputChange}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Border Opacity ({formData.filterBorderOpacity}%)</label>
                      <input
                        type="range"
                        name="filterBorderOpacity"
                        min="0"
                        max="100"
                        value={formData.filterBorderOpacity}
                        onChange={handleInputChange}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Nearby Tooltip Section */}
            <div className="space-y-6 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" /> Nearby Tooltip
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="nearbyGlassEnabled"
                    checked={formData.nearbyGlassEnabled}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-xs font-medium text-gray-600">Glass Effect</span>
                </label>
              </div>

              {/* Colors */}
              <div className="space-y-4">
                {/* Tooltip Background */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Background</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <input
                        type="color"
                        name="nearbyPrimary"
                        value={formData.nearbyPrimary}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(2)}
                        className="h-10 w-10 cursor-pointer opacity-0 absolute inset-0 z-10"
                      />
                      <div
                        className="h-10 w-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                        style={{ backgroundColor: formData.nearbyPrimary }}
                      />
                    </div>
                    <input
                      type="text"
                      name="nearbyPrimary"
                      value={formData.nearbyPrimary}
                      onChange={handleInputChange}
                      onFocus={() => setActivePreview(2)}
                      className="flex-1 px-3 py-2 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-0 text-sm font-mono transition-all"
                    />
                  </div>
                </div>

                {/* Tooltip Text */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Text</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <input
                        type="color"
                        name="nearbySecondary"
                        value={formData.nearbySecondary}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(2)}
                        className="h-10 w-10 cursor-pointer opacity-0 absolute inset-0 z-10"
                      />
                      <div
                        className="h-10 w-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                        style={{ backgroundColor: formData.nearbySecondary }}
                      />
                    </div>
                    <input
                      type="text"
                      name="nearbySecondary"
                      value={formData.nearbySecondary}
                      onChange={handleInputChange}
                      onFocus={() => setActivePreview(2)}
                      className="flex-1 px-3 py-2 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-0 text-sm font-mono transition-all"
                    />
                  </div>
                </div>

                {/* Tooltip Border/Accent */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Border / Accent</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <input
                        type="color"
                        name="nearbyTertiary"
                        value={formData.nearbyTertiary}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(2)}
                        className="h-10 w-10 cursor-pointer opacity-0 absolute inset-0 z-10"
                      />
                      <div
                        className="h-10 w-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                        style={{ backgroundColor: formData.nearbyTertiary }}
                      />
                    </div>
                    <input
                      type="text"
                      name="nearbyTertiary"
                      value={formData.nearbyTertiary}
                      onChange={handleInputChange}
                      onFocus={() => setActivePreview(2)}
                      className="flex-1 px-3 py-2 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-0 text-sm font-mono transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Glass / Opacity Controls */}
              <div className="space-y-4 pt-2 border-t border-gray-50">
                {formData.nearbyGlassEnabled ? (
                  <>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-medium text-gray-500">Blur Amount ({formData.nearbyGlassBlur}px)</label>
                      </div>
                      <input
                        type="range"
                        name="nearbyGlassBlur"
                        min="0"
                        max="100"
                        value={formData.nearbyGlassBlur}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(2)}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-medium text-gray-500">Saturation ({formData.nearbyGlassSaturation}%)</label>
                      </div>
                      <input
                        type="range"
                        name="nearbyGlassSaturation"
                        min="100"
                        max="300"
                        value={formData.nearbyGlassSaturation}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(2)}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-medium text-gray-500">BG Opacity ({formData.nearbyGlassOpacity}%)</label>
                      </div>
                      <input
                        type="range"
                        name="nearbyGlassOpacity"
                        min="0"
                        max="100"
                        value={formData.nearbyGlassOpacity}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(2)}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-medium text-gray-500">Border Opacity ({formData.nearbyBorderOpacity}%)</label>
                      </div>
                      <input
                        type="range"
                        name="nearbyBorderOpacity"
                        min="0"
                        max="100"
                        value={formData.nearbyBorderOpacity}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(2)}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-medium text-gray-500">Background Opacity ({formData.nearbyPrimaryOpacity}%)</label>
                      </div>
                      <input
                        type="range"
                        name="nearbyPrimaryOpacity"
                        min="0"
                        max="100"
                        value={formData.nearbyPrimaryOpacity}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(2)}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-medium text-gray-500">Text Opacity ({formData.nearbySecondaryOpacity}%)</label>
                      </div>
                      <input
                        type="range"
                        name="nearbySecondaryOpacity"
                        min="0"
                        max="100"
                        value={formData.nearbySecondaryOpacity}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(2)}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-medium text-gray-500">Border Opacity ({formData.nearbyTertiaryOpacity}%)</label>
                      </div>
                      <input
                        type="range"
                        name="nearbyTertiaryOpacity"
                        min="0"
                        max="100"
                        value={formData.nearbyTertiaryOpacity}
                        onChange={handleInputChange}
                        onFocus={() => setActivePreview(2)}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Map Style */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Mapbox Style</label>
              <select
                name="mapboxStyle"
                value={formData.mapboxStyle}
                onChange={handleMapStyleChange}
                onFocus={handleMapStyleFocus}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm cursor-pointer transition-all"
              >
                {MAPBOX_STYLES.map(style => (
                  <option key={style.value} value={style.value}>{style.label}</option>
                ))}
              </select>
            </div>

            {/* Custom Style URL Input */}
            {formData.mapboxStyle === 'custom' && (
              <div className="animate-fadeIn">
                <label className="block text-sm font-medium text-gray-900 mb-1">Custom Style URL</label>
                <p className="text-xs text-gray-500 mb-2">
                  Paste a Mapbox Studio share URL or enter in format: mapbox://styles/username/style-id
                </p>
                <input
                  type="text"
                  name="customStyle"
                  value={formData.customStyle}
                  onChange={handleInputChange}
                  onFocus={handleMapStyleFocus}
                  placeholder="Paste URL or mapbox://styles/username/style-id"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm font-mono transition-all"
                />
              </div>
            )}

            {/* Active Theme Checkbox */}
            <div className="flex items-center p-3 rounded-xl bg-gray-50/50 border border-gray-100">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              />
              <label className="ml-3 text-sm text-gray-700 cursor-pointer">Set as active theme</label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm rounded-xl transition-all cursor-pointer"
              >
                {editingTheme ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Preview Panel */}
        <div className="w-full md:w-1/2 bg-gray-100 relative overflow-hidden h-full">
          {/* Preview Header */}
          <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-gray-200/50">
            <span className="text-xs font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-gray-600" /> Live Preview
            </span>
          </div>

          {/* Preview Carousel Dots */}
          <div className="absolute top-4 right-4 z-20 flex gap-1.5">
            <button
              onClick={() => setActivePreview(0)}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${activePreview === 0 ? 'bg-gray-900 w-4' : 'bg-gray-400'}`}
            />
            <button
              onClick={() => setActivePreview(1)}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${activePreview === 1 ? 'bg-gray-900 w-4' : 'bg-gray-400'}`}
            />
            <button
              onClick={() => setActivePreview(2)}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${activePreview === 2 ? 'bg-gray-900 w-4' : 'bg-gray-400'}`}
            />
            <button
              onClick={() => setActivePreview(3)}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${activePreview === 3 ? 'bg-gray-900 w-4' : 'bg-gray-400'}`}
            />
          </div>

          {/* Preview Cards Container */}
          <div className="h-full w-full relative">

            {/* Card 0: Landmark Preview */}
            <div
              className={`absolute inset-0 transition-opacity duration-300 flex items-center justify-center p-6 ${activePreview === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            >
              {/* Landmark Card Preview */}
              <div className="w-full max-w-sm relative flex items-center justify-center">
                <LandmarkCard
                  landmark={MOCK_LANDMARK}
                  isVisible={true}
                  onClose={() => { }}
                  theme={formData}
                  className="!static !w-full !max-w-none !transform-none !transition-none" // Override fixed positioning
                  clientBuilding={null} // Disable distance calc
                />
              </div>
            </div>

            {/* Card 1: Filter Preview */}
            <div
              className={`absolute inset-0 transition-opacity duration-300 flex items-center justify-center p-6 ${activePreview === 1 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            >
              {/* Filter Bar Preview */}
              <div className="w-full max-w-md flex flex-col items-center justify-center">
                <div className="relative w-full">
                  <FilterBar
                    categories={MOCK_CATEGORIES}
                    activeFilter={['All']}
                    onFilterChange={() => { }}
                    theme={formData}
                    className="!static !w-full !max-w-none !transform-none !translate-x-0" // Override fixed positioning
                  />
                </div>
                <p className="text-center mt-12 text-gray-500 text-sm bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full">
                  Editing <strong>Filter Section</strong> appearance
                </p>
              </div>
            </div>

            {/* Card 2: Nearby Tooltip Preview */}
            <div
              className={`absolute inset-0 transition-opacity duration-300 flex items-center justify-center p-6 ${activePreview === 2 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            >
              {/* Nearby Tooltip Preview */}
              <div className="w-full max-w-sm flex flex-col items-center justify-center">
                <div className="relative">
                  {/* Tooltip Content */}
                  <div
                    className="rounded-lg shadow-lg overflow-hidden min-w-[200px]"
                    style={{
                      backgroundColor: formData.nearbyGlassEnabled
                        ? hexToRgba(formData.nearbyPrimary || '#ffffff', formData.nearbyGlassOpacity)
                        : hexToRgba(formData.nearbyPrimary || '#ffffff', formData.nearbyPrimaryOpacity),
                      backdropFilter: formData.nearbyGlassEnabled
                        ? `blur(${formData.nearbyGlassBlur}px) saturate(${formData.nearbyGlassSaturation}%)`
                        : 'none',
                      border: `1px solid ${hexToRgba(formData.nearbyTertiary || '#3b82f6', formData.nearbyGlassEnabled ? formData.nearbyBorderOpacity : formData.nearbyTertiaryOpacity)}`,
                    }}
                  >
                    {/* Top Bar - Accent Color */}
                    <div className="h-1.5" style={{ backgroundColor: formData.nearbyTertiary || '#3b82f6' }}></div>

                    <div className="p-4">
                      <h3 className="font-bold text-sm leading-snug" style={{ color: formData.nearbySecondary || '#1e3a8a' }}>Example Place</h3>

                      <span
                        className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide mt-1.5 mb-2.5"
                        style={{
                          color: formData.nearbyTertiary || '#3b82f6',
                          backgroundColor: hexToRgba(formData.nearbyTertiary || '#3b82f6', 15)
                        }}
                      >
                        Restaurant
                      </span>

                      <div className="flex items-center gap-4 text-xs" style={{ color: formData.nearbySecondary ? hexToRgba(formData.nearbySecondary, 70) : '#6b7280' }}>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /> 1.2 km
                        </span>
                        <span className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-full border border-current opacity-60"></div> 5 min
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Tip Arrow (simulated) */}
                  <div
                    className="w-3 h-3 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b"
                    style={{
                      backgroundColor: formData.nearbyGlassEnabled
                        ? (formData.nearbyPrimary || '#ffffff') // Glass arrow is tricky in CSS alone with exact opacity match, simplified here
                        : (formData.nearbyPrimary || '#ffffff'),
                      borderColor: hexToRgba(formData.nearbyTertiary || '#3b82f6', formData.nearbyGlassEnabled ? formData.nearbyBorderOpacity : formData.nearbyTertiaryOpacity),
                      // Opacity for glass arrow needs to match mostly but typically solid or same alpha
                      opacity: formData.nearbyGlassEnabled ? (formData.nearbyGlassOpacity / 100) : (formData.nearbyPrimaryOpacity / 100)
                    }}
                  ></div>
                </div>

                <p className="text-center mt-12 text-gray-500 text-sm bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full">
                  Editing <strong>Nearby Tooltip</strong> appearance
                </p>
              </div>
            </div>

            {/* Card 3: Map Preview */}
            <div className={`absolute inset-0 transition-opacity duration-300 ${activePreview === 3 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
              <div className="w-full h-full bg-white relative">
                {/* Map Container */}
                <div
                  ref={mapContainerRef}
                  className="absolute inset-0"
                  style={{ width: '100%', height: '100%' }}
                />

                {/* Loading/Error State */}
                {activePreview === 3 && !mapLoaded && !mapError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-gray-500">Loading map...</p>
                    </div>
                  </div>
                )}

                {mapError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <div className="text-center p-6">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MapPin className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 font-medium mb-1">Unable to load map</p>
                      <p className="text-xs text-gray-500">Check your Mapbox token configuration</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div >
    </div >
  );
}

/**
 * Filter Chip Component for Preview
 */
function FilterChip({ icon: Icon, label, active, style }) {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer whitespace-nowrap select-none ${active
        ? 'shadow-md scale-105'
        : 'hover:bg-white/10 hover:scale-105'
        }`}
      style={{
        backgroundColor: active ? style.primary : 'transparent',
        color: active ? style.secondary : '#374151', // Fallback color for inactive text if not specified
      }}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
  );
}

/**
 * Helper: Convert Hex to RGBA
 */
function hexToRgba(hex, opacity = 100) {
  if (!hex) return 'transparent';
  let c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + (opacity / 100) + ')';
  }
  return hex;
}
