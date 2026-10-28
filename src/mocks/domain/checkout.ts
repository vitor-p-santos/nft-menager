import type { WalletSnapshot } from '@/entities/order'
import type { CreateOrderPayload, Quote, QuoteChange } from '@/features/checkout/schemas/checkout'
import { stableStringify } from '@/lib/hash'
import { percentOfWei } from '@/lib/money'
import { cartsTable, type CartOwner, type CartRow } from '../db/carts'
import { nftsTable } from '../db/catalog'
import { quotesTable, type QuoteRow } from '../db/orders'
import { loadTable, saveTable } from '../db/storage'
import { walletsTable } from '../db/wallets'
import { publishNftUpdated } from '../socket/events'
import { catalogChangesFor, toCart } from './cart'
import { findCoupon, isCouponExpired, priceLines } from './pricing'

/** Validade da cotação: depois disso `POST /orders` responde 409 `quote_expired`. */
const QUOTE_TTL_MS = 10 * 60_000

// ── Cotação ────────────────────────────────────────────────────────────────

/**
 * Revalida o carrinho do usuário contra o catálogo atual e grava os ajustes (preço aceito, quantidade
 * limitada ao estoque, itens esgotados e cupom expirado removidos). "Antes" = os preços que o usuário
 * aceitou (`unitPriceWei`) com as quantidades pedidas; "depois" = o carrinho ajustado.
 */
function revalidateCart(owner: CartOwner, clientVersion: number) {
  const stored = cartsTable.get(owner)
  const changes: QuoteChange[] = []
  const before = priceLines(
    stored.items.map((row) => ({
      priceWei: row.unitPriceWei,
      quantity: row.quantity,
      network: nftsTable.find(row.nftId)?.network ?? 'ethereum',
    })),
    stored.couponCode,
  )

  let dirty = false
  const items: CartRow[] = []
  for (const row of stored.items) {
    const rowChanges = catalogChangesFor(
      { itemId: row.id, nftId: row.nftId, edition: row.edition, quantity: row.quantity, priceWei: row.unitPriceWei },
      { stopWhenUnavailable: true },
    )
    changes.push(...rowChanges)
    if (rowChanges.some((c) => c.type === 'unavailable')) {
      dirty = true
      continue
    }
    let next = row
    for (const change of rowChanges) {
      if (change.type === 'quantity_reduced') next = { ...next, quantity: change.toQuantity }
      if (change.type === 'price_changed') next = { ...next, unitPriceWei: change.toWei }
    }
    if (next !== row) dirty = true
    items.push(next)
  }

  let couponCode = stored.couponCode
  if (couponCode) {
    const coupon = findCoupon(couponCode)
    if (!coupon || isCouponExpired(coupon)) {
      changes.push({ type: 'coupon_removed', code: couponCode, reason: 'expired' })
      couponCode = null
      dirty = true
    }
  }

  const saved = dirty ? cartsTable.save(owner, { ...stored, items, couponCode }) : stored
  const cart = toCart(saved)
  if (before.coupon?.eligible && cart.coupon && !cart.coupon.eligible) {
    changes.push({ type: 'coupon_ineligible', code: cart.coupon.code, minSubtotalWei: cart.coupon.minSubtotalWei ?? '0' })
  }
  if (stableStringify(before.totals) !== stableStringify(cart.totals)) {
    changes.push({ type: 'totals_changed', from: before.totals, to: cart.totals })
  }
  if (clientVersion !== stored.version) {
    changes.unshift({ type: 'cart_updated', fromVersion: clientVersion, toVersion: saved.version })
  }
  return { stored: saved, cart, changes }
}

/**
 * Revalida preço, disponibilidade, cupom e taxa do carrinho do usuário e grava a cotação (com o diff
 * em `changes`). Sem nenhum item comprável a cotação não é criada (`cart_empty`).
 */
export function createQuote(
  userId: string,
  cartVersion: number,
): { ok: true; quote: Quote } | { ok: false; reason: 'cart_empty'; changes: QuoteChange[] } {
  const { stored, cart, changes } = revalidateCart({ userId }, cartVersion)
  const items = cart.items.filter((i) => i.quantity > 0)
  if (items.length === 0) return { ok: false, reason: 'cart_empty', changes }
  const quote = {
    id: `quote_${crypto.randomUUID()}`,
    cartVersion: cart.version,
    items,
    coupon: cart.coupon,
    totals: cart.totals,
    changes,
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  }
  quotesTable.save({ ...quote, userId, cartId: stored.id, orderId: null })
  return { ok: true, quote }
}

