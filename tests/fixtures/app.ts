import { test as base, expect } from '@playwright/test'

type Scenario = 'success' | 'failure' | 'latency' | 'timeout' | 'conflict' | 'unavailable'

type AppFixtures = {
  /**
   * Define cenários MSW antes de cada navegação (persistidos no localStorage do contexto). Além de
   * `Scenario`, algumas chaves aceitam valores próprios (`payment.outcome` = confirm|reject|hold,
   * `payment.delay` = ms, `auth.session` = expired).
   */
  mockScenarios: (map: Record<string, Scenario | (string & {})>) => Promise<void>
}

export const test = base.extend<AppFixtures>({
  page: async ({ page }, use) => {
    // Banco simulado e sessão limpos a cada teste → cenários reproduzíveis.
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('__pw_initialized')) {
        localStorage.clear()
        sessionStorage.setItem('__pw_initialized', '1')
      }
    })
    await use(page)
  },
  mockScenarios: async ({ page }, use) => {
    await use(async (map) => {
      await page.addInitScript((value) => {
        localStorage.setItem('mock:scenarios', value)
      }, JSON.stringify(map))
    })
  },
})

export { expect }
