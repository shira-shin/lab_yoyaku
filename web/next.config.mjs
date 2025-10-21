/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['via.placeholder.com'],
  },
  async redirects() {
    return [
      { source: '/favicon.png', destination: '/favicon.svg', permanent: true },
      { source: '/favicon.ico', destination: '/favicon.svg', permanent: true },
    ]
  },
  webpack(config) {
    return config
  },
}

export default nextConfig
