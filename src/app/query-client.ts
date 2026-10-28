import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'

// `timeout`: cada tentativa já esperou API_TIMEOUT_MS (10 s); repetir deixava a tela ~30 s em skeleton
// sem nenhum aviso. O erro aparece na hora, com "Tentar novamente". Falha de rede rápida ainda repete.
const NON_RETRYABLE = new Set(['validation', 'unauthorized', 'forbidden', 'not_found', 'conflict', 'timeout'])

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
