'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import SvgIconUploader from '@/components/SvgIconUploader';
import AspectRatioSizeInput from '@/components/AspectRatioSizeInput';
import FilterBar from '@/components/FilterBar';
import { Button, Input, Modal, Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import useCRUD from '@/hooks/useCRUD';
import useModal from '@/hooks/useModal';
import { Plus, Edit, Trash2, Tag, CheckCircle2, XCircle, Sparkles, Check } from 'lucide-react';
import { PROFESSIONAL_ICONS, getDefaultIconForCategory } from '@/data/professionalIcons';

const initialFormData = {
  name: '',
  icon: null, // Will store selected icon ID or custom SVG
  selectedIconId: 'location', // Default icon
  iconSvg: null,
  isActive: true,
  defaultIconWidth: 32,
  defaultIconHeight: 32,
  useCategoryDefaults: false
};

export default function ProjectCategories({ projectId }) {
  const { theme } = useTheme();
  const [iconType, setIconType] = useState('preset'); // 'preset' or 'custom'

  // Data fetching
  const categories = useCRUD({
    endpoint: '/api/categories',
    projectId,
  });

  // Modal state
  const modal = useModal(initialFormData);

  // Fetch on mount
  useEffect(() => {
    categories.fetchAll();
  }, [projectId]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    let iconValue;
    if (iconType === 'custom') {
      iconValue = modal.formData.iconSvg;
    } else {
      // Get the SVG from the selected preset icon
      const selectedIcon = PROFESSIONAL_ICONS.find(i => i.id === modal.formData.selectedIconId);
      iconValue = selectedIcon?.svg || PROFESSIONAL_ICONS[0].svg;
    }

    const payload = {
      ...modal.formData,
      icon: iconValue,
      iconSvg: iconType === 'custom' ? modal.formData.iconSvg : null,
    };

    // Remove temporary field
    delete payload.selectedIconId;

    if (modal.isEditing) {
      await categories.update(modal.editingItem.id, payload);
    } else {
      await categories.create(payload);
    }

    modal.close(true);
    setIconType('preset');
  };

  // Handle edit
  const handleEdit = (category) => {
    const hasSvg = category.icon && typeof category.icon === 'string' &&
      (category.icon.trim().toLowerCase().startsWith('<svg') || category.icon.includes('<svg'));

    // Try to find matching preset icon
    const matchingPreset = PROFESSIONAL_ICONS.find(i => i.svg === category.icon);
    const hasPreset = !!matchingPreset;

    setIconType(hasSvg && !hasPreset ? 'custom' : 'preset');

    modal.openEdit(category, (item) => ({
      name: item.name,
      icon: item.icon,
      selectedIconId: matchingPreset?.id || 'location',
      iconSvg: hasSvg && !hasPreset ? item.icon : null,
      isActive: item.isActive,
      defaultIconWidth: item.defaultIconWidth || 32,
      defaultIconHeight: item.defaultIconHeight || 32,
      useCategoryDefaults: item.useCategoryDefaults || false
    }));
  };

  // Handle close
  const handleClose = () => {
    modal.close(true);
    setIconType('preset');
  };

  // Auto-suggest icon when category name changes
  const handleNameChange = useCallback((e) => {
    modal.handleInputChange(e);
    const name = e.target.value;
    if (name && iconType === 'preset') {
      const suggestedIcon = getDefaultIconForCategory(name);
      if (suggestedIcon) {
        modal.updateField('selectedIconId', suggestedIcon.id);
      }
    }
  }, [modal, iconType]);

  // Get current icon SVG for preview
  const getCurrentIconSvg = () => {
    if (iconType === 'custom') {
      return modal.formData.iconSvg || '<svg></svg>';
    }
    const selectedIcon = PROFESSIONAL_ICONS.find(i => i.id === modal.formData.selectedIconId);
    return selectedIcon?.svg || PROFESSIONAL_ICONS[0].svg;
  };

  // Preview category object
  const previewCategory = {
    id: 'preview',
    name: modal.formData.name || 'Category Name',
    icon: getCurrentIconSvg()
  };

  // Loading state
  if (categories.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton.Card key={i} />)}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Categories</h3>
          <p className="text-sm text-gray-500 mt-1">Organize landmarks into categories</p>
        </div>
        <Button icon={Plus} onClick={() => { setIconType('preset'); modal.openCreate(); }}>
          New Category
        </Button>
      </div>

      {/* Categories Grid */}
      {categories.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {categories.items.map((category) => (
            <Card key={category.id} className="hover:shadow-md hover:border-gray-200 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                    {(() => {
                      const icon = category.icon;
                      // Check if it's SVG content
                      if (icon && typeof icon === 'string' && (icon.trim().toLowerCase().startsWith('<svg') || icon.includes('<svg'))) {
                        return <div dangerouslySetInnerHTML={{ __html: icon }} className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full" />;
                      }
                      // Otherwise display as emoji/text
                      return <span className="text-lg">{icon || '🏷️'}</span>;
                    })()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{category.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {category.isActive ? (
                        <Badge variant="default" size="xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" strokeWidth={2} />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="default" size="xs">
                          <XCircle className="w-3 h-3 mr-1" strokeWidth={2} />
                          Inactive
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {(category._count?.landmarks || 0) + (category._count?.nearByPlaces || 0)} items
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => categories.remove(category.id)}
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
          icon={Tag}
          title="No categories yet"
          description="Create categories to organize your landmarks"
          action={
            <Button icon={Plus} onClick={() => { setIconType('preset'); modal.openCreate(); }}>
              Create Category
            </Button>
          }
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={handleClose}
        title={modal.isEditing ? 'Edit Category' : 'Create New Category'}
        description="Add a category to organize your landmarks"
        size="4xl"
      >
        <div className="flex flex-col md:flex-row">
          {/* Form Section */}
          <div className="w-full md:w-1/2 p-6 border-r border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Category Name"
                name="name"
                value={modal.formData.name}
                onChange={handleNameChange}
                placeholder="Enter category name"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>

                {/* Icon Type Toggle */}
                <div className="mb-3 flex gap-2 bg-gray-100/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setIconType('preset');
                      modal.updateField('iconSvg', null);
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${iconType === 'preset'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Preset Icons
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIconType('custom');
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${iconType === 'custom'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Custom SVG
                  </button>
                </div>

                {/* Preset Icon Grid */}
                {iconType === 'preset' && (
                  <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-100">
                    {PROFESSIONAL_ICONS.map(icon => (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => modal.updateField('selectedIconId', icon.id)}
                        className={`relative p-2.5 rounded-lg transition-all cursor-pointer group ${modal.formData.selectedIconId === icon.id
                          ? 'bg-black text-white shadow-md'
                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300'
                          }`}
                        title={icon.name}
                      >
                        <div
                          className="w-6 h-6 mx-auto [&>svg]:w-full [&>svg]:h-full"
                          dangerouslySetInnerHTML={{ __html: icon.svg }}
                        />
                        {modal.formData.selectedIconId === icon.id && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom SVG Uploader */}
                {iconType === 'custom' && (
                  <SvgIconUploader
                    label=""
                    currentIcon={modal.formData.iconSvg}
                    onUpload={(svgContent) => modal.updateField('iconSvg', svgContent)}
                    onDimensionsExtracted={(dimensions) => {
                      modal.updateField('defaultIconWidth', dimensions.width);
                      modal.updateField('defaultIconHeight', dimensions.height);
                    }}
                    theme={theme}
                  />
                )}
              </div>

              {/* Default Icon Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Icon Size for Items</label>
                <p className="text-xs text-gray-500 mb-3">
                  Set default icon size for all landmarks and nearby places in this category
                </p>
                <AspectRatioSizeInput
                  width={modal.formData.defaultIconWidth}
                  height={modal.formData.defaultIconHeight}
                  widthName="defaultIconWidth"
                  heightName="defaultIconHeight"
                  onWidthChange={modal.handleInputChange}
                  onHeightChange={modal.handleInputChange}
                  widthLabel="Width (px)"
                  heightLabel="Height (px)"
                  min={10}
                  max={200}
                />
              </div>

              {/* Force Category Defaults Checkbox */}
              <div className="flex items-center p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                <input
                  type="checkbox"
                  name="useCategoryDefaults"
                  checked={modal.formData.useCategoryDefaults}
                  onChange={modal.handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700 cursor-pointer">Force category defaults for all items</label>
                  <p className="text-xs text-gray-500 mt-0.5">When enabled, all items in this category will use the category default sizes, ignoring individual item sizes</p>
                </div>
              </div>

              <div className="flex items-center p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={modal.formData.isActive}
                  onChange={modal.handleInputChange}
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded cursor-pointer"
                />
                <label className="ml-3 text-sm text-gray-700 cursor-pointer">Active category</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="secondary" type="button" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={categories.submitting}>
                  {modal.isEditing ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>

          {/* Preview Section */}
          <div className="w-full md:w-1/2 bg-gray-50 p-6 relative overflow-hidden flex flex-col justify-center items-center">
            <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-gray-200/50">
              <span className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Live Preview
              </span>
            </div>

            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.4]"
              style={{
                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />

            <div className="relative z-10 w-full max-w-sm">
              <div className="text-center mb-8">
                <h4 className="text-sm font-medium text-gray-500 mb-2">This is how it will look</h4>
                <p className="text-xs text-gray-400">The category will appear in the filter bar like this</p>
              </div>

              <div className="transform transition-all duration-500 hover:scale-105">
                <FilterBar
                  categories={[previewCategory]}
                  activeFilter={previewCategory.name}
                  onFilterChange={() => { }}
                  className="!relative !transform-none !bottom-auto !left-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
