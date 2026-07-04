/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output for smaller Docker images.
  output: "standalone",
  transpilePackages: ["@soccer/shared-types"],
  experimental: {
    // Allow importing the workspace TS package directly.
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
