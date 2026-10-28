import { useQuery } from '@tanstack/react-query'
import { useRef, useState, type ReactNode } from 'react'
import { Skeleton } from '@/components/feedback/skeleton'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CATALOG_PAGE_SIZE, CATALOG_SECTION_ID, type CatalogSearch } from '@/entities/catalog'
import type { NftSummary } from '@/entities/nft'
import { NFT_GRID_CLASS, NftCard, NftCardSkeleton } from '@/entities/nft/nft-card'
import { cn } from '@/lib/utils'
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

/** Grade de cards com o deslocamento das colunas pares no mobile (Figma Mobile "Grid"). */
const GRID_CLASS = cn(NFT_GRID_CLASS, 'pb-8 md:pb-0 [&>li:nth-child(even)]:translate-y-8 md:[&>li:nth-child(even)]:translate-y-0')

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

/** Anúncio do `aria-live` dos resultados (inclui a página além da última). */
function resultsStatus({ total, page, totalPages }: { total: number; page: number; totalPages: number }) {
  const found = `${total} ${total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}`
  const pages = Math.max(totalPages, 1)
  return page > pages ? `${found}, mas a página ${page} não existe` : `${found}, página ${page} de ${pages}`
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

  // Os filtros vêm da mesma resposta: com o catálogo em erro (e nada carregado) não há o que mostrar,
  // e o skeleton ficaria animando para sempre ao lado da mensagem de erro
  let filters: ReactNode = null
  if (data) {
    filters = <CatalogFilters search={search} facets={data.facets} navigate={navigate} onApplied={() => setFiltersOpen(false)} />
  } else if (!query.isError) {
    filters = <FiltersSkeleton />
  }

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
      <ul aria-hidden className={GRID_CLASS}>
        {Array.from({ length: CATALOG_PAGE_SIZE }, (_, i) => (
          <li key={i}>
            <NftCardSkeleton />
          </li>
        ))}
      </ul>
    )
  } else if (data.items.length === 0 && data.total > 0) {
    // Página além da última (link antigo ou URL editada): há resultados, só não nesta página
    results = (
      <EmptyState
        title="Esta página não tem NFTs"
        description={`A busca tem ${data.totalPages} ${data.totalPages === 1 ? 'página' : 'páginas'}. Volte para a primeira.`}
        action={{ label: 'Ir para a primeira página', onClick: () => goToPage(1) }}
      />
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
        className={cn(GRID_CLASS, 'transition-opacity aria-busy:opacity-70')}
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
                {data && !query.isFetching ? resultsStatus(data) : ''}
              </output>
              {query.isError && data && (
                <p role="alert" className="text-body text-muted-foreground">
                  Não foi possível atualizar os resultados. Mostrando a última lista carregada.{' '}
                  <Button variant="link" size="none" onClick={() => void query.refetch()} className="font-bold underline underline-offset-auto">
                    Tentar novamente
                  </Button>
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
            <Button variant="link" size="none" onClick={clearFilters} className="w-max text-body font-bold">
              Limpar filtros
            </Button>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
