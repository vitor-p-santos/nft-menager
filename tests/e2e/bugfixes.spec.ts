import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures/app'
import { ANA, BRUNO, expectLoginFor, logout, openPrivateAs, submitLogin } from '../fixtures/auth'
import { buyFromDetail } from '../fixtures/cart'
import { catalogRegion, expectCatalogLoaded } from '../fixtures/catalog'
import { confirmButton, openCheckoutAsAna, orderCounts, setScenarios } from '../fixtures/checkout'
import { waitForSocket } from '../fixtures/realtime'

/*
 * Regressões dos bugs de reports/BUGS.md (caça de bugs de 2026-10-28). Cada teste cita o item.
 * Layout não importa na maioria: rodam no mobile e no desktop (o tablet repete o desktop).
 */
test.skip(({ viewport }) => viewport?.width === 768, 'Tablet repete o desktop')

type ApiResult = { status: number; body: Record<string, unknown> | null }

/** Chamada à API simulada com a sessão e o carrinho anônimo da página (MSW intercepta o fetch). */
async function api(page: Page, method: string, path: string, body?: unknown): Promise<ApiResult> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const raw = localStorage.getItem('kurio:session')
      const token = raw ? (JSON.parse(raw) as { session: { token: string } }).session.token : null
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`
      const cartId = localStorage.getItem('kurio:cart-id')
      if (cartId) headers['X-Cart-Id'] = cartId
      if (method === 'POST' && path === '/orders') headers['Idempotency-Key'] = crypto.randomUUID()
      const response = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
      return { status: response.status, body: (await response.json().catch(() => null)) as Record<string, unknown> | null }
    },
    { method, path, body },
  )
}

/** Corpo da resposta (falha o teste se vier vazio). */
function bodyOf<T>(result: ApiResult): T {
  expect(result.body, `corpo de ${result.status}`).not.toBeNull()
  return result.body as T
}

const isMobileViewport = (page: Page) => (page.viewportSize()?.width ?? 0) < 768

/** Navegação pelo app, sem recarregar (dispara o `onLeave` da rota atual). */
async function navigateInApp(page: Page, path: string) {
  await page.evaluate((to) => {
    window.history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

test('2: favorito pendente de outro fluxo não desvia o login nem favorita sozinho', async ({ page }) => {
  test.slow()
  await page.goto('/nft/nft-sage-nomad-009')
  const favorite = page.getByRole('button', { name: /^Favoritar Sage Nomad #009/ }).filter({ visible: true })
  await favorite.click({ timeout: 15_000 })
  await expect(favorite.locator('xpath=following-sibling::output')).toHaveText('Entre para favoritar', { timeout: 15_000 })

  // O visitante desiste do favorito e vai comprar outra coisa
  await buyFromDetail(page, 'nft-golden-beat-207')
  await page.getByRole('region', { name: 'Resumo da carteira' }).getByRole('link', { name: 'Conectar e finalizar' }).click()
  await submitLogin(await expectLoginFor(page, '/checkout'), BRUNO)
  await expect(page).toHaveURL((url) => url.pathname === '/checkout', { timeout: 15_000 })
  const favorites = await api(page, 'GET', '/me/favorites')
  expect(JSON.stringify(favorites.body)).not.toContain('nft-sage-nomad-009')
})

test('3: compra concluída depois de sair do checkout não reabre no checkout seguinte', async ({ page, mockScenarios }) => {
  test.slow()
  await mockScenarios({ 'payment.delay': '3000' })
  await openCheckoutAsAna(page, 'nft-emerald-ape-042')
  const before = await orderCounts(page)
  await confirmButton(page).click()
  await expect(page.getByRole('dialog', { name: 'Aguardando a confirmação da rede' })).toBeVisible({ timeout: 15_000 })

  // Sai do checkout pelo app com o pedido pendente; ele conclui nesse meio-tempo
  await navigateInApp(page, '/')
  await expect.poll(async () => (await orderCounts(page)).confirmed, { timeout: 15_000 }).toBe(before.confirmed + 1)

  await buyFromDetail(page, 'nft-violet-nomad-314')
  await page.goto('/checkout')
  await expect(confirmButton(page)).toBeEnabled({ timeout: 15_000 })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith('kurio:checkout-attempt:')))).toBe(false)
})

test('4: falha na junção do carrinho no login avisa e permite tentar de novo; o logout não perde o carrinho', async ({ page }) => {
  test.slow()
  await buyFromDetail(page, 'nft-golden-beat-207')
  await setScenarios(page, { 'cart.merge': 'failure' })
  await page.goto(`/entrar?redirect=${encodeURIComponent('/carrinho')}`)
  await submitLogin(await expectLoginFor(page, '/carrinho'), BRUNO)
  await expect(page).toHaveURL((url) => url.pathname === '/carrinho', { timeout: 15_000 })
  const notice = page.getByRole('alert').filter({ hasText: 'Não foi possível trazer para a sua conta os itens' })
  await expect(notice).toBeVisible({ timeout: 15_000 })

  // Sair e entrar de novo não perde o carrinho do visitante: a junção pendente é refeita
  await page.goto('/') // o carrinho mobile esconde a tab bar (onde fica a conta)
  await logout(page, BRUNO)
  await setScenarios(page, {})
  await page.goto(`/entrar?redirect=${encodeURIComponent('/carrinho')}`)
  await submitLogin(await expectLoginFor(page, '/carrinho'), BRUNO)
  await expect(page.getByRole('link', { name: 'Golden Beat #207' }).filter({ visible: true })).toBeVisible({ timeout: 15_000 })
  await expect(notice).toHaveCount(0)
})

test('4: "Tentar novamente" traz o carrinho do visitante depois da falha', async ({ page }) => {
  test.slow()
  await buyFromDetail(page, 'nft-golden-beat-207')
  await setScenarios(page, { 'cart.merge': 'failure' })
  await page.goto(`/entrar?redirect=${encodeURIComponent('/carrinho')}`)
  await submitLogin(await expectLoginFor(page, '/carrinho'), BRUNO)
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible({ timeout: 15_000 })
  await setScenarios(page, {})
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('link', { name: 'Golden Beat #207' }).filter({ visible: true })).toBeVisible({ timeout: 15_000 })
})

test('5: carteira salva com outro tipo não vai para o pedido como a salva', async ({ page }) => {
  test.slow()
  await openCheckoutAsAna(page, 'nft-emerald-ape-042')
  const wallets = await api(page, 'GET', '/me/wallets')
  const principal = bodyOf<{ id: string; address: string; provider: string }[]>(wallets).find((w) => w.id === 'wallet-ana-principal')
  expect(principal?.provider).toBe('metamask')
  const cart = await api(page, 'GET', '/cart')
  const quote = await api(page, 'POST', '/checkout/quote', { cartVersion: cart.body?.version })
  const order = await api(page, 'POST', '/orders', {
    quoteId: quote.body?.id,
    walletId: 'wallet-ana-principal',
    network: 'ethereum',
    collector: {
      displayName: 'Ana Ribeiro',
      username: 'ana',
      profileName: 'Ana Ribeiro',
      email: 'ana@kurio.dev',
      network: 'ethereum',
      walletAddress: principal?.address,
      walletProvider: 'coinbase',
    },
  })
  expect(order.status).toBe(422)
  expect(bodyOf<{ details: Record<string, string> }>(order).details['collector.walletProvider']).toBe('O tipo difere da carteira selecionada')
})

test('6, 7 e 8: página além da última, busca por "ape" e filtros escritos à mão na URL', async ({ page }) => {
  test.slow()
  await page.goto('/?page=999#catalogo')
  await expect(page.getByText('Esta página não tem NFTs')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Ir para a primeira página' }).click()
  await expectCatalogLoaded(page)

  const search = await api(page, 'GET', '/nfts?q=ape&pageSize=50')
  const total = search.body?.total as number
  expect(total).toBeGreaterThan(0)
  expect(total).toBeLessThan(36)

  const listRequest = page.waitForRequest((r) => {
    const url = new URL(r.url())
    return url.pathname === '/api/nfts' && url.searchParams.getAll('categories').includes('musica') && url.searchParams.get('minPrice') === '0.5'
  })
  await page.goto('/?categories=musica&minPrice=0.5#catalogo')
  await listRequest
})

test('9: sessão expirada numa tela privada pede login (com aviso) e volta a ela, sem erro de conexão', async ({ page }) => {
  test.slow()
  await openPrivateAs(page, '/perfil/carteiras', ANA)
  await setScenarios(page, { 'auth.session': 'expired' })
  // Refresh: o primeiro request já volta 401, antes de a UI estar montada (o aviso não pode se perder)
  await page.reload()
  const login = await expectLoginFor(page, '/perfil/carteiras')
  await expect(login.getByText('Sua sessão expirou. Entre novamente para continuar.')).toBeVisible()
  await expect(page.getByText('Verifique sua conexão', { exact: false })).toHaveCount(0)

  await setScenarios(page, {})
  await submitLogin(login, ANA)
  await expect(page).toHaveURL((url) => url.pathname === '/perfil/carteiras', { timeout: 15_000 })
})

test('10 e 11: catálogo em falha sem skeleton eterno; timeout mostra o erro sem esperar 3 tentativas', async ({ page, mockScenarios }) => {
  test.slow()
  await mockScenarios({ 'catalog.list': 'failure', 'cart.get': 'timeout' })
  await page.goto('/#catalogo')
  await expect(page.getByText('Não foi possível carregar o catálogo')).toBeVisible({ timeout: 20_000 })
  await expect(catalogRegion(page).locator('.animate-shimmer')).toHaveCount(0)

  const start = Date.now()
  await page.goto('/carrinho')
  await expect(page.getByText('Não foi possível carregar o carrinho')).toBeVisible({ timeout: 25_000 })
  expect(Date.now() - start).toBeLessThan(20_000)
})

test('12 e 13: mensagens de estoque claras e erros de validação da API em português', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
  const nft = await api(page, 'GET', '/nfts/nft-golden-beat-207')
  const edition = bodyOf<{ editions: { edition: string; available: number }[] }>(nft).editions.find((e) => e.available > 1)
  if (!edition) throw new Error('fixture sem edição com mais de uma unidade')
  const add = (quantity: number) => api(page, 'POST', '/cart/items', { nftId: 'nft-golden-beat-207', edition: edition.edition, quantity })

  expect((await add(edition.available + 1)).body?.message).toBe(`Só há ${edition.available} unidades disponíveis`)
  expect((await add(edition.available)).status).toBe(200)
  expect((await add(1)).body?.message).toBe(`Você já tem no carrinho todas as ${edition.available} unidades disponíveis desta edição`)

  const invalid = await add(1.5)
  expect(invalid.status).toBe(422)
  expect(JSON.stringify(invalid.body)).not.toContain('Invalid input')
  expect(JSON.stringify(invalid.body)).toContain('inteiro')
})

test('14: remover pelo teclado mantém o foco nos itens e, no fim, no título', async ({ page }) => {
  test.slow()
  await buyFromDetail(page, 'nft-golden-beat-207')
  await buyFromDetail(page, 'nft-violet-nomad-314')
  const remove = page.locator('[data-cart-remove]').filter({ visible: true })
  await expect(remove).toHaveCount(2)
  await remove.first().focus()
  await page.keyboard.press('Enter')
  await expect(remove).toHaveCount(1)
  await expect(remove.first()).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('H1')
})

test('15: fechar "Pagamento recusado" devolve o foco ao "Confirmar compra"', async ({ page, mockScenarios }) => {
  test.slow()
  await mockScenarios({ 'payment.outcome': 'reject', 'payment.delay': '0' })
  await openCheckoutAsAna(page, 'nft-emerald-ape-042')
  await confirmButton(page).click()
  await expect(page.getByRole('dialog', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 15_000 })
  await page.keyboard.press('Escape')
  await expect(confirmButton(page)).toBeFocused()
})

test('16 e 17: páginas 404 têm h1; o menu do perfil não repete o nome do footer', async ({ page }) => {
  test.slow()
  await page.goto('/rota-x')
  await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible({ timeout: 15_000 })
  await page.goto('/nft/nao-existe')
  await expect(page.getByRole('heading', { level: 1, name: 'NFT não encontrado' })).toBeVisible({ timeout: 15_000 })

  if (isMobileViewport(page)) return
  await openPrivateAs(page, '/perfil', ANA)
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.getByRole('navigation', { name: 'Menu do perfil' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Meu perfil', exact: true })).toHaveCount(1)
})

test('suspeito: a confirmação tira do carrinho só a quantidade comprada', async ({ page, mockScenarios }) => {
  test.slow()
  await mockScenarios({ 'payment.outcome': 'hold' })
  await openCheckoutAsAna(page, 'nft-emerald-ape-042')
  // Um item com estoque para subir a quantidade depois (a edição do Emerald Ape tem 1 unidade)
  const nft = bodyOf<{ editions: { edition: string; available: number }[] }>(await api(page, 'GET', '/nfts/nft-golden-beat-207'))
  const edition = nft.editions.find((e) => e.available >= 2)
  if (!edition) throw new Error('fixture sem edição com 2 unidades')
  expect((await api(page, 'POST', '/cart/items', { nftId: 'nft-golden-beat-207', edition: edition.edition, quantity: 1 })).status).toBe(200)
  await page.reload()
  await expect(confirmButton(page)).toBeEnabled({ timeout: 15_000 })
  await confirmButton(page).click()
  await expect(page.getByRole('dialog', { name: 'Aguardando a confirmação da rede' })).toBeVisible({ timeout: 15_000 })

  // Com o pedido pendente, a quantidade do mesmo item sobe de 1 para 2
  const cart = bodyOf<{ items: { id: string; nftId: string; quantity: number }[] }>(await api(page, 'GET', '/cart'))
  const item = cart.items.find((i) => i.nftId === 'nft-golden-beat-207')
  expect(item?.quantity).toBe(1)
  expect((await api(page, 'PATCH', `/cart/items/${item?.id}`, { quantity: 2 })).status).toBe(200)

  const orders = bodyOf<{ items: { id: string; items: { nftId: string }[] }[] }>(await api(page, 'GET', '/orders?status=pending'))
  const pending = orders.items.find((o) => o.items.some((i) => i.nftId === 'nft-golden-beat-207'))
  await waitForSocket(page, { authenticated: true })
  await page.evaluate((id) => window.__mockRealtime?.emitOrderUpdate(id, 'confirmed'), pending?.id ?? '')

  // Fica 1 (o excedente); o Emerald Ape, comprado inteiro, sai
  await expect
    .poll(
      async () => {
        const after = bodyOf<{ items: { nftId: string; quantity: number }[] }>(await api(page, 'GET', '/cart'))
        return after.items.map((i) => `${i.nftId}:${i.quantity}`).join(',')
      },
      { timeout: 15_000 },
    )
    .toBe('nft-golden-beat-207:1')
})
