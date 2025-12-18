'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useTheme } from '@/context/ThemeContext';
import { Plus, Edit, Trash2, Palette, CheckCircle2, XCircle, Eye, MapPin, X, ChevronLeft, ChevronRight, Folder, Utensils, Car, Building, Wand2 } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import StyleBuilderAgent from './StyleBuilderAgent';

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
          secondaryOpacity: parseInt(formData.secondaryOpacity) || 100,
          tertiaryOpacity: parseInt(formData.tertiaryOpacity) || 100,
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
  const [activePreview, setActivePreview] = useState(0); // 0 = Landmark preview, 1 = Map preview
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(2);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const zoomIntervalRef = useRef(null);

  // Initialize map when switching to map preview
  useEffect(() => {
    if (activePreview === 1 && mapContainerRef.current && !mapRef.current) {
      const rawStyleUrl = formData.mapboxStyle === 'custom' ? formData.customStyle : formData.mapboxStyle;
      // Convert to proper mapbox:// format
      const styleUrl = convertToMapboxStyleUrl(rawStyleUrl) || rawStyleUrl;
      const token = mapboxgl.accessToken;

      if (!token) {
        console.error('Mapbox token not found');
        setMapError(true);
        return;
      }

      if (styleUrl && styleUrl.startsWith('mapbox://')) {
        try {
          mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: styleUrl,
            center: [77.08, 28.49], // New Delhi area
            zoom: 1, // Start from globe view
            interactive: true,
            projection: 'globe' // Enable globe projection for nice zoom effect
          });

          mapRef.current.on('load', () => {
            setMapLoaded(true);

            // Animate zoom from globe to street level
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.flyTo({
                  center: [77.08, 28.49],
                  zoom: 14, // Street level
                  duration: 3000,
                  essential: true
                });
                setCurrentZoom(14);
              }
            }, 500);

            // Set up zoom cycling animation
            zoomIntervalRef.current = setInterval(() => {
              if (mapRef.current) {
                const zoom = mapRef.current.getZoom();
                // Cycle between zoom levels: 14 -> 4 -> 14
                const newZoom = zoom > 10 ? 4 : 14;
                mapRef.current.flyTo({
                  zoom: newZoom,
                  duration: 2500,
                  essential: true
                });
                setCurrentZoom(newZoom);
              }
            }, 6000); // Every 6 seconds
          });

          mapRef.current.on('error', (e) => {
            console.error('Map error:', e);
            setMapError(true);
          });

          // Track zoom changes
          mapRef.current.on('zoom', () => {
            if (mapRef.current) {
              setCurrentZoom(Math.round(mapRef.current.getZoom()));
            }
          });
        } catch (e) {
          console.error('Failed to initialize map:', e);
          setMapError(true);
        }
      }
    }

    // Cleanup zoom interval when leaving map preview
    if (activePreview !== 1 && zoomIntervalRef.current) {
      clearInterval(zoomIntervalRef.current);
      zoomIntervalRef.current = null;
    }

    return () => {
      // Cleanup handled in style change effect
    };
  }, [activePreview]);

  // Update map style when changed
  useEffect(() => {
    if (mapRef.current) {
      const rawStyleUrl = formData.mapboxStyle === 'custom' ? formData.customStyle : formData.mapboxStyle;
      const styleUrl = convertToMapboxStyleUrl(rawStyleUrl) || rawStyleUrl;
      if (styleUrl && styleUrl.startsWith('mapbox://')) {
        try {
          mapRef.current.setStyle(styleUrl);
        } catch (e) {
          console.error('Invalid map style:', e);
        }
      }
    }
  }, [formData.mapboxStyle, formData.customStyle]);

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

  // Handle map style focus - switch to map preview
  const handleMapStyleFocus = () => {
    setActivePreview(1);
  };

  // Handle map style change
  const handleMapStyleChange = (e) => {
    handleInputChange(e);
    setActivePreview(1);
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
            {/* Landmark Card Colors Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-2xl">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Landmark Card Colors
              </h4>

              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Primary Background</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <input
                      type="color"
                      name="primary"
                      value={formData.primary}
                      onChange={handleInputChange}
                      onFocus={handleColorFocus}
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
                    onFocus={handleColorFocus}
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm font-mono transition-all"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Text & Icons</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <input
                      type="color"
                      name="secondary"
                      value={formData.secondary}
                      onChange={handleInputChange}
                      onFocus={handleColorFocus}
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
                    onFocus={handleColorFocus}
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm font-mono transition-all"
                  />
                </div>
              </div>

              {/* Tertiary Color (Glass/Inactive) */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Border / Accent</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <input
                      type="color"
                      name="tertiary"
                      value={formData.tertiary}
                      onChange={handleInputChange}
                      onFocus={handleColorFocus}
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
                    onFocus={handleColorFocus}
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm font-mono transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Filter Section Colors Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-2xl">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Folder className="w-4 h-4" /> Filter Section Colors
              </h4>

              {/* Filter Primary (Active Background) */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Active Background</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <input
                      type="color"
                      name="filterPrimary"
                      value={formData.filterPrimary}
                      onChange={handleInputChange}
                      onFocus={handleColorFocus}
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
                    onFocus={handleColorFocus}
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm font-mono transition-all"
                  />
                </div>
              </div>

              {/* Filter Secondary (Active Text) */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Active Text</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <input
                      type="color"
                      name="filterSecondary"
                      value={formData.filterSecondary}
                      onChange={handleInputChange}
                      onFocus={handleColorFocus}
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
                    onFocus={handleColorFocus}
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm font-mono transition-all"
                  />
                </div>
              </div>

              {/* Filter Tertiary (Glass/Inactive) */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Glass / Inactive Color</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <input
                      type="color"
                      name="filterTertiary"
                      value={formData.filterTertiary}
                      onChange={handleInputChange}
                      onFocus={handleColorFocus}
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
                    onFocus={handleColorFocus}
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm font-mono transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Filter Glass Effects Section */}
            <div className="space-y-4 p-4 bg-blue-50 rounded-2xl">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  🌫️ Filter Glass Effects
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="filterGlassEnabled"
                    checked={formData.filterGlassEnabled}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-600">Enable Blur</span>
                </label>
              </div>

              {formData.filterGlassEnabled && (
                <div className="space-y-3">
                  {/* Blur Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Blur Amount ({formData.filterGlassBlur}px)</label>
                    <input
                      type="range"
                      name="filterGlassBlur"
                      min="0"
                      max="100"
                      value={formData.filterGlassBlur}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Saturation ({formData.filterGlassSaturation}%)</label>
                    <input
                      type="range"
                      name="filterGlassSaturation"
                      min="100"
                      max="300"
                      value={formData.filterGlassSaturation}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Glass Opacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Background Opacity ({formData.filterGlassOpacity}%)</label>
                    <input
                      type="range"
                      name="filterGlassOpacity"
                      min="0"
                      max="100"
                      value={formData.filterGlassOpacity}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Border Opacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Border Opacity ({formData.filterBorderOpacity}%)</label>
                    <input
                      type="range"
                      name="filterBorderOpacity"
                      min="0"
                      max="100"
                      value={formData.filterBorderOpacity}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {!formData.filterGlassEnabled && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Blur disabled. Adjust color opacities below:</p>
                  {/* Primary Opacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Active BG Opacity ({formData.filterPrimaryOpacity}%)</label>
                    <input
                      type="range"
                      name="filterPrimaryOpacity"
                      min="0"
                      max="100"
                      value={formData.filterPrimaryOpacity}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  {/* Secondary Opacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Text Opacity ({formData.filterSecondaryOpacity}%)</label>
                    <input
                      type="range"
                      name="filterSecondaryOpacity"
                      min="0"
                      max="100"
                      value={formData.filterSecondaryOpacity}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  {/* Tertiary Opacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Glass Color Opacity ({formData.filterTertiaryOpacity}%)</label>
                    <input
                      type="range"
                      name="filterTertiaryOpacity"
                      min="0"
                      max="100"
                      value={formData.filterTertiaryOpacity}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Landmark Glass Effects Section */}
            <div className="space-y-4 p-4 bg-purple-50 rounded-2xl">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  📍 Landmark Glass Effects
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="landmarkGlassEnabled"
                    checked={formData.landmarkGlassEnabled}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-600">Enable Blur</span>
                </label>
              </div>

              {formData.landmarkGlassEnabled && (
                <div className="space-y-3">
                  {/* Blur Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Blur Amount ({formData.landmarkGlassBlur}px)</label>
                    <input
                      type="range"
                      name="landmarkGlassBlur"
                      min="0"
                      max="100"
                      value={formData.landmarkGlassBlur}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Saturation ({formData.landmarkGlassSaturation}%)</label>
                    <input
                      type="range"
                      name="landmarkGlassSaturation"
                      min="100"
                      max="300"
                      value={formData.landmarkGlassSaturation}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Glass Opacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Background Opacity ({formData.landmarkGlassOpacity}%)</label>
                    <input
                      type="range"
                      name="landmarkGlassOpacity"
                      min="0"
                      max="100"
                      value={formData.landmarkGlassOpacity}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Border Opacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Border Opacity ({formData.landmarkBorderOpacity}%)</label>
                    <input
                      type="range"
                      name="landmarkBorderOpacity"
                      min="0"
                      max="100"
                      value={formData.landmarkBorderOpacity}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {!formData.landmarkGlassEnabled && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Blur disabled. Adjust color opacities below:</p>
                  {/* Primary Opacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Primary Color Opacity ({formData.primaryOpacity}%)</label>
                    <input
                      type="range"
                      name="primaryOpacity"
                      min="0"
                      max="100"
                      value={formData.primaryOpacity}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  {/* Secondary Opacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Text Opacity ({formData.secondaryOpacity}%)</label>
                    <input
                      type="range"
                      name="secondaryOpacity"
                      min="0"
                      max="100"
                      value={formData.secondaryOpacity}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  {/* Tertiary Opacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Border/Accent Opacity ({formData.tertiaryOpacity}%)</label>
                    <input
                      type="range"
                      name="tertiaryOpacity"
                      min="0"
                      max="100"
                      value={formData.tertiaryOpacity}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tertiary Color (Glass/Inactive) */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Glass / Inactive Color</label>
              <p className="text-xs text-gray-500 mb-2">Base color for glass effects and inactive states.</p>
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <input
                    type="color"
                    name="tertiary"
                    value={formData.tertiary}
                    onChange={handleInputChange}
                    onFocus={handleColorFocus}
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
                  onFocus={handleColorFocus}
                  className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm font-mono transition-all"
                />
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
          </div>

          {/* Preview Cards Container */}
          <div
            className="flex transition-transform duration-500 ease-out h-full"
            style={{ transform: `translateX(-${activePreview * 100}%)` }}
          >
            {/* Card 1: Landmark & Filter Preview */}
            <div className="min-w-full h-full flex items-center justify-center p-6">
              <div className="w-full max-w-sm relative"
                style={{
                  backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              >
                {/* Landmark Card Preview */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                  {/* Gradient Header */}
                  <div
                    className="h-32 relative"
                    style={{
                      background: `linear-gradient(135deg, ${formData.primary} 0%, ${adjustColor(formData.primary, 40)} 100%)`
                    }}
                  >
                    <button className="absolute top-3 right-3 w-7 h-7 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4" style={{ backgroundColor: formData.primary }}>
                    <h3 className="text-lg font-bold mb-2" style={{ color: formData.secondary }}>
                      Example Landmark
                    </h3>
                    <div className="flex items-center gap-3 text-sm" style={{ color: formData.secondary }}>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: `${formData.secondary}20`, color: formData.secondary }}
                      >
                        Office
                      </span>
                      <span className="flex items-center gap-1 opacity-80">
                        <MapPin className="w-3 h-3" /> null km
                      </span>
                      <span className="opacity-80">⏱ nullm</span>
                    </div>
                    <p className="text-sm mt-3 opacity-70" style={{ color: formData.secondary }}>
                      This is how your landmark cards will look with the selected colors.
                    </p>
                  </div>

                  {/* Filter Bar Preview */}
                  <div className="p-3 bg-white border-t border-gray-100">
                    <div
                      className="flex items-center gap-2 p-1 rounded-full"
                      style={{ backgroundColor: formData.primary }}
                    >
                      <FilterChip icon={Folder} label="All" active style={{ primary: formData.primary, secondary: formData.secondary }} />
                      <FilterChip icon={Building} label="Office" style={{ primary: formData.primary, secondary: formData.secondary }} />
                      <FilterChip icon={Utensils} label="Food" style={{ primary: formData.primary, secondary: formData.secondary }} />
                      <FilterChip icon={Car} label="Parking" style={{ primary: formData.primary, secondary: formData.secondary }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Map Preview */}
            <div className="min-w-full h-full flex items-center justify-center p-6">
              <div className="w-full h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 relative">
                {/* Map Container */}
                <div
                  ref={mapContainerRef}
                  className="absolute inset-0"
                  style={{ width: '100%', height: '100%' }}
                />

                {/* Loading/Error State */}
                {activePreview === 1 && !mapLoaded && !mapError && (
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

                {/* Zoom Level Indicator */}
                {mapLoaded && (
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full z-10">
                    <span className="text-xs font-medium text-white">
                      Zoom: {currentZoom}
                    </span>
                  </div>
                )}

                {/* Map Preview Label */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-200/50 z-10 flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">Map Style Preview</span>
                  {mapLoaded && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Auto-zooming
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={() => setActivePreview(0)}
            className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow-md flex items-center justify-center transition-opacity cursor-pointer ${activePreview === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={() => setActivePreview(1)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow-md flex items-center justify-center transition-opacity cursor-pointer ${activePreview === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <ChevronRight className="w-4 h-4 text-gray-700" />
          </button>
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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${active ? 'bg-white shadow-sm' : 'hover:bg-white/20'
        }`}
      style={{
        color: active ? style.primary : style.secondary,
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </div>
  );
}

/**
 * Adjust color brightness
 */
function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}
