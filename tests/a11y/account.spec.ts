import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures/app'
import { ANA, openPrivateAs } from '../fixtures/auth'
import { openCheckoutAsAna } from '../fixtures/checkout'

/*
 * Telas com sessão (Fases 5-7): pagamento, pedido confirmado, atividade, perfil, carteiras e lista de
 * interesse, sem violações sérias/críticas (WCAG 2.1 AA). Layouts mudam por viewport (tabela × cards
 * na atividade, menu lateral × topo no perfil): roda nos 3.
 */
async function seriousViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${label}: ${v.id} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}

test('pagamento sem violações sérias/críticas', async ({ page }) => {
  test.slow()
  await openCheckoutAsAna(page, 'nft-violet-nomad-314')
  expect(await seriousViolations(page, '/checkout')).toEqual([])
})

test('pedido, atividade, perfil, carteiras e lista de interesse sem violações sérias/críticas', async ({ page }) => {
  test.slow()
  const main = page.getByRole('main')
  const found: string[] = []

  await openPrivateAs(page, '/pedidos/ord_fixture-ana-0001', ANA)
  await expect(page.getByRole('region', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15_000 })
  found.push(...(await seriousViolations(page, '/pedidos/<confirmado>')))

  await page.goto('/atividade')
  await expect(main.getByRole('navigation', { name: 'Filtrar pedidos por estado' })).toBeVisible({ timeout: 15_000 })
  await expect(main.getByRole('table', { name: 'Seus pedidos' }).or(main.getByRole('list', { name: 'Seus pedidos' }))).toBeVisible()
  found.push(...(await seriousViolations(page, '/atividade')))

  await page.goto('/perfil')
  await expect(main.getByRole('textbox', { name: /^Nome de usuário/ })).toHaveValue('ana', { timeout: 15_000 })
  found.push(...(await seriousViolations(page, '/perfil')))

  await page.goto('/perfil/carteiras')
  await expect(main.getByRole('region', { name: 'Carteira principal' }).getByRole('textbox', { name: /^Apelido da carteira/ })).toHaveValue(
    'Ana Principal',
    { timeout: 15_000 },
  )
  found.push(...(await seriousViolations(page, '/perfil/carteiras')))

  // Lista com um item (a vazia é só um EmptyState)
  await page.goto('/nft/nft-copper-ape-291')
  await page.getByRole('button', { name: /^Favoritar Copper Ape #291/ }).filter({ visible: true }).click({ timeout: 15_000 })
  // Espera a API confirmar (o coração muda antes, de forma otimista)
  await expect(page.getByText('Copper Ape #291 adicionado aos favoritos').filter({ visible: true })).toBeVisible()
  await page.goto('/perfil/lista-de-interesse')
  await expect(main.getByRole('list', { name: 'NFTs da lista de interesse' }).getByRole('listitem')).not.toHaveCount(0, { timeout: 15_000 })
  found.push(...(await seriousViolations(page, '/perfil/lista-de-interesse')))

  expect(found).toEqual([])
})
