import { expect, test } from '../fixtures/app'
import { isMobile, loadAllImages } from '../fixtures/catalog'

/*
 * Baseline visual "detalhe" (T-045) nos 3 viewports, estabilizada como a do "início":
 * `reducedMotion: 'reduce'` (sem shimmer nem autoplay), `animations: 'disabled'` no config,
 * avaliações e "Mais desta coleção" carregados e todas as imagens/fontes prontas antes da captura.
 * No mobile a captura é só a 1ª dobra (como o frame m-02 do Figma): em página inteira a Buy Bar
 * fixa seria pintada no meio do conteúdo.
 * Conferido com design/figma/d-02-detalhe.png e m-02-detalhe.png antes de gerar a baseline.
 */

test.use({ reducedMotion: 'reduce' })

test('detalhe', async ({ page }, testInfo) => {
  await page.goto('/nft/nft-copper-ape-291')
  await expect(page.getByRole('heading', { level: 1, name: 'Copper Ape #291' })).toBeVisible({ timeout: 15_000 })
  const related = page.getByRole('region', { name: 'Mais desta coleção' })
  await expect(related.locator('li article').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.animate-shimmer')).toHaveCount(0, { timeout: 15_000 })
  await loadAllImages(page)
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot('detalhe.png', { fullPage: !isMobile(testInfo), caret: 'hide' })
})
