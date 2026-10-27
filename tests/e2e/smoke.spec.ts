import { expect, test } from '../fixtures/app'

test('app carrega com MSW ativo e sem overflow horizontal', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 }) // MSW + hero levam ~5s no WSL sob carga

  const health = await page.evaluate(async () => (await fetch('/api/health')).json())
  expect(health).toEqual({ status: 'ok' })

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
})
