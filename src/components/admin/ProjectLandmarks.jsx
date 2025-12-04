'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useTheme } from '@/context/ThemeContext';
import SvgIconUploader from '@/components/SvgIconUploader';
import { Plus, Edit, Trash2, MapPin, Search, X, Navigation, Eye, Crosshair } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  "pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNfGX8wp_w";

export default function ProjectLandmarks({ projectId }) {
  const { theme } = useTheme();
  const [landmarks, setLandmarks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLandmark, setEditingLandmark] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    latitude: 28.49,
    longitude: 77.08,
    categoryId: '',
    icon: null,
    iconWidth: 32,
    iconHeight: 32
  });

  useEffect(() => {
    fetchLandmarks();
    fetchCategories();
  }, [projectId]);

  const fetchLandmarks = async () => {
    try {
      const response = await fetch('/api/landmarks');
      if (response.ok) {
        const data = await response.json();
        const projectLandmarks = data.filter(landmark => landmark.projectId === projectId);
        setLandmarks(projectLandmarks);
      }
    } catch (error) {
      console.error('Error fetching landmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        const projectCategories = data.filter(cat => cat.projectId === projectId);
        setCategories(projectCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredLandmarks = landmarks.filter(landmark => {
    const category = categories.find(c => c.id === landmark.categoryId);
    const categoryName = category ? category.name : '';
    return landmark.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoryName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingLandmark ? `/api/landmarks/${editingLandmark.id}` : '/api/landmarks';
      const method = editingLandmark ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          projectId: projectId
        }),
      });

      if (response.ok) {
        toast.success(editingLandmark ? 'Landmark updated!' : 'Landmark created!');
        fetchLandmarks();
        setShowModal(false);
        setEditingLandmark(null);
        resetForm();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to save landmark');
      }
    } catch (error) {
      console.error('Error saving landmark:', error);
      toast.error('Error saving landmark');
    }
  };

  const handleEdit = (landmark) => {
    setEditingLandmark(landmark);
    setFormData({
      title: landmark.title,
      description: landmark.description,
      latitude: landmark.latitude,
      longitude: landmark.longitude,
      categoryId: landmark.categoryId,
      icon: landmark.icon || null,
      iconWidth: landmark.iconWidth || 32,
      iconHeight: landmark.iconHeight || 32
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this landmark?')) {
      try {
        const response = await fetch(`/api/landmarks/${id}`, { method: 'DELETE' });
        if (response.ok) {
          toast.success('Landmark deleted!');
          fetchLandmarks();
        } else {
          toast.error('Failed to delete landmark');
        }
      } catch (error) {
        console.error('Error deleting landmark:', error);
        toast.error('Error deleting landmark');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      latitude: 28.49,
      longitude: 77.08,
      categoryId: '',
      icon: null,
      iconWidth: 32,
      iconHeight: 32
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    let parsedValue = value;
    if (type === 'number' && value !== '') {
      parsedValue = parseFloat(value);
    }
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || '📍';
  };

  // Skeleton loading
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="h-5 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-48 bg-gray-100 rounded" />
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-full" />
        </div>
        <div className="h-10 w-full bg-gray-100 rounded-xl mb-4" />
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-full bg-gray-100 rounded mb-2" />
                <div className="h-3 w-40 bg-gray-50 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Landmarks</h3>
          <p className="text-sm text-gray-500 mt-1">Add and manage points of interest on your maps</p>
        </div>
        <button
          onClick={() => { setEditingLandmark(null); resetForm(); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-full transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          New Landmark
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-black transition-colors" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search landmarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm placeholder:text-gray-400 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Landmarks List */}
      {filteredLandmarks.length > 0 ? (
        <div className="space-y-3 stagger-children">
          {filteredLandmarks.map((landmark, index) => (
            <div
              key={landmark.id}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    {landmark.icon ? (
                      <div dangerouslySetInnerHTML={{ __html: landmark.icon }} className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full" />
                    ) : (
                      <span className="text-lg">{getCategoryIcon(landmark.categoryId)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">{landmark.title}</h4>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{landmark.description}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                        <Navigation className="w-3 h-3" />
                        {landmark.latitude.toFixed(4)}, {landmark.longitude.toFixed(4)}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                        {getCategoryName(landmark.categoryId)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(landmark)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleDelete(landmark.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-2xl flex items-center justify-center">
            <MapPin className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">No landmarks yet</h4>
          <p className="text-sm text-gray-500 mb-4 max-w-xs mx-auto">
            {searchTerm ? 'No landmarks match your search.' : 'Add landmarks to mark points of interest on your map'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => { setEditingLandmark(null); resetForm(); setShowModal(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-full transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Create Landmark
            </button>
          )}
        </div>
      )}

      {/* Enhanced Modal with Map */}
      {showModal && (
        <LandmarkEditorModal
          formData={formData}
          setFormData={setFormData}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          editingLandmark={editingLandmark}
          categories={categories}
          onClose={() => { setShowModal(false); setEditingLandmark(null); resetForm(); }}
          theme={theme}
        />
      )}
    </div>
  );
}

/**
 * Landmark Editor Modal with Map Picker
 */
function LandmarkEditorModal({ formData, setFormData, handleInputChange, handleSubmit, editingLandmark, categories, onClose, theme }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current && mapboxgl.accessToken) {
      try {
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [formData.longitude, formData.latitude],
          zoom: 14,
        });

        // Add marker
        markerRef.current = new mapboxgl.Marker({
          color: '#000',
          draggable: true
        })
          .setLngLat([formData.longitude, formData.latitude])
          .addTo(mapRef.current);

        // Update coordinates on marker drag
        markerRef.current.on('dragend', () => {
          const lngLat = markerRef.current.getLngLat();
          setFormData(prev => ({
            ...prev,
            latitude: lngLat.lat,
            longitude: lngLat.lng
          }));
        });

        // Click on map to move marker
        mapRef.current.on('click', (e) => {
          markerRef.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
          setFormData(prev => ({
            ...prev,
            latitude: e.lngLat.lat,
            longitude: e.lngLat.lng
          }));
        });
      } catch (e) {
        console.error('Failed to initialize map:', e);
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update marker when coordinates change from inputs
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLngLat([formData.longitude, formData.latitude]);
      mapRef.current.flyTo({
        center: [formData.longitude, formData.latitude],
        duration: 500
      });
    }
  }, [formData.latitude, formData.longitude]);

  // Center map on current location
  const handleCenterOnLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({ ...prev, latitude, longitude }));
          if (mapRef.current) {
            mapRef.current.flyTo({ center: [longitude, latitude], zoom: 16 });
          }
          if (markerRef.current) {
            markerRef.current.setLngLat([longitude, latitude]);
          }
        },
        (error) => {
          toast.error('Unable to get your location');
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Form */}
        <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-gray-100">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {editingLandmark ? 'Edit Landmark' : 'Create New Landmark'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">Add a point of interest to your map</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm transition-all"
                placeholder="e.g., Central Park Entrance"
                required
              />
            </div>

            {/* Icon Upload */}
            <div>
              <SvgIconUploader
                label="Custom Icon (Optional)"
                currentIcon={formData.icon}
                onUpload={(svgContent) => setFormData({ ...formData, icon: svgContent })}
                theme={theme}
              />
            </div>

            {/* Icon Dimensions */}
            {formData.icon && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Width (px)</label>
                  <input
                    type="number"
                    name="iconWidth"
                    value={formData.iconWidth}
                    onChange={handleInputChange}
                    min="10"
                    max="200"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (px)</label>
                  <input
                    type="number"
                    name="iconHeight"
                    value={formData.iconHeight}
                    onChange={handleInputChange}
                    min="10"
                    max="200"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm transition-all"
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm transition-all resize-none"
                placeholder="Describe this landmark..."
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Category</label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm cursor-pointer transition-all"
                required
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm font-mono transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm font-mono transition-all"
                  required
                />
              </div>
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
                {editingLandmark ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Map */}
        <div className="w-full md:w-1/2 bg-gray-100 relative">
          {/* Map Header */}
          <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-gray-200/50">
            <span className="text-xs font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-gray-600" /> Pick Location
            </span>
          </div>

          {/* Center on location button */}
          <button
            type="button"
            onClick={handleCenterOnLocation}
            className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-sm border border-gray-200/50 hover:bg-white transition-colors cursor-pointer"
            title="Use my location"
          >
            <Crosshair className="w-4 h-4 text-gray-700" />
          </button>

          {/* Map Container */}
          <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />

          {/* Coordinates Display */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-200/50">
            <span className="text-xs font-mono text-gray-600">
              {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
            </span>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
            Click or drag marker to set location
          </div>
        </div>
      </div>
    </div>
  );
}
