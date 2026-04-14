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
          // React core — loaded on every page, cache long-term
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // UI framework libs (radix, lucide icons, class-variance)
          if (id.includes('node_modules/@radix-ui/') || id.includes('node_modules/lucide-react') || id.includes('node_modules/class-variance-authority') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge')) {
            return 'vendor-ui';
          }
          // Animation (framer-motion) — only used on some pages
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          // tRPC + tanstack query
          if (id.includes('node_modules/@trpc/') || id.includes('node_modules/@tanstack/')) {
            return 'vendor-data';
          }
          // Everything else in node_modules that isn't already chunked
          // (wouter, sonner, embla, recharts, etc.)
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    fs: {
      strict: false,
    },
  },
});
