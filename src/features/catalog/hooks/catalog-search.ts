import { CATALOG_FILTER_KEYS, type CatalogSearch } from '@/entities/catalog'

export type CatalogSearchPatch = Partial<CatalogSearch>

/** Navegação do catálogo: a rota injeta a função que grava o patch na URL. */
export type CatalogNavigate = (patch: CatalogSearchPatch, options?: { replace?: boolean }) => void

/**
 * Aplica um patch ao estado da URL: mudar qualquer filtro volta para a página 1, e
 * valores vazios ([] / '') somem da URL para manter links curtos e canônicos.
 */
export function mergeCatalogSearch(prev: CatalogSearch, patch: CatalogSearchPatch): CatalogSearch {
  const next: CatalogSearch = { ...prev, ...patch }
  const changedFilter = CATALOG_FILTER_KEYS.some((key) => key in patch && patch[key] !== prev[key])
  if (changedFilter && !('page' in patch)) next.page = undefined
  for (const key of Object.keys(next) as (keyof CatalogSearch)[]) {
    const value = next[key]
    if (value === '' || (Array.isArray(value) && value.length === 0)) delete next[key]
    if (value === undefined) delete next[key]
  }
  if (next.page === 1) delete next.page
  return next
}

export function toggleValue<T>(list: readonly T[] | undefined, value: T): T[] {
  const current = list ?? []
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
}
