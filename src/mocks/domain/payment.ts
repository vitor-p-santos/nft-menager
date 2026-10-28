import type { Nft } from '@/entities/nft'
import { cartsTable, type CartOwner } from '../db/carts'
import { nftsTable } from '../db/catalog'
import { ordersTable, receiptsTable, toPublicOrder, type OrderRow } from '../db/orders'
import { getScenarioValue } from '../scenarios'
import { publishNftUpdated, publishOrderUpdated } from '../socket/events'
import { availableOf } from './pricing'

/**
 * Pagamento simulado: cada pedido nasce `pending` com `settleAt` e `outcome`; um timer (ou a próxima
 * leitura, se o timer se perdeu num refresh) conclui em `confirmed` ou `rejected`.
 */

const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')

/** Duração do pagamento simulado: `payment.delay` (ms) ou 1,5–4 s. */
export function paymentDelayMs(): number {
  const raw = Number(getScenarioValue('payment.delay'))
  return Number.isFinite(raw) && raw >= 0 ? raw : 1_500 + Math.floor(Math.random() * 2_500)
}

/** `payment.outcome` = `confirm` (padrão) | `reject` | `hold` (fica `pending`, para testar recuperação). */
export function paymentOutcome(): OrderRow['outcome'] {
  const value = getScenarioValue('payment.outcome')
  return value === 'reject' || value === 'hold' ? value : 'confirm'
}

/** Grava a transição (`version` + 1) e avisa o dono do pedido por `order.updated`. */
function finish(row: OrderRow, patch: Partial<OrderRow>): OrderRow {
  const next: OrderRow = { ...row, ...patch, version: row.version + 1, updatedAt: new Date().toISOString() }
  ordersTable.save(next)
  publishOrderUpdated(next)
  return next
}

/**
 * Conclui o pagamento. Confirmação: revalida e baixa o estoque, gera o `txHash`, grava o recibo
 * imutável e tira os itens comprados do carrinho. Recusa (ou estoque insuficiente): carrinho intacto.
 */
function settle(row: OrderRow): OrderRow {
  if (row.status !== 'pending' || row.outcome === 'hold') return row
  if (row.outcome === 'reject') {
    return finish(row, {
      status: 'rejected',
      rejectionCode: 'payment_declined',
      rejectionReason: 'O pagamento foi recusado pela carteira. Seus itens continuam no carrinho.',
    })
  }

  const nfts = nftsTable.all()
  const byId = new Map(nfts.map((n) => [n.id, n]))
  const short = row.items.some((item) => availableOf(byId.get(item.nftId), item.edition) < item.quantity)
  if (short) {
    return finish(row, {
      status: 'rejected',
      rejectionCode: 'out_of_stock',
      rejectionReason: 'Uma das edições esgotou antes da confirmação. Seus itens continuam no carrinho.',
    })
  }
  const touched = new Set<Nft>()
  for (const item of row.items) {
    const nft = byId.get(item.nftId)
    const edition = nft?.editions.find((e) => e.edition === item.edition)
    if (!nft || !edition) continue
    edition.available -= item.quantity
    touched.add(nft)
  }
  for (const nft of touched) nft.version += 1
  nftsTable.save(nfts)

  const owner: CartOwner = { userId: row.userId }
  const cart = cartsTable.get(owner)
  // Tira do carrinho só o que foi comprado: se a quantidade aumentou enquanto o pedido estava
  // pendente, o excedente fica; o cupom só sai se for o usado no pedido (outro aplicado depois fica)
  const bought = new Map(row.items.map((i) => [i.id, i.quantity]))
  const items = cart.items.flatMap((item) => {
    const quantity = item.quantity - (bought.get(item.id) ?? 0)
    if (quantity === item.quantity) return [item]
    return quantity > 0 ? [{ ...item, quantity }] : []
  })
  const couponCode = row.coupon && cart.couponCode === row.coupon.code ? null : cart.couponCode
  const changed = items.length !== cart.items.length || items.some((item, i) => item !== cart.items[i])
  if (changed || couponCode !== cart.couponCode) cartsTable.save(owner, { ...cart, items, couponCode })

  // Eventos só depois de tudo gravado (estoque, carrinho e recibo): quem reage refaz a busca e já encontra
  // o estado final.
  const updatedAt = new Date().toISOString()
  const confirmed: OrderRow = { ...row, status: 'confirmed', txHash: `0x${randomHex(32)}`, version: row.version + 1, updatedAt }
  receiptsTable.insertOnce({ orderId: confirmed.id, issuedAt: updatedAt, snapshot: toPublicOrder(confirmed) })
  ordersTable.save(confirmed)
  for (const nft of touched) publishNftUpdated(nft, { editions: nft.editions })
  publishOrderUpdated(confirmed)
  return confirmed
}

/** Conclui o pagamento se a hora já passou (o timer se perde num refresh; a leitura conclui). */
export function settleIfDue(row: OrderRow): OrderRow {
  return row.status === 'pending' && Date.now() >= Date.parse(row.settleAt) ? settle(row) : row
}

/** Timer do pagamento simulado. Na conclusão, `finish` emite `order.updated` (e `nft.updated` do estoque). */
export function scheduleSettlement(orderId: string, ms: number) {
  setTimeout(() => {
    const row = ordersTable.find(orderId)
    if (row) settleIfDue(row)
  }, Math.max(0, ms) + 20)
}

/**
 * Reagenda os pagamentos pendentes ao subir o mock (o timer se perde num refresh). Sem isso, com o
 * socket conectado e sem polling, ninguém leria o pedido e ele ficaria `pending` até a próxima leitura.
 */
export function resumePendingSettlements() {
  const now = Date.now()
  for (const row of ordersTable.listPending()) {
    if (row.outcome !== 'hold') scheduleSettlement(row.id, Date.parse(row.settleAt) - now)
  }
}

/**
 * Conclui agora um pedido `pending` (inclusive `hold`) com o desfecho pedido; usado por
 * `window.__mockRealtime.emitOrderUpdate`. Devolve o pedido atualizado, ou `null` se não estava pendente.
 */
export function forceSettlement(orderId: string, status: 'confirmed' | 'rejected'): OrderRow | null {
  const row = ordersTable.find(orderId)
  if (!row || row.status !== 'pending') return null
  const next = settle({ ...row, outcome: status === 'confirmed' ? 'confirm' : 'reject' })
  return next.status === 'pending' ? null : next
}
