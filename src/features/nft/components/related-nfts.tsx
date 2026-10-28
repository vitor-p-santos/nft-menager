import { useQuery } from '@tanstack/react-query'
import { NftCarousel } from '@/entities/nft/nft-carousel'
import { nftQueries } from '../api/queries'
import { FavoriteButton } from './favorite-button'

/**
 * NFTs relacionados (Figma "Related"): "Mais desta coleção" no detalhe e, composto pela rota,
 * "Colecionadores também viram" no carrinho. `excludeIds` tira da lista o que já está na tela.
 */
export function RelatedNfts({
  nftId,
  title = 'Mais desta coleção',
  excludeIds,
}: {
  nftId: string
  title?: string
  excludeIds?: readonly string[]
}) {
  const query = useQuery(nftQueries.related(nftId))
  const items = excludeIds ? query.data?.filter((nft) => !excludeIds.includes(nft.id)) : query.data

  return (
    <NftCarousel
      title={title}
      items={items}
      isError={query.isError}
      onRetry={() => void query.refetch()}
      errorTitle="Não foi possível carregar os NFTs relacionados"
      renderAction={(nft) => <FavoriteButton nftId={nft.id} nftName={nft.name} variant="badge" />}
    />
  )
}
