import { defineConfig } from 'vite';
import { resolve } from 'path';

// Two pages: the 3D home (index.html) and the brand shop page (shop.html).
export default defineConfig({
  build: { rollupOptions: { input: { main: resolve(__dirname, 'index.html'), shop: resolve(__dirname, 'shop.html') } } },
});
