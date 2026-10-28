import { http, HttpResponse } from 'msw'
import type { Nft } from '@/entities/nft'
import {
  isTerminalStatus,
  ORDER_STATUSES,
  ORDERS_PAGE_SIZE,
  orderStatusSchema,
  type OrderItem,
  type OrderStatus,
  type WalletSnapshot,
} from '@/entities/order'
import {
  createOrderInputSchema,
  quoteRequestSchema,
  type QuoteChange,
} from '@/features/checkout/schemas/checkout'
import { API_BASE_URL } from '@/lib/api'
import { percentOfWei } from '@/lib/money'
import { cartsTable, type CartOwner, type CartRow } from '../db/carts'
import { nftsTable } from '../db/catalog'
import { ordersTable, quotesTable, receiptsTable, toPublicOrder, type OrderRow } from '../db/orders'
import { authenticate } from '../db/session'
import { loadTable, saveTable } from '../db/storage'
import { walletsTable } from '../db/wallets'
import { getScenario, getScenarioValue, withScenario } from '../scenarios'
import { publishNftUpdated, publishOrderUpdated } from '../socket/events'
import { availableOf, findCoupon, isExpired, priceLines, toCart } from './cart'
import { apiError, hashString, readJson, stableStringify, validationError } from './http-utils'

/** Validade da cotação: depois disso `POST /orders` responde 409 `quote_expired`. */
const QUOTE_TTL_MS = 10 * 60_000
/** Chave de idempotência aceita (UUID v4 do client, ou qualquer token URL-safe de 8–128). */
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,128}$/

