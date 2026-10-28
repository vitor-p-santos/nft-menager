import type { Page } from '@playwright/test'
import { expect } from './app'

/**
 * Subconjunto de `window.__mockRealtime` (src/mocks/socket/dev-tools.ts) usado pelos testes. O projeto
 * de testes não enxerga os tipos de `src/`, então o contrato fica repetido aqui.
 */
type MockEvent = { name: string; payload: Record<string, unknown> }

type MockRealtime = {
  stats: () => { connections: number; authenticated: number; down: boolean }
  events: () => readonly MockEvent[]
  emit: (name: string, payload: Record<string, unknown>, options?: { userId?: string }) => unknown
  emitNftUpdate: (nftId: string, changes: { priceWei?: string }) => unknown
  emitOrderUpdate: (orderId: string, status: 'confirmed' | 'rejected') => unknown
  emitDuplicate: () => unknown
  emitStale: (entityId?: string, overrides?: Record<string, unknown>) => unknown
  dropConnection: (options?: { downMs?: number }) => void
}

declare global {
  interface Window {
    __mockRealtime?: MockRealtime
  }
}

/** Valor em ETH (até 3 casas) → wei em string, como a API espera. */
export const toWei = (eth: string) => (BigInt(Math.round(Number(eth) * 1000)) * 10n ** 15n).toString()

/** Espera o socket conectar (com sessão: autenticado) antes de emitir eventos. */
export async function waitForSocket(page: Page, { authenticated = false } = {}) {
  await expect
    .poll(() => page.evaluate(() => window.__mockRealtime?.stats() ?? null), { timeout: 15_000 })
    .toMatchObject(authenticated ? { authenticated: 1, down: false } : { connections: 1, down: false })
}
