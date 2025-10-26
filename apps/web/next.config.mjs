/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        'pino-pretty': false,
        '@react-native-async-storage/async-storage': false,
      };
    }

    // Suppress warnings for optional peer dependencies
    config.ignoreWarnings = [
      { module: /node_modules\/pino/ },
      { module: /node_modules\/@metamask\/sdk/ },
    ];

    return config;
  },
};

export default nextConfig;
