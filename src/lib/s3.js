/**
 * AWS S3 Client Configuration
 * Provides S3 client and upload utilities for image storage
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Lazy initialization to ensure env vars are loaded
let s3Client = null;

function getS3Client() {
    if (!s3Client) {
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY;
        const region = process.env.AWS_S3_REGION || process.env.REGION || 'us-east-1';

        // Debug logging - remove in production after fix is verified
        console.log('🔑 S3 Client Init:', {
            accessKeyIdPrefix: accessKeyId ? accessKeyId.substring(0, 8) + '...' : 'MISSING',
            hasSecretKey: !!secretAccessKey,
            region,
            bucket: process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME
        });

        if (!accessKeyId || !secretAccessKey) {
            throw new Error('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
        }

        s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }
    return s3Client;
}

function getBucketName() {
    return process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME;
}
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} fileName - The name for the file (will be sanitized)
 * @param {string} contentType - MIME type of the file
 * @param {string} folder - Optional folder path within the bucket
 * @returns {Promise<{url: string, key: string}>} - The public URL and S3 key
 */
export async function uploadToS3(fileBuffer, fileName, contentType, folder = 'landmarks') {
    const client = getS3Client();
    const bucketName = getBucketName();
    const region = process.env.AWS_S3_REGION || process.env.REGION || 'us-east-1';

    // Sanitize filename and create unique key
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${folder}/${timestamp}-${sanitizedName}`;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        // ACL: 'public-read', // Uncomment if bucket allows public ACLs
    });

    await client.send(command);

    // Return CloudFront URL if available, otherwise S3 URL
    const url = CLOUDFRONT_URL
        ? `${CLOUDFRONT_URL.replace(/\/$/, '')}/${key}`
        : `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return { url, key };
}

/**
 * Get the public URL for an S3 key
 * @param {string} key - The S3 object key
 * @returns {string} - The public URL
 */
export function getS3Url(key) {
    const bucketName = getBucketName();
    const region = process.env.AWS_S3_REGION || process.env.REGION || 'us-east-1';

    if (CLOUDFRONT_URL) {
        return `${CLOUDFRONT_URL.replace(/\/$/, '')}/${key}`;
    }
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}

// Export getter functions for backward compatibility
export { getS3Client as s3Client, getBucketName as BUCKET_NAME };
