"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
    MapPin,
    Settings,
    ExternalLink
} from 'lucide-react';

export default function ProjectOverview({ projectId }) {
    const [project, setProject] = useState(null);
    const [mapSettings, setMapSettings] = useState(null);
    const [landmarks, setLandmarks] = useState([]);
    const [nearbyPlaces, setNearbyPlaces] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) {
            fetchProjectData();
        }
    }, [projectId]);

    const fetchProjectData = async () => {
        setLoading(true);
        try {
            // Parallel fetch of all required data
            const [
                projectRes,
                landmarksRes,
                categoriesRes,
                nearbyRes,
                settingsRes
            ] = await Promise.allSettled([
                fetch(`/api/projects/${projectId}`),
                fetch(`/api/landmarks?projectId=${projectId}`),
                fetch(`/api/categories?projectId=${projectId}`),
                fetch(`/api/nearby?projectId=${projectId}`),
                fetch(`/api/mapSettings?projectId=${projectId}`)
            ]);

            // Handle Project
            if (projectRes.status === 'fulfilled' && projectRes.value.ok) {
                setProject(await projectRes.value.json());
            } else {
                throw new Error('Failed to load project details');
            }

            // Handle Settings
            if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
                const settingsData = await settingsRes.value.json();
                const activeSetting = settingsData.find(s => s.isActive && s.projectId === projectId);
                if (activeSetting) {
                    setMapSettings(activeSetting);
                }
            }

            // Handle Landmarks
            if (landmarksRes.status === 'fulfilled' && landmarksRes.value.ok) {
                const landmarksData = await landmarksRes.value.json();
                if (Array.isArray(landmarksData)) {
                    setLandmarks(landmarksData);
                }
            }

            // Handle Nearby Places
            if (nearbyRes.status === 'fulfilled' && nearbyRes.value.ok) {
                const nearbyData = await nearbyRes.value.json();
                if (Array.isArray(nearbyData)) {
                    setNearbyPlaces(nearbyData);
                }
            }

            // Handle Categories
            if (categoriesRes.status === 'fulfilled' && categoriesRes.value.ok) {
                const categoriesData = await categoriesRes.value.json();
                if (Array.isArray(categoriesData)) {
                    setCategories(categoriesData);
                }
            }

        } catch (error) {
            console.error('Error fetching project data:', error);
            toast.error('Failed to load map preview data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-8 animate-fade-in">
                {/* Stats Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-4 h-4 bg-gray-200 rounded" />
                            <div className="h-4 w-28 bg-gray-200 rounded" />
                        </div>
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex justify-between py-2 border-b border-gray-50">
                                    <div className="h-4 w-20 bg-gray-100 rounded" />
                                    <div className="h-4 w-16 bg-gray-100 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-4 h-4 bg-gray-200 rounded" />
                            <div className="h-4 w-20 bg-gray-200 rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="p-3 bg-gray-50 rounded-xl">
                                    <div className="h-8 w-12 bg-gray-200 rounded mb-2" />
                                    <div className="h-3 w-16 bg-gray-100 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Map Skeleton */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-200 rounded" />
                            <div className="h-4 w-32 bg-gray-200 rounded" />
                        </div>
                        <div className="h-3 w-24 bg-gray-100 rounded" />
                    </div>
                    <div className="h-[600px] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-12 h-12 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm text-gray-500">Loading map preview...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="space-y-8">
            {/* Project Details Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Info Card */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Project Details
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-50">
                            <span className="text-sm text-gray-500">Status</span>
                            {project.isActive ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive
                                </span>
                            )}
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-50">
                            <span className="text-sm text-gray-500">Slug</span>
                            <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{project.slug}</code>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-500">Client URL</span>
                            {project.clientBuildingUrl ? (
                                <a href={project.clientBuildingUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                    View <ExternalLink className="w-3 h-3" />
                                </a>
                            ) : (
                                <span className="text-sm text-gray-400">Not set</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Card */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Map Stats
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <div className="text-2xl font-bold text-blue-600">{landmarks.length}</div>
                            <div className="text-xs font-medium text-blue-600/80">Landmarks</div>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-xl">
                            <div className="text-2xl font-bold text-purple-600">{nearbyPlaces.length}</div>
                            <div className="text-xs font-medium text-purple-600/80">Nearby Places</div>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-xl">
                            <div className="text-2xl font-bold text-orange-600">{categories.length}</div>
                            <div className="text-xs font-medium text-orange-600/80">Categories</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <div className="text-2xl font-bold text-gray-600">{mapSettings ? 'Custom' : 'Default'}</div>
                            <div className="text-xs font-medium text-gray-600/80">Settings</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
