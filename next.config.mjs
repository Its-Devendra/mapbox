/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        // Disable caching in development for instant updates
        unoptimized: process.env.NODE_ENV === 'development',
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.s3.**.amazonaws.com',
            },
            {
                protocol: 'https',
                hostname: '**.cloudfront.net',
            }
        ]
    },
    async headers() {
        return [
            {
                // Disable caching for uploaded images
                source: '/:all*(svg|jpg|jpeg|png|gif|webp|ico)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                ],
            },
            {
                // Disable caching for API routes
                source: '/api/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-store, no-cache, must-revalidate',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
