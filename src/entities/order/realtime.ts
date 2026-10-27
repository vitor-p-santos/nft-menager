import type { QueryClient } from '@tanstack/react-query'
import { orderKeys } from './api'
import { patchOrder, type OrderUpdatedEvent } from './events'
import type { Order, OrderList } from './schema'

/** A query guarda um pedido `pending` (detalhe, `by-key` ou alguma linha de lista)? */
export function hasPendingOrder(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false
  if ('status' in data && 'idempotencyKey' in data) return (data as Order).status === 'pending'
  if ('items' in data && Array.isArray(data.items)) return (data as OrderList).items.some((o) => o.status === 'pending')
  return false
}

/**
 * Aplica `order.updated` ao cache dos pedidos (contracts/socket-events.md):
 * - detalhe e `by-key`: transição aplicada na hora (status, txHash, motivo da recusa, `version`);
 * - listas: a linha é atualizada e a lista é invalidada (as contagens por status vêm do servidor);
 * - recibo: invalidado na confirmação (antes era 404).
 * Eventos mais velhos que o cache (`version` <=) não alteram nada (ver `patchOrder`).
 */
export function applyOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent) {
  queryClient.setQueryData<Order>(orderKeys.detail(event.orderId), (order) => order && patchOrder(order, event))
  queryClient.setQueriesData<Order | null>({ queryKey: [...orderKeys.all, 'by-key'] }, (order) =>
    order ? patchOrder(order, event) : order,
  )
  queryClient.setQueriesData<OrderList>({ queryKey: orderKeys.lists() }, (list) => {
    if (!list) return list
    let changed = false
    const items = list.items.map((order) => {
      const next = patchOrder(order, event)
      if (next !== order) changed = true
      return next
    })
    return changed ? { ...list, items } : list
  })
  void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
  if (event.status === 'confirmed') void queryClient.invalidateQueries({ queryKey: orderKeys.receipt(event.orderId) })
}
