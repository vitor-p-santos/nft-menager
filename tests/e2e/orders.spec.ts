import { expect, test } from '../fixtures/app'
import { ANA, openPrivateAs } from '../fixtures/auth'
import { apiRequest } from '../fixtures/checkout'

/*
 * Fase 6 (T-083), escopo enxuto. Pedidos de fixture da Ana (src/mocks/fixtures/orders.ts):
 * 0001 confirmado, 0010 recusado (payment_declined), 0012 pendente (`hold`, nunca conclui).
 * Estados e recibo são regras da API: um viewport basta; a lista muda de layout (tabela no
 * desktop × cards abaixo de xl), então roda em 390 e 1440.
 */

const order = (n: number) => `ord_fixture-ana-${String(n).padStart(4, '0')}`

test('estados do pedido e recibo imutável', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'Regra da API: um viewport basta')
  test.slow()
  await openPrivateAs(page, `/pedidos/${order(1)}`, ANA)

  // Confirmado: recibo (snapshot gravado na confirmação)
  const receipt = page.getByRole('region', { name: 'Seus NFTs agora estão na sua carteira' })
  await expect(receipt).toBeVisible({ timeout: 15_000 })
  await expect(receipt.getByRole('rowheader', { name: 'Golden Signal #160' })).toBeVisible()
  await expect(receipt.getByText('0.35 ETH').first()).toBeVisible() // preço da época, não o atual

  // Recibo imutável: escrita → 405; leitura continua igual
  const before = await apiRequest(page, 'GET', `/orders/${order(1)}/receipt`)
  expect(before.status).toBe(200)
  for (const method of ['PUT', 'PATCH', 'DELETE', 'POST']) {
    const write = await apiRequest(page, method, `/orders/${order(1)}/receipt`)
    expect(write.status, `${method} /receipt`).toBe(405)
  }
  expect((await apiRequest(page, 'DELETE', `/orders/${order(1)}`)).status).toBe(405)
  expect(await apiRequest(page, 'GET', `/orders/${order(1)}/receipt`)).toEqual(before)

  // Recusado: motivo da API, sem recibo, ações de nova tentativa
  await page.goto(`/pedidos/${order(10)}`)
  const rejected = page.getByRole('region', { name: 'Pagamento recusado' })
  await expect(rejected).toBeVisible({ timeout: 15_000 })
  await expect(rejected.getByRole('link', { name: 'Tentar novamente' })).toHaveAttribute('href', '/checkout')
  expect((await apiRequest(page, 'GET', `/orders/${order(10)}/receipt`)).status).toBe(404)

  // Pendente: aguardando a rede (sem recibo)
  await page.goto(`/pedidos/${order(12)}`)
  const pending = page.getByRole('region', { name: 'Aguardando a confirmação da rede' })
  await expect(pending).toBeVisible({ timeout: 15_000 })
  await expect(pending).toHaveAttribute('aria-busy', 'true')

  // Pedido de outra conta / inexistente
  await page.goto('/pedidos/ord_inexistente')
  await expect(page.getByText('Pedido não encontrado')).toBeVisible({ timeout: 15_000 })
})

test('atividade: lista, filtro por estado na URL e link para o pedido', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'tablet-768', 'Mesmos cards do mobile')
  test.slow()
  const desktop = testInfo.project.name === 'desktop-1440'
  await openPrivateAs(page, '/atividade', ANA)

  // 12 pedidos, 10 por página: tabela (desktop) ou cards
  const rows = desktop
    ? page.getByRole('table', { name: 'Seus pedidos' }).locator('tbody tr')
    : page.getByRole('list', { name: 'Seus pedidos' }).getByRole('listitem')
  await expect(rows).toHaveCount(10, { timeout: 15_000 })

  const filters = page.getByRole('navigation', { name: 'Filtrar pedidos por estado' })
  await filters.getByRole('link', { name: /^Recusados/ }).click()
  await expect(page).toHaveURL(/[?&]status=rejected/)
  await expect(rows).toHaveCount(1)
  await expect(filters.getByRole('link', { name: /^Recusados/ })).toHaveAttribute('aria-current', 'page')

  await page.getByRole('link', { name: /Ver pedido/ }).first().click()
  await expect(page).toHaveURL(new RegExp(`/pedidos/${order(10)}$`))
  await expect(page.getByRole('region', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 15_000 })
})
