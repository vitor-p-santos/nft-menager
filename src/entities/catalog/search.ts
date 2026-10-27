import { z } from 'zod'
import { networkSchema } from '@/entities/nft'

export const CATALOG_TABS = ['all', 'new', 'trending'] as const
export const CATALOG_SORTS = ['recent', 'price_asc', 'price_desc', 'popular'] as const
export const CATALOG_PAGE_SIZE = 9

export type CatalogTab = (typeof CATALOG_TABS)[number]
export type CatalogSort = (typeof CATALOG_SORTS)[number]

export const ethAmountSchema = z.string().regex(/^\d+(\.\d{1,18})?$/)

/**
 * Estado do catálogo na URL. Valores padrão ficam fora da URL (undefined), e
 * entradas inválidas são descartadas com `.catch` em vez de quebrar a rota.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().min(1).max(80).optional().catch(undefined),
  categories: z.array(z.string().min(1)).min(1).optional().catch(undefined),
  networks: z.array(networkSchema).min(1).optional().catch(undefined),
  creator: z.string().min(1).optional().catch(undefined),
  minPrice: ethAmountSchema.optional().catch(undefined),
  maxPrice: ethAmountSchema.optional().catch(undefined),
  tab: z.enum(CATALOG_TABS).optional().catch(undefined),
  sort: z.enum(CATALOG_SORTS).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

/** Chaves que, ao mudar, devem voltar a paginação para a página 1. */
export const CATALOG_FILTER_KEYS = ['q', 'categories', 'networks', 'creator', 'minPrice', 'maxPrice', 'tab', 'sort'] as const

export const SORT_LABELS: Record<CatalogSort, string> = {
  recent: 'Listados recentemente',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  popular: 'Mais populares',
}

export const TAB_LABELS: Record<CatalogTab, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

/** Âncora da seção do catálogo na Home (links "Mercado", promos, footer). */
export const CATALOG_SECTION_ID = 'catalogo'

/** Campo de busca do catálogo no mobile; o botão central da tab bar foca nele (research.md, D-09). */
export const CATALOG_SEARCH_INPUT_ID = 'mobile-catalog-search'
