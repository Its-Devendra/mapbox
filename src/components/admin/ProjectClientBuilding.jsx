'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Building, MapPin, Save, Edit } from 'lucide-react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    "pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNfGX8wp_w";

export default function ProjectClientBuilding({ projectId }) {
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const mapContainerRef = useRef();
    const mapRef = useRef();
    const markerRef = useRef();

    const [formData, setFormData] = useState({
        clientBuildingLat: null,
        clientBuildingLng: null,
        clientBuildingName: '',
        clientBuildingDescription: ''
    });

    useEffect(() => {
        fetchProject();
    }, [projectId]);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current || loading) return;

        // Initialize map
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [77.08, 28.49], // Default center
            zoom: 12
        });

        mapRef.current = map;

        map.on('load', () => {
            // If project has existing coordinates, center map and add marker
            if (formData.clientBuildingLat && formData.clientBuildingLng) {
                const coords = [formData.clientBuildingLng, formData.clientBuildingLat];
                map.setCenter(coords);
                addMarker(coords);
            }
        });

        // Click to place marker (only when editing)
        map.on('click', (e) => {
            if (!isEditing) return;
            const { lng, lat } = e.lngLat;
            addMarker([lng, lat]);
            setFormData(prev => ({
                ...prev,
                clientBuildingLat: parseFloat(lat.toFixed(6)),
                clientBuildingLng: parseFloat(lng.toFixed(6))
            }));
        });

        return () => {
            if (markerRef.current) {
                markerRef.current.remove();
            }
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [loading]);

    const addMarker = (coords) => {
        // Remove existing marker
        if (markerRef.current) {
            markerRef.current.remove();
        }

        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#3b82f6';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';

        // Add new marker
        const marker = new mapboxgl.Marker(el, { draggable: isEditing })
            .setLngLat(coords)
            .addTo(mapRef.current);

        // Update coordinates when marker is dragged
        marker.on('dragend', () => {
            const lngLat = marker.getLngLat();
            setFormData(prev => ({
                ...prev,
                clientBuildingLat: parseFloat(lngLat.lat.toFixed(6)),
                clientBuildingLng: parseFloat(lngLat.lng.toFixed(6))
            }));
        });

        markerRef.current = marker;
    };

    const fetchProject = async () => {
        try {
            const response = await fetch(`/api/projects/${projectId}`, { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                setProject(data);

                // Set form data from project
                setFormData({
                    clientBuildingLat: data.clientBuildingLat || null,
                    clientBuildingLng: data.clientBuildingLng || null,
                    clientBuildingName: data.clientBuildingName || '',
                    clientBuildingDescription: data.clientBuildingDescription || ''
                });
            }
        } catch (error) {
            console.error('Error fetching project:', error);
            toast.error('Error loading project');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Validate coordinates if provided
            if (formData.clientBuildingLat !== null && formData.clientBuildingLng !== null) {
                if (formData.clientBuildingLat < -90 || formData.clientBuildingLat > 90) {
                    toast.error('Latitude must be between -90 and 90');
                    setSaving(false);
                    return;
                }
                if (formData.clientBuildingLng < -180 || formData.clientBuildingLng > 180) {
                    toast.error('Longitude must be between -180 and 180');
                    setSaving(false);
                    return;
                }
            }

            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientBuildingLat: formData.clientBuildingLat,
                    clientBuildingLng: formData.clientBuildingLng,
                    clientBuildingName: formData.clientBuildingName || null,
                    clientBuildingDescription: formData.clientBuildingDescription || null
                }),
            });

            if (response.ok) {
                toast.success('Client building updated successfully!');
                await fetchProject();

                // Update map marker if coordinates changed
                if (mapRef.current && formData.clientBuildingLat && formData.clientBuildingLng) {
                    const coords = [formData.clientBuildingLng, formData.clientBuildingLat];
                    mapRef.current.flyTo({
                        center: coords,
                        zoom: 14,
                        duration: 1000
                    });
                    addMarker(coords);
                }
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'Failed to update client building');
            }
        } catch (error) {
            console.error('Error updating client building:', error);
            toast.error('Error updating client building');
        } finally {
            setSaving(false);
            setIsEditing(false); // Exit edit mode after saving
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'clientBuildingLat' || name === 'clientBuildingLng') {
            const numValue = value === '' ? null : parseFloat(value);
            setFormData(prev => ({ ...prev, [name]: numValue }));

            // Update marker if both coordinates are valid
            if (mapRef.current && formData.clientBuildingLat !== null && formData.clientBuildingLng !== null) {
                const lat = name === 'clientBuildingLat' ? numValue : formData.clientBuildingLat;
                const lng = name === 'clientBuildingLng' ? numValue : formData.clientBuildingLng;

                if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
                    const coords = [lng, lat];
                    addMarker(coords);
                    mapRef.current.flyTo({ center: coords, zoom: 14, duration: 500 });
                }
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const clearCoordinates = () => {
        setFormData(prev => ({
            ...prev,
            clientBuildingLat: null,
            clientBuildingLng: null
        }));

        if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
        }

        if (mapRef.current) {
            mapRef.current.flyTo({
                center: [77.08, 28.49],
                zoom: 12,
                duration: 1000
            });
        }
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
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">Client Building Location</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Configure the client building coordinates, name, and description. This location is used as the starting point for landmark routes and distance calculations.
                        </p>
                    </div>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium text-sm transition-colors"
                        >
                            <Edit className="w-4 h-4" strokeWidth={2} />
                            Edit
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Map Picker */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-700" strokeWidth={2} />
                            <h4 className="font-semibold text-sm text-gray-900">Interactive Map</h4>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Click on the map to place or drag the marker</p>
                    </div>
                    <div
                        ref={mapContainerRef}
                        className="w-full h-[400px]"
                        style={{ minHeight: '400px' }}
                    />
                </div>

                {/* Form */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Building Name
                            </label>
                            <input
                                type="text"
                                name="clientBuildingName"
                                value={formData.clientBuildingName}
                                onChange={handleInputChange}
                                placeholder="e.g., Headquarters, Main Office"
                                disabled={!isEditing}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm ${isEditing ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                                    }`}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                name="clientBuildingDescription"
                                value={formData.clientBuildingDescription}
                                onChange={handleInputChange}
                                placeholder="Brief description of the client building"
                                rows={3}
                                disabled={!isEditing}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm resize-none ${isEditing ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                                    }`}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Latitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    name="clientBuildingLat"
                                    value={formData.clientBuildingLat ?? ''}
                                    onChange={handleInputChange}
                                    placeholder="28.49"
                                    disabled={!isEditing}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-mono ${isEditing ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                                        }`}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Longitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    name="clientBuildingLng"
                                    value={formData.clientBuildingLng ?? ''}
                                    onChange={handleInputChange}
                                    placeholder="77.08"
                                    disabled={!isEditing}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-mono ${isEditing ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                                        }`}
                                />
                            </div>
                        </div>

                        {formData.clientBuildingLat !== null && formData.clientBuildingLng !== null && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
                                    <div className="text-xs text-blue-800">
                                        <p className="font-medium mb-1">Current Location</p>
                                        <p className="font-mono">
                                            {formData.clientBuildingLat.toFixed(6)}, {formData.clientBuildingLng.toFixed(6)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isEditing && (
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium text-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" strokeWidth={2} />
                                            Save Changes
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        // Reset form data to project data
                                        setFormData({
                                            clientBuildingLat: project.clientBuildingLat || null,
                                            clientBuildingLng: project.clientBuildingLng || null,
                                            clientBuildingName: project.clientBuildingName || '',
                                            clientBuildingDescription: project.clientBuildingDescription || ''
                                        });
                                    }}
                                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
                                >
                                    Cancel
                                </button>

                                {(formData.clientBuildingLat !== null || formData.clientBuildingLng !== null) && (
                                    <button
                                        type="button"
                                        onClick={clearCoordinates}
                                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* Info Card */}
            <div className="mt-6 bg-gray-50 rounded-xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
                    <div className="text-sm text-gray-600">
                        <p className="font-medium text-gray-900 mb-1">About Client Building</p>
                        <p>
                            The client building serves as the reference point for all distance calculations and landmark routes.
                            If not configured, the system will fall back to using the map settings default center coordinates.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
