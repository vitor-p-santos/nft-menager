import type { OrderItem, WalletSnapshot } from '@/entities/order'
import type { CreateOrderPayload } from '@/features/checkout/schemas/checkout'
import { ordersTable, quotesTable, type OrderRow, type QuoteRow } from '../db/orders'
import { paymentDelayMs, paymentOutcome, scheduleSettlement, settleIfDue } from './payment'

/** Pedido do usuário (concluindo o pagamento se a hora já passou), ou `undefined` se não é dele. */
export function findOwnOrder(userId: string, id: string): OrderRow | undefined {
  const row = ordersTable.find(id)
  return row && row.userId === userId ? settleIfDue(row) : undefined
}

/** Pedido criado com a chave de idempotência (concluindo o pagamento se a hora já passou). */
export function findOrderByKey(userId: string, idempotencyKey: string): OrderRow | undefined {
  const row = ordersTable.findByKey(userId, idempotencyKey)
  return row ? settleIfDue(row) : undefined
}

/**
 * Idempotência do `POST /orders`: sem pedido para a chave → `none`; mesma chave com outro corpo →
 * `key_reused` (o pedido não é tocado); mesmo corpo → `replay` com o pedido existente.
 */
export function replayOrder(
  userId: string,
  idempotencyKey: string,
  requestHash: string,
): { kind: 'none' } | { kind: 'key_reused' } | { kind: 'replay'; order: OrderRow } {
  const existing = ordersTable.findByKey(userId, idempotencyKey)
  if (!existing) return { kind: 'none' }
  if (existing.requestHash !== requestHash) return { kind: 'key_reused' }
  return { kind: 'replay', order: settleIfDue(existing) }
}

/** Todos os pedidos do usuário, já com os pagamentos vencidos concluídos. */
export function listUserOrders(userId: string): OrderRow[] {
  return ordersTable.listByUser(userId).map(settleIfDue)
}

/**
 * Cria o pedido `pending` a partir da cotação (já validada), consome a cotação e agenda o pagamento
 * simulado. Síncrono: entre a busca pela chave de idempotência e o `save` não há `await`.
 */
export function placeOrder(input: {
  userId: string
  idempotencyKey: string
  requestHash: string
  quote: QuoteRow
  payload: CreateOrderPayload
  wallet: WalletSnapshot
}): OrderRow {
  const { userId, idempotencyKey, requestHash, quote, payload, wallet } = input
  const { collector } = payload
  const now = new Date().toISOString()
  const delayMs = paymentDelayMs()
  const items: OrderItem[] = quote.items.map((i) => ({
    id: i.id,
    nftId: i.nftId,
    edition: i.edition,
    quantity: i.quantity,
    unitPriceWei: i.currentPriceWei,
    lineTotalWei: i.lineTotalWei,
    nft: i.nft,
  }))
  const row: OrderRow = {
    id: `ord_${crypto.randomUUID()}`,
    idempotencyKey,
    quoteId: quote.id,
    status: 'pending',
    items,
    coupon:
      quote.coupon?.eligible && BigInt(quote.totals.discountWei) > 0n
        ? { code: quote.coupon.code, discountWei: quote.totals.discountWei }
        : null,
    totals: quote.totals,
    wallet,
    network: payload.network,
    collector: {
      displayName: collector.displayName,
      username: collector.username,
      profileName: collector.profileName,
      email: collector.email,
      ensName: collector.ensName,
      secondaryWallet: collector.secondaryWallet,
      referralCode: collector.referralCode,
      note: collector.note,
    },
    txHash: null,
    rejectionCode: null,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
    userId,
    requestHash,
    settleAt: new Date(Date.now() + delayMs).toISOString(),
    outcome: paymentOutcome(),
  }
  ordersTable.save(row)
  quotesTable.save({ ...quote, orderId: row.id })
  scheduleSettlement(row.id, delayMs)
  return row
}
