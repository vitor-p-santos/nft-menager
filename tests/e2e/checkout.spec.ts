import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures/app'
import { apiRequest, confirmButton, openCheckoutAsAna, orderCounts, setScenarios } from '../fixtures/checkout'

/*
 * Fase 5 (T-075), escopo enxuto. Todos os testes partem do visitante: /checkout sem sessão vai para
 * /entrar?redirect=/checkout (guarda da rota privada, T-061) e volta ao pagamento após o login.
 * A compra feliz roda em 390 e 1440 (formulário recolhido no mobile × resumo lateral no desktop);
 * as regras de falha/timeout/conflito são do fluxo e da API: um viewport basta.
 * Fixture da Ana: 12 pedidos (10 confirmados, 1 recusado, 1 pendente).
 */

const NFT = { id: 'nft-copper-ape-291', name: 'Copper Ape #291' }
const statusDialog = (page: Page, title: string) => page.getByRole('dialog', { name: title })
const formAlert = (page: Page) => page.locator('form').getByRole('alert')
const desktopOnly = (name: string) => name !== 'desktop-1440'

test('compra feliz: guarda de rota, duplo clique, pendente → confirmado e carrinho esvaziado', async ({ page, mockScenarios }, testInfo) => {
  test.skip(testInfo.project.name === 'tablet-768', 'Tablet usa o layout do desktop sem a coluna lateral; 390 e 1440 bastam')
  test.slow()
  await mockScenarios({ 'payment.outcome': 'confirm', 'payment.delay': '2500' })
  await openCheckoutAsAna(page, NFT.id)

  // Duplo clique: a trava do client e a Idempotency-Key garantem um único pedido
  await confirmButton(page).dblclick()
  const pending = statusDialog(page, 'Aguardando a confirmação da rede')
  await expect(pending).toBeVisible({ timeout: 15_000 })
  // Enquanto pendente o diálogo não fecha (o status vem do servidor)
  await page.keyboard.press('Escape')
  await expect(pending).toBeVisible()

  // A confirmação só aparece quando a API devolve `confirmed`
  const receipt = statusDialog(page, 'Seus NFTs agora estão na sua carteira')
  await expect(receipt).toBeVisible({ timeout: 15_000 })
  await expect(receipt.getByRole('rowheader', { name: NFT.name })).toBeVisible()
  await expect(receipt.getByRole('link', { name: 'Ver meus pedidos' })).toBeVisible()

  const counts = await orderCounts(page)
  expect(counts).toEqual({ all: 13, pending: 1, confirmed: 11, rejected: 1 })
  // A tentativa salva (Idempotency-Key) é descartada ao concluir
  expect(await page.evaluate(() => localStorage.getItem('kurio:checkout-attempt:user-ana'))).toBeNull()

  await page.goto('/carrinho')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible({ timeout: 15_000 })
})

test('falhas: erro da API e pagamento recusado mantêm o carrinho', async ({ page }, testInfo) => {
  test.skip(desktopOnly(testInfo.project.name), 'Regra do fluxo: um viewport basta')
  test.slow()
  await openCheckoutAsAna(page, NFT.id)

  // 500 ao criar o pedido: mensagem acessível, botão volta a ficar disponível, nenhum pedido criado
  await setScenarios(page, { 'checkout.create': 'failure' })
  await confirmButton(page).click()
  await expect(formAlert(page)).toHaveText(/\S/, { timeout: 15_000 })
  await expect(confirmButton(page)).toBeEnabled()
  expect((await orderCounts(page)).all).toBe(12)

  // Pagamento recusado pela carteira: aviso de recusa e volta ao formulário com o carrinho intacto
  await setScenarios(page, { 'payment.outcome': 'reject', 'payment.delay': '500' })
  await confirmButton(page).click()
  const rejected = statusDialog(page, 'Pagamento recusado')
  await expect(rejected).toBeVisible({ timeout: 15_000 })
  await rejected.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(rejected).toBeHidden()
  await expect(formAlert(page)).toHaveText('Pagamento recusado. Seus itens continuam no carrinho; revise e tente novamente.')
  expect(await orderCounts(page)).toEqual({ all: 13, pending: 1, confirmed: 10, rejected: 2 })

  await page.goto('/carrinho')
  await expect(page.getByRole('link', { name: NFT.name }).filter({ visible: true })).toBeVisible({ timeout: 15_000 })
})

test('timeout: pedido recuperado pela Idempotency-Key, inclusive após refresh', async ({ page }, testInfo) => {
  test.skip(desktopOnly(testInfo.project.name), 'Regra do fluxo: um viewport basta')
  test.slow()
  await openCheckoutAsAna(page, NFT.id)

  // O servidor cria o pedido, mas a resposta passa do timeout do client (10 s); `hold` mantém `pending`
  await setScenarios(page, { 'checkout.create': 'timeout', 'payment.outcome': 'hold' })
  await confirmButton(page).click()
  const pending = statusDialog(page, 'Aguardando a confirmação da rede')
  await expect(pending).toBeVisible({ timeout: 25_000 })

  const attempt = await page.evaluate(() => localStorage.getItem('kurio:checkout-attempt:user-ana'))
  const saved = JSON.parse(attempt ?? 'null') as { key: string; orderId: string | null } | null
  expect(saved?.orderId).toMatch(/^ord_/)
  const byKey = await apiRequest(page, 'GET', `/orders/by-key/${saved!.key}`)
  expect(byKey.status).toBe(200)
  expect((byKey.body as { id: string }).id).toBe(saved!.orderId)

  // Refresh: a compra em andamento é recuperada (orders.recover) e nenhum pedido novo é criado
  await page.reload()
  await expect(pending).toBeVisible({ timeout: 15_000 })
  expect(await orderCounts(page)).toEqual({ all: 13, pending: 2, confirmed: 10, rejected: 1 })
})

test('conflito: revalidação mostra o diff e só compra após nova confirmação', async ({ page, mockScenarios }, testInfo) => {
  test.skip(desktopOnly(testInfo.project.name), 'Regra do fluxo: um viewport basta')
  test.slow()
  // Cotação inicial: outro comprador muda o preço → aviso não bloqueante "Atualizamos o seu pedido"
  await mockScenarios({ 'checkout.quote': 'conflict', 'payment.delay': '500' })
  await openCheckoutAsAna(page, NFT.id)
  await expect(page.getByText('Atualizamos o seu pedido:')).toBeVisible()
  await expect(page.getByText(new RegExp(`^${NFT.name} \\(edição .+\\): preço de`))).toBeVisible()

  // POST /orders → 409 price_changed: nova cotação com o diff e nova confirmação explícita
  await setScenarios(page, { 'checkout.create': 'conflict', 'payment.delay': '500' })
  await confirmButton(page).click()
  const changes = page.getByRole('dialog', { name: 'O seu pedido mudou' })
  await expect(changes).toBeVisible({ timeout: 15_000 })
  await expect(changes.getByRole('listitem').filter({ hasText: NFT.name })).toContainText('preço de')
  await expect(changes.getByText('Novo total')).toBeVisible()
  expect((await orderCounts(page)).all).toBe(12)

  await changes.getByRole('button', { name: 'Confirmar com os novos valores' }).click()
  await expect(statusDialog(page, 'Seus NFTs agora estão na sua carteira')).toBeVisible({ timeout: 15_000 })
  expect((await orderCounts(page)).all).toBe(13)
})
