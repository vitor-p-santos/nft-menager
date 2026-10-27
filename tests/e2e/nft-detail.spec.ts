import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures/app'
import { isDesktop, isMobile } from '../fixtures/catalog'

/*
 * Fase 2 (T-045), escopo enxuto: quantidade × disponibilidade, edição esgotada + avaliações,
 * favoritar sem sessão e 404. Só a compra muda de layout (coluna no desktop × Buy Bar no mobile);
 * o resto roda num viewport só.
 */

/** Stepper visível no viewport (desktop: coluna de detalhes; mobile: Buy Bar). */
const stepper = (page: Page) => page.getByRole('group', { name: 'Quantidade' }).filter({ visible: true })
const edition = (page: Page, label: string) => page.getByRole('radio', { name: new RegExp(`^${label.replace('/', '\\/')} `) })

async function openDetail(page: Page, id: string, name: string) {
  await page.goto(`/nft/${id}`)
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible({ timeout: 15_000 })
}

test('quantidade limitada pela disponibilidade da edição', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'tablet-768', 'Tablet usa a mesma coluna de compra do desktop')
  await openDetail(page, 'nft-copper-ape-291', 'Copper Ape #291')
  await expect(page.getByText('5.43 ETH').filter({ visible: true })).toBeVisible()

  // 1/1 esgotada → edição inicial é a 1/10, com 1 disponível
  await expect(edition(page, '1/10')).toBeChecked()
  const qty = stepper(page)
  const plus = qty.getByRole('button', { name: 'Aumentar quantidade' })
  await expect(qty.locator('output')).toContainText('1')
  await expect(plus).toBeDisabled()
  await expect(qty.getByRole('button', { name: 'Diminuir quantidade' })).toBeDisabled()

  // 1/50 (47 disponíveis) libera o "+"; voltar para 1/10 recorta a quantidade em 1
  await edition(page, '1/50').check({ force: true })
  await plus.click()
  await plus.click()
  await expect(qty.locator('output')).toHaveText(/^3/)
  await edition(page, '1/10').check({ force: true })
  await expect(qty.locator('output')).toHaveText(/^1 de no máximo 1$/)
  await expect(plus).toBeDisabled()
})

test('edição 1/1 esgotada desabilitada e avaliações paginadas', async ({ page }, testInfo) => {
  test.skip(!isDesktop(testInfo), 'Independe do viewport; roda só no desktop')
  await openDetail(page, 'nft-sage-nomad-009', 'Sage Nomad #009')
  await expect(edition(page, '1/1')).toBeDisabled()
  await expect(edition(page, '1/1')).not.toBeChecked()

  await page.getByRole('tab', { name: /^Avaliações/ }).click()
  const pager = page.getByRole('navigation', { name: 'Páginas de avaliações' })
  await expect(pager.locator('output')).toHaveText('Página 1 de 6', { timeout: 15_000 })
  await expect(pager.getByRole('button', { name: 'Anteriores' })).toBeDisabled()
  const firstAuthor = await page.getByRole('tabpanel').locator('li p').first().textContent()
  await pager.getByRole('button', { name: 'Próximas' }).click()
  await expect(pager.locator('output')).toHaveText('Página 2 de 6')
  await expect(pager.getByRole('button', { name: 'Anteriores' })).toBeEnabled()
  await expect(page.getByRole('tabpanel').locator('li p').first()).not.toHaveText(firstAuthor ?? '')
})

test('favoritar sem sessão pede login; NFT inexistente mostra 404', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'tablet-768', 'Tablet usa o mesmo botão "Favoritar" do desktop')
  await openDetail(page, 'nft-copper-ape-291', 'Copper Ape #291')

  // Desktop: botão "Favoritar"; mobile: coração redondo no hero
  const favorite = page.getByRole('button', { name: /^Favoritar Copper Ape #291/ }).filter({ visible: true })
  await favorite.click()
  const live = favorite.locator('xpath=following-sibling::output')
  await expect(live).toHaveAttribute('aria-live', 'polite')
  await expect(live).toHaveText('Entre para favoritar', { timeout: 15_000 })
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')

  if (isMobile(testInfo)) return // 404 independe do viewport
  await page.goto('/nft/nao-existe')
  await expect(page.getByText('NFT não encontrado')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: 'Voltar ao catálogo' })).toBeVisible()
})
