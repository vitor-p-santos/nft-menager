import { z } from 'zod'

/**
 * Envelope comum dos eventos em tempo real (ver docs/contracts/socket-events.md).
 * `version` é monotônico por entidade; `eventId` é único por emissão.
 */
export const eventEnvelopeSchema = z.object({
  eventId: z.string(),
  entityId: z.string(),
  version: z.number().int().nonnegative(),
  emittedAt: z.iso.datetime(),
})

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>

export const SOCKET_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS]
