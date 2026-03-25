import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { missionApiPlugin } from "./mission-api-plugin.mjs";

export default defineConfig({
  plugins: [missionApiPlugin(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5179,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  /** Sem isto, `vite preview` não encaminha `/api` → 404 "Cannot GET" com a UI estática. */
  preview: {
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "motion": ["framer-motion"],
          "icons": ["lucide-react"],
        },
      },
    },
  },
});
