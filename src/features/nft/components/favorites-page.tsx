import { useQuery } from '@tanstack/react-query'
import { ErrorState, EmptyState } from '@/components/feedback/states'
import { ExploreLink } from '@/entities/catalog/explore-link'
import { NFT_GRID_CLASS, NftCard, NftCardSkeleton } from '@/entities/nft/nft-card'
import { favoritesQueries } from '../api/queries'
import { FavoriteButton } from './favorite-button'

/**
 * "Lista de interesse" (`/perfil/lista-de-interesse`): os favoritos do usuário (`GET /me/favorites`)
 * com o `NftCard` do catálogo. Sem frame no Figma (ARCHITECTURE.md → Lista de interesse). O coração
 * do card desfavorita: o update otimista do `useToggleFavorite` tira o card da lista na hora, e a
 * contagem em `aria-live` anuncia a mudança (o balão do card some junto com ele).
 */
export function FavoritesPage() {
  const favorites = useQuery(favoritesQueries.list())
  const list = favorites.data

  let content
  if (list && list.length > 0) {
    content = (
      <ul aria-label="NFTs da lista de interesse" className={NFT_GRID_CLASS}>
        {list.map((nft, index) => (
          <li key={nft.id}>
            <NftCard nft={nft} priority={index < 3} action={<FavoriteButton nftId={nft.id} nftName={nft.name} variant="badge" />} />
          </li>
        ))}
      </ul>
    )
  } else if (list) {
    content = (
      <EmptyState
        title="Sua lista de interesse está vazia"
        description="Toque no coração de um NFT para guardá-lo aqui."
        action={<ExploreLink />}
      />
    )
  } else if (favorites.isError) {
    content = (
      <ErrorState
        title="Não foi possível carregar sua lista de interesse"
        description="Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onClick: () => void favorites.refetch() }}
      />
    )
  } else {
    content = (
      <ul aria-hidden className={NFT_GRID_CLASS}>
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <NftCardSkeleton />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section aria-labelledby="lista-de-interesse-titulo" className="flex flex-col gap-[30px]">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="lista-de-interesse-titulo" className="text-body-lg leading-5 font-bold text-foreground">
          Lista de interesse
        </h2>
        <p aria-live="polite" className="text-body leading-5 text-text-secondary">
          {list ? `${list.length} ${list.length === 1 ? 'NFT' : 'NFTs'}` : ''}
        </p>
      </div>
      {content}
    </section>
  )
}
