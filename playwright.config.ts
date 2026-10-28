import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
/** Com PLAYWRIGHT_BASE_URL a suíte roda contra um deploy publicado (ex.: Vercel) e não sobe o preview. */
const remoteURL = process.env.PLAYWRIGHT_BASE_URL
const baseURL = remoteURL ?? `http://localhost:${PORT}`

/**
 * Roda contra o build de produção (vite preview) com MSW ativo, para que
 * testes e baselines visuais reflitam o artefato publicado.
 * Viewports do desafio: 390 (mobile), 768 (tablet), 1440 (desktop).
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  snapshotPathTemplate: '{testDir}/visual/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Com 4 workers o build de preview no WSL estoura timeouts (imagens de ~1,9 MB); ver PROGRESSO.txt.
  workers: 2,
  reporter: [['list'], ['html', { outputFolder: 'reports/playwright', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  projects: [
    { name: 'mobile-390', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: false } },
    { name: 'tablet-768', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: remoteURL
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
