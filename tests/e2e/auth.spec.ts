import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures/app'
import { ANA, BRUNO, accountMenu, isMobile, logout, openLogin, submitLogin } from '../fixtures/auth'
import { buyFromDetail } from '../fixtures/cart'

/*
 * Fase 4 (T-065), escopo enxuto. Login/logout e expiração mudam de layout (modal no desktop × página
 * /entrar no mobile), então rodam em 390 e 1440; tablet usa o mesmo modal do desktop.
 * Cadastro e troca de conta são regras do formulário/servidor: um viewport basta.
 */

const NFT = { id: 'nft-copper-ape-291', name: 'Copper Ape #291' }
/** Botão "Favoritar" do detalhe (desktop) ou coração do hero (mobile), em qualquer estado. */
const favoriteButton = (page: Page) =>
  page.getByRole('button', { name: /^(Favoritar|Favoritado|Remover) Copper Ape #291/ }).filter({ visible: true })

/** Espera `quietMs` sem nenhuma request a `/api` (as respostas do MSW também contam). */
async function waitForApiQuiet(page: Page, quietMs = 1_500) {
  let last = Date.now()
  const touch = (url: string) => {
    if (new URL(url).pathname.startsWith('/api/')) last = Date.now()
  }
  const onRequest = (request: { url: () => string }) => touch(request.url())
  page.on('request', onRequest)
  page.on('requestfinished', onRequest)
  try {
    await expect.poll(() => Date.now() - last, { timeout: 15_000, intervals: [250] }).toBeGreaterThan(quietMs)
  } finally {
    page.off('request', onRequest)
    page.off('requestfinished', onRequest)
  }
}

test('login: senha errada, sucesso, volta à tela e logout', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'tablet-768', 'Tablet usa o mesmo modal do desktop')
  test.slow() // home pesada + login + reload + logout: passa de 30s no mobile no WSL
  // Catálogo com ordenação na URL: o login (redirect no mobile) precisa voltar com o search
  await page.goto('/?sort=price_asc')
  const href = await page.evaluate(() => location.pathname + location.search)

  const form = await openLogin(page, testInfo)
  if (isMobile(testInfo)) expect(new URL(page.url()).searchParams.get('redirect')).toBe(href)
  // Validação Zod no client (sem request)
  await form.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(form.getByLabel('E-mail', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect(form.getByLabel('E-mail', { exact: true })).toHaveAccessibleDescription('Informe o e-mail')

  // Erro da API: 401 invalid_credentials no alerta do formulário
  await submitLogin(form, { email: ANA.email, password: 'errada123' })
  await expect(form.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')

  await submitLogin(form, ANA)
  // Mobile: volta ao `redirect`; desktop: o modal fecha e a tela continua
  await expect(page).toHaveURL((url) => url.pathname + url.search === href)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(accountMenu(page, ANA)).toBeVisible()

  // A sessão sobrevive ao refresh (validada com GET /auth/me) e o logout a encerra
  await page.reload()
  await expect(accountMenu(page, ANA)).toBeVisible({ timeout: 15_000 })
  await logout(page, ANA)
  if (isMobile(testInfo)) await expect(page.getByRole('link', { name: 'Entrar na conta' })).toBeVisible()
  else await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('kurio:session'))).toBeNull()
})

test('cadastro: validação em português, e-mail em uso e sucesso', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390', 'Mesmo formulário no modal e na página: um viewport basta')
  await page.goto('/cadastro')
  const form = page.getByRole('main')
  const field = (name: string) => form.getByLabel(name, { exact: true })
  await expect(page.getByRole('heading', { level: 1, name: 'Criar perfil de colecionador' })).toBeVisible({ timeout: 15_000 })

  await field('Nome de usuário').fill('a!')
  await field('E-mail').fill('nao-e-email')
  await field('Senha').fill('curta')
  await field('Confirmar senha').fill('outra')
  await form.getByRole('button', { name: 'Criar perfil' }).click()
  await expect(field('Nome de usuário')).toHaveAccessibleDescription('O usuário precisa ter pelo menos 3 caracteres')
  await expect(field('E-mail')).toHaveAccessibleDescription('Informe um e-mail válido')
  await expect(field('Senha')).toHaveAccessibleDescription('A senha precisa ter pelo menos 8 caracteres')
  await expect(field('Confirmar senha')).toHaveAccessibleDescription('As senhas não coincidem')
  await expect(field('Nome de usuário')).toBeFocused()

  // 409 email_taken vai para o campo
  await field('Nome de usuário').fill('carla_qa')
  await field('E-mail').fill(ANA.email)
  await field('Senha').fill('Segura123')
  await field('Confirmar senha').fill('Segura123')
  await form.getByRole('button', { name: 'Criar perfil' }).click()
  await expect(field('E-mail')).toHaveAttribute('aria-invalid', 'true')
  await expect(field('E-mail')).toHaveAccessibleDescription(/.+/)

  await field('E-mail').fill('carla@kurio.dev')
  await form.getByRole('button', { name: 'Criar perfil' }).click()
  // Cadastro já devolve a sessão: vai ao Início logado
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('button', { name: 'Conta de carla_qa' })).toBeVisible()
})

