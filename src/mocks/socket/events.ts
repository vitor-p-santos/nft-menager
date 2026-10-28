import { nftUpdatedEventSchema, type Nft, type NftChanges, type NftUpdatedEvent } from '@/entities/nft'
import { orderUpdatedEventSchema, type OrderUpdatedEvent } from '@/entities/order'
import { SOCKET_EVENTS } from '@/lib/socket/events'
import type { OrderRow } from '../db/orders'
import { envelope, publish } from './server'

/**
 * Emissores de domínio usados pelos handlers REST depois de gravar a mudança no banco. O evento leva
 * a `version` já incrementada da entidade. Os schemas do client validam o payload aqui também, para o
 * mock não sair do contrato sem ninguém perceber.
 */
export function publishNftUpdated(nft: Nft, changes: NftChanges): NftUpdatedEvent {
  const event = nftUpdatedEventSchema.parse({ ...envelope(nft.id, nft.version), nftId: nft.id, changes })
  publish({ name: SOCKET_EVENTS.nftUpdated, payload: event, audience: { kind: 'public' } })
  return event
}

/** `order.updated` só para as conexões autenticadas como o dono do pedido. */
export function publishOrderUpdated(row: OrderRow): OrderUpdatedEvent {
  const event = orderUpdatedEventSchema.parse({
    ...envelope(row.id, row.version),
    orderId: row.id,
    status: row.status,
    txHash: row.txHash,
    rejectionCode: row.rejectionCode,
    rejectionReason: row.rejectionReason,
    updatedAt: row.updatedAt,
  })
  publish({ name: SOCKET_EVENTS.orderUpdated, payload: event, audience: { kind: 'user', userId: row.userId } })
  return event
}
