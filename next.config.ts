import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent client-side errors
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Exclude Agora from server-side bundle
    if (isServer) {
      config.externals = [...(config.externals || []), 'agora-rtc-sdk-ng'];
    }

    return config;
  },
};

export default nextConfig;
