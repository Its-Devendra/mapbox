'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Edit, Trash2, Settings, CheckCircle2, XCircle } from 'lucide-react';
import InteractiveMapPreview from './InteractiveMapPreview';

export default function ProjectSettings({ projectId }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [showBoundsPreview, setShowBoundsPreview] = useState(false);

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
            coordinates: [data.clientBuildingLng, data.clientBuildingLat]
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
          northEastLng: formData.northEastLng === '' ? undefined : formData.northEastLng
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
      southWestLat: '',
      southWestLng: '',
      northEastLat: '',
      northEastLng: '',
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSetting ? 'Edit Map Settings' : 'Create Map Settings'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Center Latitude</label>
                  <input
                    type="number"
                    step="any"
                    name="defaultCenterLat"
                    value={formData.defaultCenterLat}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Center Longitude</label>
                  <input
                    type="number"
                    step="any"
                    name="defaultCenterLng"
                    value={formData.defaultCenterLng}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Zoom</label>
                  <input
                    type="number"
                    min="1"
                    max="22"
                    name="defaultZoom"
                    value={formData.defaultZoom}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Zoom</label>
                  <input
                    type="number"
                    min="1"
                    max="22"
                    name="minZoom"
                    value={formData.minZoom}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Zoom</label>
                  <input
                    type="number"
                    min="1"
                    max="22"
                    name="maxZoom"
                    value={formData.maxZoom}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Route Line Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      name="routeLineColor"
                      value={formData.routeLineColor}
                      onChange={handleInputChange}
                      className="h-10 w-16 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      name="routeLineColor"
                      value={formData.routeLineColor}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Route Line Width</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    name="routeLineWidth"
                    value={formData.routeLineWidth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Map Boundaries (Optional)</h4>
                <p className="text-xs text-gray-500 mb-4">Set the maximum bounds for the map. Users won't be able to pan outside this area. Leave empty for no bounds.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-gray-700">South-West Coordinate</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          name="southWestLat"
                          value={formData.southWestLat}
                          onChange={handleInputChange}
                          placeholder="-90 to 90"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          name="southWestLng"
                          value={formData.southWestLng}
                          onChange={handleInputChange}
                          placeholder="-180 to 180"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-gray-700">North-East Coordinate</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          name="northEastLat"
                          value={formData.northEastLat}
                          onChange={handleInputChange}
                          placeholder="-90 to 90"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          name="northEastLng"
                          value={formData.northEastLng}
                          onChange={handleInputChange}
                          placeholder="-180 to 180"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="enableRotation"
                    checked={formData.enableRotation}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded cursor-pointer"
                  />
                  <label className="ml-2 text-sm text-gray-700 cursor-pointer">Enable map rotation</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="enablePitch"
                    checked={formData.enablePitch}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded cursor-pointer"
                  />
                  <label className="ml-2 text-sm text-gray-700 cursor-pointer">Enable map pitch/tilt</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="enable3DBuildings"
                    checked={formData.enable3DBuildings}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded cursor-pointer"
                  />
                  <label className="ml-2 text-sm text-gray-700 cursor-pointer">Enable 3D buildings</label>
                </div>
                {formData.enable3DBuildings && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">3D Building Min Zoom</label>
                    <input
                      type="number"
                      min="1"
                      max="22"
                      name="buildings3DMinZoom"
                      value={formData.buildings3DMinZoom}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Interactive Camera Preview Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Default Camera Position</h4>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="useDefaultCameraAfterLoad"
                      checked={formData.useDefaultCameraAfterLoad}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded mr-2"
                    />
                    <span className="text-sm text-gray-700">Use default camera after load</span>
                  </label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-700">
                    <strong>When disabled (default):</strong> Intro transition (globe → building) plays if configured.<br />
                    <strong>When enabled:</strong> Map flies directly to this camera position on load.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCameraPreview(!showCameraPreview)}
                  className="mb-3 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{showCameraPreview ? 'Hide' : 'Open'} Camera Preview</span>
                </button>

                {showCameraPreview && (
                  <div className="mb-4">
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
                        setFormData(prev => ({
                          ...prev,
                          defaultCenterLat: camera.lat,
                          defaultCenterLng: camera.lng,
                          defaultZoom: camera.zoom,
                          defaultPitch: camera.pitch,
                          defaultBearing: camera.bearing
                        }));
                      }}
                      mapStyle="mapbox://styles/mapbox/dark-v11"
                      landmarks={projectData.landmarks}
                      nearbyPlaces={projectData.nearbyPlaces}
                      clientBuilding={projectData.clientBuilding}
                    />
                  </div>
                )}
              </div>

              {/* Interactive Bounds Preview Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Map Bounds (Optional)</h4>
                <p className="text-xs text-gray-600 mb-3">
                  Restrict where users can navigate. Leave empty for no restrictions.
                </p>

                <button
                  type="button"
                  onClick={() => setShowBoundsPreview(!showBoundsPreview)}
                  className="mb-3 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <span>{showBoundsPreview ? 'Hide' : 'Open'} Bounds Editor</span>
                </button>

                {showBoundsPreview && (
                  <div className="mb-4">
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
                      mapStyle="mapbox://styles/mapbox/dark-v11"
                      landmarks={projectData.landmarks}
                      nearbyPlaces={projectData.nearbyPlaces}
                      clientBuilding={projectData.clientBuilding}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center border-t pt-4 mt-4">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded cursor-pointer"
                />
                <label className="ml-2 text-sm text-gray-700 cursor-pointer">Set as active settings</label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSetting(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium text-sm transition-colors cursor-pointer"
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

