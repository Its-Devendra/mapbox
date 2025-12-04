'use client';

import { useState, useEffect } from 'react';

export default function LandmarksPage() {
  const [landmarks, setLandmarks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLandmark, setEditingLandmark] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    latitude: '',
    longitude: '',
    categoryId: '',
    projectId: '',
    icon: '📍'
  });

  useEffect(() => {
    fetchLandmarks();
    fetchProjects();
    fetchCategories();
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
        fetchLandmarks();
        setShowModal(false);
        setEditingLandmark(null);
        setFormData({
          title: '',
          description: '',
          latitude: '',
          longitude: '',
          categoryId: '',
          projectId: '',
          icon: '📍'
        });
      }
    } catch (error) {
      console.error('Error saving landmark:', error);
    }
  };

  const handleEdit = (landmark) => {
    setEditingLandmark(landmark);
    setFormData({
      title: landmark.title,
      description: landmark.description,
      latitude: landmark.latitude.toString(),
      longitude: landmark.longitude.toString(),
      categoryId: landmark.categoryId,
      projectId: landmark.projectId,
      icon: landmark.icon || '📍'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this landmark?')) {
      try {
        const response = await fetch(`/api/landmarks/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          fetchLandmarks();
        }
      } catch (error) {
        console.error('Error deleting landmark:', error);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📋 List View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'map'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🗺️ Map View
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        /* List View */
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {landmarks.map((landmark) => (
                <tr key={landmark.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-3">{landmark.icon || '📍'}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{landmark.title}</div>
                        <div className="text-sm text-gray-500">{landmark.description}</div>
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
                    <button
                      onClick={() => handleEdit(landmark)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(landmark.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {landmarks.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No landmarks yet</h3>
              <p className="text-gray-600">Add points of interest to your maps.</p>
            </div>
          )}
        </div>
      ) : (
        /* Map View Placeholder */
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">🗺️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Interactive Map View</h3>
            <p className="text-gray-600 mb-4">
              Map integration would go here (requires react-leaflet or similar library)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {landmarks.slice(0, 8).map((landmark) => (
                <div key={landmark.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg mb-1">{landmark.icon || '📍'}</div>
                  <div className="text-sm font-medium">{landmark.title}</div>
                  <div className="text-xs text-gray-500">
                    {landmark.latitude.toFixed(4)}, {landmark.longitude.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Landmark title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon
                  </label>
                  <select
                    name="icon"
                    value={formData.icon}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="📍">📍 Location Pin</option>
                    <option value="🏛️">🏛️ Building</option>
                    <option value="🏪">🏪 Shop</option>
                    <option value="🍽️">🍽️ Restaurant</option>
                    <option value="🏨">🏨 Hotel</option>
                    <option value="⛽">⛽ Gas Station</option>
                    <option value="🏥">🏥 Hospital</option>
                    <option value="🏫">🏫 School</option>
                    <option value="🅿️">🅿️ Parking</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    Category
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      latitude: '',
                      longitude: '',
                      categoryId: '',
                      projectId: '',
                      icon: '📍'
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
