import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { cartKeys } from '@/entities/cart'
import { fetchOrderByKey, isTerminalStatus, orderKeys, orderQueries, orderSchema, type Order } from '@/entities/order'
import { sessionStore } from '@/entities/session'
import { api, ApiError, http, toApiError } from '@/lib/api'
import {
  checkoutConflictDetailsSchema,
  createOrderInputSchema,
  quoteRequestSchema,
  quoteSchema,
  type CreateOrderInput,
  type QuoteChange,
  type QuoteRequest,
} from '../schemas/checkout'
import {
  clearCheckoutAttempt,
  payloadFingerprint,
  readCheckoutAttempt,
  saveCheckoutAttempt,
  type CheckoutAttempt,
} from './attempt'
import { checkoutKeys } from './keys'

export { checkoutKeys } from './keys'
export { clearCheckoutAttempt, readCheckoutAttempt, type CheckoutAttempt } from './attempt'

/** Prefixo das queries de NFT (`nftKeys.all` da feature nft): estoque e preço mudam com a compra. */
const NFT_QUERIES = ['nfts'] as const

function requireUserId(): string {
  const user = sessionStore.getUser()
  if (!user) throw new ApiError({ kind: 'unauthorized', status: 401, code: 'unauthorized', message: 'Entre para continuar' })
  return user.id
}

/** Depois de um 409 ou de uma cotação com mudanças: carrinho e catálogo estão desatualizados. */
function invalidateCartAndNfts(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: cartKeys.all })
  void queryClient.invalidateQueries({ queryKey: NFT_QUERIES })
}

/**
 * Revalidação pré-compra (T-072): `POST /checkout/quote` com a versão do carrinho que a tela mostra.
 * A cotação já traz os valores atualizados; se `changes` não estiver vazio, mostre o diff e peça nova
 * confirmação. Numa nova cotação, envie `quote.cartVersion` (o servidor ajustou o carrinho).
 * Erros: 401, 422 `cart_empty` (carrinho vazio ou tudo esgotado).
 */
export function useRequestQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: QuoteRequest) => api.post('/checkout/quote', quoteRequestSchema.parse(request), quoteSchema),
    onSuccess: (quote, request) => {
      queryClient.setQueryData(checkoutKeys.quote(), quote)
      if (quote.changes.length > 0 || quote.cartVersion !== request.cartVersion) invalidateCartAndNfts(queryClient)
    },
  })
}

export type CreateOrderResult = {
  order: Order
  /** `true` se o pedido já existia (replay 200 ou recuperado por `Idempotency-Key` após timeout). */
  recovered: boolean
}

/** Erros em que o pedido pode ter sido criado mesmo sem resposta: a chave é mantida. */
const isOutcomeUnknown = (error: ApiError) =>
  error.kind === 'timeout' || error.kind === 'network' || error.kind === 'unavailable' || error.kind === 'unknown'

/** Um envio por chave: o duplo clique reaproveita a mesma promise (o servidor também deduplica). */
const inFlight = new Map<string, Promise<CreateOrderResult>>()

async function submitOrder(userId: string, attempt: CheckoutAttempt, body: unknown): Promise<CreateOrderResult> {
  try {
    const response = await http.post<unknown>('/orders', body, { headers: { 'Idempotency-Key': attempt.key } })
    const order = orderSchema.parse(response.data)
    saveCheckoutAttempt(userId, { ...attempt, orderId: order.id })
    return { order, recovered: response.status === 200 }
  } catch (cause) {
    const error = toApiError(cause)
    if (!isOutcomeUnknown(error)) {
      // 4xx: o servidor recusou antes de criar o pedido.
      clearCheckoutAttempt(userId, attempt.key)
      throw error
    }
    const recovered = await fetchOrderByKey(attempt.key).catch(() => null)
    if (recovered) {
      saveCheckoutAttempt(userId, { ...attempt, orderId: recovered.id })
      return { order: recovered, recovered: true }
    }
    // Resultado desconhecido: mantém a chave; o próximo envio (mesmo payload) a reutiliza.
    throw error
  }
}

