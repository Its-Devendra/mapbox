'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useTheme } from '@/context/ThemeContext';
import SvgIconUploader from '@/components/SvgIconUploader';
import AspectRatioSizeInput from '@/components/AspectRatioSizeInput';
import S3ImageUploader from '@/components/S3ImageUploader';
import BulkImportModal from '@/components/admin/BulkImportModal';
import { Plus, Edit, Trash2, MapPin, Search, X, Navigation, Eye, Crosshair, Upload } from 'lucide-react';
import { Modal } from '@/components/ui';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  "pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNjGX8wp_w";

export default function ProjectLandmarks({ projectId }) {
  const { theme } = useTheme();
  const [landmarks, setLandmarks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingLandmark, setEditingLandmark] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    latitude: 28.49,
    longitude: 77.08,
    categoryId: '',
    image: null,
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
      const response = await fetch(`/api/landmarks?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        // Data is already filtered by projectId on the server
        setLandmarks(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching landmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/categories?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        const categoryList = Array.isArray(data) ? data : [];
        setCategories(categoryList);

        // Find or use the 'Landmark' category as default
        const landmarkCategory = categoryList.find(c =>
          c.name.toLowerCase() === 'landmark'
        );
        if (landmarkCategory) {
          setFormData(prev => ({ ...prev, categoryId: landmarkCategory.id }));
        } else if (categoryList.length > 0) {
          // Fallback to first category if 'Landmark' doesn't exist
          setFormData(prev => ({ ...prev, categoryId: categoryList[0].id }));
        }
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
      image: landmark.image || null,
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
    // Find the default category (Landmark or first available)
    const landmarkCategory = categories.find(c => c.name.toLowerCase() === 'landmark');
    const defaultCategoryId = landmarkCategory?.id || (categories.length > 0 ? categories[0].id : '');

    setFormData({
      title: '',
      description: '',
      latitude: 28.49,
      longitude: 77.08,
      categoryId: defaultCategoryId,
      image: null,
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
    return category?.icon || null;
  };

  // Helper to check if icon is SVG
  const isSvgIcon = (icon) => {
    return icon && typeof icon === 'string' && (icon.trim().startsWith('<svg') || icon.trim().startsWith('<SVG'));
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
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-full transition-all border border-gray-200 hover:border-gray-300 cursor-pointer"
          >
            <Upload className="w-4 h-4" strokeWidth={2} />
            Import Excel
          </button>
          <button
            onClick={() => { setEditingLandmark(null); resetForm(); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-full transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            New Landmark
          </button>
        </div>
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
          {filteredLandmarks.map((landmark) => (
            <div
              key={landmark.id}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {(() => {
                      // Get icon from landmark or category
                      const landmarkIcon = landmark.icon && typeof landmark.icon === 'string' && landmark.icon.length > 0 ? landmark.icon : null;
                      const iconToShow = landmarkIcon || getCategoryIcon(landmark.categoryId);

                      if (iconToShow && isSvgIcon(iconToShow)) {
                        return <div dangerouslySetInnerHTML={{ __html: iconToShow }} className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full" />;
                      } else if (iconToShow && typeof iconToShow === 'string' && iconToShow.length > 0 && iconToShow.length < 10) {
                        return <span className="text-base">{iconToShow}</span>;
                      } else {
                        return <MapPin className="w-5 h-5 text-gray-700" strokeWidth={2} />;
                      }
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">{landmark.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{landmark.latitude}, {landmark.longitude}</span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {getCategoryName(landmark.categoryId)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 ml-4">
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
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingLandmark(null); resetForm(); }}
        title={editingLandmark ? 'Edit Landmark' : 'Create New Landmark'}
        description="Add a point of interest to your map"
        size="4xl"
      >
        <LandmarkEditorContent
          formData={formData}
          setFormData={setFormData}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          editingLandmark={editingLandmark}
          categories={categories}
          onClose={() => { setShowModal(false); setEditingLandmark(null); resetForm(); }}
          theme={theme}
        />
      </Modal>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        projectId={projectId}
        onImportComplete={() => {
          fetchLandmarks();
          fetchCategories();
          setShowImportModal(false);
        }}
      />
    </div>
  );
}

/**
 * Landmark Editor Content
 */
function LandmarkEditorContent({ formData, setFormData, handleInputChange, handleSubmit, editingLandmark, categories, onClose, theme }) {
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
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left: Form */}
      <div className="w-full lg:w-1/2 p-6 border-r border-gray-100 overflow-y-auto max-h-[70vh] lg:max-h-[80vh]">
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
              onDimensionsExtracted={(dimensions) => {
                setFormData(prev => ({
                  ...prev,
                  iconWidth: dimensions.width,
                  iconHeight: dimensions.height
                }));
              }}
              theme={theme}
            />
          </div>

          {/* Icon Dimensions */}
          {formData.icon && (
            <div>
              <AspectRatioSizeInput
                width={formData.iconWidth}
                height={formData.iconHeight}
                widthName="iconWidth"
                heightName="iconHeight"
                onWidthChange={handleInputChange}
                onHeightChange={handleInputChange}
                widthLabel="Icon Width (px)"
                heightLabel="Icon Height (px)"
                min={10}
                max={200}
              />
              <p className="text-xs text-gray-500 mt-2">
                Leave empty to use category default size
              </p>
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

          {/* Image Upload */}
          <div>
            <S3ImageUploader
              label="Landmark Image (Optional)"
              currentImage={formData.image}
              onUpload={(url) => setFormData({ ...formData, image: url })}
              folder="landmarks"
              accept="image/*"
            />
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
      <div className="w-full lg:w-1/2 bg-gray-100 relative min-h-[400px] overflow-hidden">
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
        <div ref={mapContainerRef} className="w-full h-full overflow-hidden" />

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
  );
}
