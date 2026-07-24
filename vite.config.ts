import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    // jspdf + html2canvas are big, and they are loaded only on export.
    chunkSizeWarningLimit: 700,
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the heavy, lazily-used export libraries out of the main bundle so
        // the first paint only ships the editor.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'export-vendor';
            if (id.includes('framer-motion')) return 'motion-vendor';
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform'))
              return 'form-vendor';
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler'))
              return 'react-vendor';
          }
          return undefined;
        },
      },
    },
  },
});
