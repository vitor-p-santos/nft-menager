import { useQuery } from '@tanstack/react-query'
import { useRef, useState, type ReactNode } from 'react'
import { Skeleton } from '@/components/feedback/skeleton'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { Container } from '@/components/layout/container'
import { Pagination } from '@/components/ui/pagination'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CATALOG_PAGE_SIZE, CATALOG_SECTION_ID, type CatalogSearch } from '@/entities/catalog'
import type { NftSummary } from '@/entities/nft'
import { NftCard, NftCardSkeleton } from '@/entities/nft/nft-card'
import { catalogQueries } from '../api/queries'
import type { CatalogNavigate } from '../hooks/catalog-search'
import { CatalogFilters } from './catalog-filters'
import { CatalogSearchBar } from './catalog-search-bar'
import { ActiveChips, CatalogTabs, FiltersButton, SortMenu, type Chip } from './catalog-toolbar'

type CatalogSectionProps = {
  search: CatalogSearch
  navigate: CatalogNavigate
  /** Conteúdo da Home entre a busca mobile e as abas (hero). */
  hero?: ReactNode
  /** Conteúdo abaixo do painel de filtros no desktop (banner "NFT em destaque"). */
  aside?: ReactNode
  /** Ação sobre a arte de cada card (favoritar), composta pela rota. */
  renderCardAction?: (nft: NftSummary) => ReactNode
}

function countActiveFilters(search: CatalogSearch) {
  return (
    (search.categories?.length ?? 0) +
    (search.networks?.length ?? 0) +
    (search.minPrice || search.maxPrice ? 1 : 0)
  )
}

function FiltersSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <Skeleton className="h-6 w-28" />
      {Array.from({ length: 9 }, (_, i) => (
        <Skeleton key={i} className="ml-3 h-5 w-[85%]" />
      ))}
    </div>
  )
}

/**
 * Catálogo da Home (Figma "Products" e Mobile "Tabs/Grid"): busca, filtros combináveis, abas,
 * ordenação e paginação, todos sincronizados com a URL pela função `navigate` da rota.
 * Layout: mobile até `md`; 3 colunas + sheet de filtros até `xl`; sidebar a partir de `xl` (D-01).
 */