// ── Revalidação do carrinho ─────────────────────────────────────────────────

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
    const nft = nftsTable.find(row.nftId)
    const base = { itemId: row.id, nftId: row.nftId, name: nft?.name ?? row.nftId, edition: row.edition }
    const available = availableOf(nft, row.edition)
    if (!nft || available === 0) {
      changes.push({ type: 'unavailable', ...base, fromQuantity: row.quantity })
      dirty = true
      continue
    }
    let next = row
    if (row.quantity > available) {
      changes.push({ type: 'quantity_reduced', ...base, fromQuantity: row.quantity, toQuantity: available })
      next = { ...next, quantity: available }
    }
    if (nft.priceWei !== row.unitPriceWei) {
      changes.push({ type: 'price_changed', ...base, fromWei: row.unitPriceWei, toWei: nft.priceWei })
      next = { ...next, unitPriceWei: nft.priceWei }
    }
    if (next !== row) dirty = true
    items.push(next)
  }

  let couponCode = stored.couponCode
  if (couponCode) {
    const coupon = findCoupon(couponCode)
    if (!coupon || isExpired(coupon)) {
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
 * Cenário `conflict` do checkout: outro comprador "muda o preço" (+5%) do primeiro item enquanto a
 * compra acontece. Acontece uma vez por carrinho e por endpoint, para a nova cotação conseguir seguir.
 */
function simulateConcurrentPriceChange(tag: string, cartId: string, nftId: string | undefined) {
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

// ── Pedidos ────────────────────────────────────────────────────────────────

const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')

/** Duração do pagamento simulado: `payment.delay` (ms) ou 1,5–4 s. */
function paymentDelayMs(): number {
  const raw = Number(getScenarioValue('payment.delay'))
  return Number.isFinite(raw) && raw >= 0 ? raw : 1_500 + Math.floor(Math.random() * 2_500)
}

/** `payment.outcome` = `confirm` (padrão) | `reject` | `hold` (fica `pending`, para testar recuperação). */
function paymentOutcome(): OrderRow['outcome'] {
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
  const purchased = new Set(row.items.map((i) => i.id))
  const items = cart.items.filter((i) => !purchased.has(i.id))
  if (items.length !== cart.items.length || (row.coupon && cart.couponCode)) {
    cartsTable.save(owner, { ...cart, items, couponCode: row.coupon ? null : cart.couponCode })
  }

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
function settleIfDue(row: OrderRow): OrderRow {
  return row.status === 'pending' && Date.now() >= Date.parse(row.settleAt) ? settle(row) : row
}

/** Timer do pagamento simulado. Na conclusão, `finish` emite `order.updated` (e `nft.updated` do estoque). */
function scheduleSettlement(orderId: string, ms: number) {
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

function findOwnOrder(userId: string, id: string): OrderRow | undefined {
  const row = ordersTable.find(id)
  return row && row.userId === userId ? settleIfDue(row) : undefined
}

const orderNotFound = () => apiError(404, 'not_found', 'Pedido não encontrado')

export const checkoutHandlers = [
  /** Revalida preço, disponibilidade, cupom e taxa; devolve a cotação com o diff (`changes`). */
  http.post(
    `${API_BASE_URL}/checkout/quote`,
    withScenario(
      'checkout.quote',
      async ({ request }) => {
        const auth = authenticate(request)
        if (auth.error) return auth.error
        const parsed = quoteRequestSchema.safeParse(await readJson(request))
        if (!parsed.success) return validationError(parsed.error.issues)
        const owner: CartOwner = { userId: auth.user.id }
        if (getScenario('checkout.quote') === 'conflict') {
          const current = cartsTable.get(owner)
          simulateConcurrentPriceChange('checkout.quote', current.id, current.items[0]?.nftId)
        }
        const { stored, cart, changes } = revalidateCart(owner, parsed.data.cartVersion)
        const items = cart.items.filter((i) => i.quantity > 0)
        if (items.length === 0) {
          return apiError(422, 'cart_empty', 'Seu carrinho está vazio ou os itens esgotaram', { changes })
        }
        const quote = {
          id: `quote_${crypto.randomUUID()}`,
          cartVersion: cart.version,
          items,
          coupon: cart.coupon,
          totals: cart.totals,
          changes,
          expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
        }
        quotesTable.save({ ...quote, userId: auth.user.id, cartId: stored.id, orderId: null })
        return HttpResponse.json(quote)
      },
      { handlesConflict: true },
    ),
  ),

  /**
   * Cria o pedido `pending` (201). Mesma `Idempotency-Key` + mesmo corpo → 200 com o pedido existente;
   * corpo diferente → 422 `idempotency_key_reused`. 409 se a cotação mudou/expirou.
   */
  http.post(
    `${API_BASE_URL}/orders`,
    withScenario(
      'checkout.create',
      async ({ request }) => {
        const auth = authenticate(request)
        if (auth.error) return auth.error
        const userId = auth.user.id
        const key = request.headers.get('Idempotency-Key')?.trim()
        if (!key || !IDEMPOTENCY_KEY.test(key)) {
          return apiError(400, 'validation_error', 'Cabeçalho Idempotency-Key ausente ou inválido', {
            field: 'Idempotency-Key',
          })
        }
        const parsed = createOrderInputSchema.safeParse(await readJson(request))
        if (!parsed.success) return validationError(parsed.error.issues)
        const payload = parsed.data
        const requestHash = hashString(stableStringify(payload))

        // Daqui até o `save` não há `await`: dois envios simultâneos com a mesma chave não criam dois pedidos.
        const existing = ordersTable.findByKey(userId, key)
        if (existing) {
          if (existing.requestHash !== requestHash) {
            return apiError(422, 'idempotency_key_reused', 'Esta chave de idempotência já foi usada com outros dados')
          }
          return HttpResponse.json(toPublicOrder(settleIfDue(existing)), { status: 200 })
        }

        const quote = quotesTable.find(payload.quoteId)
        if (!quote || quote.userId !== userId) {
          return validationError([{ path: ['quoteId'], message: 'Cotação inválida' }])
        }
        if (quote.orderId) return apiError(409, 'quote_expired', 'Esta cotação já foi usada. Revise a compra novamente.')
        if (Date.parse(quote.expiresAt) <= Date.now()) {
          return apiError(409, 'quote_expired', 'A cotação expirou. Revise a compra novamente.')
        }

        let wallet: WalletSnapshot
        const { collector } = payload
        if (payload.walletId) {
          const saved = walletsTable.findForUser(userId, payload.walletId)
          if (!saved) return validationError([{ path: ['walletId'], message: 'Carteira não encontrada' }])
          if (saved.network !== payload.network) {
            return validationError([{ path: ['network'], message: 'A rede do pedido deve ser a rede da carteira' }])
          }
          if (saved.address.toLowerCase() !== collector.walletAddress.toLowerCase()) {
            return validationError([
              { path: ['collector', 'walletAddress'], message: 'O endereço difere da carteira selecionada' },
            ])
          }
          const { id, label, network, address, ensName } = saved
          wallet = { walletId: id, label, provider: collector.walletProvider, network, address, ensName }
        } else {
          wallet = {
            walletId: null,
            label: null,
            provider: collector.walletProvider,
            network: payload.network,
            address: collector.walletAddress,
            ensName: collector.ensName,
          }
        }

        if (getScenario('checkout.create') === 'conflict') {
          simulateConcurrentPriceChange('checkout.create', quote.cartId, quote.items[0]?.nftId)
        }

        const cart = cartsTable.get({ userId })
        if (cart.version !== quote.cartVersion) {
          return apiError(409, 'cart_version_mismatch', 'O carrinho mudou desde a revisão. Revise a compra novamente.', {
            changes: [{ type: 'cart_updated', fromVersion: quote.cartVersion, toVersion: cart.version }],
          })
        }
        const changes: QuoteChange[] = []
        for (const item of quote.items) {
          const nft = nftsTable.find(item.nftId)
          const base = { itemId: item.id, nftId: item.nftId, name: item.nft.name, edition: item.edition }
          const available = availableOf(nft, item.edition)
          if (available === 0) changes.push({ type: 'unavailable', ...base, fromQuantity: item.quantity })
          else if (available < item.quantity) {
            changes.push({ type: 'quantity_reduced', ...base, fromQuantity: item.quantity, toQuantity: available })
          }
          if (nft && nft.priceWei !== item.currentPriceWei) {
            changes.push({ type: 'price_changed', ...base, fromWei: item.currentPriceWei, toWei: nft.priceWei })
          }
        }
        if (changes.some((c) => c.type === 'price_changed')) {
          return apiError(409, 'price_changed', 'O preço de um item mudou. Revise a compra novamente.', { changes })
        }
        if (changes.length > 0) {
          return apiError(409, 'out_of_stock', 'Um item esgotou ou tem menos unidades. Revise a compra novamente.', {
            changes,
          })
        }

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
          idempotencyKey: key,
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
        return HttpResponse.json(toPublicOrder(row), { status: 201 })
      },
      // `timeout`: o pedido é criado e só a resposta se perde (recuperação por `GET /orders/by-key/:key`).
      { handlesConflict: true, timeoutAfterResolve: true },
    ),
  ),

  http.get(
    `${API_BASE_URL}/orders`,
    withScenario('orders.list', ({ request }) => {
      const auth = authenticate(request)
      if (auth.error) return auth.error
      const params = new URL(request.url).searchParams
      const status = orderStatusSchema.safeParse(params.get('status'))
      const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
      const filter: OrderStatus | null = status.success ? status.data : null
      const all = ordersTable.listByUser(auth.user.id).map(settleIfDue)
      const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>
      for (const order of all) counts[order.status] += 1
      const rows = filter === null ? all : all.filter((o) => o.status === filter)
      const items = rows.slice((page - 1) * ORDERS_PAGE_SIZE, page * ORDERS_PAGE_SIZE).map(toPublicOrder)
      return HttpResponse.json({
        items,
        total: rows.length,
        page,
        pageSize: ORDERS_PAGE_SIZE,
        totalPages: Math.ceil(rows.length / ORDERS_PAGE_SIZE),
        counts: { all: all.length, ...counts },
      })
    }),
  ),

  /** Recuperação após timeout/refresh: o pedido criado com a chave, ou 404 se ela nunca chegou. */
  http.get(
    `${API_BASE_URL}/orders/by-key/:idempotencyKey`,
    withScenario('orders.recover', ({ request, params }) => {
      const auth = authenticate(request)
      if (auth.error) return auth.error
      const row = ordersTable.findByKey(auth.user.id, String(params.idempotencyKey))
      if (!row) return apiError(404, 'not_found', 'Nenhum pedido com esta chave')
      return HttpResponse.json(toPublicOrder(settleIfDue(row)))
    }),
  ),

  http.get(
    `${API_BASE_URL}/orders/:id`,
    withScenario('orders.detail', ({ request, params }) => {
      const auth = authenticate(request)
      if (auth.error) return auth.error
      const row = findOwnOrder(auth.user.id, String(params.id))
      return row ? HttpResponse.json(toPublicOrder(row)) : orderNotFound()
    }),
  ),

  /** Recibo imutável: só existe depois de `confirmed` (404 antes ou se recusado). */
  http.get(
    `${API_BASE_URL}/orders/:id/receipt`,
    withScenario('orders.receipt', ({ request, params }) => {
      const auth = authenticate(request)
      if (auth.error) return auth.error
      const row = findOwnOrder(auth.user.id, String(params.id))
      if (!row) return orderNotFound()
      const receipt = isTerminalStatus(row.status) ? receiptsTable.find(row.id) : undefined
      return receipt ? HttpResponse.json(receipt) : apiError(404, 'not_found', 'O recibo só existe para pedidos confirmados')
    }),
  ),

  /** Pedido e recibo são somente leitura: nenhuma rota altera ou apaga um recibo (imutável). */
  ...(['post', 'put', 'patch', 'delete'] as const).flatMap((method) =>
    [`${API_BASE_URL}/orders/:id`, `${API_BASE_URL}/orders/:id/receipt`].map((path) =>
      http[method](path, () =>
        apiError(405, 'method_not_allowed', 'Pedidos e recibos não podem ser alterados', { allow: 'GET' }),
      ),
    ),
  ),
]
