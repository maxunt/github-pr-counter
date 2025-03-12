/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  experimental: {
    // Force SWC transforms for fonts
    forceSwcTransforms: true,
  },
  images: {
    domains: ['avatars.githubusercontent.com', 'github.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com',
      },
    ],
  },
  // Explicitly set the output mode to be compatible with Vercel
  output: 'standalone',
};

module.exports = nextConfig; 