/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Ensure CSS is properly handled
  swcMinify: false, // Disable minification to prevent CSS issues
  // Set output to export for static sites
  output: 'export',
  // Disable image optimization that might cause issues in static export
  images: {
    unoptimized: true,
  },
  // Skip API routes during static export
  skipApiRoutes: true,
  // Specify which paths to exclude from static generation
  distDir: '.next',
  // Add strict handling of routes
  trailingSlash: true,
  // Define static routes
  exportPathMap: async function (
    defaultPathMap,
    { dev, dir, outDir, distDir, buildId }
  ) {
    return {
      '/': { page: '/' },
      '/paintings': { page: '/paintings' },
      '/devices': { page: '/devices' },
      '/materials': { page: '/materials' },
      '/auto-fetch': { page: '/auto-fetch' },
      '/data-tables': { page: '/data-tables' },
    }
  },
}

module.exports = nextConfig; 