'use client';

import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import SvgIconUploader from '@/components/SvgIconUploader';
import AspectRatioSizeInput from '@/components/AspectRatioSizeInput';
import BulkImportModal from '@/components/admin/BulkImportModal';
import { Button, Input, Select, Modal, Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import useCRUD from '@/hooks/useCRUD';
import useSearch from '@/hooks/useSearch';
import useModal from '@/hooks/useModal';
import { Plus, Edit, Trash2, Navigation, Search, Upload, Eye, Crosshair } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  "pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNjGX8wp_w";

const initialFormData = {
  title: '',
  latitude: 28.49,
  longitude: 77.08,
  categoryId: '',
  icon: null,
  iconWidth: 32,
  iconHeight: 32,
  color: '#3b82f6'
};

export default function ProjectNearBy({ projectId }) {
  const { theme } = useTheme();
  const [showImportModal, setShowImportModal] = useState(false);

  // Data fetching with useCRUD
  const nearbyPlaces = useCRUD({
    endpoint: '/api/nearby',
    projectId,
  });

  const categories = useCRUD({
    endpoint: '/api/categories',
    projectId,
  });

  // Search functionality
  const { query, setQuery, filtered: filteredPlaces } = useSearch(
    nearbyPlaces.items,
    ['title']
  );

  // Modal state
  const modal = useModal(initialFormData);

  // Fetch data on mount
  useEffect(() => {
    nearbyPlaces.fetchAll();
    categories.fetchAll();
  }, [projectId]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...modal.formData,
      latitude: parseFloat(modal.formData.latitude),
      longitude: parseFloat(modal.formData.longitude),
    };

    if (modal.isEditing) {
      await nearbyPlaces.update(modal.editingItem.id, payload);
    } else {
      await nearbyPlaces.create(payload);
    }

    modal.close(true);
  };

  // Handle edit
  const handleEdit = (place) => {
    modal.openEdit(place, (item) => ({
      title: item.title,
      latitude: item.latitude,
      longitude: item.longitude,
      categoryId: item.categoryId,
      icon: item.icon || null,
      iconWidth: item.iconWidth || 32,
      iconHeight: item.iconHeight || 32,
      color: item.color || '#3b82f6'
    }));
  };

  // Get category name helper
  const getCategoryName = (categoryId) => {
    const category = categories.items.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  // Category options for select (exclude "Landmarks" category)
  const categoryOptions = categories.items
    .filter(cat => cat.name.toLowerCase() !== 'landmarks')
    .map(cat => ({
      value: cat.id,
      label: cat.name
    }));

  // Loading state
  if (nearbyPlaces.loading) {
    return <Skeleton.List items={4} />;
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Near By Places</h3>
          <p className="text-sm text-gray-500 mt-1">Add nearby places that show distance and time on hover</p>
        </div>
        <div className="flex gap-2">
          <Button icon={Upload} variant="secondary" onClick={() => setShowImportModal(true)}>
            Import Excel
          </Button>
          <Button icon={Plus} onClick={modal.openCreate}>
            New Near By
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search nearby places..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm placeholder:text-gray-400 transition-all"
          />
        </div>
      </div>

      {/* Places List */}
      {filteredPlaces.length > 0 ? (
        <div className="space-y-3 stagger-children">
          {filteredPlaces.map((place) => (
            <Card key={place.id} className="hover:shadow-md hover:border-gray-200 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {place.icon ? (
                      <div dangerouslySetInnerHTML={{ __html: place.icon }} className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full" />
                    ) : (
                      <Navigation className="w-5 h-5 text-gray-700" strokeWidth={2} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">{place.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{place.latitude}, {place.longitude}</span>
                      <Badge variant="default" size="xs">
                        {getCategoryName(place.categoryId)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 ml-4">
                  <button
                    onClick={() => handleEdit(place)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => nearbyPlaces.remove(place.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Navigation}
          title="No nearby places yet"
          description={query ? 'No nearby places match your search.' : 'Add nearby places that will show distance and time on hover'}
          action={!query && (
            <Button icon={Plus} onClick={modal.openCreate}>
              Create Near By Place
            </Button>
          )}
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => modal.close()}
        title={modal.isEditing ? 'Edit Near By Place' : 'Create New Near By Place'}
        description="Add a nearby place that shows distance and time on hover"
        size="4xl"
      >
        <div className="flex flex-col lg:flex-row">
          {/* Form Section */}
          <div className="flex-1 p-6 border-r border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Title"
                name="title"
                value={modal.formData.title}
                onChange={modal.handleInputChange}
                placeholder="Enter place title"
                required
              />

              <Select
                label="Category"
                name="categoryId"
                value={modal.formData.categoryId}
                onChange={modal.handleInputChange}
                options={categoryOptions}
                placeholder="Select a category"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon (SVG)</label>
                <SvgIconUploader
                  label=""
                  currentIcon={modal.formData.icon}
                  onUpload={(svgContent) => modal.updateField('icon', svgContent)}
                  onDimensionsExtracted={(dimensions) => {
                    modal.updateField('iconWidth', dimensions.width);
                    modal.updateField('iconHeight', dimensions.height);
                  }}
                  theme={theme}
                />
              </div>

              {modal.formData.icon && (
                <div>
                  <AspectRatioSizeInput
                    width={modal.formData.iconWidth}
                    height={modal.formData.iconHeight}
                    widthName="iconWidth"
                    heightName="iconHeight"
                    onWidthChange={modal.handleInputChange}
                    onHeightChange={modal.handleInputChange}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tooltip Color</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <input
                      type="color"
                      name="color"
                      value={modal.formData.color}
                      onChange={modal.handleInputChange}
                      className="h-10 w-10 cursor-pointer opacity-0 absolute inset-0 z-10"
                    />
                    <div
                      className="h-10 w-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
                      style={{ backgroundColor: modal.formData.color }}
                    />
                  </div>
                  <input
                    type="text"
                    name="color"
                    value={modal.formData.color}
                    onChange={modal.handleInputChange}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm font-mono transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  name="latitude"
                  value={modal.formData.latitude}
                  onChange={modal.handleInputChange}
                  required
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  name="longitude"
                  value={modal.formData.longitude}
                  onChange={modal.handleInputChange}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="secondary" type="button" onClick={() => modal.close()}>
                  Cancel
                </Button>
                <Button type="submit" loading={nearbyPlaces.submitting}>
                  {modal.isEditing ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>

          {/* Preview Section */}
          <NearbyPreview formData={modal.formData} updateField={modal.updateField} getCategoryName={getCategoryName} />
        </div>
      </Modal>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        projectId={projectId}
        onImportComplete={() => {
          nearbyPlaces.fetchAll();
          categories.fetchAll();
          setShowImportModal(false);
        }}
      />
    </div>
  );
}

/**
 * Live Preview Component - Extracted for cleanliness
 */
function NearbyPreview({ formData, updateField, getCategoryName }) {
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
          color: formData.color || '#3b82f6',
          draggable: true
        })
          .setLngLat([formData.longitude, formData.latitude])
          .addTo(mapRef.current);

        // Update coordinates on marker drag
        markerRef.current.on('dragend', () => {
          const lngLat = markerRef.current.getLngLat();
          updateField('latitude', lngLat.lat);
          updateField('longitude', lngLat.lng);
        });

        // Click on map to move marker
        mapRef.current.on('click', (e) => {
          markerRef.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
          updateField('latitude', e.lngLat.lat);
          updateField('longitude', e.lngLat.lng);
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

  // Update marker color when color changes
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      // Remove old marker and create new one with updated color
      const lngLat = markerRef.current.getLngLat();
      markerRef.current.remove();

      markerRef.current = new mapboxgl.Marker({
        color: formData.color || '#3b82f6',
        draggable: true
      })
        .setLngLat(lngLat)
        .addTo(mapRef.current);

      // Re-attach drag handler
      markerRef.current.on('dragend', () => {
        const newLngLat = markerRef.current.getLngLat();
        updateField('latitude', newLngLat.lat);
        updateField('longitude', newLngLat.lng);
      });
    }
  }, [formData.color]);

  // Center map on current location
  const handleCenterOnLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          updateField('latitude', latitude);
          updateField('longitude', longitude);
          if (mapRef.current) {
            mapRef.current.flyTo({ center: [longitude, latitude], zoom: 16 });
          }
          if (markerRef.current) {
            markerRef.current.setLngLat([longitude, latitude]);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  return (
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
          {formData.latitude}, {formData.longitude}
        </span>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
        Click or drag marker to set location
      </div>
    </div>
  );
}
