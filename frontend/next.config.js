/** @type {import('next').NextConfig} */

// Next.js sets none of these by default (confirmed via a pre-launch security audit) — the
// backend's helmet() only protects the API's own origin, not this one, which is what users'
// browsers actually load. script-src/style-src need 'unsafe-inline' because the App Router
// injects inline hydration/RSC-payload scripts and styled-jsx/Next's own inline styles — a
// stricter nonce-based CSP is possible but needs middleware.ts to mint a per-request nonce,
// which is a bigger change than this pass; frame-ancestors/object-src/base-uri don't have that
// constraint and are the ones actually worth having (clickjacking + base-tag-injection defense).
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
// Next's dev server (webpack HMR) wraps modules in eval() for fast rebuilds — this doesn't
// happen in a production build, so 'unsafe-eval' is scoped to dev only rather than weakening
// the policy everywhere. Confirmed by hitting a real CSP violation on this exact directive
// when first testing this in the dev server.
const isDev = process.env.NODE_ENV !== 'production';
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://res.cloudinary.com https://*.tile.openstreetmap.org https://unpkg.com",
  "font-src 'self' data:",
  `connect-src 'self' ${apiUrl}`,
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig = {
  poweredByHeader: false,
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
  },
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
