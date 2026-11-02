import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://saljookhaider.com',
  trailingSlash: 'ignore',
  build: {
    // Inline all CSS: removes render-blocking stylesheet requests.
    inlineStylesheets: 'always',
  },
  vite: {
    // Keep fonts and other assets as files (cacheable, and allowed by the CSP).
    build: { assetsInlineLimit: 0 },
  },
});
