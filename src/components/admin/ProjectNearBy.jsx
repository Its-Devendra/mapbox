'use client';

import { useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import SvgIconUploader from '@/components/SvgIconUploader';
import { Button, Input, Select, Modal, Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import useCRUD from '@/hooks/useCRUD';
import useSearch from '@/hooks/useSearch';
import useModal from '@/hooks/useModal';
import { Plus, Edit, Trash2, Navigation, Search } from 'lucide-react';

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

  // Category options for select
  const categoryOptions = categories.items.map(cat => ({
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
        <Button icon={Plus} onClick={modal.openCreate}>
          New Near By
        </Button>
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
                      <span>{place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}</span>
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
                  theme={theme}
                />
              </div>

              {modal.formData.icon && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Icon Width (px)"
                    type="number"
                    name="iconWidth"
                    value={modal.formData.iconWidth}
                    onChange={modal.handleInputChange}
                    min="10"
                    max="200"
                  />
                  <Input
                    label="Icon Height (px)"
                    type="number"
                    name="iconHeight"
                    value={modal.formData.iconHeight}
                    onChange={modal.handleInputChange}
                    min="10"
                    max="200"
                  />
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
          <NearbyPreview formData={modal.formData} getCategoryName={getCategoryName} />
        </div>
      </Modal>
    </div>
  );
}

/**
 * Live Preview Component - Extracted for cleanliness
 */
function NearbyPreview({ formData, getCategoryName }) {
  return (
    <div className="w-full lg:w-80 bg-gray-50 p-6 flex flex-col relative overflow-hidden">
      <style jsx>{`
        @keyframes cursorMove {
          0% { transform: translate(100px, 100px); opacity: 0; }
          20% { transform: translate(100px, 100px); opacity: 1; }
          40% { transform: translate(0, 0); opacity: 1; }
          80% { transform: translate(0, 0); opacity: 1; }
          90% { transform: translate(100px, 100px); opacity: 1; }
          100% { transform: translate(100px, 100px); opacity: 0; }
        }
        @keyframes tooltipFade {
          0%, 40% { opacity: 0; transform: translateY(10px) scale(0.95); }
          50%, 80% { opacity: 1; transform: translateY(0) scale(1); }
          90%, 100% { opacity: 0; transform: translateY(10px) scale(0.95); }
        }
        .animate-cursor { animation: cursorMove 4s infinite ease-in-out; }
        .animate-tooltip { animation: tooltipFade 4s infinite ease-in-out; }
      `}</style>

      <h4 className="text-sm font-semibold text-gray-900 mb-4 z-10 relative">Live Preview</h4>

      <div className="flex-1 flex items-center justify-center relative">
        {/* Mini Map Background */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />

        {/* Center Marker */}
        <div className="relative z-0">
          <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-gray-100">
            {formData.icon ? (
              <div dangerouslySetInnerHTML={{ __html: formData.icon }} className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full" />
            ) : (
              <Navigation className="w-6 h-6 text-gray-400" strokeWidth={2} />
            )}
          </div>

          {/* Pulsing Effect */}
          <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-gray-400 delay-75" />

          {/* Animated Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 animate-tooltip origin-bottom z-20">
            <div className="bg-white rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 overflow-visible min-w-[200px] relative">
              <div
                className="h-1.5 w-full rounded-t-lg transition-colors duration-300"
                style={{ backgroundColor: formData.color || '#3b82f6' }}
              />
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-sm text-gray-900 leading-tight">
                    {formData.title || 'Place Title'}
                  </h3>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider transition-colors duration-300"
                    style={{
                      color: formData.color || '#3b82f6',
                      backgroundColor: `${formData.color || '#3b82f6'}15`
                    }}
                  >
                    {getCategoryName(formData.categoryId) || 'CATEGORY'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                      <span>📍</span> 1.2 km
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                      <span>🚗</span> 5 min
                    </div>
                  </div>
                </div>
              </div>
              {/* Tooltip Arrow */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-gray-100 rotate-45" />
            </div>
          </div>
        </div>

        {/* Animated Cursor */}
        <div className="absolute z-20 animate-cursor pointer-events-none">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
            <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19179L11.7841 12.3673H5.65376Z" fill="black" stroke="white" strokeWidth="1" />
          </svg>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4 z-10 relative">
        Hover animation preview
      </p>
    </div>
  );
}
