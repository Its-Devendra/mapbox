'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Check } from 'lucide-react';

/**
 * S3 Image Uploader Component
 * Handles image uploads to AWS S3 with drag & drop, preview, and progress
 */
export default function S3ImageUploader({
    label = 'Upload Image',
    currentImage = null,
    onUpload,
    folder = 'landmarks',
    accept = 'image/*',
    maxSizeMB = 50
}) {
    const [preview, setPreview] = useState(currentImage);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (file) => {
        if (!file) return;

        setError(null);
        setUploadSuccess(false);

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate file size
        if (file.size > maxSizeMB * 1024 * 1024) {
            setError(`File too large. Maximum size is ${maxSizeMB}MB`);
            return;
        }

        // Show local preview immediately
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(file);

        // Upload to S3
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folder);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            // Update preview with S3 URL and notify parent
            setPreview(data.url);
            onUpload(data.url);
            setUploadSuccess(true);

            // Clear success indicator after 2 seconds
            setTimeout(() => setUploadSuccess(false), 2000);

        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload image');
            setPreview(null);
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleRemove = () => {
        setPreview(null);
        setError(null);
        setUploadSuccess(false);
        onUpload(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                </label>
            )}

            {/* Upload Area */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`
                    relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200
                    ${uploading ? 'cursor-wait opacity-75' : 'cursor-pointer'}
                    ${isDragging
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
                    }
                    ${error ? 'border-red-300 bg-red-50/50' : ''}
                    ${uploadSuccess ? 'border-green-300 bg-green-50/50' : ''}
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                />

                {preview ? (
                    <div className="space-y-3">
                        {/* Image Preview */}
                        <div className="relative w-full max-w-[200px] mx-auto">
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full h-auto rounded-lg shadow-sm object-contain max-h-32"
                            />
                            {uploading && (
                                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                                </div>
                            )}
                            {uploadSuccess && (
                                <div className="absolute inset-0 bg-green-500/20 rounded-lg flex items-center justify-center">
                                    <div className="bg-green-500 rounded-full p-2">
                                        <Check className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {!uploading && (
                            <div className="flex justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove();
                                    }}
                                    className="text-xs px-3 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all cursor-pointer"
                                >
                                    Remove
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                    className="text-xs px-3 py-1.5 rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-all cursor-pointer"
                                >
                                    Change
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {uploading ? (
                            <Loader2 className="mx-auto h-10 w-10 text-gray-400 animate-spin" />
                        ) : (
                            <div className="mx-auto h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center">
                                <Upload className="h-6 w-6 text-gray-400" />
                            </div>
                        )}
                        <div className="text-sm text-gray-600">
                            <span className="font-medium text-gray-900">
                                {uploading ? 'Uploading...' : 'Click to upload'}
                            </span>
                            {!uploading && ' or drag and drop'}
                        </div>
                        <p className="text-xs text-gray-500">
                            PNG, JPG, WebP, SVG (max {maxSizeMB}MB)
                        </p>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <X className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
