import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'

const NON_RETRYABLE = new Set(['validation', 'unauthorized', 'forbidden', 'not_found', 'conflict'])

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && NON_RETRYABLE.has(error.kind)) return false
        return failureCount < 2
      },
    },
    mutations: {
      // Mutations nunca repetem automaticamente: pedidos usam idempotência explícita.
      retry: false,
    },
  },
})
