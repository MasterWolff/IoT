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
  
  // Help with CSS processing
  webpack: (config) => {
    // Ensure CSS is properly processed 
    config.module.rules.forEach((rule) => {
      const { oneOf } = rule;
      if (oneOf) {
        oneOf.forEach((one) => {
          if (!one.issuer) return;
          if (one.issuer.and && one.issuer.and.length > 0) {
            one.issuer.and = [/[\\/]node_modules[\\/]/, /[\\/]\.next[\\/]/];
          }
        });
      }
    });
    return config;
  },
}

module.exports = nextConfig; 