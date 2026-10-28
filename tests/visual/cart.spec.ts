import { expect, test } from '../fixtures/app'
import { buyFromDetail } from '../fixtures/cart'
import { isMobile, loadAllImages } from '../fixtures/catalog'

/*
 * Baseline visual "carrinho" (T-054) nos 3 viewports, com 2 itens e "Colecionadores também viram"
 * carregado. Mobile: só a 1ª dobra (frame m-03), já que o resumo é preso ao rodapé.
 * Conferido com design/figma/d-03-carrinho.png e m-03-carrinho.png antes de gerar a baseline.
 */

test.use({ reducedMotion: 'reduce' })

test('carrinho', async ({ page }, testInfo) => {
  await buyFromDetail(page, 'nft-emerald-ape-042')
  await buyFromDetail(page, 'nft-violet-nomad-314')
  await expect(page.getByRole('link', { name: 'Violet Nomad #314' }).filter({ visible: true })).toBeVisible()
  if (!isMobile(testInfo)) {
    const related = page.getByRole('region', { name: 'Colecionadores também viram' })
    await expect(related.locator('li article').first()).toBeVisible({ timeout: 15_000 })
  }
  await expect(page.locator('.animate-shimmer')).toHaveCount(0, { timeout: 15_000 })
  await loadAllImages(page)
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot('carrinho.png', { fullPage: !isMobile(testInfo), caret: 'hide' })
})