export function CatalogSection({ search, navigate, hero, aside, renderCardAction }: CatalogSectionProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const query = useQuery(catalogQueries.list(search))
  const data = query.data
  const activeFilters = countActiveFilters(search)

  const creatorLabel = search.creator
    ? (data?.facets.creators.find((c) => c.id === search.creator)?.label ?? search.creator)
    : undefined
  const chips: Chip[] = [
    ...(search.q ? [{ key: 'q', label: `Busca: “${search.q}”`, patch: { q: undefined } }] : []),
    ...(creatorLabel ? [{ key: 'creator', label: `Criador: ${creatorLabel}`, patch: { creator: undefined } }] : []),
  ]
  const hasAnyFilter = activeFilters > 0 || chips.length > 0 || !!search.tab

  function clearFilters() {
    navigate({
      q: undefined,
      categories: undefined,
      networks: undefined,
      creator: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      tab: undefined,
    })
  }

  function goToPage(page: number) {
    navigate({ page })
    sectionRef.current?.scrollIntoView({ block: 'start' })
  }

  const filters = data ? (
    <CatalogFilters search={search} facets={data.facets} navigate={navigate} onApplied={() => setFiltersOpen(false)} />
  ) : (
    <FiltersSkeleton />
  )

  let results: ReactNode
  if (query.isError && !data) {
    results = (
      <ErrorState
        title="Não foi possível carregar o catálogo"
        description="Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onClick: () => void query.refetch() }}
      />
    )
  } else if (!data) {
    results = (
      <ul aria-hidden className="grid grid-cols-2 gap-x-4 gap-y-6 pb-8 md:grid-cols-3 md:gap-x-[34px] md:gap-y-12 md:pb-0 [&>li:nth-child(even)]:translate-y-8 md:[&>li:nth-child(even)]:translate-y-0">
        {Array.from({ length: CATALOG_PAGE_SIZE }, (_, i) => (
          <li key={i}>
            <NftCardSkeleton />
          </li>
        ))}
      </ul>
    )
  } else if (data.items.length === 0) {
    results = (
      <EmptyState
        title="Nenhum NFT encontrado"
        description="Tente outros termos de busca ou remova alguns filtros."
        action={hasAnyFilter ? { label: 'Limpar filtros', onClick: clearFilters } : undefined}
      />
    )
  } else {
    results = (
      <ul
        aria-busy={query.isFetching}
        className="grid grid-cols-2 gap-x-4 gap-y-6 pb-8 transition-opacity aria-busy:opacity-70 md:grid-cols-3 md:gap-x-[34px] md:gap-y-12 md:pb-0 [&>li:nth-child(even)]:translate-y-8 md:[&>li:nth-child(even)]:translate-y-0"
      >
        {data.items.map((nft, index) => (
          <li key={nft.id}>
            <NftCard nft={nft} priority={index < 3} action={renderCardAction?.(nft)} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      {/* Mobile: busca + filtro no topo, antes do hero (Figma Mobile/Início) */}
      <Container className="pt-10 md:hidden">
        <CatalogSearchBar
          q={search.q}
          navigate={navigate}
          onOpenFilters={() => setFiltersOpen(true)}
          activeFilters={activeFilters}
        />
      </Container>

      {hero}

      <section
        ref={sectionRef}
        id={CATALOG_SECTION_ID}
        aria-labelledby="catalogo-titulo"
        tabIndex={-1}
        className="scroll-mt-6 focus-visible:outline-none"
      >
        <Container className="mt-6 md:mt-16 xl:mt-24">
          <h2 id="catalogo-titulo" className="sr-only">
            Catálogo de NFTs
          </h2>
          <div className="flex flex-col gap-12 xl:flex-row">
            <aside aria-label="Filtros e destaque" className="hidden w-[310px] shrink-0 flex-col gap-6 xl:flex">
              <div className="bg-card px-5 pt-5 pb-8">{filters}</div>
              {aside}
            </aside>

            <div className="flex min-w-0 flex-1 flex-col gap-6 md:gap-7">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <CatalogTabs search={search} />
                <div className="flex items-center justify-between gap-4 xl:justify-end">
                  <FiltersButton count={activeFilters} onClick={() => setFiltersOpen(true)} className="hidden md:flex xl:hidden" />
                  <SortMenu search={search} navigate={navigate} />
                </div>
              </div>
              <ActiveChips chips={chips} navigate={navigate} />

              <output aria-live="polite" className="sr-only">
                {data && !query.isFetching
                  ? `${data.total} ${data.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}, página ${data.page} de ${Math.max(data.totalPages, 1)}`
                  : ''}
              </output>
              {query.isError && data && (
                <p role="alert" className="text-body text-muted-foreground">
                  Não foi possível atualizar os resultados. Mostrando a última lista carregada.{' '}
                  <button type="button" onClick={() => void query.refetch()} className="cursor-pointer font-bold text-text-accent underline">
                    Tentar novamente
                  </button>
                </p>
              )}

              {results}

              {data && (
                <div className="mt-4 md:mt-10">
                  <Pagination label="Paginação do catálogo" page={data.page} totalPages={data.totalPages} onPageChange={goToPage} />
                </div>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Mobile/tablet: os mesmos filtros num sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl border-border bg-card px-6 pb-10 xl:hidden">
          <SheetHeader className="px-0 pb-0">
            <SheetTitle className="text-heading font-bold">Filtros</SheetTitle>
            <SheetDescription className="text-body">Os resultados são atualizados ao selecionar.</SheetDescription>
          </SheetHeader>
          {filters}
          {hasAnyFilter && (
            <button type="button" onClick={clearFilters} className="w-max cursor-pointer text-body font-bold text-text-accent underline-offset-4 hover:underline">
              Limpar filtros
            </button>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
