import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet, useMatches } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { MobileTabBar } from '@/app/layout/mobile-tab-bar'
import { SiteFooter } from '@/app/layout/site-footer'
import { SiteHeader } from '@/app/layout/site-header'
import { EmptyState } from '@/components/feedback/states'
import { AuthDialogLoader } from '@/features/auth/components/auth-dialog-loader'
import { SessionExpiredHandler } from '@/features/auth/components/session-expired-handler'
import { Container } from '@/components/layout/container'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

export type RouterContext = {
  queryClient: QueryClient
}

const Devtools = import.meta.env.DEV
  ? lazy(() => import('@/app/devtools').then((m) => ({ default: m.Devtools })))
  : () => null

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <Container className="py-16">
      <EmptyState
        titleAs="h1"
        title="Página não encontrada"
        description="O endereço pode estar incorreto ou a página foi removida."
        action={
          <Link to="/" className={buttonVariants({ size: 'lg' })}>
            Voltar ao início
          </Link>
        }
      />
    </Container>
  )
}

function RootLayout() {
  // Rotas com barra fixa própria no mobile (detalhe do NFT) escondem a tab bar e reservam o próprio espaço
  const hideTabBar = useMatches({ select: (matches) => matches.some((m) => m.staticData.hideMobileTabBar) })

  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      {/* Abaixo de md a tab bar fixa (126px) cobre o fim da página: reserva o espaço */}
      <main id="main" tabIndex={-1} className={cn('focus-visible:outline-none md:pb-24', hideTabBar ? 'pb-6' : 'pb-[150px]')}>
        <Outlet />
      </main>
      <SiteFooter />
      {!hideTabBar && <MobileTabBar />}
      {/* Modal "Entrar | Criar conta" (desktop) e reação à sessão expirada (T-062/T-063) */}
      <AuthDialogLoader />
      <SessionExpiredHandler />
      <Suspense>
        <Devtools />
      </Suspense>
    </>
  )
}
