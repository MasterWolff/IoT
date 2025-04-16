/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Turn off strict mode to avoid double-rendering issues
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Ensure CSS is properly handled
  swcMinify: false, // Disable minification to prevent CSS issues
  // Proper CSS configuration with more detailed settings
  webpack: (config, { dev, isServer }) => {
    // For CSS processing
    if (!dev) {
      // Force development-level CSS processing in production
      config.optimization.minimize = false;
      
      // Ensure CSS is properly extracted
      const miniCssExtractPlugin = config.plugins.find(
        (plugin) => plugin.constructor.name === 'MiniCssExtractPlugin'
      );
      
      if (miniCssExtractPlugin) {
        miniCssExtractPlugin.options.ignoreOrder = true;
      }

      // Ensure critical CSS chunks are not split too much
      if (config.optimization.splitChunks) {
        config.optimization.splitChunks.cacheGroups = {
          ...config.optimization.splitChunks.cacheGroups,
          styles: {
            name: 'styles',
            test: /\.(css|scss)$/,
            chunks: 'all',
            enforce: true,
            priority: 10,
          },
        };
      }
    }
    
    return config;
  },
  // Handle Tailwind CSS properly
  experimental: {
    optimizeCss: true, // Enable experimental CSS optimization
    forceSwcTransforms: true, // Force modern JS transformations
  },
  // Ensure proper build output
  output: 'standalone',
}

module.exports = nextConfig; 