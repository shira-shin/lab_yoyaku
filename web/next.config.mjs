import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['via.placeholder.com'],
  },
  webpack(config) {
    if (config.resolve?.alias && 'zod' in config.resolve.alias) {
      delete config.resolve.alias.zod
    }
    return config
  },
}

export default nextConfig
