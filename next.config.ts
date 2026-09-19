import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // model-viewer ships as an ESM bundle that must be transpiled for the Next build graph.
  transpilePackages: ['@google/model-viewer'],
  // Note: do NOT add 'gsap' to experimental.optimizePackageImports. That
  // rewrites `import gsap from 'gsap'` to a deep import of gsap-core, which
  // skips the CSSPlugin registration in the package entry point. Every
  // opacity / transform / filter tween then silently becomes a no-op, warning
  // only "Invalid property ... Missing plugin?" in the console.
  async headers() {
    return [
      {
        // The GLB/texture set is content-addressed by filename and never mutates,
        // so it can be cached aggressively. Saves re-downloading ~8MB on repeat visits.
        source: '/assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
