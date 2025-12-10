/**
 * AWS S3 Client Configuration
 * Provides S3 client and upload utilities for image storage
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Create S3 client with credentials from environment
const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION || process.env.REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME;
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
    // Sanitize filename and create unique key
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${folder}/${timestamp}-${sanitizedName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        // ACL: 'public-read', // Uncomment if bucket allows public ACLs
    });

    await s3Client.send(command);

    // Return CloudFront URL if available, otherwise S3 URL
    const url = CLOUDFRONT_URL 
        ? `${CLOUDFRONT_URL.replace(/\/$/, '')}/${key}`
        : `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION || process.env.REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return { url, key };
}

/**
 * Get the public URL for an S3 key
 * @param {string} key - The S3 object key
 * @returns {string} - The public URL
 */
export function getS3Url(key) {
    if (CLOUDFRONT_URL) {
        return `${CLOUDFRONT_URL.replace(/\/$/, '')}/${key}`;
    }
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION || process.env.REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

export { s3Client, BUCKET_NAME };
