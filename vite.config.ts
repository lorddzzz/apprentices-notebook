import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { artMetaPlugin } from './scripts/art-check.ts';
import { PRECACHE_GLOBS, PRECACHE_MAX_BYTES } from './src/ui/art/spec.ts';

function buildHash(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

const BASE = '/apprentices-notebook/';
const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

export default defineConfig({
  base: BASE,
  define: { __BUILD__: JSON.stringify(buildHash()) },
  resolve: {
    alias: [
      { find: /^\$engine$/, replacement: src('engine/index.ts') },
      { find: /^\$engine\//, replacement: `${src('engine')}/` },
      { find: /^\$data$/, replacement: src('data/index.ts') },
      { find: /^\$data\//, replacement: `${src('data')}/` },
      { find: /^\$ui\//, replacement: `${src('ui')}/` },
    ],
  },
  plugins: [
    svelte(),
    artMetaPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png', 'favicon.ico'],
      manifest: {
        name: "The Apprentice's Notebook",
        short_name: 'Notebook',
        description: 'The last tenant left the lamp lit. A turn-based rune-inscribing game.',
        display: 'standalone',
        orientation: 'portrait',
        scope: BASE,
        start_url: BASE,
        background_color: '#f1e6cc',
        theme_color: '#2b2118',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: { globPatterns: PRECACHE_GLOBS, maximumFileSizeToCacheInBytes: PRECACHE_MAX_BYTES },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Parallel build agents load the machine; slow sims must not fail on time alone.
    testTimeout: 30_000,
  },
});
