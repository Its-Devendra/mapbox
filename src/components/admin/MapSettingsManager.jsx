'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function MapSettingsManager() {
  const { theme } = useTheme();
  const [settings, setSettings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    defaultCenterLat: 28.49,
    defaultCenterLng: 77.08,
    defaultZoom: 12,
    minZoom: 8,
    maxZoom: 18,
    enableRotation: true,
    enablePitch: true,
    routeLineColor: '#3b82f6',
    routeLineWidth: 4,
    initialAnimationDuration: 3.0,
    routeAnimationDuration: 1.0,
    projectId: '',
    isActive: false
  });

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetchSettings(),
      fetchProjects()
    ]);
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/mapSettings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching map settings:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter settings
  const filteredSettings = settings.filter(setting => {
    const project = projects.find(p => p.id === setting.projectId);
    const projectName = project ? project.name : '';

    return projectName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Handle form submission
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
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchSettings();
        setShowModal(false);
        setEditingSetting(null);
        setFormData({
          defaultCenterLat: 28.49,
          defaultCenterLng: 77.08,
          defaultZoom: 12,
          minZoom: 8,
          maxZoom: 18,
          enableRotation: true,
          enablePitch: true,
          routeLineColor: '#3b82f6',
          routeLineWidth: 4,
          initialAnimationDuration: 3.0,
          routeAnimationDuration: 1.0,
          projectId: '',
          isActive: false
        });
      }
    } catch (error) {
      console.error('Error saving map setting:', error);
    }
  };

  // Handle edit
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
      routeLineColor: setting.routeLineColor,
      routeLineWidth: setting.routeLineWidth,
      initialAnimationDuration: setting.initialAnimationDuration,
      routeAnimationDuration: setting.routeAnimationDuration,
      projectId: setting.projectId,
      isActive: setting.isActive
    });
    setShowModal(true);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete these map settings?')) {
      try {
        const response = await fetch(`/api/mapSettings/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          await fetchSettings();
        }
      } catch (error) {
        console.error('Error deleting map setting:', error);
      }
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Get project name
  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Map Settings Management</h2>
          <p className="text-gray-600">Configure map display and interaction settings</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 sm:mt-0 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>New Map Settings</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <input
          type="text"
          placeholder="Search map settings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSettings.map((setting) => (
          <div key={setting.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Map Settings</h3>
                <p className="text-sm text-gray-600 mt-1">Project: {getProjectName(setting.projectId)}</p>

                <div className="flex items-center mt-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${setting.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {setting.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(setting)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(setting.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Center</span>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                    {setting.defaultCenterLat.toFixed(4)}, {setting.defaultCenterLng.toFixed(4)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Zoom</span>
                  <p className="text-sm bg-gray-100 p-2 rounded mt-1">
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
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{setting.routeLineColor}</code>
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

      {filteredSettings.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No map settings found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by creating your first map settings.'}
          </p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSetting ? 'Edit Map Settings' : 'Create Map Settings'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project
                </label>
                <select
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              {/* Map Center Coordinates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Center Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="defaultCenterLat"
                    value={formData.defaultCenterLat}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="28.6139"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Center Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="defaultCenterLng"
                    value={formData.defaultCenterLng}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="77.2090"
                    required
                  />
                </div>
              </div>

              {/* Zoom Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Zoom
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="22"
                    name="defaultZoom"
                    value={formData.defaultZoom}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Zoom
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="22"
                    name="minZoom"
                    value={formData.minZoom}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Zoom
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="22"
                    name="maxZoom"
                    value={formData.maxZoom}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Route Styling */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Route Line Color
                  </label>
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Route Line Width
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    name="routeLineWidth"
                    value={formData.routeLineWidth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="enableRotation"
                    checked={formData.enableRotation}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Enable map rotation
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="enablePitch"
                    checked={formData.enablePitch}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Enable map pitch/tilt
                  </label>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Set as active settings
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSetting(null);
                    setFormData({
                      defaultCenterLat: 28.49,
                      defaultCenterLng: 77.08,
                      defaultZoom: 12,
                      minZoom: 8,
                      maxZoom: 18,
                      enableRotation: true,
                      enablePitch: true,
                      routeLineColor: '#3b82f6',
                      routeLineWidth: 4,
                      initialAnimationDuration: 3.0,
                      routeAnimationDuration: 1.0,
                      projectId: '',
                      isActive: false
                    });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
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


