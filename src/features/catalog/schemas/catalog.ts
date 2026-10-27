import { z } from 'zod'
import { networkSchema, nftSummarySchema, weiSchema } from '@/entities/nft'

export const facetSchema = z.object({ id: z.string(), label: z.string(), count: z.number().int().nonnegative() })

export const catalogPageSchema = z.object({
  items: z.array(nftSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  facets: z.object({
    categories: z.array(facetSchema),
    networks: z.array(facetSchema.extend({ id: networkSchema })),
    creators: z.array(facetSchema),
    /** Limites globais do slider (independem dos filtros aplicados). */
    priceRange: z.object({ minWei: weiSchema, maxWei: weiSchema }),
  }),
})

export type CatalogPage = z.infer<typeof catalogPageSchema>
export type Facet = z.infer<typeof facetSchema>
