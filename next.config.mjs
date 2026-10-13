/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;
