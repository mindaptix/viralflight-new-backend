import path from 'path'
import { fileURLToPath } from 'url'
import { withPayload } from '@payloadcms/next/withPayload'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next from picking /var/www as root when a stray lockfile exists there.
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
}

export default withPayload(nextConfig)
