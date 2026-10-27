import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { nftSchema, nftSummarySchema, type NftSummary } from '@/entities/nft'
import { savePendingAction } from '@/entities/session'
import { ApiError, api, http } from '@/lib/api'
import { REVIEWS_PAGE_SIZE, reviewsPageSchema } from '../schemas/review'

/** Mesmo prefixo `['nfts']` do catálogo: invalidar `nftKeys.all` atualiza listas e detalhes. */
export const nftKeys = {
  all: ['nfts'] as const,
  details: () => [...nftKeys.all, 'detail'] as const,
  detail: (id: string) => [...nftKeys.details(), id] as const,
  related: (id: string) => [...nftKeys.all, 'related', id] as const,
  reviews: (id: string) => [...nftKeys.all, 'reviews', id] as const,
  reviewsPage: (id: string, page: number) => [...nftKeys.reviews(id), page] as const,
}

export const favoritesKeys = {
  all: ['me', 'favorites'] as const,
  list: () => [...favoritesKeys.all, 'list'] as const,
}

const nftPath = (id: string) => `/nfts/${encodeURIComponent(id)}`

export const nftQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: nftKeys.detail(id),
      queryFn: ({ signal }) => api.get(nftPath(id), nftSchema, { signal }),
    }),
  related: (id: string) =>
    queryOptions({
      queryKey: nftKeys.related(id),
      queryFn: ({ signal }) => api.get(`${nftPath(id)}/related`, nftSummarySchema.array(), { signal }),
    }),
  reviews: (id: string, page = 1) =>
    queryOptions({
      queryKey: nftKeys.reviewsPage(id, page),
      queryFn: ({ signal }) =>
        api.get(`${nftPath(id)}/reviews`, reviewsPageSchema, {
          params: { page, pageSize: REVIEWS_PAGE_SIZE },
          signal,
        }),
    }),
}

export const favoritesQueries = {
  /** Requer sessão: sem login a API responde 401 (`ApiError.kind === 'unauthorized'`). */
  list: () =>
    queryOptions({
      queryKey: favoritesKeys.list(),
      queryFn: ({ signal }) => api.get('/me/favorites', nftSummarySchema.array(), { signal }),
    }),
}

export type ToggleFavoriteInput = {
  nftId: string
  favorite: boolean
  /** Rota interna (pathname + search + hash) para voltar se a API pedir login (401). */
  redirect?: string
}

/**
 * Favorita (PUT) ou desfavorita (DELETE) com update otimista na lista de favoritos.
 * Em erro, restaura o snapshot; ao final, invalida a lista para refletir o servidor.
 * 401 ao favoritar grava a ação pendente aqui, no nível da mutation, e não no `mutate` do
 * componente: a expiração da sessão reseta o cache e, no mobile, navega para `/entrar`, e os
 * callbacks do `mutate` não rodam com o componente desmontado.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const listKey = favoritesKeys.list()

  return useMutation({
    mutationFn: async ({ nftId, favorite }: ToggleFavoriteInput) => {
      const url = `/me/favorites/${encodeURIComponent(nftId)}`
      if (favorite) await http.put(url)
      else await api.delete(url)
    },
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = queryClient.getQueryData<NftSummary[]>(listKey)
      if (previous) {
        let next = previous.filter((nft) => nft.id !== nftId)
        if (favorite) {
          // Sem o resumo em cache não há como inserir otimisticamente; a invalidação completa a lista.
          const detail = queryClient.getQueryData(nftKeys.detail(nftId))
          const summary = detail ? nftSummarySchema.safeParse(detail) : null
          if (summary?.success) next = [summary.data, ...next]
        }
        queryClient.setQueryData<NftSummary[]>(listKey, next)
      }
      return { previous }
    },
    onError: (error, { nftId, favorite, redirect }, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous)
      if (favorite && redirect && error instanceof ApiError && error.kind === 'unauthorized') {
        savePendingAction({ type: 'favorite', nftId, redirect, createdAt: Date.now() })
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: favoritesKeys.all }),
  })
}
