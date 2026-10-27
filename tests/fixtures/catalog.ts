import type { Locator, Page, TestInfo } from '@playwright/test'
import { expect } from './app'

export const isMobile = (testInfo: TestInfo) => testInfo.project.name === 'mobile-390'
export const isDesktop = (testInfo: TestInfo) => testInfo.project.name === 'desktop-1440'

/**
 * Região do catálogo na Home. Escopo por id: em execuções paralelas o `getByRole('region', { name })`
 * às vezes não resolvia o nome (h2 sr-only) a tempo e o seletor ficava instável.
 */
export const catalogRegion = (page: Page) => page.locator('section#catalogo')

/** Links dos cards de NFT na grade de resultados (o nome do NFT é o rótulo acessível). */
export const cardLinks = (page: Page) => catalogRegion(page).locator('li article h3').getByRole('link')

/**
 * Espera a primeira página do catálogo. Prazo maior que o padrão (5 s): boot do MSW + orçamento de
 * 400 ms do loader + atraso simulado, com 4 workers em paralelo, passou de 5 s em algumas execuções.
 */
export async function expectCatalogLoaded(page: Page, count = 9) {
  await expect(cardLinks(page)).toHaveCount(count, { timeout: 15_000 })
}

/** Search params do catálogo como a app os grava (arrays em JSON, padrão do TanStack Router). */
export function catalogParams(page: Page) {
  const params = new URL(page.url()).searchParams
  const categories = params.get('categories')
  return {
    q: params.get('q'),
    categories: categories ? (JSON.parse(categories) as string[]) : null,
    sort: params.get('sort'),
    page: params.get('page'),
  }
}

/** Executa `fn` no painel de filtros: sidebar no desktop (≥ 1440), sheet "Filtros" abaixo disso. */
export async function withFilters(page: Page, fn: (panel: Locator) => Promise<void>) {
  const sidebar = page.getByRole('complementary', { name: 'Filtros e destaque' })
  if (await sidebar.isVisible()) {
    await fn(sidebar)
    return
  }
  await page.getByRole('button', { name: /^Filtros/ }).filter({ visible: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Filtros' })
  await expect(sheet).toBeVisible()
  await fn(sheet)
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
}

/** Botão de uma categoria no painel "Coleções" (rótulo "Música (5 itens)"). */
export const categoryButton = (panel: Locator, label: string) =>
  panel.getByRole('region', { name: 'Coleções' }).getByRole('button', { name: new RegExp(`^${label} \\(`) })

export const sortTrigger = (page: Page) => page.getByRole('button', { name: /^Ordenar por:/ })

/** Garante que as imagens renderizadas (inclusive lazy) e as fontes carregaram. */
export async function loadAllImages(page: Page) {
  await page.evaluate(async () => {
    const step = window.innerHeight / 2
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    }
    window.scrollTo(0, 0)
  })
  // Só as visíveis: as de blocos ocultos no breakpoint (display:none) e as fora da largura da
  // página (cards além da 1ª página de um carrossel horizontal) nunca carregam se lazy
  await page.waitForFunction(() =>
    Array.from(document.images)
      .filter((img) => {
        const rect = img.getBoundingClientRect()
        return img.getClientRects().length > 0 && rect.left < window.innerWidth && rect.right > 0
      })
      .every((img) => img.complete && img.naturalWidth > 0),
  )
  await page.evaluate(() => document.fonts.ready)
}
