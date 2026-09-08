import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves the app from /<repo>/, so CI passes BASE_PATH.
// Normalized here because Pages reports the path without a trailing slash.
const base = `/${(process.env.BASE_PATH ?? "").replace(/^\/|\/$/g, "")}/`.replace("//", "/");

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
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
