import { http, HttpResponse } from 'msw'
import { API_BASE_URL } from '@/lib/api'
import { nftsTable } from '../db/catalog'
import { favoritesTable } from '../db/favorites'
import { authenticate } from '../db/session'
import { withScenario } from '../scenarios'
import { toSummary } from './catalog'

const notFound = () => HttpResponse.json({ code: 'not_found', message: 'NFT não encontrado' }, { status: 404 })

export const favoritesHandlers = [
  http.get(
    `${API_BASE_URL}/me/favorites`,
    withScenario('favorites.list', ({ request }) => {
      const auth = authenticate(request)
      if (auth.error) return auth.error
      const { user } = auth
      const items = favoritesTable
        .list(user.id)
        .map((row) => nftsTable.find(row.nftId))
        .filter((nft) => nft !== undefined)
        .map(toSummary)
      return HttpResponse.json(items)
    }),
  ),

  http.put(
    `${API_BASE_URL}/me/favorites/:nftId`,
    withScenario('favorites.add', ({ request, params }) => {
      const auth = authenticate(request)
      if (auth.error) return auth.error
      const { user } = auth
      const nft = nftsTable.find(String(params.nftId))
      if (!nft) return notFound()
      favoritesTable.add(user.id, nft.id)
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.delete(
    `${API_BASE_URL}/me/favorites/:nftId`,
    withScenario('favorites.remove', ({ request, params }) => {
      const auth = authenticate(request)
      if (auth.error) return auth.error
      const { user } = auth
      favoritesTable.remove(user.id, String(params.nftId))
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
