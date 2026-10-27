import { z } from 'zod'

/** Valor monetário em wei, serializado como string decimal (ver lib/money). */
export const weiSchema = z.string().regex(/^\d+$/, 'Valor em wei inválido')

export const networkSchema = z.enum(['ethereum', 'polygon', 'solana'])
export type Network = z.infer<typeof networkSchema>

export const editionSchema = z.enum(['1/1', '1/10', '1/50', 'open'])
export type Edition = z.infer<typeof editionSchema>

export const imageSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})
export type Image = z.infer<typeof imageSchema>

/** Representação usada em listagens (catálogo, relacionados, destaque). */
export const nftSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  tokenId: z.string(),
  collection: z.string(),
  creator: z.string(),
  categoryId: z.string(),
  network: networkSchema,
  priceWei: weiSchema,
  compareAtPriceWei: weiSchema.nullable(),
  rarity: z.enum(['rare']).nullable(),
  image: imageSchema,
  listedAt: z.iso.datetime(),
  version: z.number().int().nonnegative(),
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const nftEditionSchema = z.object({
  edition: editionSchema,
  available: z.number().int().nonnegative(),
})

export const nftSchema = nftSummarySchema.extend({
  images: z.array(imageSchema).min(1),
  editions: z.array(nftEditionSchema).min(1),
  rating: z.number().min(0).max(5),
  reviewsCount: z.number().int().nonnegative(),
  description: z.string(),
  details: z.array(z.string()),
  attributes: z.array(z.string()),
  contractAddress: z.string(),
  royaltyBps: z.number().int().nonnegative(),
  trendingScore: z.number().int().min(0).max(100),
})
export type Nft = z.infer<typeof nftSchema>