/**
 * "Confirmar compra" (T-070/T-073). Envia `POST /orders` com a `Idempotency-Key` da tentativa e
 * resolve com o pedido `pending` (ou o existente). Duplo clique, retry e refresh nunca criam dois
 * pedidos. Em timeout recupera o pedido pela chave antes de falhar.
 * Erros (`ApiError`): 409 `price_changed`/`out_of_stock`/`cart_version_mismatch`/`quote_expired`
 * (refaça a cotação; `getCheckoutConflictChanges` dá o diff), 422 `validation_error`
 * (`details` = `{ 'collector.email': msg }`), 401, e timeout/5xx sem pedido encontrado (tente de novo:
 * a chave é a mesma).
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const userId = requireUserId()
  const payload = createOrderInputSchema.parse(input)
  const fingerprint = payloadFingerprint(payload)

  let attempt = readCheckoutAttempt(userId)
  if (attempt && attempt.fingerprint !== fingerprint && !inFlight.has(attempt.key)) {
    // Tentativa anterior com outro conteúdo: se ela virou um pedido ainda em andamento, mostra ele
    // em vez de abrir um segundo pedido em paralelo.
    const previous = await fetchOrderByKey(attempt.key)
    if (previous?.status === 'pending') return { order: previous, recovered: true }
    clearCheckoutAttempt(userId, attempt.key)
    attempt = null
  }
  if (attempt && attempt.fingerprint !== fingerprint) {
    throw new ApiError({
      kind: 'conflict',
      status: null,
      code: 'order_in_progress',
      message: 'Aguarde a compra em andamento terminar',
    })
  }
  attempt ??= saveCheckoutAttempt(userId, {
    key: crypto.randomUUID(),
    fingerprint,
    quoteId: payload.quoteId,
    orderId: null,
    createdAt: Date.now(),
  })

  const key = attempt.key
  const running = inFlight.get(key)
  if (running) return running
  const promise = submitOrder(userId, attempt, payload).finally(() => inFlight.delete(key))
  inFlight.set(key, promise)
  return promise
}

/** Mutation de `createOrder`: grava o pedido no cache e invalida as listas (e carrinho/NFTs num 409). */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOrder,
    onSuccess: ({ order }) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order)
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.kind === 'conflict') invalidateCartAndNfts(queryClient)
    },
  })
}

/** Diff de um 409 do `POST /orders` (vazio se o erro não for de conflito do checkout). */
export function getCheckoutConflictChanges(error: unknown): QuoteChange[] {
  if (!(error instanceof ApiError) || error.kind !== 'conflict') return []
  const parsed = checkoutConflictDetailsSchema.safeParse(error.details)
  return parsed.success ? parsed.data.changes : []
}

export type CheckoutRecovery = { attempt: CheckoutAttempt; order: Order }

export const checkoutQueries = {
  /**
   * Ao abrir o checkout (ou depois de um refresh): existe uma compra em andamento deste usuário?
   * Devolve o pedido recuperado pela chave salva, ou `null` (sem tentativa, ou a chave nunca chegou
   * ao servidor — nesse caso a tentativa é descartada).
   */
  recovery: (userId: string) =>
    queryOptions({
      queryKey: checkoutKeys.recovery(userId),
      queryFn: async ({ signal }): Promise<CheckoutRecovery | null> => {
        const attempt = readCheckoutAttempt(userId)
        if (!attempt) return null
        const order = await fetchOrderByKey(attempt.key, signal)
        if (order) return { attempt, order }
        if (!inFlight.has(attempt.key)) clearCheckoutAttempt(userId, attempt.key)
        return null
      },
      staleTime: 0,
    }),
}

/**
 * Acompanha o pedido criado no checkout até `confirmed`/`rejected` (polling enquanto `pending`; o
 * `order.updated` entra na Fase 8). Na conclusão: invalida carrinho (confirmado esvazia, recusado
 * mantém), NFTs (estoque) e listas de pedidos, e descarta a tentativa salva.
 * A confirmação só deve ser exibida com `data.status === 'confirmed'`.
 */
export function useCheckoutOrder(orderId: string | null) {
  const queryClient = useQueryClient()
  const query = useQuery({ ...orderQueries.detail(orderId ?? ''), enabled: orderId !== null })
  const order = query.data
  const handled = useRef<string | null>(null)

  useEffect(() => {
    if (!order || !isTerminalStatus(order.status)) return
    const marker = `${order.id}:${order.status}`
    if (handled.current === marker) return
    handled.current = marker
    invalidateCartAndNfts(queryClient)
    void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    const userId = sessionStore.getUser()?.id
    if (userId) {
      clearCheckoutAttempt(userId, order.idempotencyKey)
      queryClient.removeQueries({ queryKey: checkoutKeys.recovery(userId) })
    }
  }, [order, queryClient])

  return query
}
