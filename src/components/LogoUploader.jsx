"use client";

import { useState, useRef } from 'react';

export default function LogoUploader({ label, currentLogo, onUpload, onDimensionsExtracted, theme }) {
    const [preview, setPreview] = useState(currentLogo || null);
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const validateAndReadImage = (file) => {
        setError(null);

        // Check file type (SVG, PNG, JPG)
        const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            setError('Please upload an SVG, PNG, or JPG file');
            return;
        }

        // Check file size (max 2MB)
        if (file.size > 2000000) {
            setError('File is too large (max 2MB)');
            return;
        }

        // Read the file content
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;

            // Create an image to get dimensions
            const img = new Image();
            img.onload = () => {
                // Call the dimensions callback if provided
                if (onDimensionsExtracted) {
                    onDimensionsExtracted({
                        width: img.width,
                        height: img.height
                    });
                }
            };
            img.src = content;

            setPreview(content);
            onUpload(content);
        };
        reader.onerror = () => {
            setError('Error reading file');
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            validateAndReadImage(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            validateAndReadImage(file);
        }
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
        onUpload(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-medium mb-2 text-gray-700">
                    {label}
                </label>
            )}

            {/* Upload Area */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${isDragging
                    ? 'border-gray-400 bg-gray-50'
                    : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
                    }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                />

                {preview ? (
                    <div className="space-y-3">
                        {/* Preview */}
                        <div className="flex justify-center items-center">
                            <div className="relative w-32 h-16 flex items-center justify-center bg-gray-100 rounded-lg p-2">
                                <img
                                    src={preview}
                                    alt="Logo preview"
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-gray-700">
                            Logo Uploaded ✓
                        </p>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemove();
                            }}
                            className="text-xs px-4 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200 cursor-pointer"
                        >
                            Remove Logo
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                        >
                            <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <div className="text-sm text-gray-600">
                            <span className="font-medium text-gray-900">
                                Click to upload
                            </span>{' '}
                            or drag and drop
                        </div>
                        <p className="text-xs text-gray-500">
                            SVG, PNG, JPG (max 2MB)
                        </p>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <p className="text-sm text-red-600 flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span>{error}</span>
                </p>
            )}

            {/* Helper Text */}
            <p className="text-xs mt-2 text-gray-500">
                Upload a project logo. This will be displayed on the top-left corner of the map.
            </p>
        </div>
    );
}
