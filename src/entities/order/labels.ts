import type { Order, RejectionCode } from './schema'

/** Título do aviso de recusa por motivo (D-03: o mesmo layout do recibo, outro ícone e mensagem). */
export const REJECTION_TITLES: Record<RejectionCode, string> = {
  payment_declined: 'Pagamento recusado',
  out_of_stock: 'Edição esgotada',
}

/** Título do pedido recusado: pelo motivo devolvido pela API; sem motivo, "Pedido recusado". */
export function rejectionTitle(order: Pick<Order, 'rejectionCode'>): string {
  return order.rejectionCode ? REJECTION_TITLES[order.rejectionCode] : 'Pedido recusado'
}
