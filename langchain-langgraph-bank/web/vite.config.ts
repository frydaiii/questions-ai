/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base: "./"` + HashRouter lets the built site be served from any sub-path
// (GitHub Pages project sites, Netlify, a local file server) without rewrites.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2022",
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
