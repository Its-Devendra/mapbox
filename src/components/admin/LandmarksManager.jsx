'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import SvgIconUploader from '@/components/SvgIconUploader';

export default function LandmarksManager() {
  const { theme } = useTheme();
  const [landmarks, setLandmarks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLandmark, setEditingLandmark] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    latitude: 28.49,
    longitude: 77.08,
    categoryId: '',
    projectId: '',
    icon: null, // SVG content
    iconWidth: 32,
    iconHeight: 32
  });

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetchLandmarks(),
      fetchProjects(),
      fetchCategories()
    ]);
  }, []);

  const fetchLandmarks = async () => {
    try {
      const response = await fetch('/api/landmarks');
      if (response.ok) {
        const data = await response.json();
        setLandmarks(data);
      }
    } catch (error) {
      console.error('Error fetching landmarks:', error);
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

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter landmarks
  const filteredLandmarks = landmarks.filter(landmark => {
    const project = projects.find(p => p.id === landmark.projectId);
    const category = categories.find(c => c.id === landmark.categoryId);
    const projectName = project ? project.name : '';
    const categoryName = category ? category.name : '';

    const matchesSearch = landmark.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoryName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingLandmark ? `/api/landmarks/${editingLandmark.id}` : '/api/landmarks';
      const method = editingLandmark ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        }),
      });

      if (response.ok) {
        await fetchLandmarks();
        setShowModal(false);
        setEditingLandmark(null);
        setFormData({
          title: '',
          description: '',
          latitude: 28.49,
          longitude: 77.08,
          categoryId: '',
          projectId: '',
          icon: null,
          iconWidth: 32,
          iconHeight: 32
        });
      }
    } catch (error) {
      console.error('Error saving landmark:', error);
    }
  };

  // Handle edit
  const handleEdit = (landmark) => {
    setEditingLandmark(landmark);
    setFormData({
      title: landmark.title,
      description: landmark.description,
      latitude: landmark.latitude,
      longitude: landmark.longitude,
      categoryId: landmark.categoryId,
      projectId: landmark.projectId,
      icon: landmark.icon || null,
      iconWidth: landmark.iconWidth || 32,
      iconHeight: landmark.iconHeight || 32
    });
    setShowModal(true);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this landmark?')) {
      try {
        const response = await fetch(`/api/landmarks/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          await fetchLandmarks();
        }
      } catch (error) {
        console.error('Error deleting landmark:', error);
      }
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;

    // Parse numeric values
    let parsedValue = value;
    if (type === 'number' && value !== '') {
      parsedValue = parseFloat(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  // Get project and category names
  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Landmarks Management</h2>
          <p className="text-gray-600">Add and manage points of interest on your maps</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 sm:mt-0 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>New Landmark</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <input
          type="text"
          placeholder="Search landmarks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Landmarks Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Landmark
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLandmarks.map((landmark) => (
                <tr key={landmark.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-3">{landmark.icon || '📍'}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{landmark.title}</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">{landmark.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {landmark.latitude.toFixed(6)}, {landmark.longitude.toFixed(6)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getCategoryName(landmark.categoryId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getProjectName(landmark.projectId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(landmark)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(landmark.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLandmarks.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No landmarks found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by creating your first landmark.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingLandmark ? 'Edit Landmark' : 'Create New Landmark'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Landmark title"
                    required
                  />
                </div>

                <div>
                  {/* Icon Upload */}
                  <SvgIconUploader
                    label="Landmark Icon"
                    currentIcon={formData.icon}
                    onUpload={(svgContent) => setFormData({ ...formData, icon: svgContent })}
                    theme={theme}
                  />
                </div>
              </div>

              {/* Icon Size Settings */}
              {formData.icon && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon Width (px)
                    </label>
                    <input
                      type="number"
                      name="iconWidth"
                      value={formData.iconWidth}
                      onChange={handleInputChange}
                      min="10"
                      max="200"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="32"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Min: 10px, Max: 200px
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon Height (px)
                    </label>
                    <input
                      type="number"
                      name="iconHeight"
                      value={formData.iconHeight}
                      onChange={handleInputChange}
                      min="10"
                      max="200"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="32"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Min: 10px, Max: 200px
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Landmark description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project
                  </label>
                  <select
                    name="projectId"
                    value={formData.projectId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    Category
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="28.6139"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="77.2090"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingLandmark(null);
                    setFormData({
                      title: '',
                      description: '',
                      latitude: 28.49,
                      longitude: 77.08,
                      categoryId: '',
                      projectId: '',
                      icon: null
                    });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  {editingLandmark ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


