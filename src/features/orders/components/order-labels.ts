import type { OrderStatus, RejectionCode } from '@/entities/order'

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

/** Título do aviso de recusa por motivo (D-03: o mesmo layout do recibo, outro ícone e mensagem). */
export const REJECTION_TITLES: Record<RejectionCode, string> = {
  payment_declined: 'Pagamento recusado',
  out_of_stock: 'Edição esgotada',
}
