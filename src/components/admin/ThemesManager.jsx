'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function ThemesManager() {
  const { theme } = useTheme();
  const [themes, setThemes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    primary: '#1e3a8a',
    secondary: '#ffffff',
    tertiary: '#64748b',
    quaternary: '#f1f5f9',
    mapboxStyle: 'mapbox://styles/mapbox/streets-v12',
    projectId: '',
    isActive: false
  });

  // Fetch data
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
    } finally {
      setLoading(false);
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
    }
  };

  // Filter themes
  const filteredThemes = themes.filter(theme => {
    const project = projects.find(p => p.id === theme.projectId);
    const projectName = project ? project.name : '';
    const matchesSearch = theme.primary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && theme.isActive) ||
                         (statusFilter === 'inactive' && !theme.isActive);
    return matchesSearch && matchesStatus;
  });

  // Handle form submission
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
          primary: '#1e3a8a',
          secondary: '#ffffff',
          tertiary: '#64748b',
          quaternary: '#f1f5f9',
          mapboxStyle: 'mapbox://styles/mapbox/streets-v12',
          projectId: '',
          isActive: false
        });
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  // Handle edit
  const handleEdit = (theme) => {
    setEditingTheme(theme);
    setFormData({
      primary: theme.primary,
      secondary: theme.secondary,
      tertiary: '#64748b', // Default tertiary
      quaternary: '#f1f5f9', // Default quaternary
      mapboxStyle: theme.mapboxStyle,
      projectId: theme.projectId,
      isActive: theme.isActive
    });
    setShowModal(true);
  };

  // Handle delete
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Themes Management</h2>
          <p className="text-gray-600">Customize map styles and visual themes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 sm:mt-0 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>New Theme</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search themes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'inactive'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {status === 'all' ? 'All' : status === 'active' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Themes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredThemes.map((theme) => (
          <div key={theme.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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
                <h3 className="text-lg font-semibold text-gray-900">Theme</h3>
                <p className="text-sm text-gray-600 mt-1">Project: {getProjectName(theme.projectId)}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(theme)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(theme.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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
                  {theme.mapboxStyle.replace('mapbox://styles/mapbox/', '')}
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

      {filteredThemes.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a4 4 0 004-4V5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No themes found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first theme.'}
          </p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 gap-4">
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
                      className="h-10 w-16 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      name="primary"
                      value={formData.primary}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="#1e3a8a"
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
                      className="h-10 w-16 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      name="secondary"
                      value={formData.secondary}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mapbox Style
                </label>
                <select
                  name="mapboxStyle"
                  value={formData.mapboxStyle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
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
                      primary: '#1e3a8a',
                      secondary: '#ffffff',
                      tertiary: '#64748b',
                      quaternary: '#f1f5f9',
                      mapboxStyle: 'mapbox://styles/mapbox/streets-v12',
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
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
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


