import { defineConfig } from 'vite';
import { resolve } from 'path';

// Pages: the 3D home, the shop, and the info pages.
const pages = ['index', 'shop', 'about', 'faq', 'support', 'contact'];
export default defineConfig({
  build: { rollupOptions: { input: Object.fromEntries(pages.map(p => [p, resolve(__dirname, `${p}.html`)])) } },
});
