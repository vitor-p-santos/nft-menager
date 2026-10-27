import { keepPreviousData, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import {
  isTerminalStatus,
  orderKeys,
  orderQueries,
  pendingOrderPollInterval,
  type OrderList,
  type OrderListFilters,
} from '@/entities/order'
import type { ActivitySearch } from '../schemas/activity-search'

/**
 * Query keys: as de `entities/order` (`orderKeys`), compartilhadas com o checkout. Reexportadas aqui
 * para a feature não precisar de uma segunda fábrica.
 */
export { orderKeys } from '@/entities/order'

/** Um pedido `pending` criado há menos que isso ainda está com o pagamento em curso (1,5–4 s no mock). */
const SETTLING_WINDOW_MS = 2 * 60_000

/** Estado da URL de "Atividade" → filtros do `GET /orders` (padrões fora da chave). */
export function toOrderListFilters(search: ActivitySearch): OrderListFilters {
  const filters: OrderListFilters = {}
  if (search.status) filters.status = search.status
  if (search.page && search.page > 1) filters.page = search.page
  return filters
}

/** Há pedido recém-criado aguardando o pagamento? (Um `pending` antigo, como o `hold`, não gera polling.) */
export function hasSettlingOrder(list: OrderList | undefined, now = Date.now()): boolean {
  return !!list?.items.some((o) => o.status === 'pending' && now - Date.parse(o.createdAt) < SETTLING_WINDOW_MS)
}

/**
 * Lista de pedidos de "Atividade" (`/atividade?status&page`). Mantém a página anterior durante a troca de
 * filtro/página e faz polling só enquanto um pedido recém-criado está `pending` (2 s sem socket; com o
 * socket conectado o `order.updated` atualiza a lista e o polling cai para 15 s, só como segurança).
 */
export const orderListQuery = (search: ActivitySearch) =>
  queryOptions({
    ...orderQueries.list(toOrderListFilters(search)),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => pendingOrderPollInterval(hasSettlingOrder(query.state.data)),
  })

/** Detalhe do pedido (`/pedidos/$orderId`): polling enquanto `pending`. */
export const orderDetailQuery = (orderId: string) => orderQueries.detail(orderId)

/** Recibo imutável (`GET /orders/:id/receipt`, `staleTime: Infinity`). 404 enquanto não confirmado. */
export const orderReceiptQuery = (orderId: string) => orderQueries.receipt(orderId)

/**
 * `useQuery(orderDetailQuery(id))` + sincronização: quando o pedido sai de `pending`, invalida as listas
 * (status e contagens mudam) para "Atividade" não mostrar o estado antigo.
 */
export function useOrderDetail(orderId: string) {
  const queryClient = useQueryClient()
  const query = useQuery(orderDetailQuery(orderId))
  const order = query.data
  const seenPending = useRef(false)

  useEffect(() => {
    if (!order) return
    if (order.status === 'pending') {
      seenPending.current = true
      return
    }
    if (seenPending.current && isTerminalStatus(order.status)) {
      seenPending.current = false
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    }
  }, [order, queryClient])

  return query
}
