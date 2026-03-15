import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      // Use the full Vue 2 build that includes the template compiler
      'vue': 'vue/dist/vue.esm.js',
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        wiki: resolve(__dirname, 'wiki.html'),
      },
    },
  },
});
