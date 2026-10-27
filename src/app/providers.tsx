import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { installSessionBridge } from '@/features/auth/api'
import { RealtimeStatus } from './layout/realtime-status'
import { queryClient } from './query-client'
import { useRealtimeSync } from './realtime'
import { router } from './router'

// Liga a sessão ao Axios (token + 401 `session_expired`) e ao cache antes do primeiro request.
installSessionBridge(queryClient)

/** Tempo real (T-091): uma conexão por app, montada uma única vez aqui (eventos → cache, polling de fallback, refetch ao reconectar). */
function RealtimeSync() {
  useRealtimeSync(queryClient)
  return null
}

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeSync />
      <RouterProvider router={router} />
      <RealtimeStatus />
    </QueryClientProvider>
  )
}
