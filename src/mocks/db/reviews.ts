import type { Nft } from '@/entities/nft'
import type { Review } from '@/features/nft/schemas/review'
import { seedReviews } from '../fixtures/reviews'
import { loadTable, saveTable } from './storage'

type ReviewsByNft = Record<string, Review[]>

const TABLE = 'reviews'

/** Avaliações persistidas por NFT; geradas sob demanda na primeira leitura (datas estáveis após o seed). */
export const reviewsTable = {
  forNft(nft: Nft): Review[] {
    const all = loadTable<ReviewsByNft>(TABLE, () => ({}))
    const existing = all[nft.id]
    if (existing) return existing
    const seeded = seedReviews(nft)
    all[nft.id] = seeded
    saveTable(TABLE, all)
    return seeded
  },
}
