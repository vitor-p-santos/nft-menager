import { z } from 'zod'
// Import direto (sem o index de lib/socket): os mocks usam este schema e não podem carregar o socket.io-client.
import { eventEnvelopeSchema } from '@/lib/socket/events'
import { nftEditionSchema, weiSchema, type Nft, type NftSummary } from './schema'

/** Campos do NFT que mudam em tempo real (contracts/socket-events.md → `nft.updated`). */
export const nftChangesSchema = z
  .object({
    priceWei: weiSchema,
    compareAtPriceWei: weiSchema.nullable(),
    /** Lista completa de edições com o estoque atual (não é um diff). */
    editions: z.array(nftEditionSchema).min(1),
  })
  .partial()
export type NftChanges = z.infer<typeof nftChangesSchema>

/** `nft.updated` (público). `entityId === nftId`; `version` = `Nft.version` depois da mudança. */
export const nftUpdatedEventSchema = eventEnvelopeSchema.extend({
  nftId: z.string(),
  changes: nftChangesSchema,
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

type PatchableNft = NftSummary | Nft

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Parece um NFT do catálogo (resumo ou detalhe)? Itens de carrinho/pedido não têm `priceWei` + `version`. */
const isNftLike = (value: Record<string, unknown>): value is PatchableNft =>
  typeof value.id === 'string' && typeof value.priceWei === 'string' && typeof value.version === 'number'

/**
 * Aplica o evento a um NFT. Devolve o mesmo objeto (mesma referência) quando o evento não é desse NFT
 * ou quando o dado em cache já é tão novo quanto o evento (`version` da REST >= `version` do evento).
 * `editions` só é aplicado a quem já tem o campo (o detalhe); o resumo das listas não tem estoque.
 */
export function patchNft<T extends PatchableNft>(nft: T, event: NftUpdatedEvent): T {
  if (nft.id !== event.nftId || nft.version >= event.version) return nft
  const { priceWei, compareAtPriceWei, editions } = event.changes
  const next: T = { ...nft, version: event.version }
  if (priceWei !== undefined) next.priceWei = priceWei
  if (compareAtPriceWei !== undefined) next.compareAtPriceWei = compareAtPriceWei
  if (editions !== undefined && 'editions' in next) next.editions = editions
  return next
}

/**
 * Aplica o evento a qualquer dado de query que contenha NFTs (detalhe, página do catálogo `{ items }`,
 * relacionados, favoritos, destaque da home), percorrendo objetos e arrays. Compartilhamento estrutural:
 * só os ramos alterados ganham referência nova; sem mudança, devolve o próprio `data` (sem re-render).
 */
export function patchNftsIn<T>(data: T, event: NftUpdatedEvent): T {
  return walk(data, event) as T
}

function walk(value: unknown, event: NftUpdatedEvent): unknown {
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const patched = walk(item, event)
      if (patched !== item) changed = true
      return patched
    })
    return changed ? next : value
  }
  if (!isRecord(value)) return value
  if (isNftLike(value)) return patchNft(value, event)
  let next: Record<string, unknown> | null = null
  for (const [key, child] of Object.entries(value)) {
    const patched = walk(child, event)
    if (patched !== child) {
      next ??= { ...value }
      next[key] = patched
    }
  }
  return next ?? value
}
