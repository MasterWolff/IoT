/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Make sure we're not using Server Components since we need client interactivity everywhere
  experimental: {
    serverComponents: false,
  }
}

module.exports = nextConfig; 