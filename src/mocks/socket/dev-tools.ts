import { nftChangesSchema, type NftChanges } from '@/entities/nft'
import { nftsTable } from '../db/catalog'
import { forceSettlement } from '../domain/payment'
import { publishNftUpdated } from './events'
import { connectionStats, dropConnections, envelope, publish, recentEvents, type EmittedEvent } from './server'

/**
 * `window.__mockRealtime` (T-094): gatilhos do servidor simulado para testes e QA manual.
 * - `emitNftUpdate` / `emitOrderUpdate` mudam o banco de verdade (a REST passa a devolver o mesmo estado)
 *   e emitem o evento com a `version` nova;
 * - `emit` manda um evento arbitrário (sem tocar no banco);
 * - `emitDuplicate` reenvia o último evento idêntico (mesmo `eventId`) → o client deve ignorar;
 * - `emitStale` reenvia o último evento da entidade com `eventId` novo e `version - 1` → o client deve ignorar;
 * - `dropConnection` derruba as conexões (o client reconecta e refaz as queries).
 */
export type MockRealtimeTools = {
  stats: () => ReturnType<typeof connectionStats>
  events: () => readonly EmittedEvent[]
  emit: (name: string, payload: Record<string, unknown>, options?: { userId?: string }) => EmittedEvent
  emitNftUpdate: (nftId: string, changes: NftChanges) => EmittedEvent
  emitOrderUpdate: (orderId: string, status: 'confirmed' | 'rejected') => EmittedEvent
  emitDuplicate: () => EmittedEvent
  emitStale: (entityId?: string, overrides?: Record<string, unknown>) => EmittedEvent
  dropConnection: (options?: { downMs?: number }) => void
}

declare global {
  interface Window {
    __mockRealtime?: MockRealtimeTools
  }
}

function lastEvent(entityId?: string): EmittedEvent {
  const all = recentEvents()
  const found = entityId === undefined ? all.at(-1) : all.findLast((e) => e.payload.entityId === entityId)
  if (!found) throw new Error(`__mockRealtime: nenhum evento emitido${entityId ? ` para ${entityId}` : ''}`)
  return found
}

const tools: MockRealtimeTools = {
  stats: connectionStats,
  events: recentEvents,

  emit(name, payload, options) {
    const event: EmittedEvent = {
      name,
      payload,
      audience: options?.userId ? { kind: 'user', userId: options.userId } : { kind: 'public' },
    }
    publish(event)
    return event
  },

  emitNftUpdate(nftId, rawChanges) {
    const changes = nftChangesSchema.parse(rawChanges)
    const nfts = nftsTable.all()
    const nft = nfts.find((n) => n.id === nftId || n.slug === nftId)
    if (!nft) throw new Error(`__mockRealtime: NFT ${nftId} não existe`)
    if (changes.priceWei !== undefined) nft.priceWei = changes.priceWei
    if (changes.compareAtPriceWei !== undefined) nft.compareAtPriceWei = changes.compareAtPriceWei
    if (changes.editions !== undefined) nft.editions = changes.editions
    nft.version += 1
    nftsTable.save(nfts)
    publishNftUpdated(nft, changes)
    return lastEvent(nft.id)
  },

  emitOrderUpdate(orderId, status) {
    const row = forceSettlement(orderId, status)
    if (!row) throw new Error(`__mockRealtime: o pedido ${orderId} não existe ou não está pending`)
    return lastEvent(orderId)
  },

  emitDuplicate() {
    const last = lastEvent()
    publish(last)
    return last
  },

  emitStale(entityId, overrides = {}) {
    const base = lastEvent(entityId)
    const version = Number(base.payload.version)
    const event: EmittedEvent = {
      ...base,
      payload: {
        ...base.payload,
        ...overrides,
        ...envelope(String(base.payload.entityId), Math.max(0, version - 1)),
      },
    }
    publish(event)
    return event
  },

  dropConnection(options) {
    dropConnections(options?.downMs ?? 0)
  },
}

/**
 * Só em dev e em testes automatizados (`navigator.webdriver`, ex.: Playwright contra o build de preview).
 * No deploy público o MSW também roda, mas os gatilhos só aparecem com `localStorage['mock:realtime-tools'] = 'on'`.
 */
export function installMockRealtimeTools() {
  let optIn = false
  try {
    optIn = localStorage.getItem('mock:realtime-tools') === 'on'
  } catch {
    optIn = false
  }
  if (import.meta.env.DEV || navigator.webdriver || optIn) window.__mockRealtime = tools
}
