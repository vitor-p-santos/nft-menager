import type { QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { startRealtimeSync, type RealtimeSyncOptions } from './sync'

/**
 * Liga o tempo real enquanto o componente estiver montado (o SocketProvider, T-091). Uma instância só:
 * montar duas vezes abriria duas conexões. Em StrictMode o efeito roda, limpa e roda de novo; a
 * conexão é fechada e reaberta, sem vazamento.
 */
export function useRealtimeSync(queryClient: QueryClient, options?: RealtimeSyncOptions) {
  const onDiscard = options?.onDiscard
  useEffect(() => startRealtimeSync(queryClient, { onDiscard }), [queryClient, onDiscard])
}
