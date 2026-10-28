import { http, HttpResponse } from 'msw'
import { API_BASE_URL } from '@/lib/api'
import { nftsTable } from '../db/catalog'
import { favoritesTable } from '../db/favorites'
import { toSummary } from '../domain/catalog'
import { notFound } from '../http'
import { withScenario } from '../scenarios'
import { withAuth } from '../with-auth'

export const favoritesHandlers = [
  http.get(
    `${API_BASE_URL}/me/favorites`,
    withScenario(
      'favorites.list',
      withAuth((_info, { user }) => {
        const items = favoritesTable
          .list(user.id)
          .map((row) => nftsTable.find(row.nftId))
          .filter((nft) => nft !== undefined)
          .map(toSummary)
        return HttpResponse.json(items)
      }),
    ),
  ),

  http.put(
    `${API_BASE_URL}/me/favorites/:nftId`,
    withScenario(
      'favorites.add',
      withAuth(({ params }, { user }) => {
        const nft = nftsTable.find(String(params.nftId))
        if (!nft) return notFound('NFT não encontrado')
        favoritesTable.add(user.id, nft.id)
        return new HttpResponse(null, { status: 204 })
      }),
    ),
  ),

  http.delete(
    `${API_BASE_URL}/me/favorites/:nftId`,
    withScenario(
      'favorites.remove',
      withAuth(({ params }, { user }) => {
        favoritesTable.remove(user.id, String(params.nftId))
        return new HttpResponse(null, { status: 204 })
      }),
    ),
  ),
]
