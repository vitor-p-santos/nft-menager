import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '../fixtures/app'
import { buyFromDetail } from '../fixtures/cart'

/*
 * A Home (/) já é auditada por smoke.spec.ts nos 3 viewports (WCAG 2.1 AA, zero violações).
 * Aqui: página institucional (D-10), detalhe do NFT (Fase 2) e carrinho (Fase 3), sem violações sérias/críticas.
 */
const PAGES = [
  { path: '/paginas/central-de-ajuda', heading: 'Central de ajuda' },
  { path: '/nft/nft-copper-ape-291', heading: 'Copper Ape #291' },
]

test('páginas internas sem violações sérias/críticas', async ({ page }) => {
  test.slow() // 2 páginas + 2 auditorias axe: passa de 30s no WSL sob carga
  for (const { path, heading } of PAGES) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 15_000 })
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${path}: ${v.id}`)).toEqual([])
  }
})

test('carrinho sem violações sérias/críticas', async ({ page }) => {
  await buyFromDetail(page, 'nft-violet-nomad-314')
  await expect(page.getByRole('region', { name: 'Resumo da carteira' })).toBeVisible()
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([])
})
