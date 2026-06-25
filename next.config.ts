import type { NextConfig } from "next";

const firebaseHostingOrigin = "https://pokerprobe-4c8f3.firebaseapp.com";

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
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: `${firebaseHostingOrigin}/__/auth/:path*`,
      },
      {
        source: "/__/firebase/init.json",
        destination: `${firebaseHostingOrigin}/__/firebase/init.json`,
      },
    ];
  },
};

export default nextConfig;
