import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // Vue ecosystem
          if (id.includes('node_modules/vue/') ||
              id.includes('node_modules/@vue/') ||
              id.includes('node_modules/pinia/') ||
              id.includes('node_modules/@vueuse/')) {
            return 'vue-vendor';
          }
          // CodeMirror editor
          if (id.includes('node_modules/@codemirror/') ||
              id.includes('node_modules/codemirror/') ||
              id.includes('node_modules/@lezer/')) {
            return 'codemirror';
          }
          // SQL formatter (largest single dep)
          if (id.includes('node_modules/sql-formatter/') ||
              id.includes('node_modules/nearley/') ||
              id.includes('node_modules/moo/')) {
            return 'sql-formatter';
          }
          // Syntax highlighter
          if (id.includes('node_modules/highlight.js/')) {
            return 'highlightjs';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
} as any);
