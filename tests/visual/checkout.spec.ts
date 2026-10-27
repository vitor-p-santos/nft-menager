import { expect, test } from '../fixtures/app'
import { buyFromDetail } from '../fixtures/cart'
import { isMobile, loadAllImages } from '../fixtures/catalog'
import { openCheckoutAsAna } from '../fixtures/checkout'

/*
 * Baseline visual "pagamento" (T-075) nos 3 viewports: Ana logada, 2 itens no carrinho, cotação
 * carregada. Mobile: só a 1ª dobra (frame m-04, botão preso ao rodapé); demais: página inteira.
 * Conferido com design/figma/d-04-pagamento.png e m-04-pagamento.png antes de gerar a baseline.
 */

test.use({ reducedMotion: 'reduce' })

test('pagamento', async ({ page }, testInfo) => {
  test.slow()
  await buyFromDetail(page, 'nft-emerald-ape-042')
  await openCheckoutAsAna(page, 'nft-violet-nomad-314')
  await expect(page.locator('.animate-shimmer')).toHaveCount(0, { timeout: 15_000 })
  await loadAllImages(page)
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot('pagamento.png', { fullPage: !isMobile(testInfo), caret: 'hide' })
})
