import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves the app from /<repo>/, so CI passes BASE_PATH.
// Normalized here because Pages reports the path without a trailing slash.
const base = `/${(process.env.BASE_PATH ?? "").replace(/^\/|\/$/g, "")}/`.replace("//", "/");

const buildId = (process.env.BUILD_ID ?? "dev").slice(0, 7);

export default defineConfig({
  base,
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Registration is done in src/main.tsx so a new worker can reload the page.
      injectRegister: null,
      includeAssets: ["favicon.svg"],
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        navigateFallback: `${base}index.html`,
      },
      manifest: {
        name: "Dayline",
        short_name: "Dayline",
        description: "Routines, daily checklist, and what's on the clock.",
        theme_color: "#3f6b58",
        background_color: "#f4efe6",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  test: {
    environment: "node",
  },
});
