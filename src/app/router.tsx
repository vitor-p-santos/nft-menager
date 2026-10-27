import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { queryClient } from './query-client'

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Dados ficam no TanStack Query; o loader do router apenas dispara ensureQueryData.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
  interface StaticDataRouteOption {
    /** Abaixo de `md`, a rota tem barra fixa própria (ex.: barra de compra do detalhe) no lugar da tab bar. */
    hideMobileTabBar?: boolean
  }
}
