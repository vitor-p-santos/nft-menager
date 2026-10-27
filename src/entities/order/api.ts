import { queryOptions } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { isRealtimeLive } from '@/lib/socket/status'
import { orderListSchema, orderSchema, receiptSchema, type Order, type OrderListFilters } from './schema'

/**
 * Query keys dos pedidos (privadas). Compartilhadas: o checkout cria e acompanha o pedido, a
 * feature `orders` (Fase 6) lista e mostra o recibo.
 */
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderListFilters = {}) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  byKey: (idempotencyKey: string) => [...orderKeys.all, 'by-key', idempotencyKey] as const,
  receipt: (id: string) => [...orderKeys.all, 'receipt', id] as const,
}

/**
 * Polling enquanto o pedido está `pending` e o socket NÃO está conectado (sem provider, conectando ou
 * caído): é o fallback do `order.updated` (T-093).
 */
export const ORDER_PENDING_POLL_MS = 2_000
/** Com o socket conectado o evento atualiza o pedido; este polling lento é só uma rede de segurança. */
export const ORDER_PENDING_LIVE_POLL_MS = 15_000

/**
 * Intervalo de refetch de uma query com pedido `pending`. O TanStack Query reavalia a função a cada
 * atualização da query; o sync de tempo real refaz as queries pendentes quando o status do socket muda,
 * o que troca entre os dois intervalos.
 */
export const pendingOrderPollInterval = (pending: boolean): number | false =>
  pending ? (isRealtimeLive() ? ORDER_PENDING_LIVE_POLL_MS : ORDER_PENDING_POLL_MS) : false

const orderPath = (id: string) => `/orders/${encodeURIComponent(id)}`

/** `GET /orders/by-key/:key`: o pedido criado com a chave, ou `null` se a chave nunca chegou ao servidor. */
export async function fetchOrderByKey(idempotencyKey: string, signal?: AbortSignal): Promise<Order | null> {
  try {
    return await api.get(`/orders/by-key/${encodeURIComponent(idempotencyKey)}`, orderSchema, { signal })
  } catch (error) {
    if (error instanceof ApiError && error.kind === 'not_found') return null
    throw error
  }
}

export const orderQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: orderKeys.detail(id),
      queryFn: ({ signal }) => api.get(orderPath(id), orderSchema, { signal }),
      refetchInterval: (query) => pendingOrderPollInterval(query.state.data?.status === 'pending'),
    }),
  /** Recuperação após timeout/refresh (T-073). `null` = nenhum pedido com essa chave. */
  byKey: (idempotencyKey: string) =>
    queryOptions({
      queryKey: orderKeys.byKey(idempotencyKey),
      queryFn: ({ signal }) => fetchOrderByKey(idempotencyKey, signal),
      refetchInterval: (query) => pendingOrderPollInterval(query.state.data?.status === 'pending'),
    }),
  list: (filters: OrderListFilters = {}) =>
    queryOptions({
      queryKey: orderKeys.list(filters),
      queryFn: ({ signal }) =>
        api.get('/orders', orderListSchema, { signal, params: { status: filters.status, page: filters.page } }),
    }),
  /** Recibo imutável: só existe com `confirmed` (404 antes disso). Nunca muda → `staleTime: Infinity`. */
  receipt: (id: string) =>
    queryOptions({
      queryKey: orderKeys.receipt(id),
      queryFn: ({ signal }) => api.get(`${orderPath(id)}/receipt`, receiptSchema, { signal }),
      staleTime: Infinity,
    }),
}
