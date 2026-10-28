import { useSyncExternalStore } from 'react'
import { api, getCartId, resetCartId } from '@/lib/api'
import { cartSchema, type Cart } from './schema'

/**
 * Junção do carrinho do visitante com o da conta (no login e no "Tentar novamente" do carrinho).
 * Se a junção falha, o id anônimo é mantido e a marca "junção pendente" avisa a tela do carrinho e
 * impede o logout de descartar o carrinho do visitante (antes os itens sumiam sem aviso).
 * Acesso ao storage sempre em try/catch: sem storage, a marca vale só para a aba atual.
 */
const STORAGE_KEY = 'kurio:cart-merge-pending'
let memoryPending = false
const listeners = new Set<() => void>()

export function isCartMergePending(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1' || memoryPending
  } catch {
    return memoryPending
  }
}

function setCartMergePending(pending: boolean) {
  memoryPending = pending
  try {
    if (pending) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // fica só em memória
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useCartMergePending(): boolean {
  return useSyncExternalStore(subscribe, isCartMergePending, () => false)
}

/**
 * `POST /cart/merge` com o carrinho anônimo atual. `token` explícito no login (a sessão ainda não foi
 * trocada); sem ele vale o da sessão. Devolve o carrinho mesclado, ou `null` se falhar.
 */
export async function mergeAnonymousCart(token?: string): Promise<Cart | null> {
  try {
    const cart = await api.post(
      '/cart/merge',
      { anonymousCartId: getCartId() },
      cartSchema,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
    resetCartId()
    setCartMergePending(false)
    return cart
  } catch {
    setCartMergePending(true)
    return null
  }
}
