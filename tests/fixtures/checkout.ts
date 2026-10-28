import type { Page } from '@playwright/test'
import { expect } from './app'
import { ANA, expectLoginFor, submitLogin } from './auth'
import { buyFromDetail } from './cart'

export const confirmButton = (page: Page) => page.getByRole('button', { name: /^(Confirmar compra|Processando…)$/ })

/**
 * Troca os cenários MSW no meio do teste (lidos a cada request). Diferente de `mockScenarios`,
 * não reaplica a cada navegação: use quando o cenário muda entre etapas do fluxo.
 */
export async function setScenarios(page: Page, map: Record<string, string>) {
  await page.evaluate((value) => localStorage.setItem('mock:scenarios', value), JSON.stringify(map))
}

/**
 * Visitante põe o NFT no carrinho, abre /checkout (rota privada → login com redirect=/checkout),
 * entra como Ana (carrinho anônimo mesclado) e volta ao pagamento com a cotação carregada.
 */
export async function openCheckoutAsAna(page: Page, nftId: string) {
  await buyFromDetail(page, nftId)
  await page.goto('/checkout')
  await submitLogin(await expectLoginFor(page, '/checkout'), ANA)
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(confirmButton(page)).toBeEnabled({ timeout: 15_000 })
}

/** Chamada direta à API simulada com o token da sessão atual (MSW intercepta o fetch da página). */
export async function apiRequest(page: Page, method: string, path: string) {
  return page.evaluate(
    async ({ method, path }) => {
      const raw = localStorage.getItem('kurio:session')
      const token = raw ? (JSON.parse(raw) as { session: { token: string } }).session.token : null
      const response = await fetch(`/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: method === 'GET' ? undefined : '{}',
      })
      return { status: response.status, body: (await response.json().catch(() => null)) as unknown }
    },
    { method, path },
  )
}

type OrderListBody = { total: number; counts: Record<'all' | 'pending' | 'confirmed' | 'rejected', number> }

/** Contagem de pedidos da Ana por estado (`GET /orders`). Fixture: 12 (10 confirmados, 1 recusado, 1 pendente). */
export async function orderCounts(page: Page) {
  const { status, body } = await apiRequest(page, 'GET', '/orders')
  expect(status).toBe(200)
  return (body as OrderListBody).counts
}
