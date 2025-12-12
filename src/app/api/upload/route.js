/**
 * S3 Image Upload API
 * Handles multipart form data image uploads to AWS S3
 */

import { NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/s3';

// Allowed image MIME types
const ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'audio/aac'
];

// Max file size: 10MB
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(request) {
    try {
        console.log('📤 Upload API: Received upload request');
        
        const formData = await request.formData();
        const file = formData.get('file');
        const folder = formData.get('folder') || 'landmarks';

        console.log('📤 Upload API: File details:', {
            name: file?.name,
            type: file?.type,
            size: file?.size,
            folder
        });

        if (!file) {
            console.log('❌ Upload API: No file provided');
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            console.log('❌ Upload API: Invalid file type:', file.type);
            return NextResponse.json(
                { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_SIZE) {
            console.log('❌ Upload API: File too large:', file.size);
            return NextResponse.json(
                { error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        console.log('📤 Upload API: Uploading to S3...');

        // Upload to S3
        const { url, key } = await uploadToS3(
            buffer,
            file.name,
            file.type,
            folder
        );

        console.log('✅ Upload API: Upload successful!', { url, key });

        return NextResponse.json({
            success: true,
            url,
            key,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
        });

    } catch (error) {
        console.error('❌ Upload API: Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to upload file' },
            { status: 500 }
        );
    }
}

// GET endpoint to check upload service status
export async function GET() {
    return NextResponse.json({
        service: 'S3 Upload API',
        status: 'active',
        allowedTypes: ALLOWED_TYPES,
        maxSize: `${MAX_SIZE / 1024 / 1024}MB`
    });
}
