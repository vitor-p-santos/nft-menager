import type { QueryClient } from '@tanstack/react-query'
import { cartKeys } from './api'
import type { Cart } from './schema'

/** O carrinho em cache tem algum item deste NFT? */
export const cartHasNft = (cart: Cart | undefined, nftId: string) => !!cart?.items.some((item) => item.nftId === nftId)

/**
 * `nft.updated` de um NFT do carrinho: refaz a busca, porque preço atual, `issue`, quantidade limitada e
 * totais são calculados pelo servidor (o client não recalcula carrinho).
 */
export function invalidateCartIfHasNft(queryClient: QueryClient, nftId: string) {
  if (!cartHasNft(queryClient.getQueryData<Cart>(cartKeys.detail()), nftId)) return
  void queryClient.invalidateQueries({ queryKey: cartKeys.all })
}
