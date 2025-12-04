'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import SvgIconUploader from '@/components/SvgIconUploader';
import FilterBar from '@/components/FilterBar';
import { Button, Input, Modal, Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import useCRUD from '@/hooks/useCRUD';
import useModal from '@/hooks/useModal';
import { Plus, Edit, Trash2, Tag, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

const initialFormData = {
  name: '',
  icon: '🏷️',
  iconSvg: null,
  isActive: true
};

const EMOJI_OPTIONS = [
  { value: '🏷️', label: '🏷️ Tag' },
  { value: '🏢', label: '🏢 Office' },
  { value: '🏪', label: '🏪 Shop' },
  { value: '🍽️', label: '🍽️ Restaurant' },
  { value: '🏨', label: '🏨 Hotel' },
  { value: '⛽', label: '⛽ Gas Station' },
  { value: '🏥', label: '🏥 Hospital' },
  { value: '🏫', label: '🏫 School' },
  { value: '🅿️', label: '🅿️ Parking' },
  { value: '🏛️', label: '🏛️ Government' },
  { value: '🏭', label: '🏭 Factory' },
  { value: '🌳', label: '🌳 Park' },
  { value: '⛪', label: '⛪ Church' },
  { value: '🏦', label: '🏦 Bank' },
  { value: '📚', label: '📚 Library' },
];

export default function ProjectCategories({ projectId }) {
  const { theme } = useTheme();
  const [iconType, setIconType] = useState('emoji');

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

    const payload = {
      ...modal.formData,
      icon: iconType === 'svg' ? modal.formData.iconSvg : modal.formData.icon,
      iconSvg: iconType === 'svg' ? modal.formData.iconSvg : null,
    };

    if (modal.isEditing) {
      await categories.update(modal.editingItem.id, payload);
    } else {
      await categories.create(payload);
    }

    modal.close(true);
    setIconType('emoji');
  };

  // Handle edit
  const handleEdit = (category) => {
    const hasSvg = category.icon && category.icon.includes('<svg');
    setIconType(hasSvg ? 'svg' : 'emoji');

    modal.openEdit(category, (item) => ({
      name: item.name,
      icon: hasSvg ? '🏷️' : (item.icon || '🏷️'),
      iconSvg: hasSvg ? item.icon : null,
      isActive: item.isActive
    }));
  };

  // Handle close
  const handleClose = () => {
    modal.close(true);
    setIconType('emoji');
  };

  // Preview category object
  const previewCategory = {
    id: 'preview',
    name: modal.formData.name || 'Category Name',
    icon: iconType === 'svg' ? (modal.formData.iconSvg || '<svg></svg>') : modal.formData.icon
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
        <Button icon={Plus} onClick={() => { setIconType('emoji'); modal.openCreate(); }}>
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
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    {category.icon && category.icon.includes('<svg') ? (
                      <div dangerouslySetInnerHTML={{ __html: category.icon }} className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full" />
                    ) : (
                      <span className="text-lg">{category.icon || '🏷️'}</span>
                    )}
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
                        {category.landmarks?.length || 0} landmarks
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
            <Button icon={Plus} onClick={() => { setIconType('emoji'); modal.openCreate(); }}>
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
                onChange={modal.handleInputChange}
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
                      setIconType('emoji');
                      modal.updateField('iconSvg', null);
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${iconType === 'emoji'
                        ? 'bg-white text-black shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Emoji
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIconType('svg');
                      modal.updateField('icon', '🏷️');
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${iconType === 'svg'
                        ? 'bg-white text-black shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Upload SVG
                  </button>
                </div>

                {/* Emoji Selector */}
                {iconType === 'emoji' && (
                  <select
                    name="icon"
                    value={modal.formData.icon}
                    onChange={modal.handleInputChange}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm cursor-pointer transition-all"
                  >
                    {EMOJI_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}

                {/* SVG Uploader */}
                {iconType === 'svg' && (
                  <SvgIconUploader
                    label=""
                    currentIcon={modal.formData.iconSvg}
                    onUpload={(svgContent) => modal.updateField('iconSvg', svgContent)}
                    theme={theme}
                  />
                )}
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
