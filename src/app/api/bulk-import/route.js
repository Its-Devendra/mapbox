/**
 * Bulk Import API
 * Handles Excel file upload and bulk creation of landmarks, nearby places, and categories
 */

import { NextResponse } from 'next/server';
import { parseExcelFile, bulkImport, generateTemplate } from '@/services/bulkImportService';

/**
 * POST /api/bulk-import
 * Upload Excel file and import data
 */
export async function POST(request) {
    try {
        console.log('📥 Bulk Import API: Received import request');

        const formData = await request.formData();
        const file = formData.get('file');
        const projectId = formData.get('projectId');

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        // Validate file type
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
            return NextResponse.json(
                { error: 'Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.' },
                { status: 400 }
            );
        }

        console.log('📥 Bulk Import API: Processing file:', file.name);

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Parse the Excel file
        const parsedData = parseExcelFile(buffer);

        console.log('📥 Bulk Import API: Parsed data:', {
            landmarks: parsedData.landmarks.length,
            nearbyPlaces: parsedData.nearbyPlaces.length,
            errors: parsedData.errors.length
        });

        // Preview mode - just return parsed data without importing
        const preview = formData.get('preview') === 'true';
        if (preview) {
            return NextResponse.json({
                success: true,
                preview: true,
                data: {
                    landmarks: parsedData.landmarks.slice(0, 10), // Return first 10 for preview
                    nearbyPlaces: parsedData.nearbyPlaces.slice(0, 10),
                    totalLandmarks: parsedData.landmarks.length,
                    totalNearbyPlaces: parsedData.nearbyPlaces.length
                },
                errors: parsedData.errors
            });
        }

        // Import the data
        const results = await bulkImport(projectId, parsedData);

        console.log('✅ Bulk Import API: Import completed:', results.created);

        return NextResponse.json({
            success: true,
            created: results.created,
            errors: [...parsedData.errors, ...results.errors],
            details: results.details
        });

    } catch (error) {
        console.error('❌ Bulk Import API: Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process import' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/bulk-import
 * Download sample template
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'xlsx';

        if (format === 'template') {
            const templateBuffer = generateTemplate();

            return new Response(templateBuffer, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': 'attachment; filename="bulk-import-template.xlsx"'
                }
            });
        }

        return NextResponse.json({
            service: 'Bulk Import API',
            status: 'active',
            supportedFormats: ['.xlsx', '.xls', '.csv'],
            endpoints: {
                'POST /api/bulk-import': 'Upload and import Excel file',
                'GET /api/bulk-import?format=template': 'Download sample template'
            }
        });

    } catch (error) {
        console.error('❌ Bulk Import API: Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate template' },
            { status: 500 }
        );
    }
}
