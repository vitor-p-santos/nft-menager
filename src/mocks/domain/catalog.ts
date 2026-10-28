import type { Nft, NftSummary } from '@/entities/nft'

/** Resumo do NFT usado em listagens (catálogo, relacionados, favoritos, destaque da home). */
export function toSummary(nft: Nft): NftSummary {
  const { id, slug, name, tokenId, collection, creator, categoryId, network, priceWei, compareAtPriceWei, rarity, image, listedAt, version } = nft
  return { id, slug, name, tokenId, collection, creator, categoryId, network, priceWei, compareAtPriceWei, rarity, image, listedAt, version }
}
