/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '4mb' }
  },
  // Disable Turbopack for better HMR stability
  turbo: false
}

export default nextConfig
