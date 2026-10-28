import { Link } from '@tanstack/react-router'
import { XIcon } from 'lucide-react'
import chevronDown from '@/assets/icons/chevron-down.svg'
import filterIcon from '@/assets/icons/filter.svg'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  CATALOG_SECTION_ID,
  CATALOG_SORTS,
  CATALOG_TABS,
  SORT_LABELS,
  TAB_LABELS,
  type CatalogSearch,
  type CatalogSort,
} from '@/entities/catalog'
import { cn } from '@/lib/utils'
import { mergeCatalogSearch, type CatalogNavigate } from '../hooks/catalog-search'

/** Abas (Todos / Novos / Em alta). São links: o estado vive na URL e pode ser compartilhado. */
export function CatalogTabs({ search }: { search: CatalogSearch }) {
  const current = search.tab ?? 'all'
  return (
    <nav aria-label="Abas do catálogo" className="-mx-1 overflow-x-auto px-1">
      <ul className="flex items-start gap-2 whitespace-nowrap md:gap-5">
        {CATALOG_TABS.map((tab) => {
          const active = tab === current
          return (
            <li key={tab}>
              <Link
                to="/"
                search={(prev) => mergeCatalogSearch(prev, { tab: tab === 'all' ? undefined : tab })}
                hash={CATALOG_SECTION_ID}
                resetScroll={false}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col gap-1 rounded-sm pt-0.5 text-body leading-5 transition-colors hover:text-text-accent md:text-body-md',
                  active ? 'font-bold text-text-accent' : 'text-foreground md:font-bold',
                )}
              >
                {TAB_LABELS[tab]}
                {/* Sublinhado ativo de 2px (tab-underline do Figma); reservado para não deslocar o layout */}
                <span aria-hidden className={cn('h-0.5 w-full bg-primary', !active && 'invisible')} />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function SortMenu({ search, navigate }: { search: CatalogSearch; navigate: CatalogNavigate }) {
  const current: CatalogSort = search.sort ?? (search.tab === 'trending' ? 'popular' : 'recent')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex cursor-pointer items-center gap-1 rounded-sm text-body leading-5 whitespace-nowrap text-foreground md:text-body-md">
        <span className="text-muted-foreground md:text-foreground">Ordenar por:</span>
        <span className="font-medium">{SORT_LABELS[current]}</span>
        <img src={chevronDown} alt="" width={11} height={6} className="ml-1" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 border-border bg-surface-card">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) => navigate({ sort: value as CatalogSort })}
        >
          {CATALOG_SORTS.map((sort) => (
            <DropdownMenuRadioItem key={sort} value={sort} className="text-body text-foreground">
              {SORT_LABELS[sort]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Botão "Filtros" (tablet). No mobile o mesmo sheet abre pelo botão ao lado da busca. */
export function FiltersButton({ count, onClick, className }: { count: number; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className={cn(buttonVariants({ size: 'none' }), 'h-10 gap-2 rounded-md px-3 text-body-md leading-5 font-bold', className)}
    >
      <img src={filterIcon} alt="" width={16} height={16} />
      Filtros
      {count > 0 && <span className="text-body">({count})</span>}
    </button>
  )
}

export type Chip = { key: string; label: string; patch: Partial<CatalogSearch> }

/** Filtros ativos que não aparecem no painel (busca e criador) como chips removíveis. */
export function ActiveChips({ chips, navigate }: { chips: Chip[]; navigate: CatalogNavigate }) {
  if (chips.length === 0) return null
  return (
    <ul aria-label="Filtros ativos" className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={() => navigate(chip.patch)}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border-soft bg-surface-dark px-2.5 py-1 text-body leading-5 text-text-accent hover:bg-accent"
          >
            {chip.label}
            <XIcon aria-hidden className="size-3.5" />
            <span className="sr-only">(remover filtro)</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
