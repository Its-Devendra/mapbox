'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useTheme } from '@/context/ThemeContext';
import SvgIconUploader from '@/components/SvgIconUploader';
import AudioUploader from '@/components/AudioUploader';
import LogoUploader from '@/components/LogoUploader';
import AspectRatioSizeInput from '@/components/AspectRatioSizeInput';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    isActive: true,
    clientBuildingIcon: null,
    clientBuildingIconWidth: 40,
    clientBuildingIconHeight: 40,
    clientBuildingUrl: '',
    logo: null,
    logoWidth: 120,
    logoHeight: 40,
    secondaryLogo: null,
    secondaryLogoWidth: 120,
    secondaryLogoHeight: 40,
    introAudio: null
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let parsedValue = value;
    if (type === 'checkbox') {
      parsedValue = checked;
    } else if (type === 'number' && value !== '') {
      parsedValue = parseFloat(value);
    }
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const project = await response.json();
        toast.success('Project created successfully!');
        router.push(`/admin/projects/${project.id}`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Error creating project: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Modern, Clean Header */}
      <div className="border-b border-gray-200 sticky top-0 z-50 backdrop-blur-md bg-white/80 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img className='h-8 w-auto object-contain' src='/logo.jpeg' alt='logo' />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2} />
            <span>Back to Projects</span>
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Create New Project</h1>
          <p className="text-sm text-gray-500 mt-2">Fill in the details below to create a new project</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm placeholder:text-gray-400 transition-all cursor-text"
                placeholder="Enter project name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm font-mono placeholder:text-gray-400 transition-all cursor-text"
                placeholder="project-slug"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Used in URLs. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            <div className="flex items-center p-3 rounded-xl bg-gray-50/50 border border-gray-100">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded cursor-pointer"
              />
              <label className="ml-3 text-sm text-gray-700 cursor-pointer">
                Active project
              </label>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Project Logo</h3>
              <LogoUploader
                label=""
                currentLogo={formData.logo}
                onUpload={(content) => setFormData({ ...formData, logo: content })}
                onDimensionsExtracted={(dimensions) => {
                  setFormData(prev => ({
                    ...prev,
                    logoWidth: dimensions.width,
                    logoHeight: dimensions.height
                  }));
                }}
                theme={theme}
              />

              {formData.logo && (
                <div className="mt-4">
                  <AspectRatioSizeInput
                    width={formData.logoWidth}
                    height={formData.logoHeight}
                    widthName="logoWidth"
                    heightName="logoHeight"
                    onWidthChange={handleInputChange}
                    onHeightChange={handleInputChange}
                    widthLabel="Logo Width (px)"
                    heightLabel="Logo Height (px)"
                  />
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Secondary Logo (Right Side)</h3>
              <LogoUploader
                label=""
                currentLogo={formData.secondaryLogo}
                onUpload={(content) => setFormData({ ...formData, secondaryLogo: content })}
                onDimensionsExtracted={(dimensions) => {
                  setFormData(prev => ({
                    ...prev,
                    secondaryLogoWidth: dimensions.width,
                    secondaryLogoHeight: dimensions.height
                  }));
                }}
                theme={theme}
              />

              {formData.secondaryLogo && (
                <div className="mt-4">
                  <AspectRatioSizeInput
                    width={formData.secondaryLogoWidth}
                    height={formData.secondaryLogoHeight}
                    widthName="secondaryLogoWidth"
                    heightName="secondaryLogoHeight"
                    onWidthChange={handleInputChange}
                    onHeightChange={handleInputChange}
                    widthLabel="Logo Width (px)"
                    heightLabel="Logo Height (px)"
                  />
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Client Building Icon</h3>
              <SvgIconUploader
                label=""
                currentIcon={formData.clientBuildingIcon}
                onUpload={(svgContent) => setFormData({ ...formData, clientBuildingIcon: svgContent })}
                onDimensionsExtracted={(dimensions) => {
                  setFormData(prev => ({
                    ...prev,
                    clientBuildingIconWidth: dimensions.width,
                    clientBuildingIconHeight: dimensions.height
                  }));
                }}
                theme={theme}
              />

              {formData.clientBuildingIcon && (
                <div className="mt-4">
                  <AspectRatioSizeInput
                    width={formData.clientBuildingIconWidth}
                    height={formData.clientBuildingIconHeight}
                    widthName="clientBuildingIconWidth"
                    heightName="clientBuildingIconHeight"
                    onWidthChange={handleInputChange}
                    onHeightChange={handleInputChange}
                    widthLabel="Icon Width (px)"
                    heightLabel="Icon Height (px)"
                    max={200}
                  />
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Building URL (Optional)
              </label>
              <input
                type="url"
                name="clientBuildingUrl"
                value={formData.clientBuildingUrl}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm placeholder:text-gray-400 transition-all cursor-text"
                placeholder="https://example.com"
              />
              <p className="text-xs text-gray-500 mt-2">
                When clicked, the client building marker will open this URL in a new tab
              </p>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <AudioUploader
                label="Intro Audio (Optional)"
                currentAudio={formData.introAudio}
                onUpload={(url) => setFormData({ ...formData, introAudio: url })}
                theme={theme}
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-gray-800 text-white font-medium text-sm rounded-full transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
              >
                <Save className="w-4 h-4" strokeWidth={2} />
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
