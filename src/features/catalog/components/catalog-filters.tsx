import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { CatalogSearch } from '@/entities/catalog'
import { parseEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { toggleValue, type CatalogNavigate } from '../hooks/catalog-search'
import type { CatalogPage, Facet } from '../schemas/catalog'

/** O slider trabalha em centésimos de ETH (inteiros seguros); a URL guarda ETH em string. */
const CENTI_WEI = 10n ** 16n
const toCenti = (wei: bigint) => Number(wei / CENTI_WEI)
const centiToEth = (centi: number) => `${Math.floor(centi / 100)}.${String(centi % 100).padStart(2, '0')}`
/** "0,02" — o Figma usa vírgula decimal no rótulo da faixa. */
const centiLabel = (centi: number) => centiToEth(centi).replace('.', ',')

function safeCenti(eth: string | undefined, fallback: number) {
  if (!eth) return fallback
  try {
    return toCenti(parseEth(eth))
  } catch {
    return fallback
  }
}

type FacetListProps = {
  title: string
  facets: Facet[]
  selected: readonly string[] | undefined
  onToggle: (id: string) => void
  boldCount?: boolean
}

function FacetList({ title, facets, selected, onToggle, boldCount }: FacetListProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-lead leading-6 font-bold text-foreground">
        {title}
      </h3>
      <ul className="flex flex-col">
        {facets.map((facet) => {
          const active = selected?.includes(facet.id) ?? false
          return (
            <li key={facet.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(facet.id)}
                className={cn(
                  'flex h-10 w-full cursor-pointer items-center justify-between rounded-sm pr-1 pl-3 text-left text-body-md leading-5 transition-colors hover:text-text-accent',
                  active ? 'text-text-accent' : 'text-muted-foreground',
                )}
              >
                <span>{facet.label}</span>
                <span className={cn(boldCount && 'font-bold')}>
                  ({facet.count})<span className="sr-only"> itens</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PriceRange({
  search,
  range,
  navigate,
  onApplied,
}: {
  search: CatalogSearch
  range: CatalogPage['facets']['priceRange']
  navigate: CatalogNavigate
  onApplied?: () => void
}) {
  const headingId = useId()
  const labelId = useId()
  const min = toCenti(BigInt(range.minWei))
  // Arredonda o teto para cima para que o NFT mais caro continue dentro da faixa
  const max = Number((BigInt(range.maxWei) + CENTI_WEI - 1n) / CENTI_WEI)
  const [value, setValue] = useState<[number, number]>([
    safeCenti(search.minPrice, min),
    safeCenti(search.maxPrice, max),
  ])

  function apply() {
    const [lo, hi] = value
    navigate({
      minPrice: lo > min ? centiToEth(lo) : undefined,
      maxPrice: hi < max ? centiToEth(hi) : undefined,
    })
    onApplied?.()
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-lead leading-6 font-bold text-foreground">
        Faixa de preço
      </h3>
      <div className="flex flex-col gap-4 pl-3">
        <Slider
          min={min}
          max={max}
          step={1}
          minStepsBetweenThumbs={1}
          value={value}
          onValueChange={(v) => setValue([v[0] ?? min, v[1] ?? max])}
          thumbLabels={['Preço mínimo', 'Preço máximo']}
          aria-labelledby={headingId}
          aria-describedby={labelId}
        />
        <p id={labelId} className="text-body leading-5 text-foreground">
          Preço: {centiLabel(value[0])} - {centiLabel(value[1])} ETH
        </p>
        <Button size="sm" onClick={apply} className="w-max">
          Aplicar
        </Button>
      </div>
    </section>
  )
}

type CatalogFiltersProps = {
  search: CatalogSearch
  facets: CatalogPage['facets']
  navigate: CatalogNavigate
  /** Chamado depois de aplicar a faixa de preço (fecha o sheet no mobile). */
  onApplied?: () => void
}

/** Painel de filtros (Figma: Coleções, Faixa de preço, Rede). Filtros combináveis, refletidos na URL. */
export function CatalogFilters({ search, facets, navigate, onApplied }: CatalogFiltersProps) {
  // Remonta o slider quando a URL ou os limites mudam (ex.: "Limpar filtros")
  const priceKey = `${search.minPrice ?? ''}-${search.maxPrice ?? ''}-${facets.priceRange.minWei}-${facets.priceRange.maxWei}`
  return (
    <div className="flex flex-col gap-10">
      <FacetList
        title="Coleções"
        facets={facets.categories}
        selected={search.categories}
        boldCount
        onToggle={(id) => navigate({ categories: toggleValue(search.categories, id) })}
      />
      <PriceRange key={priceKey} search={search} range={facets.priceRange} navigate={navigate} onApplied={onApplied} />
      <FacetList
        title="Rede"
        facets={facets.networks}
        selected={search.networks}
        onToggle={(id) =>
          navigate({ networks: toggleValue(search.networks, id as (typeof facets.networks)[number]['id']) })
        }
      />
    </div>
  )
}

