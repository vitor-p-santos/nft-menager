import type { Order, Receipt } from '@/entities/order'
import type { Quote } from '@/features/checkout/schemas/checkout'
import { seedOrders } from '../fixtures/orders'
import { loadTable, saveTable } from './storage'

/** Cotação guardada no servidor: o `POST /orders` compara o carrinho atual com ela. */
export type QuoteRow = Quote & {
  userId: string
  cartId: string
  /** Pedido que consumiu a cotação (uma cotação gera no máximo um pedido). */
  orderId: string | null
}

/** Pedido + dados internos que não saem na API. */
export type OrderRow = Order & {
  userId: string
  /** Impressão do corpo da requisição: mesma chave com corpo diferente → 422 `idempotency_key_reused`. */
  requestHash: string
  /** Quando o pagamento simulado conclui (a leitura conclui de forma preguiçosa se o timer se perdeu num refresh). */
  settleAt: string
  outcome: 'confirm' | 'reject' | 'hold'
}

const QUOTES = 'quotes'
/** O pedido como sai na API (sem os campos internos). */
export function toPublicOrder(row: OrderRow): Order {
  const { userId: _userId, requestHash: _hash, settleAt: _settleAt, outcome: _outcome, ...order } = row
  return order
}

const ORDERS = 'orders'
const RECEIPTS = 'receipts'

const quotes = () => loadTable<Record<string, QuoteRow>>(QUOTES, () => ({}))
const orders = () =>
  loadTable<Record<string, OrderRow>>(ORDERS, () => Object.fromEntries(seedOrders().map((row) => [row.id, row])))
/** Recibos das fixtures: um por pedido confirmado, emitido na conclusão do pagamento. */
const receipts = () =>
  loadTable<Record<string, Receipt>>(RECEIPTS, () =>
    Object.fromEntries(
      seedOrders()
        .filter((row) => row.status === 'confirmed')
        .map((row) => [row.id, { orderId: row.id, issuedAt: row.updatedAt, snapshot: toPublicOrder(row) }]),
    ),
  )

export const quotesTable = {
  find: (id: string): QuoteRow | undefined => quotes()[id],
  save(row: QuoteRow) {
    const now = Date.now()
    // Descarta cotações vencidas e não usadas para o storage não crescer sem limite.
    const kept = Object.fromEntries(
      Object.entries(quotes()).filter(([, q]) => q.orderId !== null || Date.parse(q.expiresAt) > now),
    )
    kept[row.id] = row
    saveTable(QUOTES, kept)
  },
}

export const ordersTable = {
  find: (id: string): OrderRow | undefined => orders()[id],
  findByKey: (userId: string, key: string): OrderRow | undefined =>
    Object.values(orders()).find((o) => o.userId === userId && o.idempotencyKey === key),
  listByUser: (userId: string): OrderRow[] =>
    Object.values(orders())
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  listPending: (): OrderRow[] => Object.values(orders()).filter((o) => o.status === 'pending'),
  save(row: OrderRow) {
    const all = orders()
    all[row.id] = row
    saveTable(ORDERS, all)
  },
}

/**
 * Recibos imutáveis. A tabela só tem leitura e `insertOnce`: não existe update nem delete, e nenhum
 * handler grava aqui fora da confirmação do pagamento. O `snapshot` é uma cópia do pedido no momento da
 * confirmação (preços pagos, carteira, totais) e não é recalculado a partir do catálogo.
 */
export const receiptsTable = {
  find: (orderId: string): Receipt | undefined => receipts()[orderId],
  /** Grava uma única vez: um recibo existente nunca é sobrescrito. */
  insertOnce(receipt: Receipt): Receipt {
    const all = receipts()
    const existing = all[receipt.orderId]
    if (existing) return existing
    all[receipt.orderId] = receipt
    saveTable(RECEIPTS, all)
    return receipt
  },
}
