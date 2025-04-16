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
  // Set to export static HTML
  output: 'export',
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}

module.exports = nextConfig; 