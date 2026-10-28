import type { OrderStatus } from '@/entities/order'

/** Rótulos dos estados do pedido (filtro e selo da lista). */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  rejected: 'Recusado',
}

/** Rótulos do filtro (plural), na ordem das abas. `undefined` = todos. */
export const ORDER_FILTER_LABELS: Record<OrderStatus | 'all', string> = {
  all: 'Todos',
  pending: 'Pendentes',
  confirmed: 'Confirmados',
  rejected: 'Recusados',
}
