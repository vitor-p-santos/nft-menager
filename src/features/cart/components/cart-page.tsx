import { useQuery } from '@tanstack/react-query'
import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import arrowBack from '@/assets/icons/arrow-back.svg'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { Container } from '@/components/layout/container'
import { buttonVariants } from '@/components/ui/button-variants'
import { CATALOG_SECTION_ID } from '@/entities/catalog'
import { cn } from '@/lib/utils'
import { cartQueries } from '../api/queries'
import { useCartItemActions } from '../hooks/use-cart-item-actions'
import type { Cart } from '../schemas/cart'
import { CartCards, CartItemsSkeleton, CartTable } from './cart-items'
import { CartSummary, CartSummarySkeleton } from './cart-summary'

function ExploreLink() {
  return (
    <Link to="/" hash={CATALOG_SECTION_ID} className={buttonVariants({ size: 'lg' })}>
      Explorar o mercado
    </Link>
  )
}

/** Voltar (topo mobile): histórico quando possível; senão, o catálogo. */
function BackButton() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: '/', hash: CATALOG_SECTION_ID }))}
      className="absolute left-0 flex size-[35px] cursor-pointer items-center justify-center rounded-full border border-border bg-surface-raised"
    >
      <img src={arrowBack} alt="" width={13} height={7} className="rotate-90" />
    </button>
  )
}

function Heading() {
  return (
    <>
      <nav aria-label="Trilha de navegação" className="hidden pt-8 md:block">
        <ol className="flex gap-1 text-body-md leading-4 font-bold text-foreground">
          <li>
            <Link to="/" className="rounded-sm hover:text-text-accent">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/" hash={CATALOG_SECTION_ID} className="rounded-sm hover:text-text-accent">
              Mercado
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>
      {/* Mobile (Figma "Carrinho de NFTs"): voltar + título centralizado */}
      <div className="relative flex h-[35px] items-center justify-center pt-0 md:hidden">
        <BackButton />
        <h1 className="text-title-sm leading-6 font-bold text-foreground">Carrinho de NFTs</h1>
      </div>
      <h1 className="sr-only max-md:hidden">Carrinho de NFTs</h1>
    </>
  )
}

function CartContent({ cart, related }: { cart: Cart; related?: ReactNode }) {
  const actions = useCartItemActions()
  const feedback = actions.feedback

  return (
    <>
      <p aria-live="polite" className={cn('text-body leading-5', feedback?.tone === 'error' ? 'text-destructive' : 'text-text-secondary', !feedback && 'sr-only')}>
        {feedback?.message}
      </p>
      {cart.items.length === 0 ? (
        <EmptyState
          title="Seu carrinho está vazio"
          description="Explore o mercado e adicione NFTs para vê-los aqui."
          action={<ExploreLink />}
        />
      ) : (
        <div className="flex flex-col gap-8 max-md:flex-1 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="xl:hidden">
              <CartCards items={cart.items} actions={actions} />
            </div>
            <div className="hidden xl:block">
              <CartTable items={cart.items} actions={actions} />
            </div>
          </div>
          <CartSummary cart={cart} />
        </div>
      )}
      {cart.items.length > 0 && related && <div className="mt-16 hidden md:block xl:mt-[100px]">{related}</div>}
    </>
  )
}

/**
 * Tela "Carrinho" (Figma desktop `11:1278`, mobile `16:360`). `related` é composto pela rota
 * ("Colecionadores também viram") para que esta feature não importe a de NFT.
 */
export function CartPage({ related }: { related?: (cart: Cart) => ReactNode }) {
  const { data: cart, isError, refetch } = useQuery(cartQueries.get())

  let content: ReactNode
  if (cart) {
    content = <CartContent cart={cart} related={related?.(cart)} />
  } else if (isError) {
    content = (
      <ErrorState
        title="Não foi possível carregar o carrinho"
        description="Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onClick: () => void refetch() }}
      />
    )
  } else {
    content = (
      <div className="flex flex-col gap-8 xl:flex-row xl:justify-between">
        <CartItemsSkeleton />
        <CartSummarySkeleton />
      </div>
    )
  }

  return (
    <Container className="flex flex-col gap-5 pt-[30px] max-md:min-h-dvh md:gap-3 md:pt-0">
      <Heading />
      {content}
    </Container>
  )
}
