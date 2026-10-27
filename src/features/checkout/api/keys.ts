/** Query keys do checkout (privadas: saem do cache na troca de conta). */
export const checkoutKeys = {
  all: ['checkout'] as const,
  /** Última cotação recebida (gravada pelo `useRequestQuote`). */
  quote: () => [...checkoutKeys.all, 'quote'] as const,
  /** Tentativa de compra salva + pedido recuperado por `Idempotency-Key` (T-073). */
  recovery: (userId: string) => [...checkoutKeys.all, 'recovery', userId] as const,
}
