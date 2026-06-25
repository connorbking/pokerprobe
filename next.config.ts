import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.holdemresources.net" },
      { protocol: "https", hostname: "holdemresources.net" },
      { protocol: "https", hostname: "www.flopzilla.com" },
      { protocol: "https", hostname: "www.icmizer.com" },
      { protocol: "https", hostname: "power-equilab.com" },
    ],
  },
};

export default nextConfig;
