import { expect, test } from '../fixtures/app'
import {
  cardLinks,
  catalogParams,
  catalogRegion,
  categoryButton,
  expectCatalogLoaded,
  isDesktop,
  isMobile,
  sortTrigger,
  withFilters,
} from '../fixtures/catalog'

/*
 * Fase 1 (T-030), escopo enxuto: filtros + URL, erro/vazio e navegação.
 * Só repete por viewport o que muda de layout (painel de filtros: sidebar × sheet).
 */

test('filtros combinados vão para a URL e sobrevivem ao reload', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'tablet-768', 'O sheet de filtros do tablet é o mesmo do mobile, já coberto')
  await page.goto('/')
  await expectCatalogLoaded(page)

  await withFilters(page, async (panel) => {
    await categoryButton(panel, 'Música').click()
    await expect(categoryButton(panel, 'Música')).toHaveAttribute('aria-pressed', 'true')
  })
  await sortTrigger(page).click()
  await page.getByRole('menuitemradio', { name: 'Menor preço' }).click()

  // Música (5 NFTs nas fixtures) em ordem crescente de preço
  const expected = ['Saffron Beat #852', 'Golden Signal #160', 'Golden Frequency #071', 'Golden Beat #207', 'Cedar Beat #425']
  await expect(cardLinks(page)).toHaveText(expected)
  expect(catalogParams(page)).toEqual({ q: null, categories: ['musica'], sort: 'price_asc', page: null })

  await page.reload()
  expect(catalogParams(page)).toEqual({ q: null, categories: ['musica'], sort: 'price_asc', page: null })
  await expect(cardLinks(page)).toHaveText(expected, { timeout: 15_000 })
  await expect(sortTrigger(page)).toContainText('Menor preço')
  await withFilters(page, async (panel) => {
    await expect(categoryButton(panel, 'Música')).toHaveAttribute('aria-pressed', 'true')
  })
})

test('erro, skeleton e busca vazia (D-04)', async ({ page, mockScenarios }, testInfo) => {
  test.skip(!isDesktop(testInfo), 'Estados independem do viewport; roda só no desktop')

  // Skeleton com latência: deve ocupar a mesma caixa do card (sem layout shift)
  const firstItem = (selector: string) =>
    page
      .waitForFunction((sel) => {
        const li = document.querySelector(`section#catalogo ${sel} > li`)
        if (!li) return null
        const r = li.getBoundingClientRect()
        return { width: r.width, height: r.height }
      }, selector)
      .then((h) => h.jsonValue())
  await page.goto('/?mock=catalog.list:latency')
  const skeleton = await firstItem('ul[aria-hidden="true"]')
  await expectCatalogLoaded(page)
  const card = await firstItem('ul[aria-busy]')
  expect.soft(skeleton!.height, 'altura do skeleton = altura do card').toBeCloseTo(card!.height, 0)

  // Falha da API → erro acessível → "Tentar novamente" recupera
  await mockScenarios({ 'catalog.list': 'failure' })
  await page.goto('/')
  const alert = catalogRegion(page).getByRole('alert')
  await expect(alert).toContainText('Não foi possível carregar o catálogo', { timeout: 15_000 })
  await page.evaluate(() => localStorage.setItem('mock:scenarios', '{}'))
  await alert.getByRole('button', { name: 'Tentar novamente' }).click()
  await expectCatalogLoaded(page)

  // Busca sem resultados → "Limpar filtros"
  await page.getByRole('button', { name: 'Abrir busca' }).click()
  await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('zzzz')
  await page.keyboard.press('Enter')
  // O campo fecha e o foco volta ao botão que abriu a busca
  await expect(page.getByRole('button', { name: 'Abrir busca' })).toBeFocused()
  await expect(catalogRegion(page).getByText('Nenhum NFT encontrado')).toBeVisible()
  expect(catalogParams(page).q).toBe('zzzz')
  await catalogRegion(page).getByRole('button', { name: 'Limpar filtros' }).click()
  await expectCatalogLoaded(page)
  expect(catalogParams(page).q).toBeNull()
})

test('navegação: card → detalhe, footer → página institucional, 404s', async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), 'O footer não existe abaixo de 768 px (design mobile do Figma)')
  test.skip(testInfo.project.name === 'tablet-768', 'Mesmo fluxo do desktop, sem diferença de layout relevante')

  await page.goto('/')
  await expectCatalogLoaded(page)
  await cardLinks(page).first().click()
  await expect(page).toHaveURL(/\/nft\/nft-emerald-ape-042$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()

  await page.getByRole('contentinfo').getByRole('link', { name: 'Central de ajuda', exact: true }).click()
  await expect(page).toHaveURL(/\/paginas\/central-de-ajuda$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Central de ajuda' })).toBeVisible()

  // Redes sociais: nova aba com rel seguro (D-10)
  const socials = page.getByRole('contentinfo').getByRole('link', { name: /\(abre em nova aba\)$/ })
  await expect(socials).toHaveCount(5)
  for (const link of await socials.all()) {
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noopener/)
    await expect(link).toHaveAttribute('rel', /noreferrer/)
  }

  await page.goto('/nft/nao-existe')
  await expect(page.getByText('NFT não encontrado')).toBeVisible()
  await page.goto('/paginas/slug-invalido')
  await expect(page.getByText('Página não encontrada')).toBeVisible()
})
