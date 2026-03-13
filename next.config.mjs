/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Allow up to 20 MB so our own 10 MB check can run without Next.js aborting the request
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;

