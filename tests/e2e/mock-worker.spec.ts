import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures/app'
import { ANA, openPrivateAs } from '../fixtures/auth'

/*
 * O navegador desliga o service worker do MSW quando a aba fica ociosa; ele volta sem a lista em memória
 * das abas que ativaram o mock e deixa a `/api` ir para a rede (no deploy: `index.html` ou 404 do host).
 * O client da API reconhece a resposta fora do contrato, reativa o worker e repete a requisição
 * (src/mocks/worker-recovery.ts). O keepalive preventivo é desligado aqui para testar só essa recuperação.
 */

async function stopServiceWorkers(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('ServiceWorker.enable')
  await cdp.send('ServiceWorker.stopAllWorkers')
}

/** Navegação client-side (sem recarregar a página, que reativaria o MSW pelo bootstrap). */
async function navigateInApp(page: Page, path: string) {
  await page.evaluate((to) => {
    window.history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

test('worker do MSW desligado por ociosidade: a API volta a responder sem recarregar', async ({ page }) => {
  test.slow() // login + duas paradas do worker
  await page.addInitScript(() => {
    // Sem o keepalive (setInterval), só a recuperação sob demanda do client da API reativa o mock
    window.setInterval = (() => 0) as unknown as typeof window.setInterval
  })
  const offContract: string[] = []
  page.on('response', (response) => {
    if (response.url().includes('/api/') && !response.fromServiceWorker()) offContract.push(new URL(response.url()).pathname)
  })

  await openPrivateAs(page, '/perfil', ANA)
  const main = page.getByRole('main')
  await expect(main.getByRole('textbox', { name: 'Nome de usuário' })).toHaveValue('ana', { timeout: 15_000 })

  // Query: a lista de pedidos da Ana vem do MSW, mesmo com a 1ª chamada indo para a rede
  await stopServiceWorkers(page)
  await navigateInApp(page, '/atividade')
  const orders = page.getByRole('table', { name: 'Seus pedidos' }).or(page.getByRole('list', { name: 'Seus pedidos' }))
  await expect(orders.filter({ visible: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Você ainda não fez pedidos')).toHaveCount(0)
  expect(offContract).toContain('/api/orders')

  // Mutation: salvar o perfil depois de outra parada não vira um "não encontrado" falso do host
  await navigateInApp(page, '/perfil')
  const displayName = main.getByRole('textbox', { name: 'Nome de exibição' })
  await expect(displayName).toBeVisible({ timeout: 15_000 })
  await stopServiceWorkers(page)
  offContract.length = 0
  await displayName.fill('Ana Souza')
  await main.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(main.getByText('Perfil salvo.', { exact: true })).toBeVisible({ timeout: 15_000 })
  expect(offContract.length).toBeGreaterThan(0)
})
