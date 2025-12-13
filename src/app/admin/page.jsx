'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Button, Card, Skeleton, EmptyState } from '@/components/ui';
import useCRUD from '@/hooks/useCRUD';
import useSearch from '@/hooks/useSearch';
import useFilters from '@/hooks/useFilters';
import {
    FolderKanban,
    Plus,
    Search,
    Edit,
    Trash2,
    Eye
} from 'lucide-react';

export default function AdminDashboard() {
    const router = useRouter();

    // Data fetching with useCRUD
    const projects = useCRUD({
        endpoint: '/api/projects',
    });

    // Search
    const { query, setQuery, filtered: searchedProjects } = useSearch(
        projects.items,
        ['name', 'slug']
    );

    // Status filter
    const { filters, setFilter, filtered: filteredProjects } = useFilters(
        searchedProjects,
        {
            status: { type: 'boolean', field: 'isActive', defaultValue: 'all' }
        }
    );

    // Fetch on mount
    useEffect(() => {
        projects.fetchAll();
    }, []);

    // Handle delete
    const handleDelete = async (id, e) => {
        e.stopPropagation();
        await projects.remove(id);
    };

    // Loading state with skeleton
    if (projects.loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA]">
                <div className="border-b border-gray-200 bg-white">
                    <div className="max-w-7xl mx-auto px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <Skeleton width={120} height={32} rounded="lg" />
                            <Skeleton width={140} height={40} rounded="full" />
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
                    <div className="mb-10 flex gap-4">
                        <Skeleton width={384} height={44} rounded="xl" />
                        <Skeleton width={200} height={44} rounded="xl" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton.Card key={i} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            {/* Header */}
            <div className="border-b border-gray-200 sticky top-0 z-50 backdrop-blur-md bg-white/80 supports-[backdrop-filter]:bg-white/60">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <img className='h-8 w-auto object-contain' src='/logo.jpeg' alt='logo' />
                        </div>
                        <Button
                            icon={Plus}
                            onClick={() => router.push('/admin/projects/new')}
                        >
                            New Project
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 animate-fade-in">
                {/* Search and Filter Bar */}
                <div className="mb-10 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:w-96 group">
                        <Search
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-black transition-colors"
                            strokeWidth={2}
                        />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm placeholder:text-gray-400 shadow-sm transition-all"
                        />
                    </div>

                    {/* Segmented Control Style Filters */}
                    <div className="bg-gray-100/80 p-1 rounded-xl inline-flex">
                        {['all', 'active', 'inactive'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter('status', status)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer capitalize ${filters.status === status
                                    ? 'bg-white text-black shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Projects Grid */}
                {filteredProjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                        {filteredProjects.map((project) => {
                            return (
                                <Card
                                    key={project.id}
                                    interactive
                                    padding="none"
                                    onClick={() => router.push(`/admin/projects/${project.id}`)}
                                    className="flex flex-col h-full group"
                                >
                                    <div className="p-5 flex-1">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                                                    <FolderKanban className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-900 leading-none mb-1">
                                                        {project.name}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 font-mono">/{project.slug}</p>
                                                </div>
                                            </div>
                                            <div className={`w-2 h-2 rounded-full ${project.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        </div>
                                    </div>

                                    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between rounded-b-xl">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(`/map/${project.id}`, '_blank');
                                            }}
                                            className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            View Map
                                        </button>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/admin/projects/${project.id}/edit`);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-md transition-colors cursor-pointer"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(project.id, e)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState
                        icon={FolderKanban}
                        title="No projects found"
                        description={
                            query || filters.status !== 'all'
                                ? "We couldn't find any projects matching your criteria."
                                : 'Start by creating your first project to manage your maps.'
                        }
                        action={
                            !query && filters.status === 'all' && (
                                <Button icon={Plus} onClick={() => router.push('/admin/projects/new')}>
                                    Create Project
                                </Button>
                            )
                        }
                    />
                )}
            </div>
        </div>
    );
}

