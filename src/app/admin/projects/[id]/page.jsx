'use client';

import { useState, useEffect, Suspense, lazy, memo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { Skeleton } from '@/components/ui';
import {
  ArrowLeft,
  Palette,
  MapPin,
  Tag,
  Settings,
  Edit,
  Eye,
  Info,
  Navigation,
  Building
} from 'lucide-react';

// Lazy load all tab components for better initial load performance
const ProjectOverview = lazy(() => import('@/components/admin/ProjectOverview'));
const ProjectThemes = lazy(() => import('@/components/admin/ProjectThemes'));
const ProjectCategories = lazy(() => import('@/components/admin/ProjectCategories'));
const ProjectLandmarks = lazy(() => import('@/components/admin/ProjectLandmarks'));
const ProjectNearBy = lazy(() => import('@/components/admin/ProjectNearBy'));
const ProjectSettings = lazy(() => import('@/components/admin/ProjectSettings'));
const ProjectClientBuilding = lazy(() => import('@/components/admin/ProjectClientBuilding'));

// Tab loading fallback
function TabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton height="1.25rem" width="150px" rounded="md" />
          <Skeleton height="0.875rem" width="250px" rounded="sm" className="mt-2" />
        </div>
        <Skeleton height="2.5rem" width="120px" rounded="full" />
      </div>
      <Skeleton.List items={3} />
    </div>
  );
}

// Memoized tab content to prevent unnecessary re-renders
const TabContent = memo(function TabContent({ activeTab, projectId }) {
  return (
    <Suspense fallback={<TabSkeleton />}>
      {activeTab === 'overview' && <ProjectOverview projectId={projectId} />}
      {activeTab === 'clientBuilding' && <ProjectClientBuilding projectId={projectId} />}
      {activeTab === 'themes' && <ProjectThemes projectId={projectId} />}
      {activeTab === 'categories' && <ProjectCategories projectId={projectId} />}
      {activeTab === 'landmarks' && <ProjectLandmarks projectId={projectId} />}
      {activeTab === 'nearby' && <ProjectNearBy projectId={projectId} />}
      {activeTab === 'settings' && <ProjectSettings projectId={projectId} />}
    </Suspense>
  );
});

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id;
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else {
        toast.error('Failed to load project');
        router.push('/admin');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Error loading project');
      router.push('/admin');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'clientBuilding', label: 'Client Building', icon: Building },
    { id: 'themes', label: 'Themes', icon: Palette },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'landmarks', label: 'Landmarks', icon: MapPin },
    { id: 'nearby', label: 'Near By', icon: Navigation },
    { id: 'settings', label: 'Map Settings', icon: Settings },
  ];

  // Show skeleton while loading project info
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        {/* Header Skeleton */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-6">
                <Skeleton width={32} height={32} rounded="lg" />
                <div className="h-6 w-px bg-gray-200" />
                <Skeleton width={24} height={24} rounded="md" />
                <Skeleton width={150} height={20} rounded="md" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton width={100} height={36} rounded="full" />
                <Skeleton width={120} height={36} rounded="full" />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <Skeleton width={500} height={36} rounded="xl" />
            </div>
            <div className="p-8">
              <TabSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="border-b border-gray-200 sticky top-0 z-50 backdrop-blur-md bg-white/80 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <img className='h-8 w-auto object-contain' src='/logo.jpeg' alt='logo' />
              <div className="h-6 w-px bg-gray-200" />
              <button
                onClick={() => router.push('/admin')}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-gray-500 hover:text-gray-900 -ml-1"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={2} />
              </button>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  {project.name}
                  <div className={`w-1.5 h-1.5 rounded-full ${project.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                </h1>
                <span className="text-xs text-gray-400 font-mono">/{project.slug}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open(`/map/${project.id}`, '_blank')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-black rounded-full transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                View Map
              </button>
              <button
                onClick={() => router.push(`/admin/projects/${project.id}/edit`)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-black hover:bg-gray-800 rounded-full transition-colors cursor-pointer shadow-sm hover:shadow"
              >
                <Edit className="w-3.5 h-3.5" strokeWidth={2} />
                Edit Project
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 animate-fade-in">
        {/* Main Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[500px]">
          {/* Tab Navigation */}
          <div className="p-4 sm:p-6 border-b border-gray-100 overflow-x-auto">
            <nav className="flex min-w-max" aria-label="Tabs">
              <div className="bg-gray-100/80 p-1 rounded-xl inline-flex gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${isActive
                        ? 'bg-white text-black shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-black' : 'text-gray-400'}`} strokeWidth={2} />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Tab Content - Lazy loaded */}
          <div className="p-8">
            <TabContent activeTab={activeTab} projectId={projectId} />
          </div>
        </div>
      </div>
    </div>
  );
}
