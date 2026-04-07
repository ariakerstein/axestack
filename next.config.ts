import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow iframe embedding from Circle.so and related domains
  async headers() {
    return [
      {
        // Circle app route - allow embedding from Circle.so
        source: '/circle-app',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.circle.so https://circle.so https://*.cancerpatientlab.org https://cancerpatientlab.org https://community.cancerpatientlab.org",
          },
        ],
      },
      {
        // API routes used by Circle app
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