test('sessão expirada: login volta ao fluxo e conclui o favoritar pendente', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'tablet-768', 'Tablet usa o mesmo modal do desktop')
  test.slow()
  await page.goto(`/nft/${NFT.id}`)
  await expect(page.getByRole('heading', { level: 1, name: NFT.name })).toBeVisible({ timeout: 15_000 })
  const href = await page.evaluate(() => location.pathname + location.search)

  // O detalhe mobile esconde a tab bar (Buy Bar própria): o primeiro login no mobile vai direto a /entrar?redirect=.
  if (isMobile(testInfo)) {
    await page.goto(`/entrar?redirect=${encodeURIComponent(href)}`)
    await submitLogin(page.getByRole('main'), ANA)
    await expect(page).toHaveURL((url) => url.pathname + url.search === href)
  } else {
    await submitLogin(await openLogin(page, testInfo), ANA)
  }
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 })
  // Espera os refetches do login (resetUserData) terminarem: só o clique deve usar o token recusado.
  // `networkidle` não basta: as rajadas de refetch chegam em ondas e, sob carga, uma caía depois dele.
  await waitForApiQuiet(page)

  // O servidor passa a recusar o token atual (cenário auth.session=expired, lido a cada request)
  await page.evaluate(() => localStorage.setItem('mock:scenarios', JSON.stringify({ 'auth.session': 'expired' })))

  // PUT /favorites com token vencido → 401 session_expired
  await favoriteButton(page).click()
  let form
  if (isMobile(testInfo)) {
    await expect(page).toHaveURL(/\/entrar\?/)
    const url = new URL(page.url())
    expect(url.searchParams.get('redirect')).toBe(href)
    expect(url.searchParams.get('motivo')).toBe('sessao-expirada')
    form = page.getByRole('main')
  } else {
    form = page.getByRole('dialog', { name: 'Entrar na Kurio' })
    await expect(form).toBeVisible()
  }
  await expect(form.getByText('Sua sessão expirou. Entre novamente para continuar.')).toBeVisible()
  await page.evaluate(() => localStorage.removeItem('mock:scenarios')) // o novo token volta a valer

  await submitLogin(form, ANA)
  await expect(page).toHaveURL((url) => url.pathname + url.search === href)
  const favorite = favoriteButton(page)
  await expect(favorite).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
  await expect(page.getByText(`${NFT.name} adicionado aos favoritos`).filter({ visible: true })).toBeVisible()
})

test('troca de conta: carrinho anônimo mesclado e dados privados isolados', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'Regra do servidor: um viewport basta')
  test.slow()
  const cartLink = page.getByRole('link', { name: /^Carrinho/ }).filter({ visible: true })

  // Visitante adiciona ao carrinho; o login da Ana mescla o carrinho anônimo
  await buyFromDetail(page, NFT.id)
  await submitLogin(await openLogin(page, testInfo), ANA)
  await expect(accountMenu(page, ANA)).toBeVisible()
  await expect(cartLink).toHaveAccessibleName('Carrinho, 1 item')

  // Ana favorita o NFT
  await page.goto(`/nft/${NFT.id}`)
  const favorite = favoriteButton(page)
  await favorite.click({ timeout: 15_000 })
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')

  // Logout: carrinho e favoritos somem da tela sem refresh
  await logout(page, ANA)
  await expect(cartLink).toHaveAccessibleName('Carrinho vazio')
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')

  // Bruno não vê nada da Ana
  await submitLogin(await openLogin(page, testInfo), BRUNO)
  await expect(accountMenu(page, BRUNO)).toBeVisible()
  await expect(cartLink).toHaveAccessibleName('Carrinho vazio')
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')
  await logout(page, BRUNO)

  // A Ana recupera os dados dela
  await submitLogin(await openLogin(page, testInfo), ANA)
  await expect(cartLink).toHaveAccessibleName('Carrinho, 1 item')
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
})

test('a partir de md, /entrar e /cadastro viram o modal sobre o mercado e seguem o redirect', async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), 'No mobile são páginas (coberto pelos testes acima)')
  test.slow()
  // Acesso direto ao /cadastro: modal "Criar conta" sobre o mercado, sem a página por trás
  await page.goto('/cadastro')
  await expect(page.getByRole('dialog', { name: 'Criar conta na Kurio' })).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveURL((url) => url.pathname === '/')
  await page.keyboard.press('Escape')

  // /entrar com redirect: o login pelo modal volta à rota pedida
  await page.goto(`/entrar?redirect=${encodeURIComponent('/perfil')}`)
  const dialog = page.getByRole('dialog', { name: 'Entrar na Kurio' })
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  // Por trás do modal (aria-hidden enquanto ele está aberto) está o mercado, não a página de login
  await expect(page.getByRole('region', { name: 'Catálogo de NFTs', includeHidden: true })).toBeAttached({ timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toHaveCount(0)
  await submitLogin(dialog, ANA)
  await expect(page).toHaveURL((url) => url.pathname === '/perfil', { timeout: 15_000 })
  await expect(accountMenu(page, ANA)).toBeVisible()
})

test('janela que cresce de mobile para desktop em /entrar troca a página pelo modal', async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo), 'Começa no mobile (390) e cresce para 1440')
  test.slow()
  // "Conta" da tab bar no mobile → página /entrar?redirect=/
  await page.goto('/')
  await page.getByRole('link', { name: 'Entrar na conta' }).click({ timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible({ timeout: 15_000 })

  await page.setViewportSize({ width: 1440, height: 900 })
  const dialog = page.getByRole('dialog', { name: 'Entrar na Kurio' })
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveURL((url) => url.pathname === '/')
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toHaveCount(0)
  await submitLogin(dialog, ANA)
  await expect(accountMenu(page, ANA)).toBeVisible({ timeout: 15_000 })
  await expect(dialog).toHaveCount(0)
})
