import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures/app'
import { buyFromDetail } from '../fixtures/cart'
import { confirmButton, openCheckoutAsAna } from '../fixtures/checkout'

/*
 * Cada pedido é pago numa rede só, a rede dos NFTs (reports/BUGS.md, item 1). Fixtures: Emerald Ape #042
 * é Ethereum e Neon Vessel #552 é Polygon; a Ana tem "Principal" (Ethereum) e "Reserva" (Polygon).
 */
const ETHEREUM_NFT = { id: 'nft-emerald-ape-042', name: 'Emerald Ape #042' }
const POLYGON_NFT = { id: 'nft-neon-vessel-552', name: 'Neon Vessel #552' }
const MISMATCH = 'Os NFTs deste pedido são da rede Ethereum. Use uma carteira Ethereum.'

/** `POST /orders` direto, com a carteira digitada na rede pedida (a UI não deixaria chegar aqui). */
async function placeOrderOnNetwork(page: Page, network: 'polygon' | 'solana') {
  return page.evaluate(async (network) => {
    const raw = localStorage.getItem('kurio:session')
    const token = raw ? (JSON.parse(raw) as { session: { token: string } }).session.token : ''
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    const cart = (await (await fetch('/api/cart', { headers })).json()) as { version: number }
    const quote = (await (
      await fetch('/api/checkout/quote', { method: 'POST', headers, body: JSON.stringify({ cartVersion: cart.version }) })
    ).json()) as { id: string }
    const walletAddress = network === 'solana' ? '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin' : `0x${'a'.repeat(40)}`
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        quoteId: quote.id,
        walletId: null,
        network,
        collector: {
          displayName: 'Ana Ribeiro',
          username: 'ana',
          profileName: 'Ana Ribeiro',
          email: 'ana@kurio.dev',
          network,
          walletAddress,
          walletProvider: 'metamask',
        },
      }),
    })
    return { status: response.status, body: (await response.json()) as { code: string; details?: Record<string, unknown> } }
  }, network)
}

test('carrinho com NFTs de redes diferentes não finaliza até sobrar uma rede', async ({ page }) => {
  test.slow() // dois detalhes + carrinho
  await buyFromDetail(page, ETHEREUM_NFT.id)
  await buyFromDetail(page, POLYGON_NFT.id)

  const summary = page.getByRole('region', { name: 'Resumo da carteira' })
  const blocked = summary.getByRole('button', { name: 'Conectar e finalizar', exact: true })
  await expect(blocked).toHaveAttribute('aria-disabled', 'true')
  await expect(blocked).toHaveAccessibleDescription(/NFTs de Ethereum e Polygon\. Cada compra usa uma rede só/)

  await page.getByRole('button', { name: `Remover ${POLYGON_NFT.name} do carrinho` }).filter({ visible: true }).click()
  await expect(summary.getByRole('link', { name: 'Conectar e finalizar', exact: true })).toHaveAttribute('href', '/checkout')
})

test('checkout: carrinho misturado não é cotado e a carteira precisa ser da rede dos NFTs', async ({ page }, testInfo) => {
  test.slow() // login + checkout + validações
  await openCheckoutAsAna(page, ETHEREUM_NFT.id)

  // A API recusa a carteira de outra rede, mesmo sem passar pela UI
  for (const network of ['polygon', 'solana'] as const) {
    const { status, body } = await placeOrderOnNetwork(page, network)
    expect(status).toBe(422)
    expect(body.details?.network).toBe(MISMATCH)
  }

  // Na UI: escolher a carteira "Reserva" (Polygon) é barrado no campo Rede antes de enviar
  // Rádio e checkbox são <input> sr-only (o visível é o indicador do Figma): marca sem exigir visibilidade
  if (testInfo.project.name === 'mobile-390') {
    await page.getByRole('radio', { name: /Reserva/ }).check({ force: true })
  } else {
    await page.getByRole('checkbox', { name: 'Usar outra carteira?' }).check({ force: true })
    await page.getByRole('combobox', { name: /^Rede/ }).selectOption('polygon')
    await page.getByRole('textbox', { name: /^Endereço da carteira/ }).fill(`0x${'b'.repeat(40)}`)
  }
  let posted = false
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') posted = true
  })
  await confirmButton(page).click()
  const network = page.getByRole('combobox', { name: /^Rede/ })
  await expect(network).toHaveAttribute('aria-invalid', 'true')
  await expect(network).toHaveAccessibleDescription(MISMATCH)
  expect(posted).toBe(false)

  // NFT de outra rede no carrinho: a cotação é recusada e o caminho é voltar ao carrinho
  await buyFromDetail(page, POLYGON_NFT.id)
  await page.goto('/checkout')
  await expect(page.getByText('Finalize uma rede por vez')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: 'Voltar ao carrinho' })).toBeVisible()
})
