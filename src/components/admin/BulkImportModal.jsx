'use client';

import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { Modal, Button, Badge } from '@/components/ui';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';

export default function BulkImportModal({ isOpen, onClose, projectId, onImportComplete }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [results, setResults] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setResults(null);
        setPreview(null);

        // Auto-preview the file
        await handlePreview(selectedFile);
    };

    const handlePreview = async (fileToPreview) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', fileToPreview);
            formData.append('projectId', projectId);
            formData.append('preview', 'true');

            const response = await fetch('/api/bulk-import', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to parse file');
            }

            setPreview(data);
        } catch (error) {
            toast.error(error.message);
            setFile(null);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setImporting(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', projectId);

            const response = await fetch('/api/bulk-import', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Import failed');
            }

            setResults(data);
            toast.success(`Imported ${data.created.landmarks} landmarks and ${data.created.nearbyPlaces} nearby places!`);

            if (onImportComplete) {
                onImportComplete(data);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        window.open('/api/bulk-import?format=template', '_blank');
    };

    const handleClose = () => {
        setFile(null);
        setPreview(null);
        setResults(null);
        onClose();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            setFile(droppedFile);
            setResults(null);
            setPreview(null);
            handlePreview(droppedFile);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Import from Excel"
            description="Upload an Excel file to bulk import landmarks and nearby places"
            size="2xl"
        >
            <div className="p-6 space-y-6">
                {/* Download Template Button */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        <div>
                            <p className="text-sm font-medium text-gray-900">Need a template?</p>
                            <p className="text-xs text-gray-500">Download our sample Excel file to get started</p>
                        </div>
                    </div>
                    <Button variant="secondary" size="sm" icon={Download} onClick={handleDownloadTemplate}>
                        Download Template
                    </Button>
                </div>

                {/* File Upload Area */}
                {!results && (
                    <div
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
              ${file ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {loading ? (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
                                <p className="text-sm text-gray-500">Parsing file...</p>
                            </div>
                        ) : file ? (
                            <div className="flex flex-col items-center gap-3">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                                >
                                    Choose different file
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <Upload className="w-10 h-10 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Drop your Excel file here</p>
                                    <p className="text-xs text-gray-500">or click to browse (.xlsx, .xls, .csv)</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Preview Data */}
                {preview && !results && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-900">Preview</h4>
                            <div className="flex gap-2">
                                <Badge variant="default">
                                    {preview.data.totalLandmarks} Landmarks
                                </Badge>
                                <Badge variant="default">
                                    {preview.data.totalNearbyPlaces} Nearby Places
                                </Badge>
                            </div>
                        </div>

                        {/* Landmarks Preview */}
                        {preview.data.landmarks.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-2">Landmarks (showing first {preview.data.landmarks.length})</p>
                                <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg border">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-100 sticky top-0">
                                            <tr>
                                                <th className="text-left p-2 font-medium">Name</th>
                                                <th className="text-left p-2 font-medium">Category</th>
                                                <th className="text-left p-2 font-medium">Coords</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.data.landmarks.map((l, i) => (
                                                <tr key={i} className="border-t border-gray-100">
                                                    <td className="p-2">{l.title}</td>
                                                    <td className="p-2">{l.categoryName}</td>
                                                    <td className="p-2 text-gray-500">{l.latitude.toFixed(4)}, {l.longitude.toFixed(4)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Nearby Preview */}
                        {preview.data.nearbyPlaces.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-2">Nearby Places (showing first {preview.data.nearbyPlaces.length})</p>
                                <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg border">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-100 sticky top-0">
                                            <tr>
                                                <th className="text-left p-2 font-medium">Name</th>
                                                <th className="text-left p-2 font-medium">Category</th>
                                                <th className="text-left p-2 font-medium">Coords</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.data.nearbyPlaces.map((n, i) => (
                                                <tr key={i} className="border-t border-gray-100">
                                                    <td className="p-2">{n.title}</td>
                                                    <td className="p-2">{n.categoryName}</td>
                                                    <td className="p-2 text-gray-500">{n.latitude.toFixed(4)}, {n.longitude.toFixed(4)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Parsing Errors */}
                        {preview.errors?.length > 0 && (
                            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <div className="flex items-center gap-2 text-yellow-700 mb-2">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs font-medium">{preview.errors.length} parsing issues</span>
                                </div>
                                <ul className="text-xs text-yellow-600 space-y-1">
                                    {preview.errors.slice(0, 5).map((err, i) => (
                                        <li key={i}>Row {err.row}: {err.error}</li>
                                    ))}
                                    {preview.errors.length > 5 && (
                                        <li>...and {preview.errors.length - 5} more</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Import Results */}
                {results && (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                            <div className="flex items-center gap-3 mb-3">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                                <h4 className="text-sm font-semibold text-green-900">Import Complete!</h4>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-700">{results.created.categories}</p>
                                    <p className="text-xs text-green-600">Categories Created</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-700">{results.created.landmarks}</p>
                                    <p className="text-xs text-green-600">Landmarks Added</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-700">{results.created.nearbyPlaces}</p>
                                    <p className="text-xs text-green-600">Nearby Places Added</p>
                                </div>
                            </div>
                        </div>

                        {results.errors?.length > 0 && (
                            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                <div className="flex items-center gap-2 text-red-700 mb-2">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs font-medium">{results.errors.length} items skipped</span>
                                </div>
                                <ul className="text-xs text-red-600 space-y-1 max-h-24 overflow-y-auto">
                                    {results.errors.map((err, i) => (
                                        <li key={i}>{err.type}: {err.name || 'Unknown'} - {err.error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={handleClose}>
                        {results ? 'Close' : 'Cancel'}
                    </Button>
                    {preview && !results && (
                        <Button
                            onClick={handleImport}
                            loading={importing}
                            disabled={importing || (preview.data.totalLandmarks === 0 && preview.data.totalNearbyPlaces === 0)}
                        >
                            Import {preview.data.totalLandmarks + preview.data.totalNearbyPlaces} Items
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
