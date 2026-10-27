import { z } from 'zod'
// Import direto (sem o index de lib/socket): os mocks usam este schema e não podem carregar o socket.io-client.
import { eventEnvelopeSchema } from '@/lib/socket/events'
import { orderStatusSchema, rejectionCodeSchema, type Order } from './schema'

/**
 * `order.updated` (privado: só chega ao dono do pedido). `entityId === orderId`; `version` = `Order.version`
 * depois da transição. Traz todos os campos que mudam na transição, para o client atualizar o cache
 * sem esperar um refetch.
 */
export const orderUpdatedEventSchema = eventEnvelopeSchema.extend({
  orderId: z.string(),
  status: orderStatusSchema,
  txHash: z.string().nullable(),
  rejectionCode: rejectionCodeSchema.nullable(),
  rejectionReason: z.string().nullable(),
  updatedAt: z.iso.datetime(),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

/** Aplica a transição ao pedido. Mesma referência se o evento é de outro pedido ou mais velho que o cache. */
export function patchOrder(order: Order, event: OrderUpdatedEvent): Order {
  if (order.id !== event.orderId || order.version >= event.version) return order
  const { status, txHash, rejectionCode, rejectionReason, updatedAt, version } = event
  return { ...order, status, txHash, rejectionCode, rejectionReason, updatedAt, version }
}
