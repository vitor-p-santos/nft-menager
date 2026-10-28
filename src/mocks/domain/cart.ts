import type { Cart, CartItem } from '@/entities/cart'
import type { Edition } from '@/entities/nft'
import type { QuoteChange } from '@/features/checkout/schemas/checkout'
import { multiplyWei } from '@/lib/money'
import { cartsTable, type CartOwner, type StoredCart } from '../db/carts'
import { nftsTable } from '../db/catalog'
import { availableOf, priceLines } from './pricing'

/** Monta o `Cart` do contrato: compara cada item com o NFT atual e recalcula os totais. */
export function toCart(stored: StoredCart): Cart {
  const items: CartItem[] = []
  for (const row of stored.items) {
    const nft = nftsTable.find(row.nftId)
    if (!nft) continue
    const available = availableOf(nft, row.edition)
    const quantity = Math.min(row.quantity, available)
    const issue: CartItem['issue'] =
      available === 0
        ? 'unavailable'
        : quantity < row.quantity
          ? 'quantity_reduced'
          : nft.priceWei !== row.unitPriceWei
            ? 'price_changed'
            : null
    const line = multiplyWei(BigInt(nft.priceWei), quantity)
    const { id, slug, name, tokenId, collection, network, image } = nft
    items.push({
      id: row.id,
      nftId: row.nftId,
      edition: row.edition,
      quantity,
      unitPriceWei: row.unitPriceWei,
      currentPriceWei: nft.priceWei,
      lineTotalWei: line.toString(),
      available,
      issue,
      nft: { id, slug, name, tokenId, collection, network, image },
    })
  }
  const { totals, coupon } = priceLines(
    items.map((i) => ({ priceWei: i.currentPriceWei, quantity: i.quantity, network: i.nft.network })),
    stored.couponCode,
  )
  return {
    id: stored.id,
    items,
    coupon,
    totals,
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
    version: stored.version,
  }
}

export const cartSubtotal = (stored: StoredCart) => BigInt(toCart(stored).totals.subtotalWei)

/** Linha comparada com o catálogo: item do carrinho (preço aceito) ou da cotação (preço cotado). */
export type CatalogLine = {
  itemId: string
  nftId: string
  /** Nome exibido na mudança; sem ele usa o nome atual do NFT (ou o id, se o NFT sumiu). */
  name?: string
  edition: Edition
  quantity: number
  /** Preço que o comprador viu e que é comparado com o preço atual do NFT. */
  priceWei: string
}

/**
 * Compara uma linha com o catálogo atual: `unavailable` (sem estoque ou NFT removido),
 * `quantity_reduced` (estoque menor que a quantidade) e `price_changed` (preço diferente).
 * Não grava nada. Com `stopWhenUnavailable`, um item esgotado não gera também `price_changed`
 * (a revalidação do carrinho descarta o item; a criação do pedido reporta as duas mudanças).
 */
export function catalogChangesFor(line: CatalogLine, { stopWhenUnavailable }: { stopWhenUnavailable: boolean }): QuoteChange[] {
  const nft = nftsTable.find(line.nftId)
  const base = { itemId: line.itemId, nftId: line.nftId, name: line.name ?? nft?.name ?? line.nftId, edition: line.edition }
  const available = availableOf(nft, line.edition)
  const changes: QuoteChange[] = []
  if (available === 0) {
    changes.push({ type: 'unavailable', ...base, fromQuantity: line.quantity })
    if (stopWhenUnavailable) return changes
  } else if (available < line.quantity) {
    changes.push({ type: 'quantity_reduced', ...base, fromQuantity: line.quantity, toQuantity: available })
  }
  if (nft && nft.priceWei !== line.priceWei) {
    changes.push({ type: 'price_changed', ...base, fromWei: line.priceWei, toWei: nft.priceWei })
  }
  return changes
}

/**
 * Junta o carrinho anônimo ao do usuário (login). Quantidades somadas e limitadas ao estoque (sem
 * reduzir o que o usuário já tinha); o cupom do usuário tem prioridade. O carrinho anônimo é apagado.
 */
export function mergeAnonymousCart(anonymousId: string, userId: string): StoredCart {
  const anonOwner: CartOwner = { anonymousId }
  const userOwner: CartOwner = { userId }
  const anon = cartsTable.get(anonOwner)
  const mine = cartsTable.get(userOwner)
  if (anon.items.length === 0 && !anon.couponCode) return mine
  const items = [...mine.items]
  for (const row of anon.items) {
    const max = availableOf(nftsTable.find(row.nftId), row.edition)
    const idx = items.findIndex((i) => i.nftId === row.nftId && i.edition === row.edition)
    if (idx >= 0) {
      const current = items[idx]!
      items[idx] = { ...current, quantity: Math.max(current.quantity, Math.min(current.quantity + row.quantity, max)) }
    } else {
      items.push(row)
    }
  }
  const merged = cartsTable.save(userOwner, { ...mine, items, couponCode: mine.couponCode ?? anon.couponCode })
  cartsTable.remove(anonOwner)
  return merged
}
