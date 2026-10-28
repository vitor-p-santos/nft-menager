import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures/app'
import { ANA, openPrivateAs } from '../fixtures/auth'
import { toWei, waitForSocket } from '../fixtures/realtime'

/*
 * Fase 8 (T-093/T-095). Gatilhos do servidor simulado em `window.__mockRealtime` (src/mocks/socket/dev-tools.ts):
 * `emitNftUpdate`/`emitOrderUpdate` gravam no banco e emitem o evento com a `version` nova. Regra do
 * client (cache + VersionGate), não de layout: roda só no desktop.
 */

/** Preço do detalhe: o span tem o rótulo sr-only "Preço: " antes do valor formatado ("6.50 ETH"). */
const price = (page: Page, text: string) =>
  page.getByRole('main').getByText(`Preço: ${text}`, { exact: true }).filter({ visible: true })

test.beforeEach(({ page: _page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'Regra do client: um viewport basta')
})

test('nft.updated muda o preço na tela; duplicado e evento antigo são ignorados', async ({ page }) => {
  await page.goto('/nft/nft-copper-ape-291')
  await expect(page.getByRole('heading', { level: 1, name: 'Copper Ape #291' })).toBeVisible({ timeout: 15_000 })
  await expect(price(page, '5.43 ETH')).toBeVisible()
  await waitForSocket(page)

  await page.evaluate((wei) => window.__mockRealtime!.emitNftUpdate('nft-copper-ape-291', { priceWei: wei }), toWei('6.5'))
  await expect(price(page, '6.50 ETH')).toBeVisible({ timeout: 5_000 }) // sem reload
  await expect(price(page, '5.43 ETH')).toHaveCount(0)

  // Duplicados (mesmo eventId; um deles adulterado com outro preço) e evento com version - 1: nenhum aplica
  await page.evaluate(
    ({ dup, stale }) => {
      const rt = window.__mockRealtime!
      rt.emitDuplicate()
      const last = rt.events().at(-1)!
      rt.emit(last.name, { ...last.payload, changes: { priceWei: dup } })
      rt.emitStale('nft-copper-ape-291', { changes: { priceWei: stale } })
    },
    { dup: toWei('2.22'), stale: toWei('1.11') },
  )
  await page.waitForTimeout(1_000) // dá tempo de um evento indevido chegar à tela
  await expect(price(page, '6.50 ETH')).toBeVisible()
  await expect(price(page, '2.22 ETH')).toHaveCount(0)
  await expect(price(page, '1.11 ETH')).toHaveCount(0)
})

test('desconexão: aviso, reconexão e refetch do que mudou durante a queda', async ({ page }) => {
  await page.goto('/nft/nft-copper-ape-291')
  await expect(price(page, '5.43 ETH')).toBeVisible({ timeout: 15_000 })
  await waitForSocket(page)

  // Servidor fora por 4 s; a mudança acontece enquanto ninguém está conectado (o evento se perde)
  await page.evaluate((wei) => {
    window.__mockRealtime!.dropConnection({ downMs: 4_000 })
    window.__mockRealtime!.emitNftUpdate('nft-copper-ape-291', { priceWei: wei })
  }, toWei('7.25'))
  const status = page.locator('output[aria-live="polite"]').filter({ hasText: /tempo real/ })
  await expect(status).toHaveText('Reconectando às atualizações em tempo real…', { timeout: 5_000 })
  await expect(price(page, '5.43 ETH')).toBeVisible() // ainda o valor antigo

  // Volta: aviso de restabelecido e o refetch ao reconectar traz o preço novo
  await expect(status).toHaveText('Atualizações em tempo real restabelecidas.', { timeout: 15_000 })
  await expect(price(page, '7.25 ETH')).toBeVisible({ timeout: 5_000 })
})

test('order.updated conclui o pedido pendente na tela antes do polling', async ({ page }) => {
  test.slow()
  const id = 'ord_fixture-ana-0012' // pendente (`hold`): só conclui por evento ou forceSettlement
  await openPrivateAs(page, `/pedidos/${id}`, ANA)
  await expect(page.getByRole('region', { name: 'Aguardando a confirmação da rede' })).toBeVisible({ timeout: 15_000 })
  await waitForSocket(page, { authenticated: true })

  // Com o socket ativo o polling do pendente é de 15 s: em até 5 s, só o evento explica a mudança
  await page.evaluate((orderId) => window.__mockRealtime!.emitOrderUpdate(orderId, 'confirmed'), id)
  await expect(page.getByRole('region', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 5_000 })
  await expect(page.getByRole('region', { name: 'Aguardando a confirmação da rede' })).toHaveCount(0)
})
