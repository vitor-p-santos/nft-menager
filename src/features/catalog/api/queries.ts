import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { CATALOG_PAGE_SIZE, type CatalogSearch } from '@/entities/catalog'
import { api } from '@/lib/api'
import { catalogPageSchema } from '../schemas/catalog'

export const catalogKeys = {
  all: ['nfts'] as const,
  lists: () => [...catalogKeys.all, 'list'] as const,
  list: (search: CatalogSearch) => [...catalogKeys.lists(), search] as const,
}

/** Converte o estado da URL nos query params do contrato REST. */
export function toCatalogParams(search: CatalogSearch) {
  return {
    q: search.q,
    categories: search.categories?.join(','),
    networks: search.networks?.join(','),
    creator: search.creator,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    tab: search.tab,
    sort: search.sort,
    page: search.page ?? 1,
    pageSize: CATALOG_PAGE_SIZE,
  }
}

export const catalogQueries = {
  list: (search: CatalogSearch) =>
    queryOptions({
      queryKey: catalogKeys.list(search),
      queryFn: ({ signal }) => api.get('/nfts', catalogPageSchema, { params: toCatalogParams(search), signal }),
      // Mantém a página anterior visível durante a troca de filtro (sem layout shift)
      placeholderData: keepPreviousData,
    }),
}
