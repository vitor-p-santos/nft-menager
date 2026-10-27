import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { walletListSchema } from './schema'

/** Query keys das carteiras (privadas: saem do cache na troca de conta). Checkout e perfil usam. */
export const walletKeys = {
  all: ['wallets'] as const,
  list: () => [...walletKeys.all, 'list'] as const,
}

export const walletQueries = {
  /** Carteiras do usuário logado, a principal primeiro. Exige sessão (`enabled: isAuthenticated`). */
  list: () =>
    queryOptions({
      queryKey: walletKeys.list(),
      queryFn: ({ signal }) => api.get('/me/wallets', walletListSchema, { signal }),
    }),
}
