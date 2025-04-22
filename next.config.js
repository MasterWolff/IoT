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

    // Handle Node.js module polyfills
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,        // Nodemailer needs this
      net: false,       // Nodemailer needs this
      tls: false,       // Nodemailer needs this
      dns: false,       // Nodemailer might need this
      child_process: false,
      path: false,
    };
    
    return config;
  },
  // Ensure server-only code doesn't get included in client bundles
  experimental: {
    serverComponentsExternalPackages: ['nodemailer']
  },
}

module.exports = nextConfig; 