import type { NftSummary } from './schema'

type Priced = Pick<NftSummary, 'priceWei' | 'compareAtPriceWei'>

/** Há preço anterior maior que o atual (exibido riscado no card e no detalhe). Comparação em wei. */
export function hasDiscount<T extends Priced>(nft: T): nft is T & { compareAtPriceWei: string } {
  return nft.compareAtPriceWei !== null && BigInt(nft.compareAtPriceWei) > BigInt(nft.priceWei)
}
