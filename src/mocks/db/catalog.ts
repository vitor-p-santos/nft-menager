import type { Nft } from '@/entities/nft'
import { seedNfts } from '../fixtures/nfts'
import { loadTable, saveTable } from './storage'

/** Tabela de NFTs do servidor simulado (persistida para suportar refresh e mudanças de preço/estoque). */
export const nftsTable = {
  all(): Nft[] {
    return loadTable('nfts', () => seedNfts())
  },
  find(idOrSlug: string): Nft | undefined {
    return this.all().find((n) => n.id === idOrSlug || n.slug === idOrSlug)
  },
  save(nfts: Nft[]) {
    saveTable('nfts', nfts)
  },
}
