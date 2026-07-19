/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
  },
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
