import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    // Anthropic / OpenAI / Gemini — always network only (no cached AI responses)
    {
      urlPattern: /^https:\/\/api\.anthropic\.com/,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https:\/\/api\.openai\.com/,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https:\/\/generativelanguage\.googleapis\.com/,
      handler: 'NetworkOnly',
    },

    // Supabase API — network first, 60s cache for read queries
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-rest',
        networkTimeoutSeconds: 5,
        expiration: { maxAgeSeconds: 60, maxEntries: 64 },
      },
    },
    // Supabase auth — always network
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/auth\//,
      handler: 'NetworkOnly',
    },
    // Supabase storage (brand assets, logos) — cache first
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-storage',
        expiration: { maxAgeSeconds: 60 * 60 * 24 * 7, maxEntries: 32 },
      },
    },

    // Internal API routes — network only (real-time data)
    {
      urlPattern: /^https?:\/\/[^/]+\/api\//,
      handler: 'NetworkOnly',
    },

    // Next.js static assets — cache first, long TTL
    {
      urlPattern: /\/_next\/static\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 256, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },

    // Next.js image optimisation
    {
      urlPattern: /\/_next\/image/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-images',
        expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 },
      },
    },

    // Google Fonts — cache first
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 10 },
      },
    },

    // App pages — network first with offline fallback to /offline
    {
      urlPattern: /^https?:\/\/[^/]+\/(?!api\/|_next\/)/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['os.caldr.ai', 'localhost:3000'] } },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
};

export default withPWA(nextConfig);
