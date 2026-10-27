import { z } from 'zod'

export const REVIEWS_PAGE_SIZE = 5

export const reviewSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  body: z.string(),
  createdAt: z.iso.datetime(),
})
export type Review = z.infer<typeof reviewSchema>

/** Página de `GET /nfts/:id/reviews`, ordenada da mais recente para a mais antiga. */
export const reviewsPageSchema = z.object({
  items: z.array(reviewSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
})
export type ReviewsPage = z.infer<typeof reviewsPageSchema>
