import { http, HttpResponse } from 'msw'
import { isTerminalStatus, ORDER_STATUSES, ORDERS_PAGE_SIZE, orderStatusSchema, type OrderStatus } from '@/entities/order'
import { createOrderInputSchema, quoteRequestSchema } from '@/features/checkout/schemas/checkout'
import { API_BASE_URL } from '@/lib/api'
import { hashString, stableStringify } from '@/lib/hash'
import { quotesTable, receiptsTable, toPublicOrder } from '../db/orders'
import {
  createQuote,
  findQuoteConflict,
  quoteProblem,
  resolveOrderWallet,
  simulateConcurrentPriceChange,
  simulateConcurrentPriceChangeForCart,
} from '../domain/checkout'
import { findOrderByKey, findOwnOrder, listUserOrders, placeOrder, replayOrder } from '../domain/orders'
import { apiError, notFound, readJson, validationError } from '../http'
import { getScenario, withScenario } from '../scenarios'
import { withAuth } from '../with-auth'

/** Chave de idempotência aceita (UUID v4 do client, ou qualquer token URL-safe de 8–128). */
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,128}$/

const orderNotFound = () => notFound('Pedido não encontrado')

const QUOTE_PROBLEMS = {
  used: 'Esta cotação já foi usada. Revise a compra novamente.',
  expired: 'A cotação expirou. Revise a compra novamente.',
} as const

const CONFLICT_MESSAGES = {
  cart_version_mismatch: 'O carrinho mudou desde a revisão. Revise a compra novamente.',
  price_changed: 'O preço de um item mudou. Revise a compra novamente.',
  out_of_stock: 'Um item esgotou ou tem menos unidades. Revise a compra novamente.',
} as const

export const checkoutHandlers = [
  /** Revalida preço, disponibilidade, cupom e taxa; devolve a cotação com o diff (`changes`). */
  http.post(
    `${API_BASE_URL}/checkout/quote`,
    withScenario(
      'checkout.quote',
      withAuth(async ({ request }, { user }) => {
        const parsed = quoteRequestSchema.safeParse(await readJson(request))
        if (!parsed.success) return validationError(parsed.error.issues)
        if (getScenario('checkout.quote') === 'conflict') simulateConcurrentPriceChangeForCart('checkout.quote', user.id)
        const result = createQuote(user.id, parsed.data.cartVersion)
        if (!result.ok) {
          return apiError(422, 'cart_empty', 'Seu carrinho está vazio ou os itens esgotaram', { changes: result.changes })
        }
        return HttpResponse.json(result.quote)
      }),
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
      withAuth(async ({ request }, { user }) => {
        const userId = user.id
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

        // Daqui até o `placeOrder` não há `await`: dois envios simultâneos com a mesma chave não criam dois pedidos.
        const replay = replayOrder(userId, key, requestHash)
        if (replay.kind === 'key_reused') {
          return apiError(422, 'idempotency_key_reused', 'Esta chave de idempotência já foi usada com outros dados')
        }
        if (replay.kind === 'replay') return HttpResponse.json(toPublicOrder(replay.order), { status: 200 })

        const quote = quotesTable.find(payload.quoteId)
        const problem = quoteProblem(quote, userId)
        if (problem === 'invalid' || !quote) return validationError([{ path: ['quoteId'], message: 'Cotação inválida' }])
        if (problem) return apiError(409, 'quote_expired', QUOTE_PROBLEMS[problem])

        const resolved = resolveOrderWallet(userId, payload)
        if ('issue' in resolved) return validationError([resolved.issue])

        if (getScenario('checkout.create') === 'conflict') {
          simulateConcurrentPriceChange('checkout.create', quote.cartId, quote.items[0]?.nftId)
        }

        const conflict = findQuoteConflict(quote, userId)
        if (conflict) return apiError(409, conflict.code, CONFLICT_MESSAGES[conflict.code], { changes: conflict.changes })

        const row = placeOrder({ userId, idempotencyKey: key, requestHash, quote, payload, wallet: resolved.wallet })
        return HttpResponse.json(toPublicOrder(row), { status: 201 })
      }),
      // `timeout`: o pedido é criado e só a resposta se perde (recuperação por `GET /orders/by-key/:key`).
      { handlesConflict: true, timeoutAfterResolve: true },
    ),
  ),

  http.get(
    `${API_BASE_URL}/orders`,
    withScenario(
      'orders.list',
      withAuth(({ request }, { user }) => {
        const params = new URL(request.url).searchParams
        const status = orderStatusSchema.safeParse(params.get('status'))
        const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
        const filter: OrderStatus | null = status.success ? status.data : null
        const all = listUserOrders(user.id)
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
  ),

  /** Recuperação após timeout/refresh: o pedido criado com a chave, ou 404 se ela nunca chegou. */
  http.get(
    `${API_BASE_URL}/orders/by-key/:idempotencyKey`,
    withScenario(
      'orders.recover',
      withAuth(({ params }, { user }) => {
        const row = findOrderByKey(user.id, String(params.idempotencyKey))
        return row ? HttpResponse.json(toPublicOrder(row)) : notFound('Nenhum pedido com esta chave')
      }),
    ),
  ),

  http.get(
    `${API_BASE_URL}/orders/:id`,
    withScenario(
      'orders.detail',
      withAuth(({ params }, { user }) => {
        const row = findOwnOrder(user.id, String(params.id))
        return row ? HttpResponse.json(toPublicOrder(row)) : orderNotFound()
      }),
    ),
  ),

  /** Recibo imutável: só existe depois de `confirmed` (404 antes ou se recusado). */
  http.get(
    `${API_BASE_URL}/orders/:id/receipt`,
    withScenario(
      'orders.receipt',
      withAuth(({ params }, { user }) => {
        const row = findOwnOrder(user.id, String(params.id))
        if (!row) return orderNotFound()
        const receipt = isTerminalStatus(row.status) ? receiptsTable.find(row.id) : undefined
        return receipt ? HttpResponse.json(receipt) : notFound('O recibo só existe para pedidos confirmados')
      }),
    ),
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
