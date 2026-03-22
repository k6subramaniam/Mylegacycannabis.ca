import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor: React + React-DOM (always needed)
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // Vendor: framer-motion (large, shared)
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          // Vendor: @tanstack/react-query + @trpc (data layer)
          if (id.includes('node_modules/@tanstack') || id.includes('node_modules/@trpc') || id.includes('node_modules/superjson')) {
            return 'vendor-query';
          }
          // Vendor: remaining node_modules
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: "all",
    fs: {
      strict: false,
    },
  },
});