/**
 * Cenário `conflict` do checkout: outro comprador "muda o preço" (+5%) do primeiro item enquanto a
 * compra acontece. Acontece uma vez por carrinho e por endpoint, para a nova cotação conseguir seguir.
 */
export function simulateConcurrentPriceChange(tag: string, cartId: string, nftId: string | undefined) {
  if (!nftId) return
  const done = loadTable<Record<string, true>>('scenario-price-bumps', () => ({}))
  const flag = `${tag}:${cartId}`
  if (done[flag]) return
  const nfts = nftsTable.all()
  const nft = nfts.find((n) => n.id === nftId)
  if (!nft) return
  const price = BigInt(nft.priceWei)
  nft.priceWei = (price + percentOfWei(price, 500)).toString()
  nft.version += 1
  nftsTable.save(nfts)
  done[flag] = true
  saveTable('scenario-price-bumps', done)
  publishNftUpdated(nft, { priceWei: nft.priceWei })
}

/** Usa o carrinho atual para o cenário `conflict` da cotação (ainda não existe cotação). */
export function simulateConcurrentPriceChangeForCart(tag: string, userId: string) {
  const current = cartsTable.get({ userId })
  simulateConcurrentPriceChange(tag, current.id, current.items[0]?.nftId)
}

// ── Validações da criação do pedido (sem efeitos) ───────────────────────────

/** Por que a cotação não pode virar pedido: inexistente/de outro usuário, já usada ou vencida. */
export function quoteProblem(quote: QuoteRow | undefined, userId: string): 'invalid' | 'used' | 'expired' | null {
  if (!quote || quote.userId !== userId) return 'invalid'
  if (quote.orderId) return 'used'
  if (Date.parse(quote.expiresAt) <= Date.now()) return 'expired'
  return null
}

type FieldIssue = { path: string[]; message: string }

/**
 * Carteira do pedido: a salva (`walletId`, conferindo rede e endereço) ou a informada no formulário.
 * Divergência → `issue` com o campo para o 422.
 */
export function resolveOrderWallet(userId: string, payload: CreateOrderPayload): { wallet: WalletSnapshot } | { issue: FieldIssue } {
  const { collector } = payload
  if (payload.walletId) {
    const saved = walletsTable.findForUser(userId, payload.walletId)
    if (!saved) return { issue: { path: ['walletId'], message: 'Carteira não encontrada' } }
    if (saved.network !== payload.network) {
      return { issue: { path: ['network'], message: 'A rede do pedido deve ser a rede da carteira' } }
    }
    if (saved.address.toLowerCase() !== collector.walletAddress.toLowerCase()) {
      return { issue: { path: ['collector', 'walletAddress'], message: 'O endereço difere da carteira selecionada' } }
    }
    const { id, label, network, address, ensName } = saved
    return { wallet: { walletId: id, label, provider: collector.walletProvider, network, address, ensName } }
  }
  return {
    wallet: {
      walletId: null,
      label: null,
      provider: collector.walletProvider,
      network: payload.network,
      address: collector.walletAddress,
      ensName: collector.ensName,
    },
  }
}

export type QuoteConflict = {
  code: 'cart_version_mismatch' | 'price_changed' | 'out_of_stock'
  changes: QuoteChange[]
}

/**
 * Compara a cotação com o estado atual: carrinho alterado desde a revisão, preço diferente do cotado
 * (`currentPriceWei` da cotação) ou estoque menor. Não grava nada (o carrinho não é ajustado aqui).
 */
export function findQuoteConflict(quote: QuoteRow, userId: string): QuoteConflict | null {
  const cart = cartsTable.get({ userId })
  if (cart.version !== quote.cartVersion) {
    return {
      code: 'cart_version_mismatch',
      changes: [{ type: 'cart_updated', fromVersion: quote.cartVersion, toVersion: cart.version }],
    }
  }
  const changes = quote.items.flatMap((item) =>
    catalogChangesFor(
      {
        itemId: item.id,
        nftId: item.nftId,
        name: item.nft.name,
        edition: item.edition,
        quantity: item.quantity,
        priceWei: item.currentPriceWei,
      },
      { stopWhenUnavailable: false },
    ),
  )
  if (changes.some((c) => c.type === 'price_changed')) return { code: 'price_changed', changes }
  if (changes.length > 0) return { code: 'out_of_stock', changes }
  return null
}
