import { useEffect, useId, useRef, useState } from 'react'
import filterIcon from '@/assets/icons/filter.svg'
import searchMuted from '@/assets/icons/search-muted.svg'
import { CATALOG_SEARCH_INPUT_ID } from '@/entities/catalog'
import type { CatalogNavigate } from '../hooks/catalog-search'

const DEBOUNCE_MS = 350

/**
 * Barra de busca mobile (Figma "Search", 314×45 + botão de filtro 45×45).
 * A busca é aplicada com debounce enquanto digita (replace no histórico) e no Enter.
 */
export function CatalogSearchBar({
  q,
  navigate,
  onOpenFilters,
  activeFilters,
}: {
  q: string | undefined
  navigate: CatalogNavigate
  onOpenFilters: () => void
  activeFilters: number
}) {
  const [value, setValue] = useState(q ?? '')
  const lastSent = useRef(q ?? '')
  const labelId = useId()

  // Mantém o campo em sincronia quando a URL muda por fora (voltar, limpar filtros)
  useEffect(() => {
    if ((q ?? '') !== lastSent.current) {
      lastSent.current = q ?? ''
      setValue(q ?? '')
    }
  }, [q])

  useEffect(() => {
    const term = value.trim()
    if (term === lastSent.current) return
    const timer = window.setTimeout(() => {
      lastSent.current = term
      navigate({ q: term || undefined }, { replace: true })
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [value, navigate])

  return (
    <div className="flex items-center gap-[7px]">
      <search className="min-w-0 flex-1">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const term = value.trim()
            lastSent.current = term
            navigate({ q: term || undefined })
            ;(document.activeElement as HTMLElement | null)?.blur()
          }}
          className="flex h-[45px] items-center gap-2 rounded-field bg-card px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
        >
          <label id={labelId} htmlFor={CATALOG_SEARCH_INPUT_ID} className="sr-only">
            Buscar NFTs
          </label>
          <img src={searchMuted} alt="" width={22} height={22} />
          <input
            id={CATALOG_SEARCH_INPUT_ID}
            type="search"
            enterKeyHint="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Explorar coleções"
            className="min-w-0 flex-1 bg-transparent text-body-md leading-5 font-bold text-foreground placeholder:text-text-secondary focus-visible:outline-none"
          />
        </form>
      </search>
      <button
        type="button"
        onClick={onOpenFilters}
        aria-haspopup="dialog"
        className="relative flex size-[45px] shrink-0 cursor-pointer items-center justify-center rounded-field bg-[linear-gradient(180deg,var(--brand-primary),color-mix(in_srgb,var(--brand-primary)_60%,transparent))]"
      >
        <img src={filterIcon} alt="" width={16} height={16} />
        {/* Nome acessível vem do conteúdo ("Filtros 2 ativos") e contém o número visível do badge */}
        <span className="sr-only">Filtros </span>
        {activeFilters > 0 && (
          <>
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full border-2 border-background bg-primary text-micro leading-none font-bold text-primary-foreground">
              {activeFilters}
            </span>
            <span className="sr-only"> ativos</span>
          </>
        )}
      </button>
    </div>
  )
}
