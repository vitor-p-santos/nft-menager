import { expect, test } from '../fixtures/app'
import { expectCatalogLoaded, loadAllImages } from '../fixtures/catalog'

/*
 * Baseline visual "início" (T-030) nos 3 viewports. Estabilização:
 * - `reducedMotion: 'reduce'` congela o carrossel do hero no 1º slide (o componente não faz
 *   autoplay com prefers-reduced-motion) e desliga o shimmer;
 * - `animations: 'disabled'` (playwright.config.ts) zera transições restantes;
 * - todas as imagens (inclusive lazy) e as fontes precisam ter carregado antes da captura.
 * Conferido com design/figma/d-01-inicio.png e m-01-inicio.png antes de gerar a baseline.
 */

test.use({ reducedMotion: 'reduce' })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expectCatalogLoaded(page)
  await expect(page.getByRole('region', { name: 'Diário da Cunhagem' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mostrar destaque 1 de 3' }).first()).toHaveAttribute('aria-current', 'true')
  await loadAllImages(page)
  await page.mouse.move(0, 0)
})

test('início (página inteira)', async ({ page }) => {
  await expect(page).toHaveScreenshot('inicio.png', { fullPage: true, caret: 'hide' })
})
