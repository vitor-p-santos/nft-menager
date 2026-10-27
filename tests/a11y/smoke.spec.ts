import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '../fixtures/app'

test('página inicial sem violações de acessibilidade (WCAG 2.1 AA)', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 }) // MSW + hero levam ~5s no WSL sob carga
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})
