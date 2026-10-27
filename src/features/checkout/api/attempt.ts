import { z } from 'zod'
import { hashString, stableStringify } from '@/lib/hash'
import type { CreateOrderPayload } from '../schemas/checkout'

/**
 * Tentativa de compra persistida (T-073). A `Idempotency-Key` é gerada uma vez por tentativa e salva
 * **antes** do `POST /orders`, por usuário (`kurio:checkout-attempt:<userId>`), em localStorage:
 * sobrevive a timeout, refresh e fechamento da aba. Só guarda a chave, a impressão do payload e o id
 * do pedido (nada dos dados do colecionador).
 *
 * Ciclo de vida:
 * - mesmo payload → mesma chave (duplo clique, retry, reenvio após refresh);
 * - resposta 4xx definitiva (409, 422, 401…) → nenhum pedido foi criado → descarta;
 * - timeout / rede / 5xx → resultado desconhecido → mantém e tenta recuperar por `GET /orders/by-key/:key`;
 * - pedido concluído (`confirmed`/`rejected`) observado pelo client → descarta (`useCheckoutOrder`).
 */
const PREFIX = 'kurio:checkout-attempt:'

export const checkoutAttemptSchema = z.object({
  key: z.string().min(8),
  fingerprint: z.string(),
  quoteId: z.string(),
  orderId: z.string().nullable(),
  createdAt: z.number().int().nonnegative(),
})
export type CheckoutAttempt = z.infer<typeof checkoutAttemptSchema>

/** Sem storage (modo privado), a tentativa vale só para a aba atual. */
const memory = new Map<string, CheckoutAttempt>()

export function payloadFingerprint(payload: CreateOrderPayload): string {
  return hashString(stableStringify(payload))
}

export function readCheckoutAttempt(userId: string): CheckoutAttempt | null {
  try {
    const raw = localStorage.getItem(PREFIX + userId)
    if (raw) {
      const parsed = checkoutAttemptSchema.safeParse(JSON.parse(raw))
      if (parsed.success) return parsed.data
    }
  } catch {
    // storage indisponível ou corrompido
  }
  return memory.get(userId) ?? null
}

export function saveCheckoutAttempt(userId: string, attempt: CheckoutAttempt): CheckoutAttempt {
  memory.set(userId, attempt)
  try {
    localStorage.setItem(PREFIX + userId, JSON.stringify(attempt))
  } catch {
    // fica só em memória
  }
  return attempt
}

/** Descarta a tentativa do usuário (opcionalmente só se for a da chave informada). */
export function clearCheckoutAttempt(userId: string, key?: string) {
  const current = readCheckoutAttempt(userId)
  if (key && current && current.key !== key) return
  memory.delete(userId)
  try {
    localStorage.removeItem(PREFIX + userId)
  } catch {
    // ignora
  }
}
