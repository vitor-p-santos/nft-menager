/**
 * Identificador do carrinho anônimo (`X-Cart-Id`), gerado no client e persistido
 * em localStorage. Sem storage (modo privado/bloqueado), vale só para a aba atual.
 */
const STORAGE_KEY = 'kurio:cart-id'
let memoryId: string | null = null

export function getCartId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return stored
  } catch {
    // storage indisponível → usa o id em memória
  }
  memoryId ??= crypto.randomUUID()
  try {
    localStorage.setItem(STORAGE_KEY, memoryId)
  } catch {
    // ignora
  }
  return memoryId
}

/** Descarta o id atual (após o merge no login); o próximo `getCartId` gera outro. */
export function resetCartId() {
  memoryId = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignora
  }
}
