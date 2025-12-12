"use client";

import { useState, useRef } from 'react';

export default function AudioUploader({ label, currentAudio, onUpload, theme }) {
    const [preview, setPreview] = useState(currentAudio || null);
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleUpload = async (file) => {
        setError(null);

        // Check file type
        if (!file.type.startsWith('audio/')) {
            setError('Please upload an audio file');
            return;
        }

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('Audio file is too large (max 10MB)');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'audio');

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Upload failed');
            }

            const data = await response.json();
            setPreview(data.url);
            onUpload(data.url);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Error uploading file');
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleUpload(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleUpload(file);
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
                onClick={() => !preview && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${isDragging
                    ? 'border-gray-400 bg-gray-50'
                    : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
                    } ${preview ? 'cursor-default' : 'cursor-pointer'}`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                />

                {uploading ? (
                    <div className="flex flex-col items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                        <p className="text-sm text-gray-600">Uploading audio...</p>
                    </div>
                ) : preview ? (
                    <div className="space-y-3">
                        <div className="flex justify-center items-center p-2 bg-white rounded-lg border border-gray-200">
                            <audio controls src={preview} className="w-full max-w-xs" />
                        </div>
                        <div className="flex items-center justify-between px-2">
                            <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Audio Uploaded
                            </p>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove();
                                }}
                                className="text-xs px-3 py-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors font-medium"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2 py-4">
                        <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        <div className="text-sm text-gray-600">
                            <span className="font-medium text-gray-900">Click to upload</span> or drag and drop
                        </div>
                        <p className="text-xs text-gray-500">
                            MP3, WAV, AAC (max 10MB)
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
        </div>
    );
}
