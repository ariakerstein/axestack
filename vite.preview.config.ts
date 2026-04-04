import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Separate Vite config for design system preview
// Run with: npm run preview:design
// NOT included in production builds
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src/design'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    open: true,
  },
});
