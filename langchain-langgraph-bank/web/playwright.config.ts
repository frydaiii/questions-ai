import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 4173);
// Use the locally installed Chrome by default (no browser download needed).
// Set PW_CHANNEL=msedge for Edge, or PW_CHANNEL= (empty) to use Playwright's bundled Chromium.
const channel = process.env.PW_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-results/artifacts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "e2e-results/report", open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(channel ? { channel } : {}),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], ...(channel ? { channel } : {}) },
    },
  ],
  // Test the real production artifact, served locally. Bind to 127.0.0.1 explicitly:
  // on Windows "localhost" may resolve to ::1 for the server but 127.0.0.1 for the browser.
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
