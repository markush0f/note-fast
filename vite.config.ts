import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  // The editor is lazy-loaded. Prebundle its text-style extension at startup
  // so opening a note cannot invalidate the dependency cache mid-load.
  optimizeDeps: { include: ["@tiptap/extension-text-style"] },
  server: {
    port: 1420,
    strictPort: true,
    proxy: { "/api": process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:3000" },
    watch: {
      ignored: ["**/src-tauri/**"],
      usePolling: process.env.VITE_DOCKER === "true",
      interval: 250,
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome111" : "safari16.4",
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
});
