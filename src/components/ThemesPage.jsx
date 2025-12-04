'use client';

import { useState, useEffect } from 'react';

export default function ThemesPage() {
  const [themes, setThemes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [formData, setFormData] = useState({
    primary: '#3b82f6',
    secondary: '#1e40af',
    mapboxStyle: 'mapbox://styles/mapbox/streets-v12',
    projectId: '',
    isActive: false
  });

  useEffect(() => {
    fetchThemes();
    fetchProjects();
  }, []);

  const fetchThemes = async () => {
    try {
      const response = await fetch('/api/themes');
      if (response.ok) {
        const data = await response.json();
        setThemes(data);
      }
    } catch (error) {
      console.error('Error fetching themes:', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingTheme ? `/api/themes/${editingTheme.id}` : '/api/themes';
      const method = editingTheme ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchThemes();
        setShowModal(false);
        setEditingTheme(null);
        setFormData({
          primary: '#3b82f6',
          secondary: '#1e40af',
          mapboxStyle: 'mapbox://styles/mapbox/streets-v12',
          projectId: '',
          isActive: false
        });
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const handleEdit = (theme) => {
    setEditingTheme(theme);
    setFormData({
      primary: theme.primary,
      secondary: theme.secondary,
      mapboxStyle: theme.mapboxStyle,
      projectId: theme.projectId,
      isActive: theme.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this theme?')) {
      try {
        const response = await fetch(`/api/themes/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          fetchThemes();
        }
      } catch (error) {
        console.error('Error deleting theme:', error);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Themes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes.map((theme) => (
          <div key={theme.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-gray-200"
                    style={{ backgroundColor: theme.primary }}
                  ></div>
                  <div
                    className="w-8 h-8 rounded-full border-2 border-gray-200"
                    style={{ backgroundColor: theme.secondary }}
                  ></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Theme</h3>
                <p className="text-sm text-gray-600 mt-1">Project: {getProjectName(theme.projectId)}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(theme)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(theme.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Primary Color</span>
                <div className="flex items-center mt-1">
                  <div
                    className="w-6 h-6 rounded border mr-2"
                    style={{ backgroundColor: theme.primary }}
                  ></div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{theme.primary}</code>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Secondary Color</span>
                <div className="flex items-center mt-1">
                  <div
                    className="w-6 h-6 rounded border mr-2"
                    style={{ backgroundColor: theme.secondary }}
                  ></div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{theme.secondary}</code>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Mapbox Style</span>
                <p className="text-sm mt-1 font-mono bg-gray-100 p-2 rounded truncate">
                  {theme.mapboxStyle}
                </p>
              </div>

              <div className="flex items-center pt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  theme.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {theme.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {themes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎨</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No themes yet</h3>
          <p className="text-gray-600 mb-4">Create your first theme to customize your map appearance.</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Theme
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">
                {editingTheme ? 'Edit Theme' : 'Create New Theme'}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    name="primary"
                    value={formData.primary}
                    onChange={handleInputChange}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    name="primary"
                    value={formData.primary}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    name="secondary"
                    value={formData.secondary}
                    onChange={handleInputChange}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    name="secondary"
                    value={formData.secondary}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#1e40af"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mapbox Style URL
                </label>
                <select
                  name="mapboxStyle"
                  value={formData.mapboxStyle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="mapbox://styles/mapbox/streets-v12">Streets</option>
                  <option value="mapbox://styles/mapbox/satellite-v9">Satellite</option>
                  <option value="mapbox://styles/mapbox/light-v11">Light</option>
                  <option value="mapbox://styles/mapbox/dark-v11">Dark</option>
                  <option value="mapbox://styles/mapbox/outdoors-v12">Outdoors</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Set as active theme
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTheme(null);
                    setFormData({
                      primary: '#3b82f6',
                      secondary: '#1e40af',
                      mapboxStyle: 'mapbox://styles/mapbox/streets-v12',
                      projectId: '',
                      isActive: false
                    });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTheme ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
