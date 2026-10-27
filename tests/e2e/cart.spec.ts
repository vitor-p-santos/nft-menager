import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures/app'
import { buyFromDetail, patchMockNft } from '../fixtures/cart'

/*
 * Fase 3 (T-054), escopo enxuto: fluxo principal do carrinho (quantidade, cupom, persistência após
 * refresh, remoção → vazio) e sinalização de preço alterado vinda do servidor.
 * Tabela (desktop) e cards (mobile/tablet) têm os mesmos rótulos, então os locators filtram o visível.
 */

const NFT = { id: 'nft-violet-nomad-314', name: 'Violet Nomad #314' }
const visible = (page: Page, text: string | RegExp) => page.getByText(text).filter({ visible: true })

test('quantidade, cupom, refresh e remoção', async ({ page }) => {
  test.slow() // fluxo longo (detalhe → carrinho → refresh): passa de 30s no WSL
  await buyFromDetail(page, NFT.id)
  await expect(page.getByRole('link', { name: NFT.name }).filter({ visible: true })).toBeVisible()

  // Quantidade: total da linha e subtotal vêm do servidor
  await page.getByRole('button', { name: `Aumentar quantidade de ${NFT.name}` }).filter({ visible: true }).click()
  const summary = page.getByRole('region', { name: 'Resumo da carteira' })
  await expect(summary.getByText('2.78 ETH')).toBeVisible()

  // Cupom: inválido mostra erro no campo; válido aplica desconto de 10%
  const coupon = summary.getByPlaceholder('Digite o código promocional...')
  await coupon.fill('nada')
  await summary.getByRole('button', { name: 'Aplicar' }).click()
  await expect(summary.getByRole('alert')).toHaveText('Cupom inválido')
  await expect(coupon).toHaveAttribute('aria-invalid', 'true')
  await coupon.fill('kurio10')
  await summary.getByRole('button', { name: 'Aplicar' }).click()
  await expect(summary.getByText(/Cupom KURIO10 aplicado/)).toBeVisible()
  await expect(summary.getByText('(-) 0.278 ETH')).toBeVisible()

  // Persistência: o carrinho anônimo (X-Cart-Id) sobrevive ao refresh
  await page.reload()
  await expect(summary.getByText('(-) 0.278 ETH')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('group', { name: `Quantidade de ${NFT.name}` }).filter({ visible: true }).locator('output')).toHaveText(/^2/)

  await page.getByRole('button', { name: `Remover ${NFT.name} do carrinho` }).filter({ visible: true }).click()
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('preço alterado no servidor é sinalizado no item', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'Regra do servidor: um viewport basta')
  await buyFromDetail(page, NFT.id)
  await expect(visible(page, '1.39 ETH').first()).toBeVisible()

  await patchMockNft(page, NFT.id, { priceWei: '1590000000000000000' })
  await page.reload()
  await expect(visible(page, 'Preço alterado: era 1.39 ETH')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('region', { name: 'Resumo da carteira' }).getByText('1.59 ETH')).toBeVisible()
})
