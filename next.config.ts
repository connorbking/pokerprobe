import type { NextConfig } from "next";

const firebaseProjectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  process.env.FIREBASE_PROJECT_ID;

const firebaseHostingOrigin = firebaseProjectId
  ? `https://${firebaseProjectId}.firebaseapp.com`
  : null;

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
    if (!firebaseHostingOrigin) return [];

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
