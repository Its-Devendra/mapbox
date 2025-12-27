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
    Eye,
    LogOut,
    MapPin,
    CheckCircle2,
    XCircle,
    ExternalLink,
    MoreHorizontal,
    Clock,
    TrendingUp
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
        if (confirm('Are you sure you want to delete this project?')) {
            await projects.remove(id);
        }
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/admin/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    // Calculate stats
    const totalProjects = projects.items?.length || 0;
    const activeProjects = projects.items?.filter(p => p.isActive)?.length || 0;
    const inactiveProjects = totalProjects - activeProjects;

    // Loading state with skeleton
    if (projects.loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
                {/* Header Skeleton */}
                <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
                    <div className="max-w-7xl mx-auto px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <Skeleton width={140} height={32} rounded="lg" />
                            <div className="flex gap-3">
                                <Skeleton width={120} height={40} rounded="xl" />
                                <Skeleton width={40} height={40} rounded="xl" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
                    {/* Stats Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} width="100%" height={100} rounded="2xl" />
                        ))}
                    </div>
                    {/* Search Skeleton */}
                    <div className="mb-8 flex gap-4">
                        <Skeleton width={400} height={48} rounded="xl" />
                        <Skeleton width={200} height={48} rounded="xl" />
                    </div>
                    {/* Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton.Card key={i} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
            {/* Premium Header */}
            <header className="border-b border-slate-200/80 sticky top-0 z-50 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <img className='h-8 w-auto object-contain' src='/logo.jpeg' alt='logo' />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <Button
                                icon={Plus}
                                onClick={() => router.push('/admin/projects/new')}
                                className="shadow-sm"
                            >
                                <span className="hidden sm:inline">New Project</span>
                                <span className="sm:hidden">New</span>
                            </Button>
                            <button
                                onClick={handleLogout}
                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 cursor-pointer"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" strokeWidth={1.5} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                    {/* Total Projects */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Total Projects</p>
                                <p className="text-3xl font-bold text-slate-900">{totalProjects}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <FolderKanban className="w-6 h-6 text-slate-600" strokeWidth={1.5} />
                            </div>
                        </div>
                    </div>

                    {/* Active Projects */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Active</p>
                                <p className="text-3xl font-bold text-emerald-600">{activeProjects}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" strokeWidth={1.5} />
                            </div>
                        </div>
                    </div>

                    {/* Inactive Projects */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Inactive</p>
                                <p className="text-3xl font-bold text-slate-400">{inactiveProjects}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <XCircle className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Section */}
                <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    {/* Search */}
                    <div className="relative w-full sm:w-96 group">
                        <Search
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-slate-600 transition-colors"
                            strokeWidth={2}
                        />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 text-sm placeholder:text-slate-400 shadow-sm transition-all"
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="bg-slate-100/80 p-1 rounded-xl inline-flex shadow-inner">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'active', label: 'Active' },
                            { key: 'inactive', label: 'Inactive' }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter('status', tab.key)}
                                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${filters.status === tab.key
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section Title */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {filters.status === 'all' ? 'All Projects' :
                            filters.status === 'active' ? 'Active Projects' : 'Inactive Projects'}
                    </h2>
                    <p className="text-sm text-slate-500">
                        {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Projects Grid */}
                {filteredProjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredProjects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => router.push(`/admin/projects/${project.id}`)}
                                className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer overflow-hidden"
                            >
                                {/* Card Header */}
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/50 flex items-center justify-center group-hover:from-slate-200 group-hover:to-slate-100 transition-all">
                                                <FolderKanban className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
                                                    {project.name}
                                                </h3>
                                                <p className="text-xs text-slate-400 font-mono mt-0.5">
                                                    /{project.slug}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${project.isActive
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                            : 'bg-slate-100 text-slate-500 border border-slate-200/50'
                                            }`}>
                                            {project.isActive ? 'Live' : 'Draft'}
                                        </div>
                                    </div>

                                    {/* Meta Info */}
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                                            <span>{new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(`/map/${project.id}`, '_blank');
                                        }}
                                        className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer group/btn"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 group-hover/btn:text-blue-600 transition-colors" strokeWidth={1.5} />
                                        <span className="group-hover/btn:text-blue-600 transition-colors">View Map</span>
                                    </button>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/admin/projects/${project.id}/edit`);
                                            }}
                                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-all cursor-pointer"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" strokeWidth={1.5} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(project.id, e)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
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
            </main>
        </div>
    );
}
