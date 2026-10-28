import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures/app'

/*
 * Fase 4: /entrar e /cadastro (páginas no mobile, card em md+) e o modal "Entrar | Criar conta"
 * do header (md+), já com os erros de validação visíveis. Sem violações sérias/críticas.
 */
async function seriousViolations(page: Page, label: string) {
  // No meio de uma transição de cor (ex.: troca de aba do modal) o axe mede a cor intermediária e acusa
  // color-contrast de forma intermitente; audita o estado final. Animações infinitas (spinner) não contam.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  )
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${label}: ${v.id}`)
}

test('login e cadastro sem violações sérias/críticas', async ({ page }, testInfo) => {
  test.slow() // 3 a 4 auditorias axe + navegações: passa de 30s no WSL
  const found: string[] = []
  for (const { path, heading, submit } of [
    { path: '/entrar', heading: 'Entrar', submit: 'Entrar' },
    { path: '/cadastro', heading: 'Criar perfil de colecionador', submit: 'Criar perfil' },
  ]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('main').getByRole('button', { name: submit, exact: true }).click()
    await expect(page.getByRole('main').getByRole('textbox', { name: 'E-mail' })).toHaveAttribute('aria-invalid', 'true')
    found.push(...(await seriousViolations(page, path)))
  }

  if (testInfo.project.name !== 'mobile-390') {
    await page.goto('/')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click({ timeout: 15_000 })
    const dialog = page.getByRole('dialog', { name: 'Entrar na Kurio' })
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog.getByRole('textbox', { name: 'E-mail' })).toHaveAttribute('aria-invalid', 'true')
    found.push(...(await seriousViolations(page, 'modal Entrar')))
    await dialog.getByRole('tab', { name: 'Criar conta' }).click()
    await expect(page.getByRole('dialog', { name: 'Criar conta na Kurio' })).toBeVisible()
    found.push(...(await seriousViolations(page, 'modal Criar conta')))
  }
  expect(found).toEqual([])
})
