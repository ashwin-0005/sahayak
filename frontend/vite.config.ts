import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "Sahayak",
        short_name: "Sahayak",
        description: "Offline-first follow-up and adherence tool for community health workers",
        theme_color: "#1D6A50",
        background_color: "#F6F8F4",
        display: "standalone",
        start_url: "/",
        lang: "en",
        icons: [
          { src: "/icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,woff,png,svg,ico}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    clearMocks: true
  }
});