'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Edit, Trash2, Settings, CheckCircle2, XCircle, MapPin, Eye, Crosshair, Map, Palette, ToggleRight } from 'lucide-react';
import InteractiveMapPreview from './InteractiveMapPreview';

export default function ProjectSettings({ projectId }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [showBoundsPreview, setShowBoundsPreview] = useState(false);
  const [showDistancePreview, setShowDistancePreview] = useState(false);
  const [showZoomPreview, setShowZoomPreview] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(null);
  const [zoomTarget, setZoomTarget] = useState('defaultZoom');

  // Project data for preview
  const [projectData, setProjectData] = useState({
    landmarks: [],
    nearbyPlaces: [],
    clientBuilding: null
  });

  const [formData, setFormData] = useState({
    defaultCenterLat: 28.49,
    defaultCenterLng: 77.08,
    defaultZoom: 12,
    minZoom: 8,
    maxZoom: 18,
    enableRotation: true,
    enablePitch: true,
    enable3DBuildings: true,
    buildings3DMinZoom: 15,
    routeLineColor: '#3b82f6',
    routeLineWidth: 4,
    initialAnimationDuration: 3.0,
    routeAnimationDuration: 1.0,
    useDefaultCameraAfterLoad: false,
    defaultPitch: 70,
    defaultBearing: -20,
    southWestLat: '',
    southWestLng: '',
    northEastLat: '',
    northEastLng: '',
    maxPanDistanceKm: '',
    panCenterLat: '',
    panCenterLng: '',
    isActive: false
  });

  useEffect(() => {
    fetchSettings();
    fetchProjectData();
  }, [projectId]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/mapSettings');
      if (response.ok) {
        const data = await response.json();
        const projectSettings = data.filter(setting => setting.projectId === projectId);
        setSettings(projectSettings);
      }
    } catch (error) {
      console.error('Error fetching map settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectData = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProjectData({
          landmarks: data.landmarks || [],
          nearbyPlaces: data.nearByPlaces || [],
          clientBuilding: data.clientBuildingLat && data.clientBuildingLng ? {
            name: data.clientBuildingName,
            coordinates: [data.clientBuildingLng, data.clientBuildingLat],
            icon: data.clientBuildingIcon,
            iconWidth: data.clientBuildingIconWidth,
            iconHeight: data.clientBuildingIconHeight
          } : null
        });
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingSetting ? `/api/mapSettings/${editingSetting.id}` : '/api/mapSettings';
      const method = editingSetting ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          projectId: projectId,
          southWestLat: formData.southWestLat === '' ? undefined : formData.southWestLat,
          southWestLng: formData.southWestLng === '' ? undefined : formData.southWestLng,
          northEastLat: formData.northEastLat === '' ? undefined : formData.northEastLat,
          northEastLng: formData.northEastLng === '' ? undefined : formData.northEastLng,
          maxPanDistanceKm: formData.maxPanDistanceKm === '' ? undefined : formData.maxPanDistanceKm,
          panCenterLat: formData.panCenterLat === '' ? undefined : formData.panCenterLat,
          panCenterLng: formData.panCenterLng === '' ? undefined : formData.panCenterLng
        }),
      });

      if (response.ok) {
        toast.success(editingSetting ? 'Map settings updated successfully!' : 'Map settings created successfully!');
        fetchSettings();
        setShowModal(false);
        setEditingSetting(null);
        resetForm();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to save map settings');
      }
    } catch (error) {
      console.error('Error saving map settings:', error);
      toast.error('Error saving map settings');
    }
  };

  const handleEdit = (setting) => {
    setEditingSetting(setting);
    setFormData({
      defaultCenterLat: setting.defaultCenterLat,
      defaultCenterLng: setting.defaultCenterLng,
      defaultZoom: setting.defaultZoom,
      minZoom: setting.minZoom,
      maxZoom: setting.maxZoom,
      enableRotation: setting.enableRotation,
      enablePitch: setting.enablePitch,
      enable3DBuildings: setting.enable3DBuildings ?? true,
      buildings3DMinZoom: setting.buildings3DMinZoom ?? 15,
      routeLineColor: setting.routeLineColor,
      routeLineWidth: setting.routeLineWidth,
      initialAnimationDuration: setting.initialAnimationDuration,
      routeAnimationDuration: setting.routeAnimationDuration,
      useDefaultCameraAfterLoad: setting.useDefaultCameraAfterLoad || false,
      defaultPitch: setting.defaultPitch || 70,
      defaultBearing: setting.defaultBearing || -20,
      southWestLat: setting.southWestLat || '',
      southWestLng: setting.southWestLng || '',
      northEastLat: setting.northEastLat || '',
      northEastLng: setting.northEastLng || '',
      maxPanDistanceKm: setting.maxPanDistanceKm || '',
      panCenterLat: setting.panCenterLat || '',
      panCenterLng: setting.panCenterLng || '',
      isActive: setting.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete these map settings?')) {
      try {
        const response = await fetch(`/api/mapSettings/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          toast.success('Map settings deleted successfully!');
          fetchSettings();
        } else {
          toast.error('Failed to delete map settings');
        }
      } catch (error) {
        console.error('Error deleting map settings:', error);
        toast.error('Error deleting map settings');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      defaultCenterLat: 28.49,
      defaultCenterLng: 77.08,
      defaultZoom: 12,
      minZoom: 8,
      maxZoom: 18,
      enableRotation: true,
      enablePitch: true,
      enable3DBuildings: true,
      buildings3DMinZoom: 15,
      routeLineColor: '#3b82f6',
      routeLineWidth: 4,
      initialAnimationDuration: 3.0,
      routeAnimationDuration: 1.0,
      useDefaultCameraAfterLoad: false,
      defaultPitch: 70,
      defaultBearing: -20,
      southWestLat: '',
      southWestLng: '',
      northEastLat: '',
      northEastLng: '',
      maxPanDistanceKm: '',
      panCenterLat: '',
      panCenterLng: '',
      isActive: false
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let parsedValue = value;

    if (type === 'checkbox') {
      parsedValue = checked;
    } else if (type === 'number') {
      parsedValue = value === '' ? '' : parseFloat(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
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
          <h3 className="text-base font-semibold text-gray-900">Map Settings</h3>
          <p className="text-sm text-gray-500 mt-1">Configure map display and interaction settings</p>
        </div>
        <button
          onClick={() => {
            setEditingSetting(null);
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-full transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          New Settings
        </button>
      </div>

      {settings.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {settings.map((setting) => (
            <div key={setting.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-gray-700" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Map Settings</h4>
                    {setting.isActive && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                        Active
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(setting)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleDelete(setting.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Center</span>
                    <p className="text-sm font-mono bg-white p-2 rounded mt-1">
                      {setting.defaultCenterLat.toFixed(4)}, {setting.defaultCenterLng.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Zoom</span>
                    <p className="text-sm bg-white p-2 rounded mt-1">
                      {setting.defaultZoom} ({setting.minZoom}-{setting.maxZoom})
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Route Color</span>
                  <div className="flex items-center mt-1">
                    <div
                      className="w-6 h-6 rounded border mr-2"
                      style={{ backgroundColor: setting.routeLineColor }}
                    ></div>
                    <code className="text-xs bg-white px-2 py-1 rounded">{setting.routeLineColor}</code>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Rotation:</span>
                    <span className="ml-2 font-medium">{setting.enableRotation ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pitch:</span>
                    <span className="ml-2 font-medium">{setting.enablePitch ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
          <h4 className="text-sm font-semibold text-gray-900 mb-2">No map settings yet</h4>
          <p className="text-sm text-gray-500 mb-4">Configure map behavior and display settings</p>
          <button
            onClick={() => {
              setEditingSetting(null);
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-full transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Create Settings
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowModal(false); setEditingSetting(null); resetForm(); }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingSetting ? 'Edit Map Settings' : 'Create Map Settings'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Configure how users interact with your map
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingSetting(null);
                  resetForm();
                }}
                className="p-2 -m-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Camera Position */}
                <div className="space-y-4 p-5 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-600" /> Starting Camera Position
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        name="defaultCenterLat"
                        value={formData.defaultCenterLat}
                        onChange={handleInputChange}
                        placeholder="e.g. 28.49"
                        className="w-full px-3 py-2.5 bg-gray-50 border border-transparent rounded-lg focus:bg-white focus:border-gray-300 focus:ring-0 text-sm font-mono transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        name="defaultCenterLng"
                        value={formData.defaultCenterLng}
                        onChange={handleInputChange}
                        placeholder="e.g. 77.08"
                        className="w-full px-3 py-2.5 bg-gray-50 border border-transparent rounded-lg focus:bg-white focus:border-gray-300 focus:ring-0 text-sm font-mono transition-all"
                        required
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                    💡 Use the Camera Preview below to set this visually
                  </p>
                </div>

                {/* Zoom Levels */}
                <div className="space-y-4 p-5 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gray-600" /> Zoom Levels
                    </h4>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Min Zoom</label>
                      <input
                        type="number"
                        min="1"
                        max="22"
                        name="minZoom"
                        value={formData.minZoom}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-transparent rounded-lg focus:bg-white focus:border-gray-300 focus:ring-0 text-sm font-mono transition-all"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">World view</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Default</label>
                      <input
                        type="number"
                        min="1"
                        max="22"
                        name="defaultZoom"
                        value={formData.defaultZoom}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-transparent rounded-lg focus:bg-white focus:border-gray-300 focus:ring-0 text-sm font-mono transition-all"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">Starting view</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Max Zoom</label>
                      <input
                        type="number"
                        min="1"
                        max="22"
                        name="maxZoom"
                        value={formData.maxZoom}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-transparent rounded-lg focus:bg-white focus:border-gray-300 focus:ring-0 text-sm font-mono transition-all"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">Street level</p>
                    </div>
                  </div>
                </div>

                {/* Zoom Preview */}
                <div className="space-y-4 p-5 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Map className="w-4 h-4 text-gray-600" /> Zoom Preview
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowZoomPreview(!showZoomPreview)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showZoomPreview ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {showZoomPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                  </div>

                  {showZoomPreview && (
                    <div className="space-y-4">
                      <div className="rounded-xl overflow-hidden border border-gray-200">
                        <InteractiveMapPreview
                          mode="zoom"
                          zoomSettings={{
                            minZoom: parseFloat(formData.minZoom) || 1,
                            maxZoom: parseFloat(formData.maxZoom) || 22,
                            defaultZoom: parseFloat(formData.defaultZoom) || 12
                          }}
                          onChange={(data) => {
                            if (data?.zoom !== undefined) {
                              setPreviewZoom(data.zoom);
                            }
                          }}
                          mapStyle="mapbox://styles/mapbox/streets-v12"
                          clientBuilding={projectData.clientBuilding}
                          landmarks={projectData.landmarks}
                          nearbyPlaces={projectData.nearbyPlaces}
                        />
                      </div>

                      <div className="flex flex-col gap-4 bg-gray-50 rounded-lg p-4 transition-all">
                        {/* Target Selector */}
                        <div className="flex p-1 bg-gray-200/50 rounded-lg">
                          {[
                            { id: 'minZoom', label: 'Min Zoom' },
                            { id: 'defaultZoom', label: 'Default' },
                            { id: 'maxZoom', label: 'Max Zoom' }
                          ].map((target) => (
                            <button
                              key={target.id}
                              type="button"
                              onClick={() => setZoomTarget(target.id)}
                              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${zoomTarget === target.id
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                              {target.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            Current Preview: <span className="font-mono font-semibold text-gray-900 text-lg">{previewZoom !== null ? previewZoom : parseFloat(formData.defaultZoom) || 12}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const zoomValue = previewZoom !== null ? previewZoom : parseFloat(formData.defaultZoom) || 12;
                              setFormData(prev => ({ ...prev, [zoomTarget]: zoomValue }));
                              toast.info(`Set ${zoomTarget === 'defaultZoom' ? 'Default' : zoomTarget === 'minZoom' ? 'Min' : 'Max'} Zoom to ${zoomValue}`);
                            }}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors shadow-sm active:translate-y-0.5"
                          >
                            Set as {zoomTarget === 'defaultZoom' ? 'Default' : zoomTarget === 'minZoom' ? 'Min' : 'Max'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Route Styling */}
                <div className="space-y-4 p-5 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-gray-600" /> Route Line Styling
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Color</label>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <input
                            type="color"
                            name="routeLineColor"
                            value={formData.routeLineColor}
                            onChange={handleInputChange}
                            className="h-10 w-10 cursor-pointer opacity-0 absolute inset-0 z-10"
                          />
                          <div className="h-10 w-10 rounded-lg border-2 border-gray-200" style={{ backgroundColor: formData.routeLineColor }} />
                        </div>
                        <input
                          type="text"
                          name="routeLineColor"
                          value={formData.routeLineColor}
                          onChange={handleInputChange}
                          className="flex-1 px-3 py-2.5 bg-gray-50 border border-transparent rounded-lg focus:bg-white focus:border-gray-300 focus:ring-0 text-sm font-mono transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Width</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        name="routeLineWidth"
                        value={formData.routeLineWidth}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-transparent rounded-lg focus:bg-white focus:border-gray-300 focus:ring-0 text-sm font-mono transition-all"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">1-20 pixels</p>
                    </div>
                  </div>
                </div>

                {/* User Controls */}
                <div className="space-y-4 p-5 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <ToggleRight className="w-4 h-4 text-gray-600" /> User Controls
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        name="enableRotation"
                        checked={formData.enableRotation}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-gray-900 focus:ring-gray-500 border-gray-300 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-800">Allow Rotation</span>
                        <p className="text-xs text-gray-500">Right-click drag to rotate</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        name="enablePitch"
                        checked={formData.enablePitch}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-gray-900 focus:ring-gray-500 border-gray-300 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-800">Allow Tilt (Pitch)</span>
                        <p className="text-xs text-gray-500">3D perspective view</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        name="enable3DBuildings"
                        checked={formData.enable3DBuildings}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-gray-900 focus:ring-gray-500 border-gray-300 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-800">Show 3D Buildings</span>
                        <p className="text-xs text-gray-500">Extruded buildings when zoomed</p>
                      </div>
                    </label>

                    {formData.enable3DBuildings && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">3D Min Zoom</label>
                        <input
                          type="number"
                          min="1"
                          max="22"
                          name="buildings3DMinZoom"
                          value={formData.buildings3DMinZoom}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-gray-300 focus:ring-0 text-sm font-mono transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Camera Preview */}
                <div className="space-y-4 p-5 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-gray-600" /> Camera Preview
                    </h4>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="useDefaultCameraAfterLoad"
                          checked={formData.useDefaultCameraAfterLoad}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-gray-900 focus:ring-gray-500 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-600">Custom camera</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCameraPreview(!showCameraPreview)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showCameraPreview ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {showCameraPreview ? 'Hide' : 'Preview'}
                      </button>
                    </div>
                  </div>

                  {formData.useDefaultCameraAfterLoad && (
                    <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                      Map will load at the camera position you set below (no intro animation)
                    </p>
                  )}

                  {showCameraPreview && (
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                      <InteractiveMapPreview
                        mode="camera"
                        value={{
                          lat: formData.defaultCenterLat,
                          lng: formData.defaultCenterLng,
                          zoom: formData.defaultZoom,
                          pitch: formData.defaultPitch,
                          bearing: formData.defaultBearing
                        }}
                        onChange={(camera) => {
                          console.log('📷 ProjectSettings received camera:', camera);
                          setFormData(prev => ({
                            ...prev,
                            defaultCenterLat: camera.lat,
                            defaultCenterLng: camera.lng,
                            defaultZoom: camera.zoom,
                            defaultPitch: camera.pitch,
                            defaultBearing: camera.bearing
                          }));
                        }}
                        mapStyle="mapbox://styles/mapbox/streets-v12"
                        landmarks={projectData.landmarks}
                        nearbyPlaces={projectData.nearbyPlaces}
                        clientBuilding={projectData.clientBuilding}
                      />
                    </div>
                  )}
                </div>

                {/* Navigation Bounds */}
                <div className="space-y-4 p-5 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Map className="w-4 h-4 text-gray-600" /> Navigation Bounds
                      <span className="text-xs font-normal text-gray-400">(Optional)</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowBoundsPreview(!showBoundsPreview)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showBoundsPreview ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {showBoundsPreview ? 'Hide Editor' : 'Edit Bounds'}
                    </button>
                  </div>

                  {showBoundsPreview && (
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                      <InteractiveMapPreview
                        mode="bounds"
                        value={{
                          southWest: formData.southWestLat && formData.southWestLng
                            ? [parseFloat(formData.southWestLng), parseFloat(formData.southWestLat)]
                            : null,
                          northEast: formData.northEastLat && formData.northEastLng
                            ? [parseFloat(formData.northEastLng), parseFloat(formData.northEastLat)]
                            : null
                        }}
                        onChange={(bounds) => {
                          if (bounds && bounds.southWest && bounds.northEast) {
                            setFormData(prev => ({
                              ...prev,
                              southWestLat: bounds.southWest[1],
                              southWestLng: bounds.southWest[0],
                              northEastLat: bounds.northEast[1],
                              northEastLng: bounds.northEast[0]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              southWestLat: '',
                              southWestLng: '',
                              northEastLat: '',
                              northEastLng: ''
                            }));
                          }
                        }}
                        mapStyle="mapbox://styles/mapbox/streets-v12"
                        landmarks={projectData.landmarks}
                        nearbyPlaces={projectData.nearbyPlaces}
                        clientBuilding={projectData.clientBuilding}
                      />
                    </div>
                  )}
                </div>

                {/* Active Setting */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-gray-900 focus:ring-gray-500 border-gray-300 rounded"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800">Set as active configuration</span>
                      <p className="text-xs text-gray-500">This will be used when the map loads</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSetting(null);
                    resetForm();
                  }}
                  className="px-5 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm rounded-xl transition-all"
                >
                  {editingSetting ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

