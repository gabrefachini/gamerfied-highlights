/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@laihoe/demoparser2", "@laihoe/demoparser2-darwin-arm64", "demofile"],
    serverActions: {
      bodySizeLimit: "750mb"
    }
  }
};

export default nextConfig;
