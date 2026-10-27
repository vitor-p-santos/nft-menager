import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { catalogSearchSchema } from '@/entities/catalog'
import { catalogQueries } from '@/features/catalog/api/queries'
import { CatalogSection } from '@/features/catalog/components/catalog-section'
import { mergeCatalogSearch, type CatalogNavigate } from '@/features/catalog/hooks/catalog-search'
import type { NftSummary } from '@/entities/nft'
import { homeQueries } from '@/features/home/api/queries'
import { HomeEditorial, HomeFeatured, HomeHero } from '@/features/home/components/home-sections'
import { FavoriteButton } from '@/features/nft/components/favorite-button'

/** Tempo máximo que a primeira navegação espera os dados antes de mostrar os skeletons. */
const FIRST_PAINT_BUDGET_MS = 400

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps, cause }) => {
    const pending = Promise.allSettled([
      queryClient.ensureQueryData(catalogQueries.list(deps)),
      queryClient.ensureQueryData(homeQueries.content()),
    ])
    // Troca de filtro/página ('stay'): não bloqueia; a lista anterior fica visível (keepPreviousData).
    // Entrada/preload: espera um pouco para evitar o flash de skeleton quando a API responde rápido.
    // Falhas não derrubam a rota: cada seção mostra o próprio estado de erro (D-04).
    if (cause === 'stay') return
    await Promise.race([pending, new Promise((resolve) => setTimeout(resolve, FIRST_PAINT_BUDGET_MS))])
  },
  component: HomePage,
})

/** Favoritar no card: o catálogo recebe a ação pronta, sem importar a feature nft. */
function renderFavorite(nft: NftSummary) {
  return <FavoriteButton nftId={nft.id} nftName={nft.name} variant="badge" />
}

function HomePage() {
  const search = Route.useSearch()
  const routeNavigate = Route.useNavigate()

  const navigate = useCallback<CatalogNavigate>(
    (patch, options) =>
      void routeNavigate({
        search: (prev) => mergeCatalogSearch(prev, patch),
        replace: options?.replace,
        resetScroll: false,
      }),
    [routeNavigate],
  )

  return (
    <>
      <CatalogSection
        search={search}
        navigate={navigate}
        hero={<HomeHero />}
        aside={<HomeFeatured />}
        renderCardAction={renderFavorite}
      />
      <HomeFeatured className="mx-auto mt-16 w-full max-w-[310px] xl:hidden" />
      <HomeEditorial />
    </>
  )
}
