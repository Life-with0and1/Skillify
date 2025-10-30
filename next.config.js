/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.clerk.com", // <-- correct hostname
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com", // <-- Add this for Clerk proxy images
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com", // <-- Add this for Unsplash images
      },
    ],
  },
};

module.exports = nextConfig;
